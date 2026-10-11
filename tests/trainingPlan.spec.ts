import { expect, test } from '@playwright/test'
import { HIGH_INTENSITY_BUDGET, INTENTS_FOR_DIMENSION, planBlock, type PlanInput } from '../src/domain/trainingPlan'
import { TRAINING_RULES } from '../src/data/trainingRules'
import type { RequirementRow } from '../src/domain/requirementGap'
import type { PerformanceDimension } from '../src/types/domain'
import { PERFORMANCE_DIMENSIONS } from '../src/types/domain'

/** Etappe 9c: Planbauer der Pilotwelt Grappling — handgerechnete Fälle. */

const row = (dimension: PerformanceDimension, open: boolean, measurements: number): RequirementRow => ({
  axisId: dimension,
  dimension,
  requirement: 0.9,
  score: open ? 30 : 80,
  leverage: 50,
  open,
  measurements,
  evidence: measurements >= 3 ? 'strong' : measurements === 2 ? 'moderate' : 'weak',
})

const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  family: 'combat_grappling',
  phase: 'BUILD',
  trainingAgeYears: 5,
  availableDays: [1, 2, 3, 4, 5, 6],
  fixedSessions: [{ day: 5, kind: 'hard_rounds' }],
  maxSessionMinutes: null,
  gaps: [row('endurance', true, 3), row('power', true, 2), row('max_strength', true, 1), row('strength_endurance', true, 3), row('agility', false, 3)],
  hrMaxPlausible: true,
  mode: 'preview',
  ...over,
})

test.describe('Planbauer', () => {
  test('Judo-Beispiel: 4×4 am Montag, Power am Dienstag; dünne Daten, fehlende Regel und geschlossene Lücke werden benannt', () => {
    const plan = planBlock(base())
    expect(plan.sessions.map((s) => [s.day, s.ruleId, s.primaryIntent])).toEqual([
      [1, 'vo2_4x4', 'VO2MAX'],
      [2, 'power_30_70', 'POWER'],
    ])
    // 4 × (240 s Arbeit + 180 s Pause) ohne die letzte Pause = 1500 s = 25 min.
    expect(plan.sessions[0].plannedDurationMin).toBe(25)
    expect(plan.sessions[0].blocks).toEqual([{ type: 'interval', modality: 'mixed', repetitions: 4, workSeconds: 240, recoverySeconds: 180, intensity: { type: 'hr_percent_max', min: 90, max: 95 } }])
    expect(plan.skipped).toEqual([
      { dimension: 'max_strength', reason: 'data_thin', ruleId: null },
      { dimension: 'strength_endurance', reason: 'no_rule', ruleId: null },
      { dimension: 'agility', reason: 'not_open', ruleId: null },
    ])
    // Budget: ein Tag harte Runden plus eine Intervalleinheit.
    expect(plan.highIntensityUsed).toBe(2)
    expect(plan.retest).toEqual({ week: 6, metrics: ['vo2max_ergospirometry', 'countermovement_jump'] })
  })

  test('jede Einheit trägt Regel, Version, Stärke und Spezifität aus der Regel', () => {
    for (const s of planBlock(base()).sessions) {
      const rule = TRAINING_RULES.find((r) => r.id === s.ruleId)!
      expect(s.ruleVersion).toBe(rule.version)
      expect(s.evidenceStrength).toBe(rule.evidence.strength)
      expect(s.evidenceSpecificity).toBe(rule.evidence.specificity.combat_grappling ?? 'EXTRAPOLATED')
      expect(s.coachModified).toBe(false)
    }
  })

  test('ohne glaubwürdige HFmax kein Pulsziel: stattdessen die nächste Regel für die Lücke', () => {
    const plan = planBlock(base({ hrMaxPlausible: false }))
    expect(plan.sessions.map((s) => [s.day, s.ruleId])).toEqual([
      [1, 'rst_30m'],
      [2, 'rst_30m'],
      [3, 'power_30_70'],
    ])
    expect(plan.sessions[0].blocks).toEqual([{ type: 'sprint_repeats', sets: 3, repetitions: 6, distanceM: 30, maxRecoverySeconds: 60 }])
  })

  test('nie am Tag harter Runden, Hochintensität nicht am Tag davor oder danach', () => {
    const plan = planBlock(base({ availableDays: [4, 5, 6, 7], gaps: [row('endurance', true, 3)] }))
    // 4 und 6 grenzen an Freitag, 5 ist belegt: bleibt der Sonntag (7).
    expect(plan.sessions.map((s) => s.day)).toEqual([7])
    const none = planBlock(base({ availableDays: [4, 6], gaps: [row('endurance', true, 3)] }))
    expect(none.sessions).toEqual([])
    expect(none.skipped).toEqual([{ dimension: 'endurance', reason: 'no_slot', ruleId: 'rst_30m' }])
  })

  test('das Budget für hohe Intensität ist ausgeschöpft: harte Runden zählen mit', () => {
    const plan = planBlock(base({ fixedSessions: [2, 4, 6].map((day) => ({ day, kind: 'hard_rounds' as const })), availableDays: [1, 3, 5, 7], gaps: [row('endurance', true, 3)] }))
    expect(plan.sessions).toEqual([])
    expect(plan.skipped[0]).toMatchObject({ dimension: 'endurance', reason: 'budget' })
    expect(HIGH_INTENSITY_BUDGET).toBe(3)
  })

  test('zu lange Einheit: die nächste Regel wird versucht', () => {
    const plan = planBlock(base({ maxSessionMinutes: 20, gaps: [row('endurance', true, 3)] }))
    expect(plan.sessions.map((s) => s.ruleId)).toEqual(['rst_30m', 'rst_30m'])
  })

  test('Gate: ohne Schalter und ohne geprüfte Regeln entsteht kein Plan', () => {
    for (const mode of ['off', 'live'] as const) {
      const plan = planBlock(base({ mode }))
      expect(plan.sessions).toEqual([])
      expect(plan.skipped.map((x) => [x.dimension, x.reason])).toEqual([
        ['endurance', 'no_rule'],
        ['power', 'no_rule'],
        ['max_strength', 'data_thin'],
        ['strength_endurance', 'no_rule'],
        ['agility', 'not_open'],
      ])
    }
  })

  test('Plyometrie und Kraft brauchen Trainingsalter; Trainingsalter 0 ergibt keine Einheit', () => {
    const plan = planBlock(base({ trainingAgeYears: 0, gaps: [row('power', true, 3), row('max_strength', true, 3)] }))
    expect(plan.sessions).toEqual([])
    expect(plan.skipped.map((s) => s.reason)).toEqual(['no_rule', 'no_rule'])
  })

  test('deterministisch: gleiche Eingabe, gleicher Plan', () => {
    expect(planBlock(base())).toEqual(planBlock(base()))
  })

  test('Pilot Grappling: Kraft, Power und Ausdauer haben Regeln, Kraftausdauer und Agilität (noch) nicht', () => {
    for (const d of PERFORMANCE_DIMENSIONS) {
      const bedient = INTENTS_FOR_DIMENSION[d].length > 0
      expect(bedient, d).toBe(!['strength_endurance', 'agility'].includes(d))
    }
  })
})

