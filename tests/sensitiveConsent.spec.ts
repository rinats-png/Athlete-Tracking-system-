import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { emptyData } from '../src/lib/store/schema'
import { SENSITIVE_OBSERVATION_KEYS, athleteWithoutSensitive, diaryWithoutSensitive } from '../src/domain/sensitiveData'
import { OBSERVATIONS } from '../src/data/observations'
import { privacyDocument, dpaDocument } from '../src/features/legal/texts'
import { openColdStart, openGuest, stubAuth } from './helpers'

/**
 * Gesundheitsnahe Angaben im Abgleich nur mit ausdrücklicher Einwilligung
 * (Art. 9 Abs. 2 lit. a DSGVO, docs/datenschutz-art9-abgleich.md).
 *
 * Was hier feststeht:
 *   - Die Liste der Felder ist fest; ein neues Feld muss bewusst dazu.
 *   - Ohne Einwilligung auf dem Server gehen genau diese Felder nicht mit —
 *     alles andere schon.
 *   - Mit Einwilligung gehen sie mit.
 *   - Die Registrierung fragt freiwillig, nichts ist vorausgewählt, und ohne
 *     Altersbestätigung gilt der Haken nicht.
 *   - Eine Wahl aus der Registrierung landet beim ersten Abgleich auf dem
 *     Server — nur für das Konto, für das sie getroffen wurde.
 */

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'pruef@baseline.test' }
const DAY = '2026-10-12'

function athleteWithEverything() {
  const data = emptyData()
  const a = data.athletes[0]
  a.name = 'Lena'
  a.profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
  a.profile.restingHr = 52
  a.biometrics = [{ id: 'b1', measuredOn: DAY, bodyWeightKg: 64, bodyFatPercent: 18, restingHr: 50, createdAt: `${DAY}T07:00:00.000Z` }]
  a.observations = [
    { id: 'o1', key: 'hrv_rmssd_ms', observedAt: `${DAY}T07:00:00.000Z`, value: 61, device: '', note: '', createdAt: `${DAY}T07:00:00.000Z` },
    { id: 'o2', key: 'y_balance_composite', observedAt: `${DAY}T07:00:00.000Z`, value: 98, device: '', note: '', createdAt: `${DAY}T07:00:00.000Z` },
  ]
  a.diary = [
    {
      id: 'd1',
      day: DAY,
      weightKg: 64,
      sleepHours: 7.5,
      sleepQuality: 4,
      energy: 4,
      stress: 2,
      soreness: 3,
      steps: 9000,
      adherence: 4,
      sessions: [{ id: 's1', kind: 'endurance', durationMin: 45, rpe: 6, note: '', giScore: 1, energyFeel: 4 }],
      note: '',
      createdAt: `${DAY}T20:00:00.000Z`,
      updatedAt: `${DAY}T20:00:00.000Z`,
    },
  ]
  return data
}

test.describe('Die Liste', () => {
  test('ist fest, und jede Kennung gibt es im Katalog', () => {
    expect([...SENSITIVE_OBSERVATION_KEYS].sort()).toEqual(
      ['bia_fat_mass_percent', 'ck_u_l', 'doms', 'dxa_fat_mass_percent', 'fat_mass_percent', 'hrv_rmssd_ms', 'lean_mass_kg', 'resting_hr_bpm', 'rmr_kcal_day', 'sleep_h'].sort(),
    )
    const known = new Set(OBSERVATIONS.map((o) => o.key))
    for (const key of SENSITIVE_OBSERVATION_KEYS) expect(known.has(key), key).toBe(true)
  })

  test('der Filter nimmt genau die gesundheitsnahen Felder heraus', () => {
    const a = athleteWithEverything().athletes[0]
    const out = athleteWithoutSensitive(a)
    expect(out.profile.restingHr).toBeNull()
    expect(out.biometrics[0]).toMatchObject({ bodyWeightKg: 64, bodyFatPercent: null, restingHr: null })
    expect(out.observations.map((o) => o.key)).toEqual(['y_balance_composite'])
    expect(out.diary[0]).toMatchObject({ weightKg: 64, steps: 9000, adherence: 4, sleepHours: null, sleepQuality: null, energy: null, stress: null, soreness: null })
    expect(out.diary[0].sessions[0]).toMatchObject({ durationMin: 45, rpe: 6, giScore: null, energyFeel: null })
    // Das Original bleibt unberührt — auf dem Gerät geht nichts verloren.
    expect(a.diary[0].sleepHours).toBe(7.5)
    expect(diaryWithoutSensitive(a.diary[0]).updatedAt).toBe(a.diary[0].updatedAt)
  })
})

