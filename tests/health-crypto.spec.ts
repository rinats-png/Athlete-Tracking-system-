import { expect, test } from '@playwright/test'
import {
  PHRASE_ALPHABET,
  PHRASE_BITS,
  VERIFIER_PLAINTEXT,
  checkVerifier,
  decryptJson,
  deriveKey,
  encryptJson,
  generatePhrase,
  isCompletePhrase,
  makeVerifier,
  newSalt,
  normalizePhrase,
} from '../src/lib/health/crypto'
import { hasHealthData, healthRecords, mergeHealth, planHealthPush, type IncomingHealth, type RemoteHealthRow } from '../src/lib/health/sync'
import { emptyAthlete } from '../src/lib/store/schema'
import type { StoredAthlete, StoredLabEntry } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * Ende-zu-Ende-Verschlüsselung der Gesundheitsschicht.
 *
 * Die eine Zusage, die diese Fälle halten: Der Server bekommt nichts, was
 * ohne die Phrase des Nutzers lesbar wäre — weder der Wert noch die
 * Kategorie noch der Tag. Dass jemand überhaupt Zyklusdaten führt, ist
 * selbst eine Information.
 */

const lab = (id: string, day: string, updatedAt: string, marker = 'ferritin', value = 48): StoredLabEntry => ({
  id,
  day,
  marker,
  value,
  unit: 'µg/l',
  refLow: 30,
  refHigh: 400,
  lab: 'Labor Nord',
  time: '07:40',
  fasting: true,
  trainingDayBefore: false,
  cyclePhase: null,
  infection: false,
  note: '',
  createdAt: updatedAt,
  updatedAt,
})

function athleteWith(labs: StoredLabEntry[], healthUpdatedAt: string | null = null): StoredAthlete {
  const a = emptyAthlete()
  return { ...a, health: { ...a.health, labs, updatedAt: healthUpdatedAt } }
}

test.describe('Phrase', () => {
  test('sechs Gruppen zu vier Zeichen, ohne I, O, 0 und 1', () => {
    expect(PHRASE_BITS).toBe(120)
    for (let i = 0; i < 40; i++) {
      const p = generatePhrase()
      expect(p).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){5}$/)
      for (const c of p.replace(/-/g, '')) expect(PHRASE_ALPHABET, c).toContain(c)
    }
    for (const c of 'IO01') expect(PHRASE_ALPHABET).not.toContain(c)
    // Zwei Phrasen hintereinander sind nie gleich.
    expect(generatePhrase()).not.toBe(generatePhrase())
  })

  test('beim Eintippen zählt nur, was es im Alphabet gibt', () => {
    expect(normalizePhrase('k7m2 9xqr abcd efgh jklm npqr')).toBe('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR')
    // I und O gibt es nicht — wer sie tippt, hat sich vertippt, und geraten
    // wird nicht.
    expect(normalizePhrase('AIOB')).toBe('AB')
    expect(isCompletePhrase('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR')).toBe(true)
    expect(isCompletePhrase('K7M2-9XQR')).toBe(false)
  })
})

