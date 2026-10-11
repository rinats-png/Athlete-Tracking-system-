import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { PLAN_TEMPLATES } from '../src/data/planTemplates'
import { TRAINING_RULES } from '../src/data/trainingRules'
import { eligibleRules } from '../src/domain/trainingRules'
import { fitStart, fitTemplate, type FitInput } from '../src/domain/planFit'
import { openSessionsOn, plannedTotal, sessionInWeek, weekChecks } from '../src/domain/trainingBlock'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'
import type { StoredTrainingBlock } from '../src/lib/store/localStore'

/** Trainingsbereich Etappe 2: Planbibliothek, Plan-Detail, Plan anpassen. */

const base = (id: string, over: Partial<FitInput> = {}): FitInput => ({
  template: PLAN_TEMPLATES.find((t) => t.id === id)!,
  disciplineId: 'judo',
  trainingAgeYears: 5,
  availableDays: [1, 2, 3, 4, 6],
  fixedSessions: [{ day: 5, kind: 'hard_rounds' }],
  equipment: ['weights', 'cardio', 'sprint'],
  hrMaxPlausible: true,
  mode: 'preview',
  startDay: '2026-10-05',
  eventDay: null,
  today: '2026-10-04',
  ...over,
})

test.describe('Vorlagen: Fachlogik', () => {
  test('jeder Regelplatz zeigt auf eine Regel, die zu Familie und Phase der Vorlage passt', () => {
    for (const t of PLAN_TEMPLATES) {
      expect(new Set(t.slots.map((s) => s.key)).size, t.id).toBe(t.slots.length)
      for (const s of t.slots) {
        expect(s.weekFrom, `${t.id}/${s.key}`).toBeGreaterThanOrEqual(1)
        expect(s.weekTo ?? t.weeks, `${t.id}/${s.key}`).toBeLessThanOrEqual(t.weeks)
        if (!s.ruleId) continue
        const ok = eligibleRules({ family: t.family, phase: t.phase, intent: s.intent, mode: 'preview', trainingAgeYears: 10 }, TRAINING_RULES).some((r) => r.id === s.ruleId)
        expect(ok, `${t.id}/${s.key}: Regel ${s.ruleId} passt nicht`).toBe(true)
      }
    }
  })

  test('die Vorlage trägt keine eigene Dosis: Regelplätze bekommen sie aus der Regel, offene bleiben ohne Zahlen', () => {
    for (const t of PLAN_TEMPLATES) {
      const fit = fitTemplate(base(t.id, { disciplineId: t.family === 'hybrid' ? 'hybrid' : t.family === 'combat_striking' ? 'boxing' : 'judo', availableDays: [1, 2, 3, 4, 5, 6, 7], fixedSessions: [] }))
      for (const s of fit.sessions) {
        if (s.kind === 'open') {
          expect(s.ruleId).toBeNull()
          expect(s.blocks).toEqual([])
          expect(s.evidenceStrength).toBeNull()
        } else {
          expect(TRAINING_RULES.some((r) => r.id === s.ruleId && r.version === s.ruleVersion)).toBe(true)
          expect(s.evidenceStrength).not.toBeNull()
        }
      }
    }
  })

  test('Verteilung: ein Tag eine Einheit, nichts neben harten Runden bei hohem Reiz, Wochenbudget gehalten', () => {
    const t = PLAN_TEMPLATES.find((x) => x.id === 'hyrox_prep')!
    const fit = fitTemplate(base('hyrox_prep', { availableDays: [1, 2, 3, 4, 6, 7], fixedSessions: [{ day: 5, kind: 'hard_rounds' }] }))
    for (let w = 1; w <= t.weeks; w++) {
      const inWeek = fit.sessions.filter((s) => sessionInWeek(s, w, t.weeks))
      const days = inWeek.map((s) => s.day)
      expect(new Set(days).size, `Woche ${w}`).toBe(days.length)
      expect(days).not.toContain(5)
      expect(inWeek.filter((s) => s.highIntensity).length + 1, `Budget Woche ${w}`).toBeLessThanOrEqual(3)
      for (const s of inWeek.filter((x) => x.highIntensity)) expect([4, 6]).not.toContain(s.day)
    }
  })

  test('was nicht passt, entfällt sichtbar mit Grund: Ausstattung, Pulsziele, zu wenige Tage', () => {
    const noGear = fitTemplate(base('grappling_gpp', { equipment: ['cardio'] }))
    expect(noGear.skipped.filter((s) => s.reason === 'equipment').map((s) => s.slotKey).sort()).toEqual(['rst', 'strength'])
    expect(noGear.sessions.some((s) => s.primaryIntent === 'MAX_STRENGTH')).toBe(false)
    const noHr = fitTemplate(base('striking_gpp', { disciplineId: 'boxing', hrMaxPlausible: false }))
    expect(noHr.skipped).toContainEqual({ slotKey: 'vo2', intent: 'VO2MAX', reason: 'hr_max_unknown' })
    const oneDay = fitTemplate(base('hybrid_base', { availableDays: [2], fixedSessions: [] }))
    expect(oneDay.sessions.length).toBeLessThanOrEqual(1)
    expect(oneDay.skipped.length).toBeGreaterThan(0)
    const young = fitTemplate(base('striking_build', { disciplineId: 'boxing', trainingAgeYears: 0 }))
    expect(young.skipped.some((s) => s.reason === 'rule_unavailable')).toBe(true)
  })

  test('Wochenspannen: Einheiten der Phasen gelten nur in ihren Wochen und zählen so in Heute, Wochenprüfung und Summe', () => {
    const t = PLAN_TEMPLATES.find((x) => x.id === 'hyrox_prep')!
    const fit = fitTemplate(base('hyrox_prep', { availableDays: [1, 2, 3, 4, 6, 7], fixedSessions: [] }))
    const rehearsal = fit.sessions.find((s) => s.primaryIntent === 'RACE_REHEARSAL')
    expect(rehearsal).toMatchObject({ weekFrom: 7, weekTo: 7, kind: 'open' })
    const block: StoredTrainingBlock = { id: 'b', name: '', family: 'hybrid', disciplineId: 'hyrox', phase: 'BUILD', startDay: '2026-10-05', weeks: t.weeks, retestMetrics: [], templateId: t.id, assignmentId: null, eventDay: null, sessions: fit.sessions, completions: [], status: 'active', createdAt: '', updatedAt: '', libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [], moves: [] }
    const rehearsalDate = (week: number) => new Date(Date.parse('2026-10-05T00:00:00Z') + ((week - 1) * 7 + rehearsal!.day - 1) * 86_400_000).toISOString().slice(0, 10)
    expect(openSessionsOn(block, rehearsalDate(7)).some((s) => s.id === rehearsal!.id)).toBe(true)
    expect(openSessionsOn(block, rehearsalDate(6)).some((s) => s.id === rehearsal!.id)).toBe(false)
    const checks = weekChecks(block, '2026-12-20')
    expect(checks[6].planned).toBeGreaterThan(checks[0].planned)
    expect(checks.reduce((a, c) => a + c.planned, 0)).toBe(plannedTotal(block))
  })

  test('Start: ohne Termin der nächste Montag; mit Termin endet der Block davor; zu knapp wird gemeldet', () => {
    expect(fitStart(6, '2026-10-04', null, '2026-10-04')).toEqual({ startDay: '2026-10-05', tooShort: false })
    // Termin Samstag 2027-01-16: 8 Wochen davor liegt der Montag 2026-11-16.
    expect(fitStart(8, '2026-10-04', '2027-01-16', '2026-10-04')).toEqual({ startDay: '2026-11-16', tooShort: false })
    expect(fitStart(8, '2026-10-04', '2026-11-01', '2026-10-04')).toEqual({ startDay: '2026-10-05', tooShort: true })
  })

  test('Schema 34: ein Bestand der Version 33 bekommt Wochenspanne, Art, Vorlage und Termin', () => {
    const old = emptyData() as any
    old.version = 33
    old.athletes[0].trainingBlocks = [{ id: 'b', family: 'combat_grappling', disciplineId: 'judo', phase: 'BUILD', startDay: '2026-10-05', weeks: 6, retestMetrics: [], sessions: [{ id: 's', day: 1, ruleId: 'vo2_4x4', ruleVersion: '1.0.0', primaryIntent: 'VO2MAX', evidenceStrength: 'HIGH', evidenceSpecificity: 'EXTRAPOLATED', plannedDurationMin: 25, highIntensity: true, blocks: [], retestMetric: 'x', coachModified: false, coachModificationReason: null, removed: false }], completions: [], status: 'active', createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(33)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(34)
    const b = data!.athletes[0].trainingBlocks[0]
    expect(b).toMatchObject({ templateId: null, eventDay: null })
    expect(b.sessions[0]).toMatchObject({ weekFrom: 1, weekTo: null, kind: 'rule' })
  })
})

test.describe('Vorlagen: Taper und Rückkehr', () => {
  test('fünf Vorlagen ohne Regelplätze: alles offen, keine Dosis, Wochenspannen stimmig', () => {
    for (const id of ['grappling_taper', 'striking_taper', 'grappling_return', 'striking_return', 'hybrid_return']) {
      const t = PLAN_TEMPLATES.find((x) => x.id === id)!
      expect(t, id).toBeTruthy()
      expect(['TAPER', 'TRANSITION']).toContain(t.phase)
      expect(t.slots.every((s) => s.ruleId === null), id).toBe(true)
      const fit = fitTemplate(base(id, { disciplineId: t.family === 'hybrid' ? 'hybrid' : t.family === 'combat_striking' ? 'boxing' : 'judo', availableDays: [1, 2, 3, 4, 5, 6, 7], fixedSessions: [] }))
      expect(fit.sessions.length, id).toBeGreaterThan(0)
      expect(fit.sessions.every((s) => s.kind === 'open' && s.blocks.length === 0 && s.evidenceStrength === null), id).toBe(true)
    }
    expect(PLAN_TEMPLATES).toHaveLength(12)
  })
})

test.describe('Vorlagen: Bildschirme', () => {
  const prepare = async (page: import('@playwright/test').Page) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      data.athletes[0].profile.trainingAgeYears = 6
      data.athletes[0].profile.maxHr = 195
      data.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
  }

  test('Bibliothek zeigt alle Vorlagen, die der Sportart zuerst mit «passt», alle ungeprüft, Filter nach Ziel', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/vorlagen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-library')).toBeVisible()
    await expect(page.getByTestId('tpl-card-grappling_gpp')).toBeVisible()
    await expect(page.getByTestId('tpl-card-hyrox_prep')).toBeVisible()
    await expect(page.locator('[data-testid^="tpl-card-"]').first()).toHaveAttribute('data-testid', /grappling/)
    await expect(page.getByTestId('tpl-fit-grappling_gpp')).toHaveAttribute('data-fit', 'match')
    await expect(page.getByTestId('tpl-card-grappling_gpp')).toContainText('Fachlich noch nicht geprüft')
    await page.getByTestId('tpl-goal-power').click()
    await expect(page.getByTestId('tpl-card-grappling_build')).toBeVisible()
    await expect(page.getByTestId('tpl-card-grappling_gpp')).toHaveCount(0)
    await page.getByTestId('tpl-goal-event').click()
    await expect(page.getByTestId('tpl-card-grappling_taper')).toBeVisible()
    await page.getByTestId('tpl-goal-strength').click()
    await expect(page.getByTestId('tpl-card-hybrid_strength')).toBeVisible()
    await expect(page.getByTestId('tpl-fit-hybrid_strength')).toHaveAttribute('data-fit', 'supports')
  })

  test('Detail: Regelplätze mit Evidenz, offene Plätze als offen gekennzeichnet', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/vorlagen/grappling_gpp', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-template')).toBeVisible()
    await expect(page.getByTestId('tpl-slot-strength')).toContainText('Evidenz')
    await expect(page.getByTestId('tpl-open-base')).toContainText('keine belegte Dosis')
    await page.getByTestId('tpl-fit-link').click()
    await expect(page.getByTestId('plan-fit')).toBeVisible()
  })

  test('Anpassen: fehlende Ausstattung streicht Plätze mit Grund, Übernehmen legt den Block an', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/vorlagen/grappling_gpp/anpassen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('fit-sessions')).toContainText('Maximalkraft')
    await page.getByTestId('fit-equipment-weights').click()
    await expect(page.getByTestId('fit-skipped')).toContainText('Ausstattung fehlt')
    await expect(page.getByTestId('fit-sessions')).not.toContainText('Maximalkraft')
    await page.getByTestId('fit-equipment-weights').click()
    await page.getByTestId('fit-adopt').click()
    await expect(page).toHaveURL(/\/plan\/block/)
    const block = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks[0])
    expect(block.templateId).toBe('grappling_gpp')
    expect(block.sessions.some((s: { kind: string }) => s.kind === 'open')).toBe(true)
    expect(block.sessions.every((s: { kind: string; ruleId: string | null }) => (s.kind === 'rule') === (s.ruleId != null))).toBe(true)
  })

  test('zu knapper Wettkampftermin wird gemeldet', async ({ page }) => {
    await prepare(page)
    await page.goto('/plan/vorlagen/grappling_gpp/anpassen', { waitUntil: 'domcontentloaded' })
    const soon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
    await page.getByTestId('fit-event').fill(soon)
    await expect(page.getByTestId('fit-tooshort')).toBeVisible()
  })
})