/** Ein Server, der zuhört; `consent` ist die Zeile in sensitive_consents. */
async function fakeServer(page: Page, consent: { version: string; kind: string; withdrawn_at: string | null } | null) {
  const writes: { table: string; method: string; body: unknown }[] = []
  await page.route('**/*.supabase.co/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const single = (req.headers()['accept'] ?? '').includes('pgrst.object')
    const table = url.match(/\/rest\/v1\/([a-z_]+)/)?.[1] ?? ''
    if (table && req.method() !== 'GET') writes.push({ table, method: req.method(), body: req.postDataJSON() })

    if (url.includes('/auth/v1/user')) return json(200, USER)
    if (url.includes('/rest/v1/rpc/my_pool_owner')) return json(200, USER.id)
    if (table === 'sensitive_consents') {
      if (req.method() === 'GET') return single ? (consent ? json(200, consent) : json(406, { code: 'PGRST116' })) : json(200, consent ? [consent] : [])
      return json(201, [])
    }
    if (table === 'athlete_documents') {
      if (req.method() === 'GET') return json(200, [])
      const row = { updated_at: '2026-10-13T10:00:00.000Z' }
      return json(201, single ? row : [row])
    }
    if (table === 'athlete_series') return json(req.method() === 'GET' ? 200 : 201, [])
    if (url.includes('/rest/v1/')) return json(200, [])
    return route.abort()
  })
  return writes
}

