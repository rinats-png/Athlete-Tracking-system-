import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openGuest } from './helpers'

/**
 * Konto Pflicht, Abgleich automatisch.
 *
 * Was hier feststeht:
 *   - Mit Konto gleicht die App von selbst ab — niemand muss etwas antippen.
 *   - Ausschalten geht, aber erst nach einem Fenster mit den Folgen; wer
 *     dort «anlassen» wählt, hat nichts verändert.
 *   - Ausgeschaltet geht nichts mehr an den Server.
 *   - Ein fremder Bestand auf dem Gerät wandert nie in ein anderes Konto.
 *   - Eine abgelaufene Anmeldung wird gesagt, nicht verschwiegen.
 */

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'pruef@baseline.test' }

/** Ein Server, der zuhört und alles aufschreibt. */
async function fakeServer(page: Page, options: { user?: boolean } = {}) {
  const calls: { method: string; url: string }[] = []
  await page.route('**/*.supabase.co/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes('/rest/')) calls.push({ method: req.method(), url })

    if (url.includes('/auth/v1/user')) return options.user === false ? json(401, { message: 'unauthorized' }) : json(200, USER)
    if (url.includes('/auth/v1/logout')) return json(204, {})
    if (url.includes('/rest/v1/rpc/my_pool_owner')) return json(200, USER.id)
    if (url.includes('/rest/v1/athlete_documents')) {
      if (req.method() === 'GET') return json(200, [])
      const single = (req.headers()['accept'] ?? '').includes('pgrst.object')
      const row = { updated_at: '2026-10-13T10:00:00.000Z' }
      return json(201, single ? row : [row])
    }
    if (url.includes('/rest/v1/athlete_series')) return json(req.method() === 'GET' ? 200 : 201, [])
    // Alles andere (Stufen, Push, Pläne): leer, nicht abgewiesen.
    if (url.includes('/rest/v1/')) return json(200, [])
    return route.abort()
  })
  return calls
}

/** Ein Ergebnis eintragen, damit es etwas abzugleichen gibt. */
async function measure(page: Page) {
  await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/^Distanz/).fill('3200')
  await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
  await page.waitForURL('**/ergebnis/**')
}

/** Abgleich wie bei einem echten Menschen: an (der Prüflauf schaltet ihn sonst aus). */
async function syncDefault(page: Page) {
  await page.evaluate(() => localStorage.removeItem('kydon.sync.enabled'))
}

const pushes = (calls: { method: string; url: string }[]) =>
  calls.filter((c) => c.url.includes('athlete_documents') && c.method === 'POST')

test.describe('Mit Konto gleicht die App von selbst ab', () => {
  test('ein Ergebnis geht ohne einen Tipp auf «Abgleichen» in das Konto', async ({ page }) => {
    const calls = await fakeServer(page)
    await openGuest(page)
    await syncDefault(page)
    await measure(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => pushes(calls).length, { timeout: 15_000 }).toBeGreaterThan(0)
    // Und das Gerät merkt sich, wem der Bestand gehört.
    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.user'))).toBe(USER.id)
  })

  test('ausgeschaltet geht nichts an den Server', async ({ page }) => {
    const calls = await fakeServer(page)
    await openGuest(page)
    await measure(page)
    // Der Prüflauf startet mit «off» — genau der Zustand nach dem Ausschalten.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    expect(calls.filter((c) => c.url.includes('athlete_')), 'kein Abgleich, wenn ausgeschaltet').toEqual([])
  })
})

test.describe('Ausschalten nur mit Blick auf die Folgen', () => {
  test('das Fenster nennt, was dann nicht mehr geht — «anlassen» ändert nichts', async ({ page }) => {
    await fakeServer(page)
    await openGuest(page)
    await syncDefault(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Abgleich ausschalten' }).click()
    const dialog = page.getByTestId('sync-off-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Was dann nicht mehr geht' })).toBeVisible()
    await expect(dialog.getByTestId('sync-off-backup')).toContainText('Keine Sicherung mehr')
    await expect(dialog.getByTestId('sync-off-devices')).toContainText('anderen Geräte')
    await expect(dialog.getByTestId('sync-off-coach')).toContainText('Trainer sieht nur noch')
    await expect(dialog.getByTestId('sync-off-plans')).toContainText('Pläne und Anpassungen')
    await expect(dialog.getByTestId('sync-off-server')).toContainText('nicht gelöscht')

    await dialog.getByRole('button', { name: 'Abgleich anlassen' }).click()
    await expect(dialog).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.enabled'))).not.toBe('off')
    await expect(page.getByRole('button', { name: 'Abgleich ausschalten' })).toBeVisible()
  })

  test('«trotzdem ausschalten» hält an und sagt, seit wann', async ({ page }) => {
    await fakeServer(page)
    await openGuest(page)
    await syncDefault(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Abgleich ausschalten' }).click()
    await page.getByTestId('sync-off-confirm').click()

    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.enabled'))).toBe('off')
    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.pausedAt'))).not.toBeNull()
    await expect(page.getByTestId('sync-paused')).toContainText('ausgeschaltet')

    await page.getByRole('button', { name: 'Abgleich wieder einschalten' }).click()
    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.enabled'))).toBe('on')
    expect(await page.evaluate(() => localStorage.getItem('kydon.sync.pausedAt'))).toBeNull()
  })
})

test.describe('Was der Abgleich nicht allein lösen kann, wird gesagt', () => {
  test('ein fremder Bestand wandert nie in ein anderes Konto', async ({ page }) => {
    const calls = await fakeServer(page)
    await openGuest(page)
    await measure(page)
    await page.evaluate(() => {
      localStorage.removeItem('kydon.sync.enabled')
      localStorage.setItem('kydon.sync.user', '00000000-0000-4000-8000-0000000000ff')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('sync-attention')).toHaveAttribute('data-kind', 'otherAccount', { timeout: 10_000 })
    expect(pushes(calls), 'nichts geschrieben').toEqual([])
  })

  test('eine abgelaufene Anmeldung bittet um eine neue', async ({ page }) => {
    await fakeServer(page, { user: false })
    await openGuest(page)
    await syncDefault(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    const notice = page.getByTestId('sync-attention')
    await expect(notice).toHaveAttribute('data-kind', 'signedOut', { timeout: 10_000 })
    await expect(notice.getByRole('button', { name: 'Neu anmelden' })).toBeVisible()
  })
})

test.describe('Konto Pflicht', () => {
  test('ein Gerätekonto ohne Anmeldung kommt nicht herein', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => localStorage.removeItem('kydon.auth'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('tab', { name: 'Anmelden' })).toBeVisible({ timeout: 10_000 })
    // Der Bestand bleibt dabei liegen — er gehört dem Menschen, nicht der Anmeldung.
    expect(await page.evaluate(() => localStorage.getItem('kydon.data.v1'))).not.toBeNull()
  })

  test('es gibt keinen Weg mehr an der Anmeldung vorbei', () => {
    const code = readFileSync('src/features/auth/AuthScreen.tsx', 'utf8')
    // Ohne Dienst kein Konto nur auf dem Gerät, sondern eine Meldung.
    expect(code).not.toMatch(/if \(!isSupabaseConfigured\(\)\) \{\s*onDone\(/)
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain('if (!account || !hasStoredSession())')
  })
})
