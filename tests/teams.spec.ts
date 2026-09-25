import { expect, test, type Page } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Stufe, Frist und Team im Bildschirm.
 *
 * Ohne Server: Der letzte Zählstand liegt im Speicher (so wie in einer Halle
 * ohne Netz), und genau davon lebt die Oberfläche. Geprüft wird, dass der
 * Hinweis kommt, dass nach der Frist ein NEUER Athlet nicht gespeichert
 * werden kann — und dass die Teamverwaltung dem Inhaber anderes zeigt als
 * einem Trainer im Team.
 */

const DAY = 86_400_000

function status(overrides: Record<string, unknown> = {}) {
  return {
    pool_owner: 'owner-1',
    is_owner: true,
    product: 'coach_start',
    limit: 10,
    seats: 1,
    measured: 11,
    window_start: new Date(Date.now() - 100 * DAY).toISOString(),
    over_limit_since: new Date(Date.now() - 2 * DAY).toISOString(),
    auto_upgrade: false,
    interval: 'yearly',
    period_end: new Date(Date.now() + 265 * DAY).toISOString(),
    scheduled_product: null,
    has_subscription: true,
    team: null,
    ...overrides,
  }
}

async function asCoachWith(page: Page, raw: Record<string, unknown>) {
  await openGuest(page)
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()
  await page.evaluate((value) => {
    localStorage.setItem('kydon.billing.mode', 'on')
    localStorage.setItem('kydon.coachStatus.v1', JSON.stringify({ raw: value, checkedAt: new Date().toISOString() }))
  }, raw)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test.describe('Stufe überschritten', () => {
  test('in der Frist: Hinweis mit Resttagen, Messen geht weiter', async ({ page }) => {
    await asCoachWith(page, status())
    const panel = page.getByTestId('coach-plan')
    await expect(panel).toContainText('11 von 10 Athleten gemessen')
    await expect(page.getByTestId('limit-grace').first()).toContainText('noch 12 Tage')
    await expect(page.getByTestId('limit-grace').first()).toContainText('Coach Team')
  })

  test('nach der Frist: ein neuer Athlet wird nicht gespeichert', async ({ page }) => {
    await asCoachWith(page, status({ over_limit_since: new Date(Date.now() - 20 * DAY).toISOString() }))
    await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.40')
    await expect(page.getByTestId('limit-blocked').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ergebnis speichern' })).toBeDisabled()
  })

  test('ohne Abo führt der Weg zur Kasse, nicht zu einem Wechsel', async ({ page }) => {
    await asCoachWith(page, status({ product: null, limit: 3, measured: 4, has_subscription: false }))
    await expect(page.getByTestId('coach-plan')).toContainText('Coach Free')
    await expect(page.getByRole('link', { name: /Zu Coach Start wechseln/ }).first()).toBeVisible()
  })
})

test.describe('Team', () => {
  test('ohne Teamstufe: Hinweis auf Coach Team, Beitreten geht trotzdem', async ({ page }) => {
    await asCoachWith(page, status({ measured: 4, over_limit_since: null }))
    const panel = page.getByTestId('team-panel')
    await expect(panel).toContainText('Weitere Trainer gibt es ab Coach Team')
    await expect(panel.getByRole('button', { name: 'Beitreten' })).toBeDisabled()
    // Ein gültiger Code und die Entscheidung über den eigenen Bestand sind nötig.
    await panel.getByRole('textbox', { name: 'Mit Code oder Link beitreten' }).fill(`https://kydon.app/team/beitreten#${'b'.repeat(64)}`)
    await expect(panel.getByRole('button', { name: 'Beitreten' })).toBeEnabled()
  })

  test('der Inhaber sieht Plätze, Einladung und Auflösen', async ({ page }) => {
    await asCoachWith(
      page,
      status({
        product: 'coach_team',
        limit: 30,
        seats: 2,
        measured: 12,
        over_limit_since: null,
        team: { id: 't1', name: 'Halle Nord', role: 'owner', open_invites: 0, members: [{ user_id: 'owner-1', role: 'owner', name: 'Rinat', joined_at: new Date().toISOString() }] },
      }),
    )
    const panel = page.getByTestId('team-panel')
    await expect(panel).toContainText('Trainer im Team: 1 von 2 Plätzen')
    await expect(panel.getByRole('button', { name: 'Einladungslink erstellen' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Team auflösen' })).toBeVisible()
  })

  test('ein Trainer im Team sieht das Team, aber keine Verwaltung', async ({ page }) => {
    await asCoachWith(
      page,
      status({
        is_owner: false,
        product: 'coach_pro',
        limit: 75,
        seats: 3,
        measured: 20,
        over_limit_since: null,
        has_subscription: false,
        team: {
          id: 't1',
          name: 'Halle Nord',
          role: 'coach',
          open_invites: 0,
          members: [
            { user_id: 'owner-1', role: 'owner', name: 'Rinat', joined_at: new Date().toISOString() },
            { user_id: 'me', role: 'coach', name: 'Sam', joined_at: new Date().toISOString() },
          ],
        },
      }),
    )
    const panel = page.getByTestId('team-panel')
    await expect(panel).toContainText('Du bist Trainer im Team „Halle Nord“')
    await expect(panel.getByRole('button', { name: 'Einladungslink erstellen' })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Entfernen' })).toHaveCount(0)
    await expect(page.getByTestId('coach-plan')).toContainText('Die Stufe gehört dem Team')
  })
})