import { readDict } from './helpers'
import { openDemo } from './helpers'

test.describe('Texte der Regeln in allen Sprachen', () => {
  for (const lang of ['de', 'en', 'fr', 'es', 'nl', 'sv', 'nb', 'da']) {
    test(`${lang}: Titel und Grenzen jeder Regel stehen im Wörterbuch`, () => {
      const dict = readDict(lang)
      for (const r of TRAINING_RULES) {
        expect(dict.plan.rules[r.id].title, `${r.id} Titel`).toBeTruthy()
        r.evidence.limitations.forEach((_, i) => expect(dict.plan.rules[r.id][`limit${i}`], `${r.id} limit${i}`).toBeTruthy())
      }
    })
  }
})

test.describe('Bildschirm Plan (Vorschau)', () => {
  test('Judo mit Demodaten: Vorschau-Hinweis, Einheiten mit Beleg, Messung am Blockende', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      data.athletes[0].profile.trainingAgeYears = 6
      data.athletes[0].profile.maxHr = 195
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/neu', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-preview')).toBeVisible()
    await expect(page.getByTestId('plan-preview-banner')).toBeVisible()
    await expect(page.getByTestId('plan-retest')).toBeVisible()
    const text = await page.getByTestId('plan-preview').innerText()
    expect(text).not.toMatch(/plan\.[a-z]+\.|\{\{/)
    // Jede gezeigte Einheit kennzeichnet die Regel als ungeprüft.
    const sessions = page.locator('[data-testid^="plan-session-"]')
    const n = await sessions.count()
    for (let i = 0; i < n; i++) await expect(sessions.nth(i)).toContainText('Fachlich noch nicht geprüft')
    // Beleg aufklappen zeigt Grenzen und Quellen.
    if (n > 0) {
      await sessions.first().getByTestId('plan-evidence-open').click()
      await expect(sessions.first()).toContainText('Grenzen der Evidenz')
    }
  })

  test('Disziplin ohne Pilotregeln: ehrlicher Hinweis statt Plan', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'marathon'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/neu', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Pilotwelt/)).toBeVisible()
  })
})

