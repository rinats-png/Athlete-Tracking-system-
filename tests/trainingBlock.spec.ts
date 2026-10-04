import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { planBlock, type PlanInput } from '../src/domain/trainingPlan'
import { adoptBlock, blockEndDay, blockReport, blockWeek, mondayOnOrAfter, openSessionsOn, overrideSession, weekChecks, weekdayOf } from '../src/domain/trainingBlock'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'
import type { RequirementRow } from '../src/domain/requirementGap'
import type { StoredResult } from '../src/lib/store/localStore'

/** Etappe 10: Trainingsblock, Coach Override, Wochenprüfung, Block-Bericht, Player. */

const row = (dimension: RequirementRow['dimension'], measurements: number): RequirementRow => ({ axisId: String(dimension), dimension, requirement: 0.9, score: 30, leverage: 50, open: true, measurements, evidence: 'strong' })
const input: PlanInput = { family: 'combat_grappling', phase: 'BUILD', trainingAgeYears: 5, availableDays: [1, 2, 3, 4, 6], fixedSessions: [{ day: 5, kind: 'hard_rounds' }], maxSessionMinutes: null, gaps: [row('endurance', 3), row('power', 2)], hrMaxPlausible: true, mode: 'preview' }
const NOW = '2026-10-04T09:00:00.000Z'
const mk = () => adoptBlock(planBlock(input), { id: 'b1', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: '2026-10-04', now: NOW })

