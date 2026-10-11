import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'
import { openDemo } from './helpers'

/**
 * Training starten: Startauswahl im Plan, Einheiten an einem anderen Tag
 * (der Termin wird trotzdem abgehakt) und freies Training ohne Termin —
 * eintragen, aus dem Katalog, selbst zusammengestellt.
 */
const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeksOf = (id: string) => JSON.parse(readFileSync(new URL(`plans/${id}.json`, dir), 'utf8')) as PlanWeek[]

const mkSession = (id: string, day: number) => ({ id, day, weekFrom: 1, weekTo: null, kind: 'open', title: '', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false })
const mk = (over: Record<string, unknown> = {}) =>
  ({ id: 'b', name: '', family: 'hybrid', disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions: [mkSession('a', 1), mkSession('e', 4)], completions: [], libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [], moves: [], status: 'active', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...over }) as unknown as StoredTrainingBlock
const doneOn = (sessionId: string, day: string, planDay: string | null = null) => ({ sessionId, day, durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null, feedback: null, pain: false, planDay, sets: [], swaps: [] })

test.describe('Fachlogik', () => {
  test('offene Termine: heute, verpasst (neueste zuerst), kommende zwei Wochen; Erledigtes fehlt', async () => {
    const { openToDo } = await import('../src/domain/trainingBlock')
    const b = mk({ completions: [doneOn('a', '2026-10-07', '2026-10-05')] })
    const r = openToDo(b, '2026-10-12')
    expect(r.today.map((o) => o.planned)).toEqual(['2026-10-12'])
    expect(r.missed.map((o) => o.planned)).toEqual(['2026-10-08'])
    expect(r.upcoming.map((o) => o.planned)).toEqual(['2026-10-15', '2026-10-19', '2026-10-22', '2026-10-26'])
    expect(openToDo(mk({ status: 'completed' }), '2026-10-12')).toEqual({ today: [], missed: [], upcoming: [] })
  })

  test('einen bestimmten offenen Termin finden; erledigt oder unbekannt → null', async () => {
    const { findOpenOccurrence } = await import('../src/domain/trainingBlock')
    const b = mk({ completions: [doneOn('a', '2026-10-05')] })
    expect(findOpenOccurrence(b, 'e', '2026-10-15')?.date).toBe('2026-10-15')
    expect(findOpenOccurrence(b, 'a', '2026-10-05')).toBeNull()
    expect(findOpenOccurrence(b, 'a', '2026-10-06')).toBeNull()
  })

  test('eigene Einheit: Name und Übung nötig, Sätze begrenzt, keine Regel, kein Termin', async () => {
    const { customSession, canStartCustom, MAX_FREE_EXERCISES } = await import('../src/domain/freeSession')
    const pick = { exerciseId: 'EX_KB_082_GOBLET_SQUAT', name: 'Goblet Squat', sets: 40, reps: '10' }
    expect(canStartCustom('', [pick])).toBe(false)
    expect(canStartCustom('Beine', [])).toBe(false)
    expect(canStartCustom('Beine', [pick])).toBe(true)
    expect(canStartCustom('Beine', Array(MAX_FREE_EXERCISES + 1).fill(pick))).toBe(false)
    const s = customSession('free-1', '  Beine  ', [pick])
    expect(s).toMatchObject({ id: 'free-1', kind: 'own', title: 'Beine', ruleId: null, weekFrom: 1, weekTo: null })
    expect(s.blocks[0]).toMatchObject({ type: 'library_exercise', exerciseId: 'EX_KB_082_GOBLET_SQUAT', sets: 20, reps: '10' })
  })

  test('Einheit aus dem Katalog: gleicher Inhalt wie im Plan, eigene Kennung', async () => {
    const { librarySession, materializePlan } = await import('../src/domain/library')
    const p = index.plans.find((x) => x.plan_id === 'PLN_STR_BASE_8W')!
    const weeks = weeksOf(p.plan_id)
    const s = librarySession(p, weeks, 2, 0, index, exercises, 'free-x')!
    const block = materializePlan(p, weeks, index, exercises, { id: 'b', startDay: '2026-10-05', now: 'n', disciplineId: null })
    const same = block.sessions.find((x) => x.weekFrom === 2 && x.title === s.title)!
    expect(s.id).toBe('free-x')
    expect(s.blocks).toEqual(same.blocks)
    expect(librarySession(p, weeks, 99, 0, index, exercises, 'x')).toBeNull()
  })
})