test.describe('Pilot Hybrid (Etappe 9d)', () => {
  const hybrid = (over: Partial<PlanInput> = {}): PlanInput =>
    base({
      family: 'hybrid',
      fixedSessions: [],
      gaps: [row('endurance', true, 3), row('max_strength', true, 3), row('power', true, 2), row('strength_endurance', true, 3)],
      ...over,
    })

  test('Hybrid-Woche: 4×4 am Montag, Kraft an getrennten Tagen (Mi, Fr), Power in der verbleibenden Lücke (Di)', () => {
    const plan = planBlock(hybrid())
    expect(plan.sessions.map((s) => [s.day, s.ruleId])).toEqual([
      [1, 'vo2_4x4'],
      [2, 'power_30_70'],
      [3, 'max_strength_80'],
      [5, 'max_strength_80'],
    ])
    // Hybrid ist für alle Regeln nur übertragen oder allgemein belegt, nie direkt.
    expect(plan.sessions.map((s) => s.evidenceSpecificity)).toEqual(['EXTRAPOLATED', 'GENERAL', 'GENERAL', 'GENERAL'])
    expect(plan.sessions.some((s) => s.evidenceSpecificity === 'DIRECT')).toBe(false)
  })

  test('Hinweise: Concurrent-Training bei Kraft plus harter Ausdauer, keine Stationsdosis bei Kraftausdauer', () => {
    const plan = planBlock(hybrid())
    expect(plan.notes).toEqual([
      { key: 'concurrent', sourceIds: ['concurrent_2024', 'concurrent_umbrella_2026'] },
      { key: 'no_station_dose', sourceIds: ['hyrox_demand_2025', 'hift_scoping_2025'] },
    ])
    expect(plan.skipped).toEqual([{ dimension: 'strength_endurance', reason: 'no_rule', ruleId: null }])
    // Kein Hinweis auf Gleichzeitigkeit ohne beides.
    const onlyStrength = planBlock(hybrid({ gaps: [row('max_strength', true, 3)] }))
    expect(onlyStrength.notes).toEqual([])
    // Grappling bekommt die Hybrid-Hinweise nie, nur den Hinweis zum Geltungsbereich im Kampfsport.
    expect(planBlock(base()).notes).toEqual([{ key: 'combat_scope', sourceIds: [] }])
  })

  test('Streuung gilt nur für Hybrid: Grappling darf dieselben Tage dicht legen', () => {
    const grapple = planBlock(base({ family: 'combat_grappling', fixedSessions: [], gaps: [row('endurance', true, 3), row('max_strength', true, 3)] }))
    expect(grapple.sessions.map((s) => s.day)).toEqual([1, 2, 3])
  })

  test('wenn nur benachbarte Tage frei sind, werden sie genutzt statt nichts zu planen', () => {
    const plan = planBlock(hybrid({ availableDays: [1, 2], gaps: [row('max_strength', true, 3)] }))
    expect(plan.sessions.map((s) => s.day)).toEqual([1, 2])
  })

  test('Budget kleiner als die Häufigkeit der Regel: benannt als Budget, nicht als fehlender Tag', () => {
    const plan = planBlock(hybrid({ fixedSessions: [{ day: 7, kind: 'hard_rounds' }, { day: 6, kind: 'hard_rounds' }], availableDays: [1, 2, 3, 4], gaps: [row('endurance', true, 3)], hrMaxPlausible: false }))
    // Budget 3 − 2 = 1; die Sprint-Regel braucht zwei Einheiten.
    expect(plan.skipped).toEqual([{ dimension: 'endurance', reason: 'budget', ruleId: 'rst_30m' }])
  })
})

