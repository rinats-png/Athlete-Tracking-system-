import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { navItemsFor, navKeyForPath, NAV_ITEMS } from '../src/features/dashboard/BottomNav'

/** Neuer Trainingsbereich, Etappe 1: Navigation mit sechs Tabs, Hub, Weg zum Plan. */

test.describe('Navigation: Fachlogik', () => {
  test('mit Trainingsbereich sechs Tabs, Plan an dritter Stelle; Pfade führen auf den richtigen Tab', () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual(['athleteToday', 'athleteTest', 'athletePlan', 'athletePerformance', 'fuel', 'athleteMore'])
    expect(navKeyForPath('/plan', 'solo', NAV_ITEMS)).toBe('athletePlan')
    expect(navKeyForPath('/plan/block', 'solo', NAV_ITEMS)).toBe('athletePlan')
    expect(navKeyForPath('/plan/heute', 'solo', NAV_ITEMS)).toBe('athletePlan')
    expect(navKeyForPath('/training', 'solo', NAV_ITEMS)).toBe('athletePlan')
    expect(navKeyForPath('/performance', 'solo', NAV_ITEMS)).toBe('athletePerformance')
    expect(navKeyForPath('/diagnostik', 'solo', NAV_ITEMS)).toBe('athleteTest')
  })
  test('ohne Bau-Schalter (hier: kein Vite-Umfeld) bleibt die Leiste bei fünf Tabs in der alten Reihenfolge', () => {
    expect(navItemsFor('solo').map((i) => i.key)).toEqual(['athleteToday', 'athletePerformance', 'athleteTest', 'fuel', 'athleteMore'])
    expect(navItemsFor('coach')).toHaveLength(5)
  })
})

const seed = (page: import('@playwright/test').Page, withSession: boolean) =>
  page.evaluate((withS) => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    data.athletes[0].profile.competition = { name: 'HYROX Frankfurt', on: new Date(Date.now() + 47 * 86_400_000).toISOString().slice(0, 10) }
    const today = new Date()
    const wd = ((today.getUTCDay() + 6) % 7) + 1
    const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1) - 14)).toISOString().slice(0, 10)
    const now = new Date().toISOString()
    const session = { id: 's1', day: wd, ruleId: 'vo2_4x4', ruleVersion: '1.0.0', primaryIntent: 'VO2MAX', evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, highIntensity: true, blocks: [{ type: 'interval', modality: 'mixed', repetitions: 4, workSeconds: 240, recoverySeconds: 180, intensity: { type: 'hr_percent_max', min: 90, max: 95 } }], retestMetric: 'countermovement_jump', coachModified: false, coachModificationReason: null, removed: false }
    data.athletes[0].trainingBlocks = withS ? [{ id: 'b1', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: ['countermovement_jump'], sessions: [session], completions: [], status: 'active', createdAt: now, updatedAt: now }] : []
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  }, withSession)

test.describe('Bildschirm', () => {
  test('sechs Tabs, Plan ist der größte, Antippen öffnet den Hub', async ({ page }) => {
    await openDemo(page)
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    const buttons = nav.getByRole('button')
    await expect(buttons).toHaveCount(6)
    const sizes = await buttons.evaluateAll((els) => els.map((el) => el.querySelector('.nav-dot')!.getBoundingClientRect().width))
    expect(sizes[2]).toBeGreaterThan(Math.max(sizes[0], sizes[1], sizes[3], sizes[4], sizes[5]))
    // Treffer mindestens 44 px, keine Überlappung der Tabs.
    const boxes = await buttons.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.right, r.width, r.height] }))
    for (const [, , w, h] of boxes) expect(Math.min(w, h)).toBeGreaterThanOrEqual(43.5)
    for (let i = 1; i < boxes.length; i++) expect(boxes[i][0] + 0.5, `Tab ${i} überlappt`).toBeGreaterThanOrEqual(boxes[i - 1][1])
    await buttons.nth(2).click()
    await expect(page).toHaveURL(/\/plan$/)
    await expect(page.getByTestId('plan-hub')).toBeVisible()
  })

  test('ohne Block: ruhiger Anfang mit einem Weg nach vorn, Weg-Seite verlinkt nur, was es gibt', async ({ page }) => {
    await openDemo(page)
    await seed(page, false)
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-empty')).toBeVisible()
    await page.getByTestId('hub-choose').click()
    await expect(page.getByTestId('plan-way')).toBeVisible()
    await expect(page.getByTestId('way-template')).toHaveAttribute('href', '/plan/vorlagen')
    await expect(page.getByTestId('way-own')).toHaveAttribute('href', '/plan/eigen')
    await page.getByTestId('way-computed').click()
    await expect(page).toHaveURL(/\/plan\/pruefung/)
    await page.getByTestId('gate-compute').or(page.getByTestId('gate-preview')).click()
    await expect(page).toHaveURL(/\/plan\/neu/)
    await expect(page.getByTestId('plan-preview')).toBeVisible()
  })

  test('mit Block: Woche, vier Karten, Begründung mit Evidenz und Prüfstatus, Wettkampf-Zähler, Start führt in den Player', async ({ page }) => {
    await openDemo(page)
    await seed(page, true)
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-block')).toBeVisible()
    await expect(page.getByTestId('hub-week')).toContainText('Woche 3 von 6')
    for (const id of ['hub-today', 'hub-weekcount', 'hub-goal', 'hub-retest', 'hub-why']) await expect(page.getByTestId(id)).toBeVisible()
    await expect(page.getByTestId('hub-why')).toContainText('Ungeprüft')
    await expect(page.getByTestId('hub-block')).toContainText('Wettkampf in 47 Tagen')
    const text = await page.getByTestId('plan-hub').innerText()
    expect(text).not.toMatch(/planHub\.|plan\.[a-z]+\.|\{\{/)
    await page.getByTestId('hub-start').click()
    await expect(page.getByTestId('session-player')).toBeVisible()
  })

  test('kein seitliches Überlaufen, hell und dunkel, schmal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await openDemo(page)
    await seed(page, true)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => localStorage.setItem('kydon.theme', t), theme)
      await page.goto('/plan', { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('plan-hub')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    }
  })
})
