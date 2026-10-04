import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { calendarWeek } from '../src/domain/trainingBlock'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'

/** Trainingsbereich Etappe 3: Plankalender. */

const mkSession = (id: string, day: number, over: Record<string, unknown> = {}) => ({ id, day, weekFrom: 1, weekTo: null, kind: 'open', ruleId: null, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false, ...over })

test('Fachlogik: Kalenderwoche hat sieben Tage, beachtet Wochenspanne, Streichung und Erledigtes', () => {
  const block = { id: 'b', family: 'hybrid', disciplineId: 'hyrox', phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, eventDay: null, sessions: [mkSession('a', 1), mkSession('b', 3, { weekFrom: 3 }), mkSession('c', 5, { removed: true })], completions: [{ sessionId: 'a', day: '2026-10-05', durationMin: 30, rpe: 5, diarySessionId: null }], status: 'active', createdAt: '', updatedAt: '' } as unknown as StoredTrainingBlock
  const w1 = calendarWeek(block, 1)
  expect(w1).toHaveLength(7)
  expect(w1[0].date).toBe('2026-10-05')
  expect(w1[0].sessions).toEqual([expect.objectContaining({ done: true })])
  expect(w1[2].sessions).toHaveLength(0)
  expect(w1[4].sessions).toHaveLength(0)
  expect(calendarWeek(block, 3)[2].sessions).toHaveLength(1)
  expect(calendarWeek(block, 2)[0].sessions[0].done).toBe(false)
})

test.describe('Plankalender: Bildschirm', () => {
  const prepare = async (page: import('@playwright/test').Page) => {
    await openDemo(page)
    await page.evaluate((sess) => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      const today = new Date()
      const wd = ((today.getUTCDay() + 6) % 7) + 1
      const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
      data.athletes[0].trainingBlocks = [{ id: 'b1', family: 'hybrid', disciplineId: 'hyrox', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: [], templateId: null, eventDay: null, sessions: sess, completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    }, [mkSession('s1', 1), mkSession('s2', 3, { primaryIntent: 'GRIP_ENDURANCE', weekFrom: 3 })])
  }

  test('Woche, Phase und Monat zeigen die Einheiten; Wochenspanne wird beachtet', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-calendar')).toBeVisible()
    await expect(page.getByTestId('cal-week')).toContainText('1')
    await expect(page.getByTestId('cal-day-1')).toContainText('Grundlagenausdauer')
    await expect(page.getByTestId('cal-session-s2')).toHaveCount(0)
    await page.getByTestId('cal-next').click()
    await page.getByTestId('cal-next').click()
    await expect(page.getByTestId('cal-session-s2')).toBeVisible()
    await page.getByTestId('cal-view-phase').click()
    await expect(page.getByTestId('cal-phase')).toBeVisible()
    await expect(page.getByTestId('cal-phase-week-1')).toContainText('0 von 1')
    await expect(page.getByTestId('cal-phase-week-3')).toContainText('0 von 2')
    await page.getByTestId('cal-view-month').click()
    await expect(page.getByTestId('cal-month')).toBeVisible()
  })

  test('Verschieben braucht einen Grund, gilt für die Serie und landet im Block', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('cal-session-s1').click()
    await page.getByTestId('cal-move-4').click()
    await page.getByTestId('cal-confirm').click()
    await expect(page.getByTestId('cal-error')).toContainText('Grund')
    await page.getByTestId('cal-reason').fill('Arbeitstermin')
    await page.getByTestId('cal-confirm').click()
    await expect(page.getByTestId('cal-day-4')).toContainText('Grundlagenausdauer')
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks[0].sessions.find((x: { id: string }) => x.id === 's1'))
    expect(s).toMatchObject({ day: 4, coachModified: true, coachModificationReason: 'Arbeitstermin' })
  })

  test('Ziehen auf einen Tag wählt ihn als Ziel; belegter Tag wird abgewiesen', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('cal-session-s1').dragTo(page.getByTestId('cal-day-2'))
    await expect(page.getByTestId('cal-move')).toContainText('Dienstag')
    await page.getByTestId('cal-reason').fill('x')
    await page.getByTestId('cal-confirm').click()
    await expect(page.getByTestId('cal-day-2')).toContainText('Grundlagenausdauer')
  })

  test('ohne Block ein ruhiger Hinweis', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Es gibt keinen aktiven Block.')).toBeVisible()
  })
})