test('Bildschirm Plan: HYROX zeigt Hinweise zur Studienlage mit Quellen', async ({ page }) => {
  await openDemo(page)
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    data.athletes[0].profile.disciplineId = 'hyrox'
    data.athletes[0].profile.trainingAgeYears = 4
    data.athletes[0].profile.maxHr = 190
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  })
  await page.goto('/plan/neu', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('plan-preview')).toBeVisible()
  const text = await page.getByTestId('plan-preview').innerText()
  expect(text).not.toMatch(/plan\.[a-z]+\.|\{\{/)
  // Ob Hinweise erscheinen, hängt von den Demodaten ab; erscheinen sie, tragen sie Quellen.
  const notes = page.getByTestId('plan-notes')
  if (await notes.count()) await expect(notes.locator('a').first()).toHaveAttribute('href', /doi\.org/)
})

import { familyOfDiscipline } from '../src/domain/trainingPlan'
import { specificityFor } from '../src/domain/trainingRules'

test.describe('Pilot Striking (Etappe 9e)', () => {
  const boxing = (over: Partial<PlanInput> = {}): PlanInput =>
    base({
      family: 'combat_striking',
      disciplineId: 'boxing',
      trainingAgeYears: 4,
      availableDays: [1, 2, 3, 4, 6],
      gaps: [row('endurance', true, 3), row('power', true, 3), row('max_strength', true, 3)],
      ...over,
    })

  test('Zuordnung: Boxen und Kickboxen sind Striking; MMA und Karate (noch) nicht', () => {
    expect(familyOfDiscipline('boxing')).toBe('combat_striking')
    expect(familyOfDiscipline('kickboxing')).toBe('combat_striking')
    expect(familyOfDiscipline('mma')).toBeNull()
    expect(familyOfDiscipline('karate')).toBeNull()
  })

  test('Boxen, früher Camp-Abschnitt: 4×4 Montag (nicht neben dem harten Freitag), Power Dienstag, Kraft Mittwoch und Donnerstag', () => {
    const plan = planBlock(boxing())
    expect(plan.sessions.map((s) => [s.day, s.ruleId])).toEqual([
      [1, 'vo2_4x4'],
      [2, 'power_30_70'],
      [3, 'max_strength_80'],
      [4, 'max_strength_80'],
    ])
    expect(plan.notes).toEqual([{ key: 'combat_scope', sourceIds: [] }])
  })

  test('Spezifität je Disziplin: Boxen und Judo direkt bei Kraft, Kickboxen und Ringen nur verwandt; Plyometrie direkt für Ringen und Judo', () => {
    const strength = TRAINING_RULES.find((r) => r.id === 'max_strength_80')!
    const plyo = TRAINING_RULES.find((r) => r.id === 'plyo_combat')!
    expect(specificityFor(strength, 'combat_striking', 'boxing')).toBe('DIRECT')
    expect(specificityFor(strength, 'combat_striking', 'kickboxing')).toBe('RELATED')
    expect(specificityFor(strength, 'combat_grappling', 'judo')).toBe('DIRECT')
    expect(specificityFor(strength, 'combat_grappling', 'wrestling')).toBe('RELATED')
    expect(specificityFor(strength, 'combat_grappling', 'bjj')).toBe('RELATED')
    expect(specificityFor(plyo, 'combat_grappling', 'wrestling')).toBe('DIRECT')
    expect(specificityFor(plyo, 'combat_striking', 'boxing')).toBe('RELATED')
    // Ohne Disziplin zählt die Familie; ohne Eintrag nie DIRECT.
    expect(specificityFor(strength, 'hybrid')).toBe('GENERAL')
    expect(specificityFor(strength, 'combat_striking', null)).toBe('RELATED')
  })

  test('die geplanten Einheiten tragen die Spezifität der Disziplin', () => {
    const boxer = planBlock(boxing())
    expect(boxer.sessions.map((s) => s.evidenceSpecificity)).toEqual(['EXTRAPOLATED', 'DIRECT', 'DIRECT', 'DIRECT'])
    const kick = planBlock(boxing({ disciplineId: 'kickboxing' }))
    expect(kick.sessions.map((s) => s.evidenceSpecificity)).toEqual(['EXTRAPOLATED', 'RELATED', 'RELATED', 'RELATED'])
  })

  test('Plyometrie gehört nur zum Kampfsport und braucht die Trainerfreigabe als Merkmal', () => {
    const plyo = TRAINING_RULES.find((r) => r.id === 'plyo_combat')!
    expect(plyo.eligibleFamilies).not.toContain('hybrid')
    expect(plyo.safety.requiresCoachApproval).toBe(true)
  })
})