async function seed(page: Page, extra: Record<string, string> = {}) {
  await openGuest(page)
  await page.evaluate(
    ({ store, extra }) => {
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
      localStorage.removeItem('kydon.sync.enabled')
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
    },
    { store: athleteWithEverything(), extra },
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
}

const docOf = (writes: { table: string; body: unknown }[]) =>
  writes.filter((w) => w.table === 'athlete_documents').map((w) => w.body as { document: Record<string, any> })[0]?.document
const diaryOf = (writes: { table: string; body: unknown }[]) =>
  writes
    .filter((w) => w.table === 'athlete_series')
    .flatMap((w) => (Array.isArray(w.body) ? w.body : [w.body]) as { kind: string; payload: Record<string, any> }[])
    .find((r) => r.kind === 'diary')?.payload

test.describe('Im Abgleich', () => {
  test('ohne Einwilligung bleiben die gesundheitsnahen Felder auf dem Gerät', async ({ page }) => {
    const writes = await fakeServer(page, null)
    await seed(page)
    await expect.poll(() => (docOf(writes) ? 1 : 0), { timeout: 15_000 }).toBe(1)
    await expect.poll(() => (diaryOf(writes) ? 1 : 0), { timeout: 15_000 }).toBe(1)
    const doc = docOf(writes)!
    expect(doc.biometrics[0]).toMatchObject({ bodyWeightKg: 64, bodyFatPercent: null, restingHr: null })
    expect(doc.observations.map((o: { key: string }) => o.key)).toEqual(['y_balance_composite'])
    expect(diaryOf(writes)).toMatchObject({ weightKg: 64, sleepHours: null, stress: null, soreness: null })
    // Und auf dem Gerät steht alles noch.
    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].diary[0].sleepHours)
    expect(local).toBe(7.5)
  })

  test('mit Einwilligung gehen sie mit', async ({ page }) => {
    const writes = await fakeServer(page, { version: '2026-10-13', kind: 'self', withdrawn_at: null })
    await seed(page)
    await expect.poll(() => (diaryOf(writes) ? 1 : 0), { timeout: 15_000 }).toBe(1)
    expect(docOf(writes)!.biometrics[0]).toMatchObject({ bodyFatPercent: 18, restingHr: 50 })
    expect(diaryOf(writes)).toMatchObject({ sleepHours: 7.5, stress: 2 })
  })

  test('eine Wahl aus der Registrierung geht beim ersten Abgleich auf den Server — nur für ihr Konto', async ({ page }) => {
    const pending = (email: string) =>
      JSON.stringify({ state: 'granted', kind: 'self', pending: true, ageConfirmed: true, email, at: '2026-10-13T09:00:00.000Z', version: '2026-10-13' })
    const writes = await fakeServer(page, null)
    await seed(page, { 'kydon.sensitive.consent.v1': pending('pruef@baseline.test') })
    await expect.poll(() => writes.filter((w) => w.table === 'sensitive_consents').length, { timeout: 15_000 }).toBeGreaterThan(0)
    expect(writes.find((w) => w.table === 'sensitive_consents')!.body).toMatchObject({ user_id: USER.id, version: '2026-10-13', kind: 'self', withdrawn_at: null, age_confirmed: true })
  })

  test('eine Wahl für eine andere E-Mail gilt nicht', async ({ page }) => {
    const writes = await fakeServer(page, null)
    await seed(page, {
      'kydon.sensitive.consent.v1': JSON.stringify({ state: 'granted', kind: 'self', pending: true, ageConfirmed: true, email: 'jemand@anders.de', at: '2026-10-13T09:00:00.000Z', version: '2026-10-13' }),
    })
    await expect.poll(() => (diaryOf(writes) ? 1 : 0), { timeout: 15_000 }).toBe(1)
    expect(writes.filter((w) => w.table === 'sensitive_consents')).toEqual([])
    expect(diaryOf(writes)).toMatchObject({ sleepHours: null })
  })
})

