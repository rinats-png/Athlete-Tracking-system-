import { test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo } from '../tests/helpers'
import { materializePlan } from '../src/domain/library'
import { moveOccurrence, occurrences } from '../src/domain/trainingBlock'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'

/**
 * Aufnahmen: Kalender mit Terminen, Verschieben, verpasste Einheit, Satz-Log und Ersatz im Player (keine Prüfung).
 * Aufruf: npx playwright test -c playwright.mockups.config.ts mockups/kalender.spec.ts --project=phone
 * Ausgabe: mockups-kalender/<name>-<hell|dunkel>.png
 */
const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeks = JSON.parse(readFileSync(new URL('plans/PLN_STR_BASE_8W.json', dir), 'utf8')) as PlanWeek[]
const today = new Date().toISOString().slice(0, 10)
const wd = ((new Date().getUTCDay() + 6) % 7) + 1
const day = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const monday = day(-(wd - 1))

for (const theme of ['light', 'dark'] as const) {
  test(`Kalender und Player ${theme}`, async ({ page }) => {
    page.setDefaultTimeout(15_000)
    const name = theme === 'light' ? 'hell' : 'dunkel'
    await page.emulateMedia({ colorScheme: theme })
    await openDemo(page)
    const shot = async (file: string, full = false) => {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `mockups-kalender/${file}-${name}.png`, fullPage: full })
    }
    // Block seit letzter Woche: eine Einheit verpasst, eine verschoben, eine heute.
    let block = materializePlan(index.plans.find((p) => p.plan_id === 'PLN_STR_BASE_8W')!, weeks, index, exercises, { id: 'shot', startDay: day(-(wd - 1) - 7), now: new Date().toISOString(), disciplineId: null })
    const all = occurrences(block)
    const last = all.filter((o) => o.date < monday)
    block.completions = last.slice(0, -1).map((o) => ({ sessionId: o.session.id, day: o.date, durationMin: 55, rpe: 7, diarySessionId: null, avgHr: null, maxHr: null, feedback: 3, pain: false, planDay: null, sets: [], swaps: [] }))
    const thisWeek = all.filter((o) => o.date >= monday && o.date < day(-(wd - 1) + 7) && o.session.blocks[0]?.type === 'library_exercise')
    const r = thisWeek[0] && thisWeek[0].date !== today ? moveOccurrence(block, thisWeek[0].session.id, thisWeek[0].planned, today, today, new Date().toISOString()) : null
    if (r?.ok) block = r.block
    await page.evaluate((b) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = [b]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, block)
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('plan-calendar').waitFor()
    await shot('01-kalender-woche', true)
    await page.locator(`[data-testid^="cal-session-"][data-planned="${today}"]`).first().click()
    await page.locator('[data-testid^="cal-move-"]').last().dispatchEvent('click')
    await shot('02-verschieben', true)
    await page.getByTestId('cal-cancel').click()
    await page.getByTestId('cal-view-month').click()
    await shot('03-kalender-monat')
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('set-logger').waitFor()
    await page.waitForTimeout(500)
    const first = page.locator('[data-testid^="setlog-0-0-"]').first()
    await first.fill('60')
    await page.getByTestId('setlog-tick-0-0').click()
    await shot('04-player-satzlog', true)
    await page.getByTestId('setlog-rest-skip').click().catch(() => {})
    await page.getByTestId('setlog-swap-0').click()
    await page.getByTestId('setlog-options-0').scrollIntoViewIfNeeded()
    await shot('05-player-ersatz')
  })
}
