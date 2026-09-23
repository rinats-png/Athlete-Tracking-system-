import { expect, test, type Page } from '@playwright/test'
import { normalizePath, isUntrackedPath } from '../src/lib/analytics'
import { funnelView } from '../src/lib/supabase/analyticsAdmin'
import { openGuest } from './helpers'

/**
 * Nutzungsstatistik im Browser.
 *
 * Die eine Zusage, an der alles hängt: OHNE JA GEHT NICHTS RAUS. Geprüft wird
 * das, indem `sendBeacon` und `fetch` zum Empfang abgefangen und mitgezählt
 * werden — ein Fall, der nur die Oberfläche ansieht, würde ein heimliches
 * Ereignis nicht bemerken.
 */

const CONSENT = 'kydon.analytics.consent.v1'
const SESSION = 'kydon.analytics.session.v1'

/** Fängt alles ab, was an /functions/v1/track ginge, und legt es in window.__sent. */
async function recordBeacons(page: Page) {
  await page.addInitScript(() => {
    const sent: string[] = []
    ;(window as unknown as { __sent: string[] }).__sent = sent
    const originalBeacon = navigator.sendBeacon?.bind(navigator)
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      if (String(url).includes('/functions/v1/track')) {
        if (data instanceof Blob) void data.text().then((t) => sent.push(t))
        else sent.push(String(data))
        return true
      }
      return originalBeacon ? originalBeacon(url, data) : false
    }
  })
  await page.route('**/functions/v1/track', (route) => route.fulfill({ status: 200, body: '{"ok":true}' }))
}

const sent = (page: Page) => page.evaluate(() => (window as unknown as { __sent: string[] }).__sent.map((t) => JSON.parse(t) as Record<string, unknown>))

async function setConsent(page: Page, state: 'granted' | 'denied' | null) {
  await page.evaluate(
    ({ key, state }) => {
      if (state == null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify({ state, at: '2026-09-23T00:00:00.000Z' }))
    },
    { key: CONSENT, state },
  )
}

test.describe('Ohne Ja geht nichts raus', () => {
  test('abgelehnt: kein Ereignis, keine Sitzungskennung', async ({ page }) => {
    await recordBeacons(page)
    await openGuest(page)
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)
    expect(await sent(page)).toEqual([])
    expect(await page.evaluate((k) => localStorage.getItem(k), SESSION)).toBeNull()
  })

  test('unbeantwortet: die Frage steht da — und trotzdem geht nichts raus', async ({ page }) => {
    await recordBeacons(page)
    await openGuest(page)
    await setConsent(page, null)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('analytics-consent')).toBeVisible()
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)
    expect(await sent(page)).toEqual([])
    expect(await page.evaluate((k) => localStorage.getItem(k), SESSION)).toBeNull()
  })
})

test.describe('Mit Ja', () => {
  test('«Ja» speichert die Einwilligung, die Frage verschwindet, die Zählung beginnt', async ({ page }) => {
    await recordBeacons(page)
    await openGuest(page)
    await setConsent(page, null)
    await page.reload({ waitUntil: 'domcontentloaded' })

    const strip = page.getByTestId('analytics-consent')
    // «Ja» und «Nein» gleich gross — eine Einwilligung durch Gestaltung ist keine.
    const yes = strip.getByRole('button', { name: 'Ja, gerne' })
    const no = strip.getByRole('button', { name: 'Nein, danke' })
    const [a, b] = [await yes.boundingBox(), await no.boundingBox()]
    expect(Math.abs((a?.height ?? 0) - (b?.height ?? 0))).toBeLessThan(2)

    await yes.click()
    await expect(strip).toHaveCount(0)
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect.poll(async () => (await sent(page)).map((e) => e.event_name)).toContain('page_view')

    const events = await sent(page)
    const view = events.find((e) => e.event_name === 'page_view')!
    expect((view.properties as { path: string }).path).toBe('/verlauf')
    expect(view.session_id).toMatch(/^[0-9a-f-]{36}$/)
    // Die Kontokennung schickt der Browser nie selbst.
    for (const e of events) expect(e).not.toHaveProperty('user_id')
  })

  test('auf der Gesundheitsschicht wird nicht gezählt — auch nicht der Aufruf', async ({ page }) => {
    await recordBeacons(page)
    await openGuest(page)
    await setConsent(page, 'granted')
    await page.goto('/gesundheit', { waitUntil: 'domcontentloaded' })
    await page.goto('/peakweek', { waitUntil: 'domcontentloaded' })
    await page.goto('/freigaben', { waitUntil: 'domcontentloaded' })
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect.poll(async () => (await sent(page)).length).toBeGreaterThan(0)
    const paths = (await sent(page)).map((e) => JSON.stringify(e))
    for (const p of paths) {
      expect(p).not.toContain('/gesundheit')
      expect(p).not.toContain('/peakweek')
      expect(p).not.toContain('/freigaben')
    }
  })

  test('«Nein» im Profil löscht die Sitzungskennung sofort', async ({ page }) => {
    await recordBeacons(page)
    await openGuest(page)
    await setConsent(page, 'granted')
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), SESSION)).not.toBeNull()

    await page.getByTestId('analytics-setting').getByRole('button', { name: 'Nein, danke' }).click()
    expect(await page.evaluate((k) => localStorage.getItem(k), SESSION)).toBeNull()
    await expect(page.getByTestId('analytics-setting')).toContainText('Ausgeschaltet')
  })
})

test.describe('Das Dashboard', () => {
  test('ohne Anmeldung als Admin geht es zurück zur Startseite', async ({ page }) => {
    await openGuest(page)
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('analytics-dashboard')).toHaveCount(0)
  })
})

test.describe('Reine Rechnungen', () => {
  test('Kennungen verschwinden aus dem Pfad', () => {
    expect(normalizePath('/ergebnis/3f2a9c1e-7b4d-4e8a-9f21-0c5d6e7f8a9b')).toBe('/ergebnis/:id')
    expect(normalizePath('/trainer/testtag/k8m2x9q4r7w1z5n3')).toBe('/trainer/testtag/:id')
    expect(normalizePath('/tests/cooper_12min?x=1#a')).toBe('/tests/cooper_12min')
    expect(normalizePath('/verlauf')).toBe('/verlauf')
  })

  test('gesperrte Pfade, auch mit Unterseite — ähnliche Namen nicht', () => {
    expect(isUntrackedPath('/gesundheit')).toBe(true)
    expect(isUntrackedPath('/peakweek/x')).toBe(true)
    expect(isUntrackedPath('/freigaben?a=1')).toBe(true)
    expect(isUntrackedPath('/gesundheitstipps')).toBe(false)
  })

  test('Funnel: Anteil am Start und Abfall zum vorigen Schritt', () => {
    const view = funnelView([
      { step: 1, event_name: 'a', people: 200 },
      { step: 2, event_name: 'b', people: 100 },
      { step: 3, event_name: 'c', people: 25 },
    ])
    expect(view.map((v) => v.ofStart)).toEqual([1, 0.5, 0.125])
    expect(view.map((v) => v.fromPrevious)).toEqual([null, 0.5, 0.25])
    // Ein leerer Start teilt nicht durch null.
    expect(funnelView([{ step: 1, event_name: 'a', people: 0 }, { step: 2, event_name: 'b', people: 0 }])[1].ofStart).toBe(0)
  })
})
