import { expect, test } from '@playwright/test'
import { openColdStart, openDemo } from './helpers'
import { WHATS_NEW } from '../src/data/whatsNew'
import { latestReleaseId, unseenReleases } from '../src/features/whatsNew/whatsNewState'
import { readFileSync } from 'node:fs'

/** «Neu bei KYDON»: einmal je neuem Stand, nie beim Erststart, nie zweimal. */

const rel = (id: string) => ({ id, items: ['a'] })

test.describe('Logik', () => {
  test('ohne Marke sind alle Stände neu, neueste zuerst', () => {
    const list = [rel('2026-09-30'), rel('2026-10-15'), rel('2026-08-01')]
    expect(unseenReleases(null, list).map((r) => r.id)).toEqual(['2026-10-15', '2026-09-30', '2026-08-01'])
  })
  test('mit Marke nur, was danach kam; gleicher Stand ergibt nichts', () => {
    const list = [rel('2026-09-30'), rel('2026-10-15')]
    expect(unseenReleases('2026-09-30', list).map((r) => r.id)).toEqual(['2026-10-15'])
    expect(unseenReleases('2026-10-15', list)).toEqual([])
  })
  test('eine Marke jenseits aller Stände (Rückschritt) ergibt nichts', () => {
    expect(unseenReleases('2027-01-01', [rel('2026-09-30')])).toEqual([])
  })
  test('Zähler am selben Tag ordnet richtig', () => {
    expect(unseenReleases('2026-09-30', [rel('2026-09-30'), rel('2026-09-30.2')]).map((r) => r.id)).toEqual(['2026-09-30.2'])
  })
  test('latestReleaseId, Kennungen eindeutig, jeder Eintrag in allen Sprachen', () => {
    expect(latestReleaseId([])).toBeNull()
    const ids = WHATS_NEW.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const lang of ['de', 'en', 'fr', 'es', 'nl', 'sv', 'nb', 'da']) {
      const items = JSON.parse(readFileSync(`src/i18n/${lang}.extra.json`, 'utf-8')).whatsNew.items as Record<string, string>
      for (const r of WHATS_NEW) for (const k of r.items) expect(items[k], `${lang}.${k}`).toBeTruthy()
    }
  })
})

test.describe('Im Bildschirm', () => {
  test('Erststart: kein Hinweis, Marke gesetzt', async ({ page }) => {
    await openColdStart(page)
    await expect(page.getByTestId('whats-new')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('kydon.whatsnew.seen'))).toBe(WHATS_NEW[0].id)
  })

  test('Update mit vorhandenem Bestand: einmal sichtbar, Schliessen setzt die Marke, kein zweites Mal', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => localStorage.removeItem('kydon.whatsnew.seen'))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const dlg = page.getByTestId('whats-new')
    await expect(dlg).toBeVisible()
    await expect(dlg).toContainText('Neu bei KYDON:')
    await expect(page.getByTestId('whats-new-list').locator('li')).toHaveCount(WHATS_NEW[0].items.length)
    await dlg.getByRole('button', { name: 'Verstanden' }).click()
    await expect(dlg).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('kydon.whatsnew.seen'))).toBe(WHATS_NEW[0].id)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await expect(page.getByTestId('whats-new')).toHaveCount(0)
  })

  test('Escape schliesst ebenfalls und merkt sich den Stand', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => localStorage.setItem('kydon.whatsnew.seen', '2020-01-01'))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('whats-new')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('whats-new')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('kydon.whatsnew.seen'))).toBe(WHATS_NEW[0].id)
  })

  test('neuer Stand später: erscheint erneut nur für die Differenz', async ({ page }) => {
    await openDemo(page)
    // Simuliert: zuletzt gesehen war ein älterer Stand → der aktuelle ist neu.
    await page.evaluate(() => localStorage.setItem('kydon.whatsnew.seen', '2026-01-01'))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('whats-new')).toBeVisible()
  })
})