test.describe('Bei der Registrierung', () => {
  test('freiwillig, nichts vorausgewählt, ohne Altersbestätigung kein Absenden mit Haken', async ({ page }) => {
    await stubAuth(page)
    await openColdStart(page)
    await expect(page.locator('[data-state="formed"]')).toBeAttached({ timeout: 10_000 })
    await page.getByRole('tab', { name: 'Konto anlegen' }).click()
    await page.getByRole('button', { name: /Für mich selbst/ }).click()
    await page.getByRole('button', { name: 'Später entscheiden' }).click()

    const field = page.getByTestId('sensitive-consent-field')
    await expect(field).toBeVisible()
    await expect(field.getByTestId('sensitive-categories').locator('li')).toHaveCount(4)
    await expect(field).toContainText('Ohne Einwilligung bleiben genau diese Angaben auf diesem Gerät')
    await expect(page.getByTestId('sensitive-consent-grant')).not.toBeChecked()

    await page.getByLabel('Name').fill('Lena')
    await page.getByLabel('E-Mail').fill('Lena@Example.org')
    await page.getByLabel('Passwort').fill('einLangesPasswort')
    await page.getByTestId('sensitive-consent-grant').check()
    await expect(page.getByRole('button', { name: 'Konto anlegen', exact: true }).last()).toBeDisabled()
    await page.getByTestId('sensitive-consent-age').check()
    await page.getByRole('button', { name: 'Konto anlegen', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Bestätige deine E-Mail' })).toBeVisible()

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.sensitive.consent.v1') as string))
    expect(stored).toMatchObject({ state: 'granted', pending: true, ageConfirmed: true, email: 'lena@example.org', kind: 'self', version: '2026-10-13' })
  })

  test('ohne Haken entsteht das Konto trotzdem, und es gibt keine Einwilligung', async ({ page }) => {
    await stubAuth(page)
    await openColdStart(page)
    await expect(page.locator('[data-state="formed"]')).toBeAttached({ timeout: 10_000 })
    await page.getByRole('tab', { name: 'Konto anlegen' }).click()
    await page.getByRole('button', { name: /Ich betreue andere/ }).click()
    await page.getByRole('button', { name: 'Später entscheiden' }).click()
    // Ein Trainer bestätigt, statt für andere einzuwilligen.
    await expect(page.getByTestId('sensitive-consent-field')).toContainText('Ich bestätige, dass mir die ausdrückliche Einwilligung der Athleten vorliegt')
    await page.getByLabel('Name').fill('Sam')
    await page.getByLabel('E-Mail').fill('sam@example.org')
    await page.getByLabel('Passwort').fill('einLangesPasswort')
    await page.getByRole('button', { name: 'Konto anlegen', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Bestätige deine E-Mail' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kydon.sensitive.consent.v1'))).toBeNull()
  })
})

test.describe('Im Profil', () => {
  test('einwilligen und widerrufen, beides geht zum Server', async ({ page }) => {
    const writes = await fakeServer(page, null)
    await seed(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const setting = page.getByTestId('sensitive-setting')
    await expect(setting.getByTestId('sensitive-setting-state')).toHaveAttribute('data-state', 'unset')

    await setting.getByTestId('sensitive-ask').click()
    await expect(setting.getByTestId('sensitive-grant')).toBeDisabled()
    await setting.getByTestId('sensitive-setting-age').check()
    await setting.getByTestId('sensitive-grant').click()
    await expect.poll(() => writes.filter((w) => w.table === 'sensitive_consents' && w.method === 'POST').length).toBeGreaterThan(0)

    // Der Server (fake) kennt die Einwilligung nicht — der Abgleich danach
    // setzt den Stand zurück. Für den Widerruf zählt hier nur der Weg.
    await page.evaluate(() =>
      localStorage.setItem('kydon.sensitive.consent.v1', JSON.stringify({ state: 'granted', kind: 'self', pending: false, ageConfirmed: true, email: null, at: null, version: '2026-10-13' })),
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByTestId('sensitive-withdraw').click()
    await expect.poll(() => writes.filter((w) => w.table === 'sensitive_consents' && w.method === 'PATCH').length).toBeGreaterThan(0)
    expect(writes.find((w) => w.table === 'sensitive_consents' && w.method === 'PATCH')!.body).toHaveProperty('withdrawn_at')
  })
})

test.describe('Recht und Nachweis', () => {
  test('die Datenschutzerklärung nennt Felder, Einwilligung, Widerruf und Nachweis', () => {
    const de = privacyDocument('de').sections.flatMap((s) => s.body).join(' ')
    expect(de).toContain('In den Abgleich gehen sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO)')
    expect(de).toContain('Ohne Einwilligung bleiben genau diese Angaben auf deinem Gerät')
    expect(de).toContain('der nächste Abgleich entfernt sie vom Server')
    const en = privacyDocument('en').sections.flatMap((s) => s.body).join(' ')
    expect(en).toContain('They are synced only with your explicit consent (Art. 9(2)(a) GDPR)')
    expect(dpaDocument('de').sections.flatMap((s) => s.body).join(' ')).toContain('ohne Bestätigung bleiben sie auf seinem Gerät')
  })

  test('die Migration hat Zeilenschutz und kein Löschen für Clients', () => {
    const sql = readFileSync('supabase/migrations/20261013100000_sensitive_consents.sql', 'utf8')
    expect(sql).toContain('alter table public.sensitive_consents enable row level security')
    expect(sql).toContain('on delete cascade')
    expect(sql).not.toMatch(/for delete/)
    expect(sql).toContain('revoke all on public.sensitive_consents from anon')
  })
})