test.describe('Verschlüsselung', () => {
  test('hin und zurück mit derselben Phrase', async () => {
    const salt = newSalt()
    const key = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR', salt))!
    expect(key).toBeTruthy()
    const blob = (await encryptJson(key, { marker: 'ferritin', value: 48 }))!
    expect(blob.startsWith('v1.')).toBe(true)
    expect(await decryptJson(key, blob)).toEqual({ marker: 'ferritin', value: 48 })
  })

  test('eine andere Phrase liest nichts — und eine Veränderung am Chiffrat auch nicht', async () => {
    const salt = newSalt()
    const key = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR', salt))!
    const other = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQQ', salt))!
    const blob = (await encryptJson(key, { value: 48 }))!
    expect(await decryptJson(other, blob)).toBeNull()

    const parts = blob.split('.')
    const flipped = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}${parts[2].endsWith('AA') ? 'BB' : 'AA'}`
    expect(await decryptJson(key, flipped)).toBeNull()
    expect(await decryptJson(key, 'unsinn')).toBeNull()
  })

  test('derselbe Zufallsvektor kommt nicht zweimal vor', async () => {
    const key = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR', newSalt()))!
    const a = (await encryptJson(key, 'x'))!
    const b = (await encryptJson(key, 'x'))!
    expect(a.split('.')[1]).not.toBe(b.split('.')[1])
    expect(a).not.toBe(b)
  })

  test('ein anderes Salz ergibt einen anderen Schlüssel', async () => {
    const phrase = 'K7M2-9XQR-ABCD-EFGH-JKLM-NPQR'
    const one = (await deriveKey(phrase, newSalt()))!
    const two = (await deriveKey(phrase, newSalt()))!
    const blob = (await encryptJson(one, 'geheim'))!
    expect(await decryptJson(two, blob)).toBeNull()
  })

  test('die Probe belegt die richtige Phrase, ohne sie irgendwo abzulegen', async () => {
    const salt = newSalt()
    const key = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR', salt))!
    const verifier = (await makeVerifier(key))!
    expect(verifier).not.toContain(VERIFIER_PLAINTEXT)
    expect(await checkVerifier(key, verifier)).toBe(true)
    const wrong = (await deriveKey('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF', salt))!
    expect(await checkVerifier(wrong, verifier)).toBe(false)
  })

  test('im Chiffrat steht weder Wert noch Kategorie noch Tag', async () => {
    const key = (await deriveKey('K7M2-9XQR-ABCD-EFGH-JKLM-NPQR', newSalt()))!
    const entry = lab('l1', '2026-09-01', '2026-09-01T08:00:00.000Z')
    const blob = (await encryptJson(key, { kind: 'lab', ...entry }))!
    for (const wort of ['ferritin', 'lab', 'Labor Nord', '2026-09-01', '48', 'cycle', 'symptom']) {
      expect(blob.toLowerCase(), wort).not.toContain(wort.toLowerCase())
    }
  })
})

test.describe('Datensätze', () => {
  test('einer je Eintrag, dazu genau ein meta', () => {
    const a = athleteWith([lab('l1', '2026-09-01', 'x'), lab('l2', '2026-09-02', 'y')], 'z')
    const records = healthRecords(a)
    expect(records.filter((r) => r.kind === 'meta')).toHaveLength(1)
    expect(records.filter((r) => r.kind === 'lab').map((r) => r.entryId)).toEqual(['lab:l1', 'lab:l2'])
    expect(hasHealthData(a)).toBe(true)
    expect(hasHealthData(emptyAthlete())).toBe(false)
  })

  test('ohne Stand geht alles hoch; mit Stand nur, was sich geändert hat', () => {
    const a = athleteWith([lab('l1', '2026-09-01', '2026-09-01T08:00:00.000Z'), lab('l2', '2026-09-03', '2026-09-03T08:00:00.000Z')], '2026-09-01T08:00:00.000Z')
    expect(planHealthPush(healthRecords(a), [], a.id, null).upserts).toHaveLength(3)
    const later = planHealthPush(healthRecords(a), [], a.id, '2026-09-02T00:00:00.000Z')
    expect(later.upserts.map((r) => r.entryId)).toEqual(['lab:l2'])
  })

  test('Grabstein nur für Zeilen, die der Server VOR dem letzten Abgleich hatte', () => {
    const a = athleteWith([lab('l1', '2026-09-01', '2026-09-01T08:00:00.000Z')], '2026-09-01T08:00:00.000Z')
    const remote: RemoteHealthRow[] = [
      { athlete_id: a.id, entry_id: 'lab:weg', payload: 'v1.a.b', updated_at: '2026-09-01T00:00:00.000Z', deleted_at: null },
      { athlete_id: a.id, entry_id: 'lab:neu', payload: 'v1.a.b', updated_at: '2026-09-05T00:00:00.000Z', deleted_at: null },
      { athlete_id: 'fremd', entry_id: 'lab:andere', payload: 'v1.a.b', updated_at: '2026-09-01T00:00:00.000Z', deleted_at: null },
    ]
    const plan = planHealthPush(healthRecords(a), remote, a.id, '2026-09-02T00:00:00.000Z')
    expect(plan.tombstones).toEqual(['lab:weg'])
  })
})

test.describe('Einarbeiten', () => {
  const incoming = (entryId: string, data: unknown, deleted = false): IncomingHealth => ({ entryId, deleted, data })

  test('unbekannt kommt dazu, der jüngere gewinnt, bei Gleichstand bleibt der lokale', () => {
    const local = lab('l1', '2026-09-01', '2026-09-02T00:00:00.000Z', 'ferritin', 40)
    const a = athleteWith([local])

    const added = mergeHealth(a, [incoming('lab:l2', lab('l2', '2026-09-03', 'z'))])
    expect(added.changed).toBe(1)
    expect(added.athlete.health.labs.map((l) => l.id)).toEqual(['l1', 'l2'])

    const newer = mergeHealth(a, [incoming('lab:l1', lab('l1', '2026-09-01', '2026-09-03T00:00:00.000Z', 'ferritin', 55))])
    expect(newer.athlete.health.labs[0].value).toBe(55)

    const tie = mergeHealth(a, [incoming('lab:l1', lab('l1', '2026-09-01', '2026-09-02T00:00:00.000Z', 'ferritin', 99))])
    expect(tie.changed).toBe(0)
    expect(tie.athlete).toBe(a)
  })

  test('ein Grabstein löscht den Eintrag', () => {
    const a = athleteWith([lab('l1', '2026-09-01', 'x')])
    const after = mergeHealth(a, [incoming('lab:l1', null, true)])
    expect(after.changed).toBe(1)
    expect(after.athlete.health.labs).toEqual([])
  })

  test('meta trägt die Einwilligungen mit — sonst stünden die Daten ohne sie da', () => {
    const a = athleteWith([])
    const consents = [{ category: 'lab' as const, grantedAt: '2026-09-01T00:00:00.000Z', withdrawnAt: null, version: '2026-09-22' }]
    const after = mergeHealth(a, [incoming('meta', { consents, trainingKcalPerDay: 600 })])
    expect(after.athlete.health.consents).toEqual(consents)
    expect(after.athlete.health.trainingKcalPerDay).toBe(600)
  })

  test('eine Zeile, deren Kennung nicht zum Inhalt passt, wird nicht übernommen', () => {
    const a = athleteWith([])
    expect(mergeHealth(a, [incoming('lab:l1', lab('anders', '2026-09-01', 'x'))]).changed).toBe(0)
    expect(mergeHealth(a, [incoming('unsinn', { id: 'x' })]).changed).toBe(0)
    expect(mergeHealth(a, [incoming('meta', { consents: 'kaputt' })]).changed).toBe(0)
  })
})

test.describe('Im Bildschirm', () => {
  test('ohne Anmeldung gibt es keinen Schlüssel und keine Phrase', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      localStorage.setItem('kydon.billing.mode', 'on')
      localStorage.setItem('kydon.billing.v1', JSON.stringify({ entitlements: [{ product: 'athlete_elite', status: 'active', currentPeriodEnd: null }], coachGrant: false, checkedAt: null }))
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.birthDate = '1996-01-15'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('health-key')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Ende-zu-Ende')
    // Ohne Anmeldung gibt es nichts zu entsperren — und der Bildschirm
    // verspricht auch nichts. Vor allem zeigt er KEINE Phrase: die entsteht
    // erst, wenn jemand sie ausdrücklich erzeugt.
    await expect(panel).toContainText('angemeldet')
    await expect(page.getByTestId('health-phrase')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Phrase erzeugen' })).toHaveCount(0)
  })
})
