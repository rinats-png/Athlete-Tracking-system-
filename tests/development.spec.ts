import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { developmentOf, DEVELOPMENT_WEEKS } from '../src/domain/development'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'

/** Trainingsbereich Etappe 14: Langzeitentwicklung. */

const mk = (id: string, startDay: string, over: Partial<StoredTrainingBlock> = {}): StoredTrainingBlock =>
  ({ id, name: id, family: null, disciplineId: null, phase: 'BUILD', startDay, weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions: [], completions: [], status: 'closed', createdAt: '', updatedAt: '', ...over }) as StoredTrainingBlock
const done = (day: string) => ({ sessionId: 's', day, durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null, feedback: null, pain: false, planDay: null, sets: [], swaps: [] })

test.describe('Langzeitentwicklung: Fachlogik', () => {
  test('Blöcke neueste zuerst; zwölf Wochen mit Montag, Zählung je Woche über alle Blöcke, Summe über alles', () => {
    const today = '2026-10-07' // Mittwoch, Montag 2026-10-05
    const a = mk('alt', '2026-06-01', { completions: [done('2026-06-02')] })
    const b = mk('neu', '2026-09-14', { status: 'active', completions: [done('2026-10-05'), done('2026-10-06'), done('2026-09-29')] })
    const dev = developmentOf([a, b], [], today)
    expect(dev.blocks.map((x) => x.block.id)).toEqual(['neu', 'alt'])
    expect(dev.weeks).toHaveLength(DEVELOPMENT_WEEKS)
    expect(dev.weeks[DEVELOPMENT_WEEKS - 1]).toEqual({ weekStart: '2026-10-05', done: 2 })
    expect(dev.weeks[DEVELOPMENT_WEEKS - 2]).toEqual({ weekStart: '2026-09-28', done: 1 })
    expect(dev.weeks[0].weekStart).toBe('2026-07-20')
    expect(dev.totalDone).toBe(4) // die Einheit vom Juni zählt in der Summe, liegt aber außerhalb der zwölf Wochen
    expect(dev.weeks.reduce((n, w) => n + w.done, 0)).toBe(3)
  })
  test('Block ohne Retest: keine Messzahlen; Block mit offenem Retest zählt als offen, nie als Misserfolg', () => {
    const dev = developmentOf([mk('x', '2026-06-01', { retestMetrics: ['countermovement_jump'] })], [], '2026-10-07')
    expect(dev.blocks[0]).toMatchObject({ measured: 0, open: 1 })
    expect(dev.blocks[0].report.metrics[0].status).toBe('open')
    expect(developmentOf([mk('y', '2026-06-01')], [], '2026-10-07').blocks[0]).toMatchObject({ measured: 0, open: 0 })
  })
})

test.describe('Langzeitentwicklung: Bildschirm', () => {
  test('zeigt Blöcke und Wochenbalken ohne Prognose; ohne Block ein Hinweis', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/entwicklung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Noch kein Block.')).toBeVisible()
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date()
      const day = now.toISOString().slice(0, 10)
      const mk = (id: string, name: string, status: string, startDay: string, completions: unknown[], retest: string[]) => ({ id, name, family: null, disciplineId: null, phase: 'BUILD', startDay, weeks: 4, retestMetrics: retest, templateId: null, assignmentId: null, eventDay: null, sessions: [], completions, status, createdAt: now.toISOString(), updatedAt: now.toISOString() })
      d.athletes[0].trainingBlocks = [
        mk('b1', 'Alter Block', 'closed', '2026-03-02', [], ['countermovement_jump']),
        mk('b2', 'Neuer Block', 'active', '2026-09-14', [{ sessionId: 's', day, durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null, feedback: null, pain: false, planDay: null, sets: [], swaps: [] }], []),
      ]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/entwicklung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dev-block-b2')).toContainText('Neuer Block')
    await expect(page.getByTestId('dev-block-b2')).toContainText('läuft')
    await expect(page.getByTestId('dev-block-b1')).toContainText('abgeschlossen')
    await expect(page.getByTestId('dev-metric-b1-countermovement_jump')).toContainText('Keine Messung am Blockende')
    expect(await page.locator('[data-testid^="dev-week-"]').count()).toBe(12)
    await expect(page.locator('[data-testid^="dev-week-"][data-done="1"]')).toHaveCount(1)
    const text = await page.getByTestId('plan-development').innerText()
    expect(text).not.toMatch(/Prognose|voraussichtlich|wirst du|Erfolg\b(?!\.)/i)
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('hub-to-development').click()
    await expect(page).toHaveURL(/\/plan\/entwicklung/)
  })
})
