import { expect, test } from '@playwright/test'
import { OFF_NOTICE, OFF_RATE, rateDelay } from '../src/lib/openFoodFacts'
import { exportNotices } from '../src/lib/store/localStore'
import { emptyData } from '../src/lib/store/schema'
import { itemFromCore } from '../src/domain/nutrition'
import { privacyDocument } from '../src/features/legal/texts'
import { openGuest } from './helpers'

/**
 * Open Food Facts unter ODbL — was die Lizenz und die API-Regeln verlangen
 * (docs/odbl.md): Namensnennung überall dort, wo Werte von dort auftauchen,
 * und ein fairer Umgang mit der Rate.
 */

test.describe('Rate', () => {
  test('zehn Suchen je Minute — die elfte wartet, bis die älteste aus dem Fenster fällt', () => {
    const now = 100_000
    const recent = Array.from({ length: 10 }, (_, i) => now - 50_000 + i * 1000)
    expect(rateDelay(recent, OFF_RATE.search, now)).toBe(10_000)
    expect(rateDelay(recent.slice(1), OFF_RATE.search, now)).toBe(0)
    // Was älter als das Fenster ist, zählt nicht.
    expect(rateDelay(recent.map((t) => t - 60_000), OFF_RATE.search, now)).toBe(0)
    expect(OFF_RATE.product).toBe(100)
  })
})

test.describe('Namensnennung', () => {
  test('der Export trägt die Notiz genau dann, wenn eine Position von Open Food Facts stammt', () => {
    const data = emptyData()
    expect(exportNotices(data)).toEqual([])
    const core = itemFromCore('haferflocken_zart', 80, 'i1')!
    data.athletes[0].meals = [{ id: 'm', day: '2026-09-21', slot: 'breakfast', items: [core], note: '', createdAt: '2026-09-21T08:00:00.000Z', updatedAt: '2026-09-21T08:00:00.000Z' }]
    expect(exportNotices(data)).toEqual([])
    data.athletes[0].meals[0].items.push({ ...core, id: 'i2', foodKey: null, source: 'off', barcode: '4000417025005' })
    expect(exportNotices(data)).toEqual([OFF_NOTICE])
    expect(OFF_NOTICE).toContain('Open Database License')
  })

  test('das Impressum nennt die Quelle und die Lizenz', async ({ page }) => {
    await openGuest(page)
    await page.goto('/impressum', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('imprint-sources')
    await expect(panel).toContainText('Open Food Facts')
    await expect(panel).toContainText('ODbL')
    await expect(panel.getByRole('link', { name: 'ODbL 1.0' })).toHaveAttribute('href', /opendatacommons\.org/)
  })

  test('die Datenschutzerklärung nennt Open Food Facts als Dienst auf Tipp', () => {
    for (const locale of ['de', 'en'] as const) {
      const text = privacyDocument(locale).sections.map((s) => [s.heading, ...s.body].join(' ')).join(' ')
      expect(text).toContain('Open Food Facts')
      expect(text).toMatch(/IP/)
    }
  })
})
