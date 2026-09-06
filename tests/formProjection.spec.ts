import { expect, test } from '@playwright/test'
import { MAX_HORIZON_DAYS, projectForm, projectableTests } from '../src/domain/formProjection'
import { CHECKPOINT_WEEKS, seasonPlan } from '../src/domain/seasonPlan'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Die Formvorhersage sagt, wo die Gerade am Stichtag steht — und weigert
 * sich, wenn die Messungen den Tag nicht tragen. Der Saisonplan legt fest,
 * WANN gemessen wird; er empfiehlt kein Training.
 */

const result = (slug: string, day: string, score: number): StoredResult =>
  ({
    id: `${slug}-${day}`,
    testSlug: slug,
    performedAt: `${day}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: null,
    ageYears: null,
    sex: null,
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    photo: null,
    createdAt: `${day}T09:00:00.000Z`,
  }) as StoredResult

const asOf = new Date('2026-04-01T12:00:00.000Z')

test.describe('Formvorhersage', () => {
  test('unter drei Messungen gibt es keine Gerade', () => {
    const p = projectForm([result('countermovement_jump', '2026-01-01', 40), result('countermovement_jump', '2026-02-01', 41)], 'countermovement_jump', '2026-05-01', null, asOf)
    expect(p.verdict).toBe('too_few')
    expect(p.projected).toBeNull()
  })

  test('eine steigende Gerade wird am Stichtag abgelesen', () => {
    // 40, 41, 42, 43 im Monatsabstand — 1 cm je ~30 Tage.
    const results = ['2026-01-01', '2026-01-31', '2026-03-02', '2026-04-01'].map((d, i) => result('countermovement_jump', d, 40 + i))
    const p = projectForm(results, 'countermovement_jump', '2026-05-01', null, asOf)
    expect(p.verdict).toBe('projected')
    expect(p.projected).toBeGreaterThan(43.5)
    expect(p.projected).toBeLessThan(44.5)
    expect(p.rSquared).toBeGreaterThan(0.99)
  })

  test('ein Stichtag jenseits des doppelten Messzeitraums wird nicht hochgerechnet', () => {
    const results = ['2026-03-01', '2026-03-15', '2026-04-01'].map((d, i) => result('countermovement_jump', d, 40 + i))
    // 31 Tage Messzeitraum, Stichtag 120 Tage nach der letzten Messung.
    const p = projectForm(results, 'countermovement_jump', '2026-07-30', null, asOf)
    expect(p.verdict).toBe('too_far')
    expect(MAX_HORIZON_DAYS).toBe(365)
  })

  test('ein vergangener Stichtag ist keine Vorhersage', () => {
    const results = ['2026-01-01', '2026-02-01', '2026-03-01'].map((d, i) => result('countermovement_jump', d, 40 + i))
    expect(projectForm(results, 'countermovement_jump', '2026-02-15', null, asOf).verdict).toBe('past')
  })

  test('das Band kommt aus der eigenen Streuung und entscheidet über das Ziel', () => {
    // Streuend, aber mit Trend: die Streuung ist bekannt (≥ 4 Punkte).
    const scores = [40, 42, 41, 43, 42, 44]
    const days = ['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']
    const results = days.map((d, i) => result('countermovement_jump', d, scores[i]))
    const reach = projectForm(results, 'countermovement_jump', '2026-05-01', 40, asOf)
    expect(reach.verdict).toBe('projected')
    expect(reach.band).not.toBeNull()
    expect(reach.band![0]).toBeLessThan(reach.projected!)
    expect(reach.band![1]).toBeGreaterThan(reach.projected!)
    expect(reach.goalOutlook, 'ein Ziel unter dem ganzen Band ist erreicht').toBe('reaches')

    const miss = projectForm(results, 'countermovement_jump', '2026-05-01', 60, asOf)
    expect(miss.goalOutlook).toBe('misses')

    const open = projectForm(results, 'countermovement_jump', '2026-05-01', reach.projected!, asOf)
    expect(open.goalOutlook, 'ein Ziel mitten im Band bleibt offen').toBe('unclear')
  })

  test('bei «kleiner ist besser» dreht sich die Zielaussage', () => {
    const results = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((d, i) => result('sprint_10m', d, 1.9 - i * 0.02))
    const p = projectForm(results, 'sprint_10m', '2026-05-01', 1.95, asOf)
    expect(p.verdict).toBe('projected')
    expect(p.goalOutlook).toBe('reaches')
  })

  test('die Liste enthält nur, was hochrechenbar ist, beste Gerade zuerst', () => {
    const results = [
      ...['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((d, i) => result('countermovement_jump', d, 40 + i)),
      ...['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((d, i) => result('grip_strength', d, [50, 58, 49, 60][i])),
      result('cooper_12min', '2026-04-01', 2800),
    ]
    const list = projectableTests(results, '2026-05-01', {}, asOf)
    expect(list.map((p) => p.testSlug)).toEqual(['countermovement_jump', 'grip_strength'])
  })
})

test.describe('Saisonplan', () => {
  test('drei Kontrollpunkte rückwärts vom Wettkampf, mit Status', () => {
    const plan = seasonPlan('2026-06-14', 'judo', [], asOf)
    expect(plan.checkpoints.map((c) => c.kind)).toEqual(['foundation', 'specific', 'form'])
    expect(plan.checkpoints[0].on).toBe('2026-03-22') // 12 Wochen vorher
    expect(plan.checkpoints[1].on).toBe('2026-05-03')
    expect(plan.checkpoints[2].on).toBe('2026-05-31')
    expect(plan.daysToGo).toBe(74)
    // 22. März liegt mehr als 7 Tage vor dem 1. April: ausgelassen.
    expect(plan.checkpoints[0].status).toBe('missed')
    expect(plan.checkpoints[1].status).toBe('upcoming')
    expect(plan.next?.kind).toBe('specific')
    expect(CHECKPOINT_WEEKS.form).toBe(2)
  })

  test('eine Messung im Fenster macht den Kontrollpunkt zu «gemessen»', () => {
    const plan = seasonPlan('2026-06-14', 'judo', [result('grip_strength', '2026-03-25', 50)], asOf)
    expect(plan.checkpoints[0].status).toBe('done')
    expect(plan.checkpoints[0].measured).toBe(1)
  })

  test('der Formcheck nimmt die Kerntests mit der längsten eigenen Historie', () => {
    const results = ['2026-01-01', '2026-02-01', '2026-03-01'].map((d, i) => result('sprint_10m', d, 1.9 - i * 0.01))
    const plan = seasonPlan('2026-06-14', 'judo', results, asOf)
    expect(plan.checkpoints[2].slugs[0]).toBe('sprint_10m')
    expect(plan.checkpoints[2].slugs.length).toBeLessThanOrEqual(2)
  })

  test('die Grundlage sind die universellen Tests, auch ohne Disziplin', () => {
    const plan = seasonPlan('2026-06-14', null, [], asOf)
    expect(plan.checkpoints[0].slugs).toContain('grip_strength')
    expect(plan.checkpoints[1].slugs.length).toBeGreaterThan(0)
  })
})
