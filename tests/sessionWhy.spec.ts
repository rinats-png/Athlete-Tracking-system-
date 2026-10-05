import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'

/** Trainingsbereich Etappe 7: «Warum diese Einheit?». */

const base = { weekFrom: 1, weekTo: null, title: '', note: '', blocks: [], highIntensity: false, coachModified: false, coachModificationReason: null, removed: false, retestMetric: '' }

test('Block: Regeleinheit zeigt Regel, Evidenz, Prüfstatus, Grenzen, Quellen, Messgröße; offene und eigene sagen, dass es keine belegte Dosis gibt', async ({ page }) => {
  await openDemo(page)
  await page.evaluate((b) => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    const now = new Date().toISOString()
    const today = new Date()
    const wd = ((today.getUTCDay() + 6) % 7) + 1
    const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
    data.athletes[0].trainingBlocks = [{ id: 'b', name: '', family: 'hybrid', disciplineId: 'hyrox', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: ['countermovement_jump'], templateId: 'hyrox_prep', eventDay: null, completions: [], status: 'active', createdAt: now, updatedAt: now,
      sessions: [
        { ...b, id: 'r', day: 1, kind: 'rule', ruleId: 'vo2_4x4', ruleVersion: '1.0.0', primaryIntent: 'VO2MAX', evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, retestMetric: 'countermovement_jump', coachModified: true, coachModificationReason: 'Wettkampf am Samstag' },
        { ...b, id: 'o', day: 3, kind: 'open', ruleId: null, ruleVersion: null, primaryIntent: 'HYROX_STATIONS', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null },
        { ...b, id: 'e', day: 5, kind: 'own', title: 'Mein Lauf', ruleId: null, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null },
      ] }]
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  }, base)
  await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('why-open-r').click()
  const rule = page.getByTestId('why-r')
  await expect(rule).toContainText('Version 1.0.0')
  await expect(rule).toContainText('Evidenz')
  await expect(rule).toContainText('Ungeprüft')
  await expect(rule).toContainText('Grenzen')
  await expect(rule).toContainText('Quellen')
  await expect(rule).toContainText('Am Blockende gemessen')
  await expect(rule).toContainText('Aus der Vorlage')
  await expect(page.getByTestId('why-coach-r')).toContainText('Wettkampf am Samstag')
  await expect(rule.locator('a[href^="https://doi.org/"]').first()).toBeVisible()
  await page.getByTestId('why-open-o').click()
  await expect(page.getByTestId('why-openline-o')).toContainText('keine belegte Dosis')
  await expect(page.getByTestId('why-o')).not.toContainText('Quellen')
  await page.getByTestId('why-open-e').click()
  await expect(page.getByTestId('why-own-e')).toContainText('deine Entscheidung')
})
