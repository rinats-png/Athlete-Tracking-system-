import { expect, test } from '@playwright/test'
import { DPA_VERSION, dpaDocument } from '../src/features/legal/texts'
import { openGuest } from './helpers'

/**
 * Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) für Trainerkonten.
 *
 * Geprüft wird, dass der Text die Pflichtinhalte von Art. 28 Abs. 3 trägt,
 * dass ein Trainer den Hinweis sieht, solange er nicht angenommen hat, und
 * dass ein Athlet ihn nie sieht.
 */

test.describe('Der Vertrag', () => {
  test('trägt die Pflichtinhalte nach Art. 28 Abs. 3 in beiden Sprachen', () => {
    for (const locale of ['de', 'en'] as const) {
      const doc = dpaDocument(locale)
      const text = doc.sections.map((s) => [s.heading, ...s.body, ...(s.list ?? [])].join(' ')).join(' ')
      const needles =
        locale === 'de'
          ? ['Gegenstand und Dauer', 'Weisung', 'Vertraulichkeit', 'Art. 32', 'Unterauftragsverarbeiter', 'Rechten der betroffenen', 'Verletzung', 'Löschung', 'Nachweise', 'Drittländer']
          : ['Subject matter and duration', 'nstruction', 'Confidentiality', 'Art. 32', 'Sub-processors', 'data subject rights', 'breach', 'Deletion', 'Evidence', 'third countries']
      for (const n of needles) expect(text, `${locale}: ${n}`).toContain(n)
      expect(doc.updated).toContain(DPA_VERSION)
    }
  })

  test('nennt jeden Unterauftragsverarbeiter aus der Empfängerliste', () => {
    const text = dpaDocument('de').sections.flatMap((s) => s.list ?? []).join(' ')
    for (const name of ['Supabase', 'Netlify', 'Stripe']) expect(text).toContain(name)
  })
})

test.describe('Im Bildschirm', () => {
  test('ein Trainer sieht den Hinweis, bis er angenommen hat; die Seite zeigt Fassung und Knopf', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('kydon.account.v1')!)
      localStorage.setItem('kydon.account.v1', JSON.stringify({ ...a, role: 'coach' }))
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.role = 'coach'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-notice')).toBeVisible()
    await page.getByRole('link', { name: 'Vertrag lesen und annehmen' }).click()
    await expect(page).toHaveURL(/\/auftragsverarbeitung/)
    await expect(page.getByRole('heading', { name: 'Vertrag zur Auftragsverarbeitung' })).toBeVisible()
    await expect(page.getByTestId('dpa-acceptance')).toContainText(`Fassung ${DPA_VERSION}`)
    await expect(page.getByRole('button', { name: 'Vertrag annehmen' })).toBeVisible()
    // Ohne Server kann nichts hinterlegt werden — und die Seite sagt das, statt so zu tun.
    await page.getByRole('button', { name: 'Vertrag annehmen' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('mit hinterlegter Annahme steht kein Hinweis mehr; eine alte Fassung fordert eine neue', async ({ page }) => {
    await openGuest(page)
    await page.evaluate((v) => {
      const a = JSON.parse(localStorage.getItem('kydon.account.v1')!)
      localStorage.setItem('kydon.account.v1', JSON.stringify({ ...a, role: 'coach', dpaAcceptedAt: '2026-09-21T10:00:00.000Z', dpaVersion: v }))
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.role = 'coach'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    }, DPA_VERSION)
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-notice')).toHaveCount(0)
    await page.goto('/auftragsverarbeitung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-acceptance')).toContainText('Angenommen am')

    await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('kydon.account.v1')!)
      localStorage.setItem('kydon.account.v1', JSON.stringify({ ...a, dpaVersion: '2026-01-01' }))
    })
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-notice')).toContainText('neue Fassung')
  })

  test('ein Athlet sieht keinen Hinweis und keinen Knopf', async ({ page }) => {
    await openGuest(page)
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-notice')).toHaveCount(0)
    await page.goto('/auftragsverarbeitung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dpa-acceptance')).toContainText('betrifft Trainerkonten')
    await expect(page.getByRole('button', { name: 'Vertrag annehmen' })).toHaveCount(0)
  })
})
