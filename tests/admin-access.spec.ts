import { expect, test, type Page } from '@playwright/test'
import { openGuest, stubAuth } from './helpers'

/**
 * Der Admin-Bereich ist für den Admin überall sichtbar.
 *
 * DER FEHLER, DEN DAS BEHEBT: der Weg ins Dashboard stand nur tief im
 * Profil und wurde nur beim Öffnen dieser Seite erfragt. Jetzt steht er als
 * Leiste über jeder Seite und wird bei jeder Anmeldung neu erfragt. Ob
 * jemand Admin ist, entscheidet weiterhin allein die Datenbank
 * (is_analytics_admin); hier wird ihre Antwort nachgestellt.
 */

async function openSignedIn(page: Page, isAdmin: boolean) {
  await stubAuth(page)
  await page.route('**/rest/v1/rpc/is_analytics_admin', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isAdmin) }),
  )
  // Eine bestehende Sitzung, wie supabase-js sie ablegt.
  await page.addInitScript(() => {
    const user = { id: '00000000-0000-4000-8000-000000000001', email: 'info@kydon.app' }
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
  })
  await openGuest(page)
}

test('der Admin sieht auf jeder Seite den Weg ins Dashboard', async ({ page }) => {
  await openSignedIn(page, true)
  const bar = page.getByTestId('admin-bar')
  await expect(bar).toBeVisible()
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('admin-link')).toBeVisible()
  await page.getByTestId('admin-bar').click()
  await page.waitForURL('**/admin/analytics')
  await expect(page.getByTestId('admin-bar')).toHaveCount(0)
})

test('alle anderen sehen nichts davon', async ({ page }) => {
  await openSignedIn(page, false)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(1000)
  await expect(page.getByTestId('admin-bar')).toHaveCount(0)
})
