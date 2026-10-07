import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { assessmentCoverage, athleteToday, dataConfidence, dimensionRows, recentChanges } from '../src/domain/performanceView'
import { emptyData } from '../src/lib/store/schema'
import { NAV_ITEMS, navKeyForPath } from '../src/features/dashboard/BottomNav'
import { disciplineById, coreSlugs } from '../src/data/sportProfiles'
import type { StoredResult } from '../src/lib/store/localStore'

/** Etappe 2 des Umbaus: Athlet — Heute, Performance, Navigation. */

const asOf = new Date('2026-10-07T12:00:00.000Z')

const result = (slug: string, day: string, score: number): StoredResult =>
  ({
    id: `${slug}-${day}`,
    testSlug: slug,
    performedAt: `${day}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 80,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    protocol: { version: null, method: null, tester: '', deviation: '', abortReason: '', invalidAttempts: [] },
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    photo: null,
    createdAt: `${day}T09:00:00.000Z`,
  }) as StoredResult

test.describe('Fachlogik', () => {
  test('Data Confidence: ohne bewertete Messung unzureichend, sonst drei Stufen', () => {
    expect(dataConfidence([], asOf)).toEqual({ level: 'INSUFFICIENT', score: 0 })
    const one = dataConfidence([result('grip_strength', '2026-10-01', 60)], asOf)
    expect(['LOW', 'MODERATE', 'HIGH']).toContain(one.level)
    expect(one.score).toBeGreaterThan(0)
  })

  test('Assessment Coverage ist eine Anzahl der Kerntests, keine Prozentzahl', () => {
    const discipline = disciplineById('judo')!
    const core = coreSlugs(discipline)
    expect(core.length).toBeGreaterThan(1)
    const cov = assessmentCoverage('judo', [result(core[0], '2026-10-01', 70), result(core[1], '2026-03-01', 70)], asOf)!
    expect(cov.total).toBe(core.length)
    expect(cov.measured).toBe(2)
    expect(cov.missing).toHaveLength(core.length - 2)
    expect(cov.stale).toEqual([core[1]])
    expect(assessmentCoverage(null, [], asOf)).toBeNull()
    expect(assessmentCoverage('judo', [result(core[0], '2020-01-01', 70)], asOf)!.measured).toBe(0)
  })

  test('Veränderungen: Erstmessungen erscheinen nicht, Höchstzahl wird eingehalten', () => {
    const rs = [result('grip_strength', '2026-09-01', 50), result('grip_strength', '2026-10-01', 70), result('plank_hold', '2026-10-02', 60)]
    const ch = recentChanges(rs, 3)
    expect(ch.map((c) => c.slug)).toEqual(['grip_strength'])
    expect(recentChanges(rs, 0)).toEqual([])
  })

  test('Heute ohne Daten rechnet nichts: kein Wettkampf, keine Lücke, keine Behauptung', () => {
    const base = emptyData().athletes[0]
    const t = athleteToday({ profile: base.profile, results: [], workouts: [] }, asOf)
    expect(t.hasData).toBe(false)
    expect(t.gap).toBeNull()
    expect(t.event).toBeNull()
    expect(t.confidence.level).toBe('INSUFFICIENT')
  })

  test('Dimensionen: gemessen ohne Referenz ist etwas anderes als nicht gemessen', () => {
    const rows = dimensionRows(
      [
        { axisId: 'a', dimension: null, score: 70, testCount: 2, latestPerformedAt: '2026-10-01T09:00:00.000Z', hasData: true },
        { axisId: 'b', dimension: null, score: null, testCount: 1, latestPerformedAt: '2026-09-01T09:00:00.000Z', hasData: true },
        { axisId: 'c', dimension: null, score: null, testCount: 0, latestPerformedAt: null, hasData: false },
      ],
      [],
      asOf,
    )
    expect(rows.map((r) => r.status)).toEqual(['referenced', 'noReference', 'unmeasured'])
    expect(rows[0].ageDays).toBe(6)
    expect(rows[2].ageDays).toBeNull()
  })
})

test('Navigation des Athleten: fünf Bereiche, alte Adressen führen auf den richtigen', () => {
  expect(NAV_ITEMS.map((i) => i.key)).toEqual(['athleteToday', 'athleteTest', 'athletePlan', 'athletePerformance', 'fuel', 'athleteMore'])
  expect(navKeyForPath('/')).toBe('athleteToday')
  expect(navKeyForPath('/verlauf')).toBe('athletePerformance')
  expect(navKeyForPath('/analyse/laeufe')).toBe('athletePerformance')
  expect(navKeyForPath('/tests/grip_strength')).toBe('athleteTest')
  expect(navKeyForPath('/diagnostik')).toBe('athleteTest')
  expect(navKeyForPath('/profil')).toBe('athleteMore')
  expect(navKeyForPath('/preise')).toBe('athleteMore')
})

test('Bildschirm: Heute zeigt Veränderung, Lücke und nächsten Test; ohne Rohschlüssel', async ({ page }) => {
  await openDemo(page)
  await expect(page.getByTestId('athlete-today')).toBeVisible()
  await expect(page.getByTestId('today-changes')).toBeVisible()
  await expect(page.getByTestId('today-gap')).toBeVisible()
  await expect(page.getByTestId('today-confidence')).toContainText('Datenlage')
  const text = await page.getByTestId('athlete-today').innerText()
  expect(text).not.toMatch(/athleteToday\.|performance\.|overview\.reasons/)
  expect(text).not.toMatch(/\b(bereit|Risiko|Streak)\b/i)
  expect(text).not.toMatch(/\d\s?% bereit/)
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  for (const label of ['Heute', 'Leistung', 'Test', 'Fuel', 'Einstellungen']) await expect(nav.getByRole('button', { name: label })).toBeVisible()
})

test('Bildschirm: Leistung zeigt Datenbasis, Dimensionen und die vier Karten, ohne Gesamtwert', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Leistung' }).click()
  await expect(page).toHaveURL(/\/performance$/)
  await expect(page.getByTestId('perf-basis')).toBeVisible()
  await expect(page.getByTestId('perf-confidence')).toContainText('Datenlage')
  await expect(page.getByTestId('perf-coverage')).toContainText(/\d+ von \d+ Kerntests/)
  await expect(page.getByTestId('perf-dimensions').locator('li').first()).toBeVisible()
  for (const id of ['perf-strongest', 'perf-gap', 'perf-change', 'perf-next']) await expect(page.getByTestId(id)).toBeVisible()
  const text = await page.getByTestId('performance-screen').innerText()
  expect(text).not.toMatch(/performance\.|athleteToday\.|radar\.[a-z]/i)
  expect(text).not.toMatch(/\d+\s?%\s*(Abdeckung|Coverage)/i)
})

test('Bildschirm: kein seitliches Überlaufen, hell und dunkel', async ({ page }) => {
  await openDemo(page)
  for (const theme of ['light', 'dark']) {
    for (const path of ['/', '/performance', '/mehr']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over, `${theme} ${path}`).toBeLessThanOrEqual(0)
    }
  }
})

test('der klassische Einstieg bleibt: ohne Messung zeigt Heute den geführten Einstieg', async ({ page }) => {
  const { openGuest } = await import('./helpers')
  await openGuest(page)
  await expect(page.getByTestId('athlete-today')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})
