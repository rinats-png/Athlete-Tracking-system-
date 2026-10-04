import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { transferOf } from '../src/domain/evidence'
import { FUEL_RULES, FUEL_SOURCES } from '../src/data/fuelRules'

/** Etappe 6: Evidence Drawer — Grundlage einer Empfehlung, getrennt von der Datenlage. */

test.describe('Evidence: Fachlogik', () => {
  test('Übertragung folgt der Spezifität', () => {
    expect(transferOf('same_sport')).toBe('direct')
    expect(transferOf('related_sport')).toBe('related')
    expect(transferOf('general_athlete')).toBe('extrapolated')
  })
  test('jede Regel nennt nur Quellen, die es gibt', () => {
    for (const r of FUEL_RULES) {
      expect(r.evidence.sourceIds.length).toBeGreaterThan(0)
      for (const id of r.evidence.sourceIds) expect(FUEL_SOURCES[id], `${r.id}: ${id}`).toBeTruthy()
    }
  })
})

test.describe('Evidence Drawer: Bildschirm', () => {
  test('öffnet mit Stärke, Art, Übertragung und Quellen, schließt mit Escape', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'marathon'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('evidence-open').click()
    const drawer = page.getByTestId('evidence-drawer')
    await expect(drawer).toBeVisible()
    for (const id of ['recommendation', 'strength', 'type', 'specificity', 'applied', 'transfer', 'verification', 'version']) {
      await expect(page.getByTestId(`evidence-${id}`)).toBeVisible()
    }
    expect(await page.getByTestId('evidence-sources').locator('li').count()).toBeGreaterThan(0)
    expect(await drawer.innerText()).not.toMatch(/evidence\.drawer\./)
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
  })
})
