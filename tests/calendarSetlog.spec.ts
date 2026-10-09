import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'
import { openDemo } from './helpers'

/**
 * Kalender mit echten Terminen (frei verschiebbar, verpasste nachholen),
 * Satz-Log und Ersatz im Session Player (Schema 42).
 */
const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeksOf = (id: string) => JSON.parse(readFileSync(new URL(`plans/${id}.json`, dir), 'utf8')) as PlanWeek[]

const mkSession = (id: string, day: number, over: Record<string, unknown> = {}) => ({ id, day, weekFrom: 1, weekTo: null, kind: 'open', title: '', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false, ...over })
const mk = (over: Record<string, unknown> = {}) =>
  ({ id: 'b', name: '', family: 'hybrid', disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions: [mkSession('a', 1, { highIntensity: true }), mkSession('k', 3, { highIntensity: true }), mkSession('e', 5)], completions: [], libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [], moves: [], status: 'active', createdAt: '', updatedAt: '', ...over }) as unknown as StoredTrainingBlock
const doneOn = (sessionId: string, day: string, planDay: string | null = null) => ({ sessionId, day, durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null, feedback: null, pain: false, planDay, sets: [], swaps: [] })

test.describe('Termine: Fachlogik', () => {
  test('Termine haben echte Daten; ein verschobener Termin liegt nur in seiner Woche woanders', async () => {
    const { occurrences, moveOccurrence, openSessionsOn, calendarWeek } = await import('../src/domain/trainingBlock')
    const b = mk()
    expect(occurrences(b)).toHaveLength(12)
    const r = moveOccurrence(b, 'e', '2026-10-09', '2026-10-11', '2026-10-06', 'now')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(openSessionsOn(r.block, '2026-10-09').map((s) => s.id)).toEqual([])
    expect(openSessionsOn(r.block, '2026-10-11').map((s) => s.id)).toEqual(['e'])
    expect(openSessionsOn(r.block, '2026-10-16').map((s) => s.id)).toEqual(['e'])
    expect(calendarWeek(r.block, 1)[6].sessions.map((x) => x.session.id)).toEqual(['e'])
    // Zurück auf den geplanten Tag: Verschiebung weg.
    const back = moveOccurrence(r.block, 'e', '2026-10-09', '2026-10-09', '2026-10-06', 'now')
    expect(back.ok && back.block.moves).toEqual([])
  })

  test('gesperrt: Erledigtes, Vergangenheit, zwei Schlüsseleinheiten an einem Tag, mehr als zwei Wochen nach Blockende', async () => {
    const { moveOccurrence } = await import('../src/domain/trainingBlock')
    const b = mk({ completions: [doneOn('a', '2026-10-05')] })
    expect(moveOccurrence(b, 'a', '2026-10-05', '2026-10-08', '2026-10-05', 'n')).toEqual({ ok: false, error: 'done' })
    expect(moveOccurrence(b, 'e', '2026-10-09', '2026-10-04', '2026-10-05', 'n')).toEqual({ ok: false, error: 'past' })
    expect(moveOccurrence(b, 'a', '2026-10-12', '2026-10-07', '2026-10-05', 'n')).toEqual({ ok: false, error: 'two_key' })
    expect(moveOccurrence(b, 'e', '2026-10-30', '2026-11-16', '2026-10-05', 'n')).toEqual({ ok: false, error: 'out_of_range' })
    expect(moveOccurrence(b, 'e', '2026-10-30', '2026-11-15', '2026-10-05', 'n').ok).toBe(true)
    expect(moveOccurrence(b, 'x', '2026-10-30', '2026-11-15', '2026-10-05', 'n')).toEqual({ ok: false, error: 'unknown_occurrence' })
  })

  test('Hinweise statt Sperre: harte Tage hintereinander, Wettkampfnähe, voller Tag, außerhalb des Blocks', async () => {
    const { moveWarnings } = await import('../src/domain/trainingBlock')
    const b = mk({ eventDay: '2026-10-25' })
    expect(moveWarnings(b, 'a', '2026-10-12', '2026-10-13')).toContain('key_adjacent')
    expect(moveWarnings(b, 'a', '2026-10-19', '2026-10-24')).toContain('event_close')
    expect(moveWarnings(b, 'e', '2026-10-09', '2026-11-03')).toContain('outside_block')
    const crowded = mk({ sessions: [mkSession('a', 1), mkSession('c', 1), mkSession('e', 5)] })
    expect(moveWarnings(crowded, 'e', '2026-10-09', '2026-10-05')).toContain('crowded')
  })

  test('verpasst = vor heute, nicht erledigt; verschoben erledigt zählt über den geplanten Tag', async () => {
    const { missedOccurrences, weekChecks } = await import('../src/domain/trainingBlock')
    const b = mk({ completions: [doneOn('a', '2026-10-06', '2026-10-05')] })
    expect(missedOccurrences(b, '2026-10-10').map((o) => o.session.id)).toEqual(['k', 'e'])
    expect(weekChecks(b, '2026-10-10')[0]).toEqual({ week: 1, planned: 3, done: 1 })
  })

  test('Serie verschieben (Override) löscht einzelne Verschiebungen dieser Einheit', async () => {
    const { moveOccurrence, overrideSession } = await import('../src/domain/trainingBlock')
    const r = moveOccurrence(mk(), 'e', '2026-10-09', '2026-10-10', '2026-10-05', 'n')
    if (!r.ok) throw new Error('move')
    const o = overrideSession(r.block, 'e', { day: 6 }, 'Schicht', 'n')
    expect(o.ok && o.block.moves).toEqual([])
  })

  test('Schema 42: Blöcke bekommen leere Verschiebungen, Abschlüsse leeres Satz-Log', async () => {
    const { emptyData, parseStoredData, CURRENT_SCHEMA_VERSION } = await import('../src/lib/store/schema')
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(42)
    const old = emptyData() as any
    old.version = 41
    old.athletes[0].trainingBlocks = [{ ...mk(), moves: undefined, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', completions: [{ sessionId: 'a', day: '2026-10-05', durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null, feedback: null, pain: false }] }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(41)
    expect(report.rejected).toEqual([])
    const b = data!.athletes[0].trainingBlocks[0]
    expect(b.moves).toEqual([])
    expect(b.completions[0]).toMatchObject({ planDay: null, sets: [], swaps: [] })
  })
})

test.describe('Satz-Log und Ersatz: Fachlogik', () => {
  test('Parametervertrag → höchstens drei Felder; Gewicht nur, wo die Übung Last kennt', async () => {
    const { setFieldsFor, firstNumber } = await import('../src/domain/library')
    expect(setFieldsFor(['sets', 'reps', 'load_kg', 'rir'])).toEqual(['weightKg', 'reps', 'rir'])
    expect(setFieldsFor(['sets', 'reps_or_time', 'rpe'])).toEqual(['reps', 'rpe'])
    expect(setFieldsFor(['sets', 'duration_s'])).toEqual(['durationS', 'rpe'])
    for (const e of exercises) expect(setFieldsFor(e.parameters).length, e.id).toBeLessThanOrEqual(3)
    expect(firstNumber('6–8')).toBe(6)
    expect(firstNumber('30 s')).toBe(30)
    expect(firstNumber(null)).toBeNull()
  })

  test('Ersatz: Plan-Ersatz zuerst, gleiches Muster, nie «nur mit Trainer» für eine selbst geführte Übung', async () => {
    const { substituteOptions } = await import('../src/domain/library')
    const goblet = exercises.find((e) => e.id === 'EX_KB_082_GOBLET_SQUAT')!
    const opts = substituteOptions(goblet, exercises, { EX_KB_082_GOBLET_SQUAT: ['EX_BW_046_EINBEINIGE_BECKENHEBUNG'] })
    expect(opts[0]).toMatchObject({ fromPlan: true })
    expect(opts.length).toBeGreaterThan(1)
    for (const o of opts.filter((x) => !x.fromPlan)) expect(o.exercise.patterns.some((p) => goblet.patterns.includes(p))).toBe(true)
    if (goblet.coachGate !== 'COACH_REQUIRED') for (const o of opts) expect(o.exercise.coachGate).not.toBe('COACH_REQUIRED')
  })

  test('Satz-Log → Trainingslog: nur Sätze mit Wiederholungen, alte Kennung wo es eine gibt, ohne Dauer und RPE', async () => {
    const { workoutFromSets } = await import('../src/domain/setLog')
    let n = 0
    const w = workoutFromSets(
      [
        { part: 0, exerciseId: 'EX_STR_BAR_001_KNIEBEUGE', name: 'Kniebeuge', set: 1, reps: 5, weightKg: 80, rir: 2, rpe: null, durationS: null, distanceM: null },
        { part: 0, exerciseId: 'EX_STR_BAR_001_KNIEBEUGE', name: 'Kniebeuge', set: 2, reps: 5, weightKg: 80, rir: 7, rpe: null, durationS: null, distanceM: null },
        { part: 1, exerciseId: 'EX_CORE_X', name: 'Plank', set: 1, reps: null, weightKg: null, rir: null, rpe: 6, durationS: 45, distanceM: null },
        { part: 2, exerciseId: 'EX_NEU', name: 'Neu', set: 1, reps: 10, weightKg: null, rir: null, rpe: 7, durationS: null, distanceM: null },
      ],
      { id: 'w', day: '2026-10-05', title: 'Kraft', diarySessionId: 'd', now: 'n', newId: () => `i${n++}`, legacyOf: (id) => (id === 'EX_STR_BAR_001_KNIEBEUGE' ? 'back_squat' : undefined) },
    )
    expect(w).toMatchObject({ durationMin: null, rpe: null, diarySessionId: 'd' })
    expect(w!.exercises).toHaveLength(2)
    expect(w!.exercises[0]).toMatchObject({ exerciseKey: 'back_squat', customName: '' })
    expect(w!.exercises[0].sets[1].rir).toBeNull()
    expect(w!.exercises[1]).toMatchObject({ exerciseKey: 'custom', customName: 'Neu' })
    expect(w!.exercises[1].sets[0].weightKg).toBe(0)
  })

  test('Ersatz übernehmen: künftige Einheiten tauschen, Dosis und Regel bleiben, neue Version, rücknehmbar', async () => {
    const { materializePlan } = await import('../src/domain/library')
    const { applySubstitution, revertLast } = await import('../src/domain/adaptation')
    const p = index.plans.find((x) => x.plan_id === 'PLN_STR_BASE_8W')!
    const block = materializePlan(p, weeksOf(p.plan_id), index, exercises, { id: 'b', startDay: '2026-10-05', now: 'n', disciplineId: null })
    const first = block.sessions.flatMap((s) => s.blocks).find((x) => x.type === 'library_exercise')!
    if (first.type !== 'library_exercise') throw new Error('x')
    const next = applySubstitution(block, { from: first.exerciseId, fromName: first.name, to: 'EX_NEU', toName: 'Neu' }, { id: 'adj', now: 'n', today: '2026-10-19' })
    expect(next.planVersion).toBe(2)
    expect(next.adjustments[0]).toMatchObject({ source: 'substitution', intentPct: 0 })
    const parts = (b: typeof block) => b.sessions.flatMap((s) => s.blocks.map((x) => ({ s, x }))).filter(({ x }) => x.type === 'library_exercise')
    for (const { s, x } of parts(next)) {
      if (x.type !== 'library_exercise') continue
      if (s.weekFrom < 3) expect(x.exerciseId).not.toBe('EX_NEU')
    }
    const swapped = parts(next).filter(({ x }) => x.type === 'library_exercise' && x.exerciseId === 'EX_NEU')
    expect(swapped.length).toBeGreaterThan(0)
    for (const { x } of swapped) if (x.type === 'library_exercise') expect(x).toMatchObject({ name: 'Neu', sets: expect.anything() })
    const back = revertLast(next, { id: 'r', now: 'n' })
    expect(parts(back).some(({ x }) => x.type === 'library_exercise' && x.exerciseId === 'EX_NEU')).toBe(false)
  })
})

test.describe('Bildschirme', () => {
  const today = () => new Date().toISOString().slice(0, 10)
  const mondayOfToday = () => {
    const d = new Date()
    const wd = ((d.getUTCDay() + 6) % 7) + 1
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
  }

  test('Player: Satz-Log mit Haken, Ersatz «auch künftig», Abschluss schreibt Satz-Log, Workout und neue Planversion', async ({ page }) => {
    const { materializePlan } = await import('../src/domain/library')
    const { moveOccurrence, occurrences } = await import('../src/domain/trainingBlock')
    const p = index.plans.find((x) => x.plan_id === 'PLN_STR_BASE_8W')!
    let block = materializePlan(p, weeksOf(p.plan_id), index, exercises, { id: 'b-lib', startDay: mondayOfToday(), now: new Date().toISOString(), disciplineId: null })
    const o = occurrences(block).find((x) => x.week === 1 && x.session.blocks[0]?.type === 'library_exercise')!
    if (o.date !== today()) {
      const r = moveOccurrence(block, o.session.id, o.planned, today(), today(), new Date().toISOString())
      if (!r.ok) throw new Error(r.error)
      block = r.block
    }
    await openDemo(page)
    await page.evaluate((b) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = [b]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, block)
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('set-logger')).toBeVisible()
    await expect(page.getByTestId('setlog-part-0')).toBeVisible()
    await page.getByTestId('setlog-swap-0').click()
    const option = page.locator('[data-testid^="setlog-option-"]').first()
    const toId = ((await option.getAttribute('data-testid')) as string).replace('setlog-option-', '')
    await option.click()
    await expect(page.getByTestId('setlog-swapped-0')).toBeVisible()
    await page.getByTestId('setlog-keep-0').check()
    const firstField = page.locator('[data-testid^="setlog-0-0-"]').first()
    await firstField.fill('8')
    await page.getByTestId('setlog-tick-0-0').click()
    await expect(page.getByTestId('setlog-count')).toContainText('1')
    await page.getByTestId('player-rpe-6').click()
    await page.getByTestId('player-done').click()
    await expect(page).toHaveURL(/\/plan\/block/)
    const a = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0])
    const b = a.trainingBlocks[0]
    const c = b.completions[0]
    expect(c.sets).toHaveLength(1)
    expect(c.sets[0]).toMatchObject({ part: 0, exerciseId: toId, set: 1 })
    expect(c.swaps).toEqual([expect.objectContaining({ part: 0, to: toId })])
    expect(c.planDay).toBe(o.planned === today() ? null : o.planned)
    expect(b.planVersion).toBe(2)
    expect(b.adjustments[0].source).toBe('substitution')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
  })

  test('Kalender: verpasste Einheit heute nachholen → sie steht im Player', async ({ page }) => {
    const start = new Date(Date.parse(`${mondayOfToday()}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
    await openDemo(page)
    await page.evaluate(([s, sess]) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].trainingBlocks = [{ id: 'b1', family: 'hybrid', disciplineId: 'hyrox', phase: 'BUILD', startDay: s, weeks: 4, retestMetrics: [], templateId: null, eventDay: null, sessions: [sess], completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, [start, mkSession('m1', 1, { primaryIntent: 'AEROBIC_BASE', weekTo: 1 })] as const)
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('cal-missed')).toBeVisible()
    await page.getByTestId('cal-catchup-m1').click()
    await expect(page.getByTestId('cal-missed')).toHaveCount(0)
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('session-player')).toBeVisible()
    await expect(page.getByTestId('player-moved')).toBeVisible()
  })
})
