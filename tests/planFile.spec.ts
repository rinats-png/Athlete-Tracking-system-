import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { exportPlan, importPlan, PLAN_FILE_MAX_BYTES, type ImportContext } from '../src/domain/planFile'
import { TRAINING_RULES } from '../src/data/trainingRules'
import { addOwnSession, addExercise, createOwnBlock } from '../src/domain/trainingBlock'

/** Trainingsbereich Etappe 8: Plan als Datei. */

let n = 0
const ctx = (over: Partial<ImportContext> = {}): ImportContext => ({ newId: () => `i${n++}`, now: '2026-10-05T09:00:00.000Z', startDay: '2026-10-05', disciplineId: 'judo', family: 'combat_grappling', trainingAgeYears: 5, mode: 'preview', ...over })
const file = (sessions: unknown[], over = {}) => JSON.stringify({ format: 'kydon-plan', version: 1, name: 'Fremd', weeks: 6, phase: 'BUILD', sessions, ...over })
const s = (over = {}) => ({ day: 1, intent: 'MAX_STRENGTH', ...over })

test.describe('Planaustausch: Fachlogik', () => {
  test('Evidenz und Dosis aus der Datei zählen nie: Regeleinheiten kommen aus dem Register, Eigenes bleibt ohne Evidenz', () => {
    const forged = { ...s({ day: 1, ruleId: 'max_strength_80', intent: 'VO2MAX' }), evidenceStrength: 'HIGH', blocks: [{ type: 'strength', sets: 99 }] }
    const r = importPlan(file([forged, s({ day: 2, title: 'Eigen', note: 'x', minutes: 45, exercises: [{ name: 'Rudern', sets: 3, reps: 8, load: '60 kg' }] })]), ctx())
    if (!r.ok) throw new Error('erwartet ok')
    const [rule, own] = r.block.sessions
    expect(rule).toMatchObject({ kind: 'rule', ruleId: 'max_strength_80', primaryIntent: 'MAX_STRENGTH' })
    expect(JSON.stringify(rule.blocks)).not.toContain('99')
    expect(rule.evidenceStrength).toBe(TRAINING_RULES.find((x) => x.id === 'max_strength_80')!.evidence.strength)
    expect(own).toMatchObject({ kind: 'own', ruleId: null, evidenceStrength: null, title: 'Eigen', plannedDurationMin: 45 })
    expect(own.blocks).toEqual([{ type: 'exercise', exerciseKey: null, name: 'Rudern', sets: 3, reps: 8, load: '60 kg' }])
    expect(r.report).toMatchObject({ fromRules: 1, own: 1, unknownRules: 0, skipped: 0 })
  })

  test('unbekannte Regel wird zur eigenen Einheit und gezählt; im Betrieb (live) keine ungeprüfte Regel', () => {
    const r = importPlan(file([s({ ruleId: 'erfundene_regel' })]), ctx())
    if (!r.ok) throw new Error('erwartet ok')
    expect(r.block.sessions[0]).toMatchObject({ kind: 'own', ruleId: null })
    expect(r.report.unknownRules).toBe(1)
    const prod = importPlan(file([s({ ruleId: 'max_strength_80' })]), ctx({ mode: 'live' }))
    if (!prod.ok) throw new Error('erwartet ok')
    expect(prod.block.sessions[0].kind).toBe('own')
    expect(prod.report.unknownRules).toBe(1)
  })

  test('belegter Tag, falsche Wochen und unbekannte Absicht werden übersprungen und gezählt', () => {
    const r = importPlan(file([s({ day: 1 }), s({ day: 1 }), s({ day: 2, weekFrom: 9 }), s({ day: 3, intent: 'ZAUBER' }), s({ day: 4, weekFrom: 1, weekTo: 3 }), s({ day: 4, weekFrom: 4, weekTo: 6 })]), ctx())
    if (!r.ok) throw new Error('erwartet ok')
    expect(r.block.sessions.map((x) => x.day)).toEqual([1, 4, 4])
    expect(r.report.skipped).toBe(3)
  })

  test('Fehler: zu groß, kein JSON, kein Plan; Felder werden begrenzt', () => {
    expect(importPlan('x'.repeat(PLAN_FILE_MAX_BYTES + 1), ctx())).toEqual({ ok: false, error: 'too_big' })
    expect(importPlan('{kaputt', ctx())).toEqual({ ok: false, error: 'not_json' })
    expect(importPlan(JSON.stringify({ format: 'anders' }), ctx())).toEqual({ ok: false, error: 'not_a_plan' })
    expect(importPlan(file([s({ day: 8 })]), ctx())).toEqual({ ok: false, error: 'not_a_plan' })
    expect(importPlan(file([s({ title: 'x'.repeat(61) })]), ctx())).toEqual({ ok: false, error: 'not_a_plan' })
  })

  test('Rundreise: Export und Import ergeben dieselben eigenen Einheiten mit Übungen', () => {
    let b = createOwnBlock({ id: 'b', name: 'Mein Block', family: null, disciplineId: null, phase: 'BUILD', weeks: 4, startDay: '2026-10-05', now: '2026-10-05T00:00:00.000Z' })
    const add = addOwnSession(b, { id: 'a', day: 2, intent: 'MAX_STRENGTH', title: 'Beine', note: 'schwer', minutes: 60, weekFrom: 1, weekTo: null, highIntensity: false }, '')
    if (!add.ok) throw new Error('x')
    b = add.block
    const ex = addExercise(b, 'a', { exerciseKey: 'back_squat', name: 'Kniebeuge', sets: 3, reps: 5, load: '80 kg' }, '')
    if (!ex.ok) throw new Error('x')
    const back = importPlan(exportPlan(ex.block), ctx({ family: null }))
    if (!back.ok) throw new Error('erwartet ok')
    expect(back.block).toMatchObject({ name: 'Mein Block', weeks: 4 })
    expect(back.block.sessions[0]).toMatchObject({ kind: 'own', day: 2, title: 'Beine', note: 'schwer', plannedDurationMin: 60 })
    expect(back.block.sessions[0].blocks).toHaveLength(1)
  })
})

test.describe('Planaustausch: Bildschirm', () => {
  test('Import legt den Block an und meldet die Zählung; Export lädt eine JSON-Datei', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      data.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/eigen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('plan-import-input').setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(file([s({ day: 1, ruleId: 'max_strength_80' }), s({ day: 2, title: 'Lauf', intent: 'AEROBIC_BASE' }), s({ day: 2 })])) })
    await expect(page.getByTestId('plan-import-report')).toContainText('1 Einheiten aus Regeln')
    await expect(page.getByTestId('plan-import-report')).toContainText('1 übersprungen')
    await expect(page.getByTestId('own-plan')).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('plan-export').click()])
    expect(download.suggestedFilename()).toMatch(/^kydon-plan-.*\.json$/)
  })

  test('kaputte Datei: ruhige Meldung, kein Block', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/eigen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('plan-import-input').setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from('{kaputt') })
    await expect(page.getByTestId('plan-import-error')).toContainText('kein gültiges JSON')
    await expect(page.getByTestId('own-create')).toBeVisible()
  })
})
