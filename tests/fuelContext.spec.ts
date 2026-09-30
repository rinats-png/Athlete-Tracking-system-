import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { readFileSync } from 'node:fs'
import { FUEL_NOTES } from '../src/data/fuelContext'
import { FUEL_SOURCES } from '../src/data/fuelRules'
import { ANTI_DOPING_LINKS, SUPPLEMENTS } from '../src/data/supplements'
import { contextNotes } from '../src/domain/fuelPlan'

/** Fuel Stufe 3: Hitze, Kälte, Reise und die Supplement-Informationsseite. */

test.describe('Bedingungen und Reise', () => {
  test('normal und keine Reise: keine Hinweise', () => {
    expect(contextNotes('normal', 'none')).toEqual([])
  })
  test('Hitze, Kälte, Reise, Zeitzonen wählen die passenden Hinweise', () => {
    expect(contextNotes('hot', 'none').map((n) => n.id)).toEqual(['hot_sweat', 'hot_fluid', 'hot_caffeine'])
    expect(contextNotes('cold', 'none').map((n) => n.id)).toEqual(['cold_thirst'])
    expect(contextNotes('normal', 'trip').map((n) => n.id)).toEqual(['trip_access', 'trip_arrival'])
    expect(contextNotes('normal', 'zones').map((n) => n.id)).toEqual(['trip_access', 'trip_arrival', 'zones_timing'])
  })
  test('jeder Hinweis nennt nur vorhandene Quellen; ohne Konsensus steht «expert» und nicht «high»', () => {
    for (const n of FUEL_NOTES) {
      for (const id of n.evidence.sourceIds) expect(FUEL_SOURCES[id], `${n.id}: ${id}`).toBeTruthy()
      if (n.evidence.type === 'expert') expect(n.evidence.strength, n.id).toBe('low')
    }
  })
})

test.describe('Nahrungsergänzung', () => {
  test('jede Substanz nennt vorhandene Quellen', () => {
    for (const s of SUPPLEMENTS) {
      expect(s.sourceIds.length, s.id).toBeGreaterThan(0)
      for (const id of s.sourceIds) expect(FUEL_SOURCES[id], `${s.id}: ${id}`).toBeTruthy()
    }
    for (const l of ANTI_DOPING_LINKS) expect(l.url).toMatch(/^https:\/\//)
  })

  test('die Texte enthalten keine Dosis und keine Marke', () => {
    for (const lang of ['de', 'en']) {
      const items = JSON.parse(readFileSync(`src/i18n/${lang}.extra.json`, 'utf-8')).fueling.supplements.items as Record<string, Record<string, string>>
      for (const [id, t] of Object.entries(items)) {
        const text = `${t.what} ${t.limits}`
        expect(text, `${lang} ${id}`).not.toMatch(/\d\s?(mg|g\/kg|g\b|gramm|grams|mg\/kg)/i)
      }
    }
  })

  test('Seite: Warnung vor der Liste, Links, vier Karten', async ({ page }) => {
    await openDemo(page)
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('fuel-supplements')
    await expect(panel).toBeVisible()
    await expect(page.getByTestId('fuel-doping')).toBeVisible()
    await expect(panel.locator('[data-testid^="fuel-supp-"]')).toHaveCount(4)
    await expect(page.getByTestId('fuel-doping').getByRole('link').first()).toHaveAttribute('href', /wada-ama\.org/)
    // Die Warnung steht vor der ersten Karte.
    const order = await panel.evaluate((el) => {
      const w = el.querySelector('[data-testid="fuel-doping"]')!
      const c = el.querySelector('[data-testid="fuel-supp-caffeine"]')!
      return !!(w.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    expect(order).toBe(true)
  })

  test('Plan: heisse Bedingungen zeigen Hinweise mit Abzeichen und ändern die Spanne nicht', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'marathon'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
    const plan = page.getByTestId('fuel-plan')
    await expect(page.getByTestId('fuel-context')).toHaveCount(0)
    const before = await page.getByTestId('fuel-plan-during').innerText()
    await plan.getByRole('button', { name: 'heiss' }).click()
    await expect(page.getByTestId('fuel-context').locator('[data-note]')).toHaveCount(3)
    expect(await page.getByTestId('fuel-plan-during').innerText()).toBe(before)
  })
})
