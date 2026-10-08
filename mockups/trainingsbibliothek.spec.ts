import { test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo } from '../tests/helpers'
import { materializePlan } from '../src/domain/library'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'

/**
 * Aufnahmen der neuen Bereiche der Trainingsbibliothek (keine Prüfung).
 * Aufruf: npx playwright test -c playwright.mockups.config.ts mockups/trainingsbibliothek.spec.ts --project=phone
 * Ausgabe: mockups-bibliothek/<name>-<hell|dunkel>.png
 */
const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeks = JSON.parse(readFileSync(new URL('plans/PLN_HYROX_BASE_8W.json', dir), 'utf8')) as PlanWeek[]

for (const theme of ['light', 'dark'] as const) {
  test(`Trainingsbibliothek ${theme}`, async ({ page }) => {
    const name = theme === 'light' ? 'hell' : 'dunkel'
    await page.emulateMedia({ colorScheme: theme })
    await openDemo(page)
    const shot = async (file: string, full = false) => {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `mockups-bibliothek/${file}-${name}.png`, fullPage: full })
    }
    await page.goto('/plan/waehlen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('plan-way').waitFor()
    await shot('01-weg-zum-plan')
    await page.goto('/plan/uebungen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('exdb-list').waitFor()
    await shot('02-uebungsdatenbank')
    await page.getByTestId('exdb-pattern-JUMP_PLYOMETRIC').click()
    await shot('03-uebungsdatenbank-filter')
    await page.goto('/plan/uebungen/EX_STR_BAR_001_KNIEBEUGE', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('exercise-detail').waitFor()
    await shot('04-uebungsdetail', true)
    await page.goto('/plan/programme', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('program-library').waitFor()
    await shot('05-programmbibliothek', true)
    await page.goto('/plan/programme/PLN_HYROX_BASE_8W', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('program-detail').waitFor()
    await shot('06-plandetail', true)
    await page.goto('/plan/programme/PLN_HYP_PPL_12W', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('prog-adopt').scrollIntoViewIfNeeded()
    await shot('07-plan-nur-trainer')
    // Übernommener Bibliotheksplan mit zwei Rückmeldungen: Anpassungsfeld im Block.
    const start = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10)
    const block = materializePlan(index.plans.find((p) => p.plan_id === 'PLN_HYROX_BASE_8W')!, weeks, index, exercises, { id: 'shot', startDay: start, now: new Date().toISOString(), disciplineId: null })
    block.completions = [
      { sessionId: block.sessions[0].id, day: start, durationMin: 50, rpe: 5, diarySessionId: null, avgHr: null, maxHr: null, feedback: 2, pain: false },
      { sessionId: block.sessions[1].id, day: new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10), durationMin: 35, rpe: 4, diarySessionId: null, avgHr: null, maxHr: null, feedback: 1, pain: false },
    ]
    await page.evaluate((b) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = [b]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, block)
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('adjust-panel').waitFor()
    await page.getByTestId('adjust-suggested').click()
    await page.getByTestId('adjust-panel').scrollIntoViewIfNeeded()
    await shot('08-anpassen-vorschlag')
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('player-feedback').scrollIntoViewIfNeeded().catch(() => {})
    await shot('09-player-rueckmeldung')
  })
}
