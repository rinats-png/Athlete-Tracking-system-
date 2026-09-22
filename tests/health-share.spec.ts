import { expect, test } from '@playwright/test'
import {
  generateEnvelopeKeys,
  importPublicKey,
  newShareKey,
  openPayload,
  openSealedKey,
  sealKey,
  sealPayload,
  unwrapPrivateKey,
  wrapPrivateKey,
} from '../src/lib/health/envelope'
import { deriveKey, newSalt } from '../src/lib/health/crypto'
import { readSharePayload, sharePayload, staleShares } from '../src/lib/health/share'
import type { StoredHealth, StoredLabEntry } from '../src/lib/store/localStore'

/**
 * Der Schlüsselumschlag — die Trainerfreigabe je Kategorie.
 *
 * Fünf Zusagen halten diese Fälle fest:
 *
 *   1. Der Trainer kann lesen, was ihm freigegeben wurde.
 *   2. Ein anderer Trainer kann es nicht — auch nicht mit derselben Zeile.
 *   3. Eine Freigabe für Laborwerte öffnet keine Zyklusdaten.
 *   4. Der private Schlüssel überlebt einen Gerätewechsel, weil er in der
 *      Phrase eingewickelt liegt — und NUR in ihr.
 *   5. Eine Freigabe ist eine Abschrift mit Datum. Sie altert sichtbar.
 */

const PHRASE_A = 'K7M2-9XQR-ABCD-EFGH-JKLM-NPQR'
const PHRASE_B = 'T4W8-3ZYX-VUTS-RQPN-MLKJ-HGFE'

