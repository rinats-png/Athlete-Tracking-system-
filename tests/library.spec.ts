import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import type { LibraryExercise, PlanWeek, ProgramIndex } from '../src/domain/libraryTypes'

/**
 * Trainingsbibliothek (Übungsdatenbank v1.1 + Programm-Seed v4): die
 * Regelkette als Prüffall. Was der Verifier des Pakets nicht prüft — ob jede
 * Position in den Grenzen ihrer Methodenregel liegt, ob Intent und Übung
 * zusammenpassen, ob ein Plan lockerer ist als seine strengste Methode —,
 * prüft dieser Fall bei jedem Bau.
 */
const dir = new URL('../src/data/library/', import.meta.url)
const exercises = JSON.parse(readFileSync(new URL('exerciseRegistry.json', dir), 'utf8')) as LibraryExercise[]
const index = JSON.parse(readFileSync(new URL('programIndex.json', dir), 'utf8')) as ProgramIndex
const weeksOf = (id: string) => JSON.parse(readFileSync(new URL(`plans/${id}.json`, dir), 'utf8')) as PlanWeek[]

const PATTERNS = ['SQUAT_KNEE_DOMINANT', 'HINGE_HIP_EXTENSION', 'HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PULL', 'CARRY', 'ROTATION', 'ANTI_ROTATION', 'ANTI_EXTENSION_STABILITY', 'ANTI_LATERAL_FLEXION', 'JUMP_PLYOMETRIC', 'THROW_BALLISTIC', 'LOCOMOTION_SPRINT', 'COD_DECELERATION', 'REACTIVE_AGILITY', 'MOBILITY_ROM', 'WEIGHTLIFTING_TECHNIQUE', 'CONDITIONING_CYCLIC_MIXED', 'ISOMETRIC_FORCE', 'ACCESSORY_ISOLATION']
const CAUTION = ['knee_load', 'lumbar_trunk_load', 'shoulder_load', 'elbow_grip_load', 'hamstring_high_tension', 'achilles_foot_impact', 'wrist_front_rack_or_overhead', 'high_velocity', 'high_contact_plyometric', 'high_technical_complexity', 'avoid_forced_rom']

test.describe('Übungsdatenbank', () => {
  test('128 Übungen, eindeutige Kennungen, kontrollierte Vokabulare (Golden Cases Kap. 20)', () => {
    expect(exercises).toHaveLength(128)
    expect(new Set(exercises.map((e) => e.id)).size).toBe(128)
    for (const e of exercises) {
      expect(e.name.trim(), e.id).not.toBe('')
      expect(e.patterns.length, e.id).toBeGreaterThan(0)
      for (const p of e.patterns) expect(PATTERNS, `${e.id} ${p}`).toContain(p)
      for (const c of e.caution) expect(CAUTION, `${e.id} ${c}`).toContain(c)
      expect(['LOW', 'MODERATE', 'HIGH']).toContain(e.complexity)
      expect(e.steps.length, `${e.id} ohne Ausführungsschritte`).toBeGreaterThan(0)
      // HIGH-Komplexität ist nie «selbst geführt».
      if (e.complexity === 'HIGH') expect(e.coachGate, e.id).not.toBe('SELF_GUIDED_WITH_CUES')
      if (e.category === 'OLY') expect(e.complexity, `${e.id}: Oly nicht LOW`).not.toBe('LOW')
    }
    const ohs = exercises.find((e) => e.id === 'EX_OLY_075_OVERHEAD_SQUAT')!
    expect(ohs.patterns[0]).toBe('WEIGHTLIFTING_TECHNIQUE')
    expect(exercises.find((e) => e.id === 'EX_MOB_105_BAND_SHOULDER_DISLOCATE')!.name).toMatch(/Pass-Through/)
    expect(exercises.find((e) => e.id === 'EX_BW_045_MOUNTAIN_CLIMBERS')!.patterns).not.toContain('JUMP_PLYOMETRIC')
  })

  test('alte Katalogkennungen zeigen auf vorhandene Übungen beider Kataloge, keine doppelt', async () => {
    const { LEGACY_TO_REGISTRY } = await import('../src/data/library/legacyExerciseMap')
    const { EXERCISES } = await import('../src/data/exercises')
    const ids = new Set(exercises.map((e) => e.id))
    const values = Object.values(LEGACY_TO_REGISTRY)
    expect(new Set(values).size).toBe(values.length)
    for (const [legacy, id] of Object.entries(LEGACY_TO_REGISTRY)) {
      expect(EXERCISES.some((e) => e.key === legacy), legacy).toBe(true)
      expect(ids.has(id), id).toBe(true)
    }
  })

  test('Ersatzübung bleibt im Bewegungsmuster, Beinpresse ist kein Ersatz für die Kniebeuge', async () => {
    const { substitutes } = await import('../src/domain/library')
    const squat = exercises.find((e) => e.id === 'EX_STR_BAR_001_KNIEBEUGE')!
    const subs = substitutes(squat, exercises, ['eq_dumbbell', 'eq_kettlebell'])
    expect(subs.length).toBeGreaterThan(0)
    for (const s of subs) expect(s.patterns.some((p) => squat.patterns.includes(p)), s.name).toBe(true)
    expect(subs.map((s) => s.id)).not.toContain('EX_STR_ACC_022_BEINPRESSE')
    expect(subs.map((s) => s.id)).toContain('EX_STR_ACC_021_GOBLET_SQUAT')
  })
})

