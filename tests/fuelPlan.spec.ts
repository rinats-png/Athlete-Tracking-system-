import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'

/** Trainingsbereich Etappe 13: Fuel und Plan verknüpft. */

const seed = (page: import('@playwright/test').Page, withToday: boolean) =>
  page.evaluate((today) => {
    const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    const now = new Date()
    const wd = ((now.getUTCDay() + 6) % 7) + 1
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
    const day = today ? wd : (wd % 7) + 1
    d.athletes[0].trainingBlocks = [{ id: 'x', name: '', family: null, disciplineId: null, phase: 'BUILD', startDay: monday, weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, completions: [], status: 'active', createdAt: now.toISOString(), updatedAt: now.toISOString(),
      sessions: [{ id: 's', day, weekFrom: 1, weekTo: null, kind: 'own', title: 'Beintag', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'MAX_STRENGTH', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: 75, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false }] }]
    localStorage.setItem('kydon.data.v1', JSON.stringify(d))
  }, withToday)

test('Fuel zeigt die heute geplante Einheit mit Dauer und führt zum Player; der Player führt zu Fuel', async ({ page }) => {
  await openDemo(page)
  await seed(page, true)
  await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
  const card = page.getByTestId('fuel-planned')
  await expect(card).toContainText('Beintag')
  await expect(card).toContainText('75 Min.')
  await expect(card).not.toContainText(/\bg\b|kcal|ml/)
  await page.getByTestId('fuel-to-player').click()
  await expect(page).toHaveURL(/\/plan\/heute/)
  await page.getByTestId('player-to-fuel').click()
  await expect(page).toHaveURL(/\/fuel/)
})

test('ohne Einheit heute keine Karte', async ({ page }) => {
  await openDemo(page)
  await seed(page, false)
  await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('fuel-hub').or(page.locator('main'))).toBeVisible()
  await expect(page.getByTestId('fuel-planned')).toHaveCount(0)
})