const result = (day: string, score: number): StoredResult =>
  ({ id: `r-${day}`, testSlug: 'countermovement_jump', performedAt: `${day}T09:00:00.000Z`, values: {}, metrics: {}, score, bodyWeightKg: 80, ageYears: 28, sex: 'male', assessmentId: null, attempts: [], attemptSelection: null, protocol: { version: null, method: null, tester: '', deviation: '', abortReason: '', invalidAttempts: [] }, context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' }, photo: null, createdAt: `${day}T09:00:00.000Z` }) as StoredResult

test.describe('Block: Fachlogik', () => {
  test('Wochentage und Montag: der Block beginnt am Montag nach dem Wunschtag', () => {
    expect(weekdayOf('2026-10-05')).toBe(1)
    expect(weekdayOf('2026-10-04')).toBe(7)
    expect(mondayOnOrAfter('2026-10-04')).toBe('2026-10-05')
    expect(mondayOnOrAfter('2026-10-05')).toBe('2026-10-05')
    expect(mondayOnOrAfter('2026-10-06')).toBe('2026-10-12')
  })

  test('Übernahme: Momentaufnahme der Einheiten, Messung am Blockende, Ende nach sechs Wochen', () => {
    const b = mk()
    expect(b.startDay).toBe('2026-10-05')
    expect(blockEndDay(b)).toBe('2026-11-15')
    expect(b.sessions.map((s) => [s.id, s.day, s.ruleId])).toEqual([['vo2_4x4-d1', 1, 'vo2_4x4'], ['power_30_70-d2', 2, 'power_30_70']])
    expect(b.retestMetrics).toEqual(['vo2max_ergospirometry', 'countermovement_jump'])
    expect(b.sessions.every((s) => !s.coachModified && !s.removed)).toBe(true)
  })

  test('Woche im Block', () => {
    const b = mk()
    expect(blockWeek(b, '2026-10-04')).toBe('before')
    expect(blockWeek(b, '2026-10-05')).toBe(1)
    expect(blockWeek(b, '2026-10-11')).toBe(1)
    expect(blockWeek(b, '2026-10-12')).toBe(2)
    expect(blockWeek(b, '2026-11-15')).toBe(6)
    expect(blockWeek(b, '2026-11-16')).toBe('after')
  })

  test('Coach Override: ohne Grund keine Änderung, kein zweiter Schlüsseltag, Änderung bleibt sichtbar', () => {
    const b = mk()
    expect(overrideSession(b, 'vo2_4x4-d1', { day: 3 }, '  ', NOW)).toEqual({ ok: false, error: 'reason_required' })
    expect(overrideSession(b, 'nix', { day: 3 }, 'Grund', NOW)).toEqual({ ok: false, error: 'unknown_session' })
    expect(overrideSession(b, 'vo2_4x4-d1', { day: 2 }, 'Grund', NOW)).toEqual({ ok: false, error: 'day_taken' })
    expect(overrideSession(b, 'vo2_4x4-d1', {}, 'Grund', NOW)).toEqual({ ok: false, error: 'nothing_changed' })
    const moved = overrideSession(b, 'vo2_4x4-d1', { day: 3 }, 'Turnier am Montag', NOW)
    expect(moved.ok).toBe(true)
    if (moved.ok) {
      const s = moved.block.sessions[0]
      expect([s.day, s.coachModified, s.coachModificationReason]).toEqual([3, true, 'Turnier am Montag'])
      // Das Original bleibt unverändert (reine Funktion).
      expect(b.sessions[0].day).toBe(1)
      const gone = overrideSession(moved.block, 'vo2_4x4-d1', { removed: true }, 'Verletzungspause', NOW)
      expect(gone.ok && gone.block.sessions[0].removed).toBe(true)
    }
  })

  test('offene Einheiten des Tages und Wochenprüfung zählen nur Abgeschlossenes', () => {
    const b = mk()
    expect(openSessionsOn(b, '2026-10-05').map((s) => s.id)).toEqual(['vo2_4x4-d1'])
    expect(openSessionsOn(b, '2026-10-07')).toEqual([])
    const done = { ...b, completions: [{ sessionId: 'vo2_4x4-d1', day: '2026-10-05', durationMin: 25, rpe: 8, diarySessionId: 'x' }] }
    expect(openSessionsOn(done, '2026-10-05')).toEqual([])
    expect(weekChecks(done, '2026-10-14')).toEqual([
      { week: 1, planned: 2, done: 1 },
      { week: 2, planned: 2, done: 0 },
    ])
    expect(weekChecks(done, '2026-10-04')).toEqual([])
    expect(openSessionsOn({ ...b, status: 'closed' }, '2026-10-05')).toEqual([])
  })

  test('Block-Bericht: offen bis zur Messung, danach gegen die Messschwankung; fehlende Messung nur am Ende ein Fehlen', () => {
    const b = mk()
    const before = blockReport(b, [], '2026-11-01')
    expect(before.finished).toBe(false)
    expect(before.planned).toBe(12)
    expect(before.metrics.map((m) => m.status)).toEqual(['open', 'open'])
    const after = blockReport(b, [], '2026-11-20')
    expect(after.finished).toBe(true)
    // Eine Messung der Sprunghöhe in der letzten Woche, eine davor.
    const results = [result('2026-09-20', 40), result('2026-11-12', 44)]
    const rep = blockReport(b, results, '2026-11-20')
    const jump = rep.metrics.find((m) => m.metric === 'countermovement_jump')!
    expect(jump.status).toBe('measured')
    expect(['better', 'within_noise', 'unknown_error']).toContain(jump.report?.verdict)
    expect(rep.metrics.find((m) => m.metric === 'vo2max_ergospirometry')!.status).toBe('open')
    // Außerhalb des Fensters (zu früh) zählt nicht.
    expect(blockReport(b, [result('2026-10-20', 44)], '2026-11-20').metrics.every((m) => m.status === 'open')).toBe(true)
  })

  test('Schema 33: ein Bestand der Version 32 bekommt leere Trainingsblöcke', () => {
    const old = { ...emptyData(), version: 32 } as any
    for (const a of old.athletes) delete a.trainingBlocks
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(32)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(33)
    expect(data?.athletes[0].trainingBlocks).toEqual([])
  })
})

test.describe('Block: Bildschirme', () => {
  const prepare = async (page: import('@playwright/test').Page) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      data.athletes[0].profile.trainingAgeYears = 6
      data.athletes[0].profile.maxHr = 195
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
  }

  const seedBlock = async (page: import('@playwright/test').Page, sessions: unknown[]) =>
    page.evaluate((list) => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const today = new Date()
      const wd = ((today.getUTCDay() + 6) % 7) + 1
      const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
      const now = new Date().toISOString()
      data.athletes[0].trainingBlocks = [{ id: 'b1', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: ['countermovement_jump'], sessions: list, completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    }, sessions)
  const sess = (id: string, day: number, ruleId = 'vo2_4x4', intent = 'VO2MAX') => ({ id, day, ruleId, ruleVersion: '1.0.0', primaryIntent: intent, evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, highIntensity: true, blocks: [{ type: 'interval', modality: 'mixed', repetitions: 4, workSeconds: 240, recoverySeconds: 180, intensity: { type: 'hr_percent_max', min: 90, max: 95 } }], retestMetric: 'countermovement_jump', coachModified: false, coachModificationReason: null, removed: false })

  test('Einheit mit Grund ändern; ohne Grund und auf einen belegten Tag wird abgewiesen', async ({ page }) => {
    await prepare(page)
    await seedBlock(page, [sess('s1', 1), sess('s2', 3, 'power_30_70', 'POWER')])
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-block')).toBeVisible()
    await page.getByTestId('block-edit-open-s1').click()
    await page.getByTestId('block-edit-day').selectOption('7')
    await page.getByTestId('block-edit-move').click()
    await expect(page.getByTestId('block-edit-error')).toBeVisible()
    await page.getByTestId('block-edit-day').selectOption('3')
    await page.getByTestId('block-edit-reason').fill('Test')
    await page.getByTestId('block-edit-move').click()
    await expect(page.getByTestId('block-edit-error')).toBeVisible()
    await page.getByTestId('block-edit-day').selectOption('7')
    await page.getByTestId('block-edit-reason').fill('Turnier am Wochenende')
    await page.getByTestId('block-edit-move').click()
    await expect(page.getByTestId('block-reason-s1')).toContainText('Turnier am Wochenende')
    expect(await page.getByTestId('plan-block').innerText()).not.toMatch(/block\.[a-z]+\.|\{\{/)
    await page.getByTestId('block-edit-open-s2').click()
    await page.getByTestId('block-edit-reason').fill('Verletzungspause')
    await page.getByTestId('block-edit-remove').click()
    await expect(page.getByTestId('block-reason-s2')).toContainText('Verletzungspause')
  })

  test('Block zu Ende: nächste Phase vorgeschlagen, Plan öffnet damit; abgeschlossen bleibt zur Ansicht', async ({ page }) => {
    await prepare(page)
    await page.evaluate((list) => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      // Beginn vor zehn Wochen, an einem Montag: der Block (6 Wochen) ist vorbei.
      const d = new Date(Date.now() - 70 * 86_400_000)
      const wd = ((d.getUTCDay() + 6) % 7) + 1
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
      data.athletes[0].trainingBlocks = [{ id: 'b1', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: ['countermovement_jump'], sessions: list, completions: [], status: 'active', createdAt: now, updatedAt: now }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    }, [sess('s1', 1)])
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('block-next')).toBeVisible()
    await expect(page.getByTestId('block-next-missing')).toBeVisible()
    await page.getByTestId('block-next-plan').click()
    await expect(page).toHaveURL(/\/plan\/neu\?phase=SPECIFIC/)
    await expect(page.getByTestId('plan-phase')).toHaveValue('SPECIFIC')
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('block-close').click()
    await expect(page.getByTestId('block-closed')).toBeVisible()
    await expect(page.getByTestId('block-edit-open-s1')).toHaveCount(0)
    await expect(page.getByTestId('block-close')).toHaveCount(0)
    expect(await page.getByTestId('plan-block').innerText()).not.toMatch(/block\.[a-z]+\.|\{\{/)
  })

  test('Player: Einheit abschließen legt Last ins Tagebuch und zählt in der Woche', async ({ page }) => {
    await prepare(page)
    await page.evaluate(() => {
      // Ein Block, der heute beginnt und an jedem Wochentag eine Einheit hat.
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const today = new Date()
      const wd = ((today.getUTCDay() + 6) % 7) + 1
      const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (wd - 1))).toISOString().slice(0, 10)
      const now = new Date().toISOString()
      data.athletes[0].trainingBlocks = [
        {
          id: 'b1', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: monday, weeks: 6, retestMetrics: ['countermovement_jump'],
          sessions: [{ id: 's1', day: wd, ruleId: 'vo2_4x4', ruleVersion: '1.0.0', primaryIntent: 'VO2MAX', evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, highIntensity: true, blocks: [{ type: 'interval', modality: 'mixed', repetitions: 4, workSeconds: 240, recoverySeconds: 180, intensity: { type: 'hr_percent_max', min: 90, max: 95 } }], retestMetric: 'countermovement_jump', coachModified: false, coachModificationReason: null, removed: false }],
          completions: [], status: 'active', createdAt: now, updatedAt: now,
        },
      ]
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('session-player')).toBeVisible()
    await expect(page.getByTestId('player-clock')).toHaveText('4:00')
    await page.getByTestId('player-toggle').click()
    await expect.poll(async () => (await page.getByTestId('player-clock').innerText())).not.toBe('4:00')
    await page.getByTestId('player-toggle').click()
    await page.getByTestId('player-rpe-8').click()
    await page.getByTestId('player-done').click()
    await expect(page.getByTestId('plan-block')).toBeVisible()
    await expect(page.getByTestId('block-check-1')).toContainText('1 von 1')
    const diary = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].diary)
    const sessions = diary.flatMap((e: { sessions: { note: string; rpe: number; kind: string }[] }) => e.sessions).filter((s: { note: string }) => s.note.startsWith('plan:'))
    expect(sessions).toHaveLength(1)
    expect([sessions[0].rpe, sessions[0].kind]).toEqual([8, 'endurance'])
    // Zweites Abschließen am selben Tag ist ausgeschlossen: nichts mehr offen.
    await page.goto('/plan/heute', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('session-player')).toHaveCount(0)
  })
})

import { nextBlockSuggestion, shownBlock } from '../src/domain/trainingBlock'
import { weeklyReport } from '../src/domain/weeklyReport'

test.describe('ADAPT und Bericht (Etappe 11)', () => {
  test('nächste Phase als Vorschlag; unbelegte und fehlende Retests benannt', () => {
    const b = mk()
    const none = blockReport(b, [], '2026-11-20')
    expect(nextBlockSuggestion(b, none)).toEqual({ phase: 'SPECIFIC', unproven: [], missing: ['vo2max_ergospirometry', 'countermovement_jump'] })
    const noise = blockReport(b, [result('2026-09-20', 40), result('2026-11-12', 40.2)], '2026-11-20')
    const sug = nextBlockSuggestion(b, noise)
    expect(sug.unproven).toEqual(['countermovement_jump'])
    expect(sug.missing).toEqual(['vo2max_ergospirometry'])
    expect(nextBlockSuggestion({ ...b, phase: 'GPP' }, none).phase).toBe('BUILD')
    expect(nextBlockSuggestion({ ...b, phase: 'SPECIFIC' }, none).phase).toBe('SPECIFIC')
  })

  test('gezeigt wird der aktive Block, sonst der zuletzt geänderte abgeschlossene', () => {
    const a = { ...mk(), id: 'a', status: 'closed' as const, updatedAt: '2026-10-01T00:00:00.000Z' }
    const c = { ...mk(), id: 'c', status: 'closed' as const, updatedAt: '2026-11-01T00:00:00.000Z' }
    const act = { ...mk(), id: 'act' }
    expect(shownBlock([])).toBeNull()
    expect(shownBlock([a, c])!.id).toBe('c')
    expect(shownBlock([a, c, act])!.id).toBe('act')
  })

  test('Wochenbericht: Block für Athlet und Eltern, nie für den Verband', () => {
    const a = emptyData().athletes[0]
    const inp = { athlete: { profile: a.profile, results: [], workouts: [], diary: [] }, reminders: { remindersEnabled: false, reminderIntervalDays: {} }, trainingBlocks: [{ ...mk(), completions: [{ sessionId: 'vo2_4x4-d1', day: '2026-10-12', durationMin: 25, rpe: 8, diarySessionId: 'x' }] }] }
    const at = new Date('2026-10-14T08:00:00.000Z')
    const find = (r: 'athlete' | 'parents' | 'association') => weeklyReport(inp, r, at).facts.find((f) => f.key === 'block')
    expect(find('athlete')?.params).toEqual({ week: 2, weeks: 6, done: 1, planned: 2 })
    expect(find('parents')?.params).toEqual({ week: 2, weeks: 6, done: 1, planned: 2 })
    expect(find('association')).toBeUndefined()
    // Ohne Block oder außerhalb des Zeitraums: keine Zeile.
    expect(weeklyReport({ ...inp, trainingBlocks: [] }, 'athlete', at).facts.some((f) => f.key === 'block')).toBe(false)
    expect(weeklyReport(inp, 'athlete', new Date('2026-12-01T08:00:00.000Z')).facts.some((f) => f.key === 'block')).toBe(false)
  })
})
