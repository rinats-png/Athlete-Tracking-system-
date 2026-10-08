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

  test('jeder Retest zeigt auf einen Test des Katalogs', () => {
    const tests = new Set(index.tests.map((t) => t.test_id))
    for (const p of index.plans) for (const t of p.retest.test_ids) expect(tests.has(t), `${p.plan_id} → ${t}`).toBe(true)
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