test.describe('Programmbibliothek', () => {
  test('16 Pläne, jede Plandatei vorhanden, Kennungen eindeutig', () => {
    expect(index.plans).toHaveLength(16)
    expect(new Set(index.plans.map((p) => p.plan_id)).size).toBe(16)
    const files = readdirSync(new URL('plans/', dir)).map((f) => f.replace('.json', ''))
    expect(files.sort()).toEqual(index.plans.map((p) => p.plan_id).sort())
    for (const p of index.plans) {
      const weeks = weeksOf(p.plan_id)
      expect(weeks.length, p.plan_id).toBe(p.weeks)
      expect(weeks.reduce((n, w) => n + w.sessions.length, 0), p.plan_id).toBe(p.sessionCount)
    }
  })

  test('Regelkette: jede Position in den Grenzen ihrer Methodenregel, Intent passt, Autonomie nie lockerer als die Methoden', async () => {
    const { auditPlan } = await import('../src/domain/library')
    let positions = 0
    for (const p of index.plans) {
      const a = auditPlan(p, weeksOf(p.plan_id), index, exercises)
      positions += a.positions
      expect(a.unknownExercises, p.plan_id).toEqual([])
      expect(a.intentMismatches, p.plan_id).toEqual([])
      expect(a.templateMismatches, p.plan_id).toEqual([])
      expect(a.autonomyTooLoose, p.plan_id).toBe(false)
      expect(a.violations, `${p.plan_id}: ${JSON.stringify(a.violations.slice(0, 3))}`).toEqual([])
    }
    expect(positions).toBe(2089)
  })

  test('alle Regeln ungeprüft → kein Plan gilt als geprüft; Quellen nur mit DOI', async () => {
    const { planReviewed } = await import('../src/domain/library')
    for (const r of index.methodRules) {
      expect(r.review_status).toBe('DRAFT_UNREVIEWED')
      for (const ref of r.evidence_refs ?? []) expect(ref.doi, r.rule_id).toMatch(/^10\.\d{4,}\//)
    }
    for (const p of index.plans) expect(planReviewed(p, index.methodRules), p.plan_id).toBe(false)
  })

  test('jeder Retest zeigt auf einen Test des Seeds UND auf einen Test des KYDON-Katalogs', async () => {
    const { SEED_TEST_TO_SLUG } = await import('../src/data/library/testMap')
    const { getTest } = await import('../src/data/testCatalog')
    const tests = new Set(index.tests.map((t) => t.test_id))
    for (const p of index.plans) for (const t of p.retest.test_ids) expect(tests.has(t), `${p.plan_id} → ${t}`).toBe(true)
    for (const t of index.tests) expect(getTest(SEED_TEST_TO_SLUG[t.test_id]), t.test_id).toBeTruthy()
  })

  test('Übernahme: Athlet nur AUTO-Pläne, «Coach empfohlen» mit Bestätigung, Coach-Pläne nur über Trainer', async () => {
    const { adoptGate } = await import('../src/domain/library')
    const byId = (id: string) => index.plans.find((p) => p.plan_id === id)!
    expect(adoptGate(byId('PLN_RUN5K_BASE_8W'), 'solo')).toBe('open')
    expect(adoptGate(byId('PLN_HYP_PPL_12W'), 'solo')).toBe('coach_only')
    expect(adoptGate(byId('PLN_HYP_PPL_12W'), 'coach')).toBe('open')
    const recommended = index.plans.find((p) => p.autonomy === 'AUTO_WITH_RULES' && p.coach_gate === 'COACH_RECOMMENDED')
    if (recommended) expect(adoptGate(recommended, 'solo')).toBe('confirm')
  })
})

test('Mengenangaben: Einheit entscheidet über die Grenze', async () => {
  const { parseAmount } = await import('../src/domain/library')
  expect(parseAmount('8–10')).toEqual({ kind: 'reps', min: 8, max: 10 })
  expect(parseAmount('30 m')).toEqual({ kind: 'distance_m', min: 30, max: 30 })
  expect(parseAmount('2 min')).toEqual({ kind: 'seconds', min: 120, max: 120 })
  expect(parseAmount('10 pro Seite')).toEqual({ kind: 'reps', min: 10, max: 10 })
  expect(parseAmount(null)).toBeNull()
})

test.describe('Übungsdatenbank: Bildschirm', () => {
  test('128 Übungen, Filter nach Muster und «allein ausführbar», Detail mit Belastungshinweis, Schritten, Ersatz und ungeprüftem Transfer', async ({ page }) => {
    const { openDemo } = await import('./helpers')
    await openDemo(page)
    await page.goto('/plan/uebungen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('exdb-list')).toContainText('128')
    await page.getByTestId('exdb-pattern-JUMP_PLYOMETRIC').click()
    await expect(page.getByTestId('exdb-item-EX_PLYO_053_DEPTH_JUMP')).toBeVisible()
    await expect(page.getByTestId('exdb-item-EX_STR_BAR_001_KNIEBEUGE')).toHaveCount(0)
    await page.getByTestId('exdb-self').check()
    await expect(page.getByTestId('exdb-item-EX_PLYO_053_DEPTH_JUMP')).toHaveCount(0)
    await page.getByTestId('exdb-pattern-all').click()
    await page.getByTestId('exdb-self').uncheck()
    await page.getByTestId('exdb-search').fill('kniebeuge (back')
    await page.getByTestId('exdb-item-EX_STR_BAR_001_KNIEBEUGE').click()
    await expect(page.getByTestId('exercise-detail')).toBeVisible()
    await expect(page.getByTestId('ex-caution')).toContainText('Knie')
    await expect(page.getByTestId('ex-steps').locator('ol li')).toHaveCount(5)
    await expect(page.getByTestId('ex-params')).toContainText('Last (kg)')
    await expect(page.getByTestId('ex-substitutes')).toContainText('Goblet')
    await expect(page.getByTestId('ex-substitutes')).not.toContainText('Beinpresse')
    await expect(page.getByTestId('ex-transfer-note')).toContainText('noch nicht')
    // Varianten-Graph: Regression ist ein Link auf die aufgelöste Übung.
    await page.getByTestId('ex-variants').getByRole('link').first().click()
    await expect(page).toHaveURL(/\/plan\/uebungen\/EX_/)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
  })
})

test.describe('Programmbibliothek: Übernehmen', () => {
  test('jeder Plan wird ein gültiger Block (Schema 41): Einheiten je Woche, Dosis als Momentaufnahme, Version 1', async () => {
    const { materializePlan, INTENT_OF_TEMPLATE } = await import('../src/domain/library')
    const { emptyData, parseStoredData } = await import('../src/lib/store/schema')
    for (const t of index.sessionTemplates) expect(INTENT_OF_TEMPLATE[t.session_template_id], t.session_template_id).toBeTruthy()
    for (const p of index.plans) {
      const block = materializePlan(p, weeksOf(p.plan_id), index, exercises, { id: `b-${p.plan_id}`, startDay: '2026-10-12', now: '2026-10-08T12:00:00.000Z', disciplineId: null })
      expect(block.sessions).toHaveLength(p.sessionCount)
      expect(block.libraryPlanId).toBe(p.plan_id)
      expect(block.planVersion).toBe(1)
      const data = emptyData() as any
      data.athletes[0].trainingBlocks = [block]
      const { data: parsed, report } = parseStoredData(data)
      expect(report.rejected, p.plan_id).toEqual([])
      expect(parsed!.athletes[0].trainingBlocks[0].sessions, p.plan_id).toHaveLength(p.sessionCount)
    }
  })

  test('Schema 41: ältere Blöcke bekommen Herkunft leer, Version 1, keine Anpassungen; Abschlüsse ohne Rückmeldung', async () => {
    const { emptyData, parseStoredData } = await import('../src/lib/store/schema')
    const old = emptyData() as any
    old.version = 40
    old.athletes[0].trainingBlocks = [{ id: 'b', name: '', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, sessions: [], completions: [{ sessionId: 's', day: '2026-10-05', durationMin: 30, rpe: 6, diarySessionId: null, avgHr: null, maxHr: null }], status: 'active', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(40)
    const b = data!.athletes[0].trainingBlocks[0]
    expect(b).toMatchObject({ libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [] })
    expect(b.completions[0]).toMatchObject({ feedback: null, pain: false })
  })

  test('nächster Montag', async () => {
    const { nextMonday } = await import('../src/domain/library')
    expect(nextMonday('2026-10-08')).toBe('2026-10-12')
    expect(nextMonday('2026-10-12')).toBe('2026-10-12')
    expect(nextMonday('2026-10-11')).toBe('2026-10-12')
  })

  test('Bildschirm: Ziel filtern, Plan öffnen, Woche wechseln, Regeln mit DOI, übernehmen → Block mit Bibliothekseinheiten', async ({ page }) => {
    const { openDemo } = await import('./helpers')
    await openDemo(page)
    await page.goto('/plan/waehlen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('way-library').click()
    await expect(page.getByTestId('program-library')).toBeVisible()
    await expect(page.getByTestId('lib-unreviewed')).toBeVisible()
    await expect(page.getByTestId('prog-count')).toContainText('16')
    await page.getByTestId('prog-goal-RUN_5K').click()
    await expect(page.getByTestId('prog-count')).toContainText('2')
    // Coach-Pläne sind für Athleten als «Nur über Trainer» markiert.
    await page.getByTestId('prog-goal-all').click()
    await expect(page.getByTestId('prog-gate-PLN_HYP_PPL_12W')).toBeVisible()
    await page.getByTestId('prog-PLN_HYP_PPL_12W').click()
    await expect(page.getByTestId('prog-coach-only')).toBeVisible()
    await expect(page.getByTestId('prog-adopt-button')).toHaveCount(0)
    await page.goto('/plan/programme/PLN_RUN5K_BASE_8W', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('prog-rules').locator('a[href^="https://doi.org/10."]').first()).toBeVisible()
    await page.getByTestId('prog-week-4').click()
    await expect(page.getByTestId('prog-reduced')).toBeVisible()
    await expect(page.getByTestId('prog-retest')).toContainText('5-km')
    await page.getByTestId('prog-adopt-button').click()
    await expect(page).toHaveURL(/\/plan\/block$/)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks.find((b: any) => b.libraryPlanId === 'PLN_RUN5K_BASE_8W'))
    expect(stored.sessions).toHaveLength(24)
    expect(stored.sessions[0].kind).toBe('library')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
  })
})

test.describe('Adaptive Anpassung', () => {
  const mkBlock = async (planId: string, startDay = '2026-10-05') => {
    const { materializePlan } = await import('../src/domain/library')
    const p = index.plans.find((x) => x.plan_id === planId)!
    return materializePlan(p, weeksOf(planId), index, exercises, { id: 'b', startDay, now: '2026-10-05T00:00:00.000Z', disciplineId: null })
  }
  const done = (sessionId: string, day: string, feedback: number | null, pain = false) => ({ sessionId, day, durationMin: 45, rpe: 7, diarySessionId: null, avgHr: null, maxHr: null, feedback, pain })

  test('Review: frühestens nach 3 Tagen, mindestens 2 Rückmeldungen, Richtung aus dem Mittel, Schmerz → leichter', async () => {
    const { reviewFeedback } = await import('../src/domain/adaptation')
    const b = await mkBlock('PLN_STR_BASE_8W')
    expect(reviewFeedback(b, '2026-10-06').reason).toBe('too_early')
    expect(reviewFeedback({ ...b, completions: [done('x', '2026-10-06', 1)] }, '2026-10-09').reason).toBe('too_few')
    expect(reviewFeedback({ ...b, completions: [done('x', '2026-10-06', 1), done('y', '2026-10-08', 2)] }, '2026-10-09')).toMatchObject({ reason: 'too_easy', suggestedPct: 10 })
    expect(reviewFeedback({ ...b, completions: [done('x', '2026-10-06', 5), done('y', '2026-10-08', 4)] }, '2026-10-09')).toMatchObject({ reason: 'too_hard', suggestedPct: -10 })
    expect(reviewFeedback({ ...b, completions: [done('x', '2026-10-06', 3), done('y', '2026-10-08', 3)] }, '2026-10-09')).toMatchObject({ reason: 'fits', suggestedPct: null })
    expect(reviewFeedback({ ...b, completions: [done('x', '2026-10-06', 1, true)] }, '2026-10-09')).toMatchObject({ reason: 'pain', suggestedPct: -10 })
  })

  test('Vorschlag: nur künftige Einheiten außerhalb von Entlastungswochen, je Position eine Stellgröße, nie außerhalb der Regelgrenze', async () => {
    const { proposeAdjustment, applyAdjustment, revertLast } = await import('../src/domain/adaptation')
    const { checkDose } = await import('../src/domain/library')
    const b = await mkBlock('PLN_STR_BASE_8W')
    const today = '2026-10-14' // Woche 2
    for (const pct of [10, 20, 30, -10, -20, -30] as const) {
      const p = proposeAdjustment(b, pct, index.methodRules, today)
      expect(p.blocked).toBe(false)
      for (const c of p.changes) {
        const s = b.sessions.find((x) => x.id === c.sessionId)!
        expect(s.weekFrom, `${pct}`).toBeGreaterThanOrEqual(2)
        expect(s.note).not.toBe('reduced')
        expect(pct === 10 || pct === -10 ? c.field : 'x').toBe(pct === 10 || pct === -10 ? 'rpe' : 'x')
      }
      // Nach der Übernahme liegt jede geänderte Position weiter in den Grenzen ihrer Regel.
      const next = applyAdjustment(b, p, { id: `a${pct}`, now: '2026-10-14T00:00:00.000Z', source: 'manual' })
      if (p.changes.length) expect(next.planVersion).toBe(2)
      for (const c of p.changes) {
        const part = next.sessions.find((x) => x.id === c.sessionId)!.blocks[c.part]
        if (part.type !== 'library_exercise' || !part.ruleId) continue
        const rule = index.methodRules.find((r) => r.rule_id === part.ruleId)!
        const v = checkDose({ kind: 'exercise', exercise_id: part.exerciseId, sets: part.sets, reps: part.reps, intensity: null, rpe: part.rpe, rest_s: part.restS, notes: '', exercise_intent: part.intent, role: part.role }, rule)
        expect(v.filter((x) => x.field === c.field), `${pct} ${c.sessionId}`).toEqual([])
      }
    }
    const p = proposeAdjustment(b, 10, index.methodRules, today)
    expect(p.changes.length).toBeGreaterThan(0)
    const v2 = applyAdjustment(b, p, { id: 'a', now: '2026-10-14T00:00:00.000Z', source: 'manual' })
    expect(v2.adjustments).toHaveLength(1)
    const v3 = revertLast(v2, { id: 'r', now: '2026-10-14T01:00:00.000Z' })
    expect(v3.planVersion).toBe(3)
    expect(v3.sessions).toEqual(b.sessions)
  })

  test('Schmerz in den letzten 14 Tagen sperrt jede Steigerung, leichter bleibt möglich', async () => {
    const { proposeAdjustment } = await import('../src/domain/adaptation')
    const b = { ...(await mkBlock('PLN_STR_BASE_8W')), completions: [done('x', '2026-10-12', 3, true)] }
    expect(proposeAdjustment(b, 20, index.methodRules, '2026-10-14')).toMatchObject({ blocked: true, changes: [] })
    expect(proposeAdjustment(b, -20, index.methodRules, '2026-10-14').blocked).toBe(false)
  })

  test('Bildschirm: Rückmeldung im Player, Anpassung im Block mit Vorschau, Übernehmen erzeugt Version 2, Zurücknehmen Version 3', async ({ page }) => {
    const { openDemo } = await import('./helpers')
    const block = await mkBlock('PLN_STR_BASE_8W', '2026-01-05')
    await openDemo(page)
    await page.evaluate((b) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks = [{ ...b, startDay: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    }, block)
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('adjust-panel')).toBeVisible()
    await expect(page.getByTestId('adjust-review')).toContainText(/Rückmeldungen/)
    await page.getByTestId('adjust-10').click()
    await expect(page.getByTestId('adjust-changes')).toBeVisible()
    await page.getByTestId('adjust-accept').click()
    await expect(page.getByTestId('adjust-panel')).toContainText('Planversion 2')
    await expect(page.getByTestId('adjust-history')).toContainText('1 → 2')
    await page.getByTestId('adjust-revert').click()
    await expect(page.getByTestId('adjust-panel')).toContainText('Planversion 3')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
  })
})

test('Sportarten-Entscheid v4: Muay Thai, 800 m, 1500 m mit Kerntests aus dem Gesamtmaster; neue Retest-Tests ohne Referenzwerte', async () => {
  const { DISCIPLINES } = await import('../src/data/sportProfiles')
  const { getTest } = await import('../src/data/testCatalog')
  for (const id of ['muay_thai', 'run_800m', 'run_1500m']) {
    const d = DISCIPLINES.find((x) => x.id === id)!
    expect(d, id).toBeTruthy()
    const core = d.tests.filter((t) => t.role === 'core')
    expect(core.length, id).toBeGreaterThanOrEqual(4)
    for (const t of core) expect(t.documentLabel, `${id} ${t.slug}`).toMatch(/^Gesamtmaster v3, 8\.\d/)
  }
  expect(DISCIPLINES.find((d) => d.id === 'muay_thai')!.dimensionWeights).toEqual({ strength_endurance: 1, power: 0.9, endurance: 0.8, agility: 0.6, relative_strength: 0.6 })
  for (const slug of ['strength_5rm', 'strength_3rm', 'strength_10rm', 'hyrox_half_sim', 'gpp_circuit', 'hr_recovery_60s', 'opener_simulation']) expect(getTest(slug), slug).toBeTruthy()
})