test.describe('Bildschirme', () => {
  const today = () => new Date().toISOString().slice(0, 10)
  const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
  const mondayOfToday = () => {
    const d = new Date()
    const wd = ((d.getUTCDay() + 6) % 7) + 1
    return addDays(today(), -(wd - 1))
  }
  const seed = async (page: Page, blocks: unknown[]) => {
    await openDemo(page)
    await page.evaluate((list) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = list
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, blocks)
  }
  const athlete = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0])

  test('Hub: «Training starten» mit und ohne Plan; Heute führt dorthin', async ({ page }) => {
    await seed(page, [])
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-empty')).toBeVisible()
    await page.getByTestId('hub-start-training').click()
    await expect(page.getByTestId('training-start')).toBeVisible()
    await expect(page.getByTestId('start-no-block')).toBeVisible()
    await expect(page.getByTestId('start-log')).toBeVisible()
    await expect(page.getByTestId('start-catalog')).toBeVisible()
    await expect(page.getByTestId('start-build')).toBeVisible()
  })

  test('kommende Einheit heute durchführen: Termin gilt als erledigt, nicht der heutige', async ({ page }) => {
    // Block ab dem Montag der Vorwoche: jeden Tag eine Einheit — es gibt Verpasstes, Heutiges und Kommendes.
    const block = mk({ startDay: addDays(mondayOfToday(), -7), sessions: [1, 2, 3, 4, 5, 6, 7].map((d) => mkSession(`s${d}`, d)) })
    const { openToDo } = await import('../src/domain/trainingBlock')
    const todo = openToDo(block, today())
    const next = todo.upcoming[0]
    const missed = todo.missed[0]
    await seed(page, [block])
    await page.goto('/plan/start', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('start-today')).toBeVisible()
    await expect(page.getByTestId('start-missed')).toBeVisible()
    await page.getByTestId(`start-occ-${next.session.id}-${next.planned}`).click()
    await expect(page.getByTestId('session-player')).toBeVisible()
    await expect(page.getByTestId('player-other-day')).toBeVisible()
    await page.getByTestId('player-rpe-6').click()
    await page.getByTestId('player-done').click()
    await expect(page).toHaveURL(/\/plan\/block/)
    const c = (await athlete(page)).trainingBlocks[0].completions
    expect(c).toEqual([expect.objectContaining({ sessionId: next.session.id, day: today(), planDay: next.planned })])
    await page.goto('/plan/start', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId(`start-occ-${next.session.id}-${next.planned}`)).toHaveCount(0)
    await expect(page.getByTestId(`start-occ-${todo.today[0].session.id}-${todo.today[0].planned}`)).toBeVisible()
    // Verpasste Einheit nachholen, ebenfalls über den Kalender erreichbar.
    await page.getByTestId(`start-occ-${missed.session.id}-${missed.planned}`).click()
    await expect(page.getByTestId('player-other-day')).toBeVisible()
    await page.getByTestId('player-rpe-5').click()
    await page.getByTestId('player-done').click()
    const c2 = (await athlete(page)).trainingBlocks[0].completions
    expect(c2[1]).toMatchObject({ sessionId: missed.session.id, planDay: missed.planned })
  })

  test('Kalender: «Jetzt durchführen» öffnet den Player mit diesem Termin', async ({ page }) => {
    const block = mk({ startDay: mondayOfToday(), sessions: [1, 2, 3, 4, 5, 6, 7].map((d) => mkSession(`s${d}`, d)) })
    const { openToDo } = await import('../src/domain/trainingBlock')
    const next = openToDo(block, today()).upcoming[0]
    await seed(page, [block])
    await page.goto(`/plan/heute?s=${next.session.id}&d=${next.planned}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('player-other-day')).toBeVisible()
    await expect(page.getByRole('button', { pressed: true })).toHaveCount(1)
  })

  test('eigene Einheit zusammenstellen → Player → Trainingslog; kein Termin wird abgehakt', async ({ page }) => {
    const block = mk({ startDay: mondayOfToday() })
    await seed(page, [block])
    await page.goto('/plan/start', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('start-build').click()
    await expect(page.getByTestId('free-build')).toBeVisible()
    await expect(page.getByTestId('free-build-start')).toBeDisabled()
    await page.getByTestId('free-name').fill('Beine frei')
    await page.getByTestId('free-search').fill('Goblet')
    await page.getByTestId('free-add-EX_KB_082_GOBLET_SQUAT').click()
    await expect(page.getByTestId('free-sets-0')).toContainText('3')
    await page.getByTestId('free-build-start').click()
    await expect(page.getByTestId('free-player')).toBeVisible()
    await expect(page.getByTestId('free-player')).toContainText('Beine frei')
    await page.getByTestId('setlog-0-0-reps').fill('10')
    await page.getByTestId('setlog-tick-0-0').click()
    await page.getByTestId('free-minutes').fill('40')
    await page.getByTestId('free-rpe-7').click()
    await page.getByTestId('free-save').click()
    await expect(page).toHaveURL(/\/training$/)
    const a = await athlete(page)
    expect(a.trainingBlocks[0].completions).toEqual([])
    const w = a.workouts.find((x: { title: string }) => x.title === 'Beine frei')
    expect(w.exercises[0].sets[0]).toMatchObject({ reps: 10 })
    const day = a.diary.find((e: { day: string }) => e.day === today())
    expect(day.sessions).toContainEqual(expect.objectContaining({ durationMin: 40, rpe: 7, note: 'frei:Beine frei', id: w.diarySessionId }))
  })

  test('Einheit aus dem Katalog starten; ohne Einheit erklärt der Player den Weg zurück', async ({ page }) => {
    await seed(page, [])
    await page.goto('/plan/frei/katalog', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('free-plan-PLN_STR_BASE_8W').click()
    await expect(page.getByTestId('free-sessions')).toBeVisible()
    const first = weeksOf('PLN_STR_BASE_8W')[0].sessions[0].name
    await page.getByTestId('free-session-0').click()
    await expect(page.getByTestId('free-player')).toContainText(first.slice(0, 20))
    // Direkt aufgerufen (ohne gewählte Einheit im Navigationszustand).
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await page.goto('/plan/frei', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('free-player')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Training starten/ })).toBeVisible()
  })

  test('«Etwas eintragen» öffnet den Editor im Trainingslog', async ({ page }) => {
    await seed(page, [])
    await page.goto('/plan/start', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('start-log').click()
    await expect(page.getByTestId('workout-editor')).toBeVisible()
  })
})