const lab = (id: string, updatedAt: string): StoredLabEntry => ({
  id,
  day: '2026-09-01',
  marker: 'ferritin',
  value: 48,
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

const health = (labs: StoredLabEntry[] = []): StoredHealth => ({
  consents: [],
  labs,
  symptoms: [],
  cycle: [],
  selfImage: [],
  meds: [],
  photos: [],
  trainingKcalPerDay: null,
  updatedAt: null,
})

test.describe('Der Umschlag', () => {
  test('der Trainer öffnet, wofür der Umschlag verschlossen wurde', async () => {
    const trainer = (await generateEnvelopeKeys())!
    expect(trainer).toBeTruthy()

    const shareKey = (await newShareKey())!
    const recipient = (await importPublicKey(trainer.publicKeyB64))!
    const envelope = (await sealKey(recipient, shareKey))!
    const payload = (await sealPayload(shareKey, sharePayload(health([lab('l1', '2026-09-01T10:00:00.000Z')]), 'lab', '2026-09-02T08:00:00.000Z')))!

    const opened = (await openSealedKey(trainer.privateKey, envelope))!
    expect(opened).toBeTruthy()
    const read = readSharePayload(await openPayload(opened, payload))
    expect(read?.category).toBe('lab')
    expect(read?.takenAt).toBe('2026-09-02T08:00:00.000Z')
    expect((read?.entries[0] as StoredLabEntry).marker).toBe('ferritin')
  })

  test('ein anderer Trainer öffnet denselben Umschlag nicht', async () => {
    const trainer = (await generateEnvelopeKeys())!
    const fremd = (await generateEnvelopeKeys())!
    const shareKey = (await newShareKey())!
    const envelope = (await sealKey((await importPublicKey(trainer.publicKeyB64))!, shareKey))!

    expect(await openSealedKey(fremd.privateKey, envelope)).toBeNull()
  })

  test('eine Freigabe für Laborwerte öffnet keine Zyklusdaten', async () => {
    const trainer = (await generateEnvelopeKeys())!
    const recipient = (await importPublicKey(trainer.publicKeyB64))!

    const labKey = (await newShareKey())!
    const cycleKey = (await newShareKey())!
    const labEnvelope = (await sealKey(recipient, labKey))!
    const cyclePayload = (await sealPayload(cycleKey, sharePayload(health(), 'cycle', '2026-09-02T08:00:00.000Z')))!

    // Der Trainer hat den Laborschlüssel — und kommt damit an die
    // Zyklusabschrift nicht heran, obwohl beide ihm gehören.
    const opened = (await openSealedKey(trainer.privateKey, labEnvelope))!
    expect(await openPayload(opened, cyclePayload)).toBeNull()
  })

  test('das Chiffrat der Abschrift trägt den Wert nicht im Klartext', async () => {
    const shareKey = (await newShareKey())!
    const payload = (await sealPayload(shareKey, sharePayload(health([lab('l1', '2026-09-01T10:00:00.000Z')]), 'lab', '2026-09-02T08:00:00.000Z')))!
    for (const wort of ['ferritin', 'labor nord', '2026-09-01', 'lab']) {
      expect(payload.toLowerCase(), wort).not.toContain(wort)
    }
  })
})

test.describe('Der private Schlüssel und die Phrase', () => {
  test('eingewickelt in die Phrase, auf einem zweiten Gerät wieder da', async () => {
    const salt = newSalt()
    const geraetA = (await deriveKey(PHRASE_A, salt))!
    const paar = (await generateEnvelopeKeys())!
    const wrapped = (await wrapPrivateKey(geraetA, paar.privateKey))!
    expect(wrapped.startsWith('v1.')).toBe(true)

    // Gerät B: dieselbe Phrase, dasselbe Salz — und der Schlüssel ist zurück.
    const geraetB = (await deriveKey(PHRASE_A, salt))!
    const zurueck = await unwrapPrivateKey(geraetB, wrapped)
    expect(zurueck).toBeTruthy()

    // Und er funktioniert: ein Umschlag für sein Gegenstück geht auf.
    const shareKey = (await newShareKey())!
    const envelope = (await sealKey((await importPublicKey(paar.publicKeyB64))!, shareKey))!
    expect(await openSealedKey(zurueck!, envelope)).toBeTruthy()
  })

  test('eine andere Phrase packt nichts aus', async () => {
    const salt = newSalt()
    const meins = (await deriveKey(PHRASE_A, salt))!
    const fremd = (await deriveKey(PHRASE_B, salt))!
    const paar = (await generateEnvelopeKeys())!
    const wrapped = (await wrapPrivateKey(meins, paar.privateKey))!

    expect(await unwrapPrivateKey(fremd, wrapped)).toBeNull()
  })
})

test.describe('Die Abschrift', () => {
  test('sie enthält genau eine Kategorie', () => {
    const h = health([lab('l1', '2026-09-01T10:00:00.000Z')])
    const p = sharePayload(h, 'cycle', '2026-09-02T08:00:00.000Z')
    expect(p.category).toBe('cycle')
    expect(p.entries).toEqual([])

    const q = sharePayload(h, 'lab', '2026-09-02T08:00:00.000Z')
    expect(q.entries).toHaveLength(1)
  })

  test('was die Form nicht erfüllt, wird gar nicht angezeigt', () => {
    expect(readSharePayload(null)).toBeNull()
    expect(readSharePayload({ category: 'erfunden', takenAt: 'x', entries: [] })).toBeNull()
    expect(readSharePayload({ category: 'lab', takenAt: 'x' })).toBeNull()
    expect(readSharePayload({ category: 'lab', takenAt: '2026-09-02', entries: [] })).toEqual({ category: 'lab', takenAt: '2026-09-02', entries: [] })
  })

  test('sie altert sichtbar — aber die App frischt nichts von selbst auf', () => {
    const h = health([lab('l1', '2026-09-05T10:00:00.000Z')])
    // Die Abschrift ist älter als der jüngste Eintrag.
    expect(staleShares(h, [{ category: 'lab', takenAt: '2026-09-02T08:00:00.000Z' }])).toEqual(['lab'])
    // Und jünger: dann gibt es nichts zu sagen.
    expect(staleShares(h, [{ category: 'lab', takenAt: '2026-09-06T08:00:00.000Z' }])).toEqual([])
    // Eine Kategorie ohne Einträge veraltet nicht.
    expect(staleShares(h, [{ category: 'cycle', takenAt: '2026-09-02T08:00:00.000Z' }])).toEqual([])
  })
})

test.describe('Im Bildschirm', () => {
  test('ohne Konto gibt es keine Freigabe — und der Bildschirm behauptet nichts anderes', async ({ page }) => {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.evaluate(() => {
      localStorage.setItem('kydon.billing.mode', 'on')
      localStorage.setItem(
        'kydon.billing.v1',
        JSON.stringify({ entitlements: [{ product: 'athlete_elite', status: 'active', currentPeriodEnd: null }], coachGrant: false, checkedAt: null }),
      )
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.birthDate = '1996-01-15'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })

    // Ohne angemeldetes Konto gibt es niemanden, dem man etwas freigeben
    // könnte. Der Abschnitt erscheint dann gar nicht — statt eines
    // Knopfes, der nichts tut.
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('health-consent')).toBeVisible()
    await expect(page.getByTestId('health-share')).toHaveCount(0)
  })

  test('die Trainerseite sagt ohne Schlüssel, woran es liegt', async ({ page }) => {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.goto('/freigaben', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('shared-scope')).toContainText('keine Diagnose')
    // Und sie stuft nichts ein — dieselbe Linie wie die Athletenseite.
    const text = await page.locator('main').innerText()
    for (const wort of ['auffällig', 'Verdacht', 'Mangel', 'zu niedrig', 'zu hoch', 'erhöht', 'Therapie', 'Screening']) {
      expect(text, `«${wort}» wäre eine Einstufung`).not.toContain(wort)
    }
  })
})
