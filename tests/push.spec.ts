import { expect, test, type Page } from '@playwright/test'
import { openGuest, stubAuth } from './helpers'
import {
  MAX_COACH_BODY,
  broadcastPayload,
  cleanText,
  coachPayload,
  duePayload,
} from '../supabase/functions/_shared/push'

/**
 * Push-Benachrichtigungen.
 *
 * Der teuerste Fehler wäre eine Nachricht, die mehr verrät als nötig: sie
 * läuft über den Dienst des Browserherstellers und steht auf dem
 * Sperrbildschirm. Deshalb nennt die Fälligkeitsmeldung keinen Test und
 * keinen Wert — und der Server erfährt nur ein Datum.
 */

test.describe('Push — Inhalt', () => {
  test('die Fälligkeitsmeldung nennt weder Test noch Wert, in jeder Sprache', () => {
    for (const locale of ['de', 'en', 'fr', 'es', 'nl', 'sv', 'da', 'nb', 'xx']) {
      const p = duePayload(locale)
      expect(p.title.length).toBeGreaterThan(3)
      expect(p.body).not.toMatch(/\d/)
      expect(p.body).not.toMatch(/Cooper|Squat|Beep|kg|VO2/i)
      expect(p.url).toBe('/verlauf/erinnerungen')
    }
  })

  test('Freitext wird gesäubert und begrenzt', () => {
    expect(cleanText('  Testtag\n\nSamstag  ', 100)).toBe('Testtag Samstag')
    expect(cleanText('', 100)).toBeNull()
    expect(cleanText('x'.repeat(MAX_COACH_BODY + 1), MAX_COACH_BODY)).toBeNull()
    expect(cleanText(42, 100)).toBeNull()
    expect(coachPayload('fr', 'Salut').title).toBe('Message de ton entraîneur')
    expect(broadcastPayload('Neu', 'Text').tag).toBe('kydon-news')
  })
})

const SESSION_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'coach@example.org' }

async function signedIn(page: Page, rpc: Record<string, unknown>, onPush?: (body: unknown) => void) {
  await stubAuth(page)
  for (const [name, value] of Object.entries(rpc)) {
    await page.route(`**/rest/v1/rpc/${name}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) }),
    )
  }
  await page.route('**/functions/v1/push', async (route) => {
    onPush?.(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, sent: 2, recipients: 1 }),
    })
  })
  await page.addInitScript((user) => {
    localStorage.setItem(
      'kydon.auth',
      JSON.stringify({
        access_token: 'stub',
        refresh_token: 'stub',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      }),
    )
  }, SESSION_USER)
  await openGuest(page)
}

test.describe('Push — Oberfläche', () => {
  test('ohne Konto sagt die Einstellung, was fehlt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/verlauf/erinnerungen', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('push-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/brauchst du ein Konto|unterstützt keine|installierten App/)).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Push einschalten' })).toHaveCount(0)
  })

  test('ein Trainer schreibt seinen verbundenen Athleten', async ({ page }) => {
    let sent: { action?: string; athleteIds?: string[]; body?: string } | null = null
    await signedIn(
      page,
      {
        push_my_athletes: [
          { athlete_id: 'a-1', display_name: 'Mia Muster', has_push: true },
          { athlete_id: 'a-2', display_name: 'Tom Test', has_push: false },
        ],
        is_analytics_admin: false,
      },
      (body) => (sent = body as typeof sent),
    )
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('coach-push')
    await expect(panel).toBeVisible()
    // Vorausgewählt ist, wer Push eingeschaltet hat.
    await expect(panel.getByRole('checkbox', { name: /Mia Muster/ })).toBeChecked()
    await expect(panel.getByRole('checkbox', { name: /Tom Test/ })).not.toBeChecked()
    await panel.getByLabel('Nachricht').fill('Testtag am Samstag, 9 Uhr')
    await panel.getByRole('button', { name: 'Senden' }).click()
    await expect(panel.getByText('An 1 Athlet verschickt.')).toBeVisible()
    expect(sent).toEqual({ action: 'coach', athleteIds: ['a-1'], body: 'Testtag am Samstag, 9 Uhr' })
  })

  test('ohne verbundene Athleten erscheint die Trainer-Nachricht nicht', async ({ page }) => {
    await signedIn(page, { push_my_athletes: [], is_analytics_admin: false })
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('coach-push')).toHaveCount(0)
  })

  test('der Admin schickt eine Rundnachricht erst nach Bestätigung', async ({ page }) => {
    let sent: unknown = null
    await signedIn(
      page,
      {
        is_analytics_admin: true,
        push_my_athletes: [],
        analytics_summary: { total_events: 0, unique_people: 0, signed_in_people: 0, sessions: 0 },
        analytics_top_events: [],
        analytics_pages: [],
        analytics_retention: null,
        analytics_event_names: [],
        analytics_event_log: [],
        analytics_funnel: [],
      },
      (body) => (sent = body),
    )
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('admin-broadcast')
    await expect(panel).toBeVisible()
    await panel.getByLabel('Titel').fill('Neu in KYDON')
    await panel.getByLabel('Nachricht').fill('Testprotokoll v1.0 ist da.')
    await panel.getByRole('button', { name: 'Senden', exact: true }).click()
    expect(sent).toBeNull()
    await panel.getByRole('button', { name: 'Ja, senden' }).click()
    await expect(panel.getByText('Verschickt an 2 Gerät(e).')).toBeVisible()
    expect(sent).toEqual({ action: 'broadcast', title: 'Neu in KYDON', body: 'Testprotokoll v1.0 ist da.' })
  })
})
