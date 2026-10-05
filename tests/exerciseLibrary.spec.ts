import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { addCustomExercise, MAX_CUSTOM, removeCustomExercise, searchLibrary } from '../src/domain/exerciseLibrary'
import { EXERCISES } from '../src/data/exercises'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Trainingsbereich Etappe 15: Übungsbibliothek mit eigenen Übungen. */

let n = 0
const id = () => `c${n++}`

test.describe('Übungsbibliothek: Fachlogik', () => {
  test('eigene Übung: Name gesäubert; doppelt (auch gegen den Katalog, beide Sprachen) und leer werden abgewiesen; Grenze 50', () => {
    const a = addCustomExercise([], '  Zughaltung   Ringe ', 'back', id)
    if (!a.ok) throw new Error('x')
    expect(a.list).toEqual([{ id: expect.any(String), name: 'Zughaltung Ringe', muscle: 'back' }])
    expect(addCustomExercise(a.list, 'zughaltung ringe', null, id)).toEqual({ ok: false, error: 'duplicate' })
    expect(addCustomExercise([], 'Kniebeuge (Langhantel)', null, id)).toEqual({ ok: false, error: 'duplicate' })
    expect(addCustomExercise([], 'back squat (barbell)', null, id)).toEqual({ ok: false, error: 'duplicate' })
    expect(addCustomExercise([], '   ', null, id)).toEqual({ ok: false, error: 'no_name' })
    let list = [] as typeof a.list
    for (let i = 0; i < MAX_CUSTOM; i++) list = (addCustomExercise(list, `Eigene ${i}`, null, id) as { list: typeof list }).list
    expect(addCustomExercise(list, 'Eine zu viel', null, id)).toEqual({ ok: false, error: 'too_many' })
    expect(removeCustomExercise(list, list[0].id)).toHaveLength(MAX_CUSTOM - 1)
  })
  test('Suche: eigene vor dem Katalog, Umlaute und Sprachen egal, Muskelgruppe filtert', () => {
    const customs = [{ id: 'k', name: 'Kniebeuge am Ring', muscle: 'legs' as const }]
    const r = searchLibrary('kniebeuge', customs, null, 'de')
    expect(r[0]).toMatchObject({ customId: 'k', key: null })
    expect(r.some((e) => e.key === 'back_squat')).toBe(true)
    expect(searchLibrary('squat', [], null, 'de').some((e) => e.key === 'back_squat')).toBe(true) // englischer Name findet auch in der deutschen Ansicht
    const chest = searchLibrary('', customs, 'chest', 'en')
    expect(chest.length).toBeGreaterThan(0)
    expect(chest.every((e) => e.muscle === 'chest')).toBe(true)
    expect(searchLibrary('', [], null, 'en').length).toBe(EXERCISES.length)
  })
  test('Schema 40: ältere Bestände bekommen leere eigene Übungen', () => {
    const old = emptyData() as any
    old.version = 39
    for (const a of old.athletes) delete a.customExercises
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(39)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(40)
    expect(data!.athletes[0].customExercises).toEqual([])
  })
})

test.describe('Übungsbibliothek: Bildschirm', () => {
  test('Katalog mit Bildern, Filter, eigene Übung anlegen; im eigenen Plan in der Übungssuche auffindbar', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].customExercises = []
      d.athletes[0].trainingBlocks = [{ id: 'x', name: 'P', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, completions: [], status: 'active', createdAt: now, updatedAt: now,
        sessions: [{ id: 's1', day: 1, weekFrom: 1, weekTo: null, kind: 'own', title: 'Zug', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'MAX_STRENGTH', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false }] }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/uebungen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('exlib-item-back_squat')).toBeVisible()
    await expect(page.getByTestId('exlib-item-back_squat').locator('img')).toHaveCount(1)
    await page.getByTestId('exlib-muscle-chest').click()
    await expect(page.getByTestId('exlib-item-back_squat')).toHaveCount(0)
    await page.getByTestId('exlib-muscle-all').click()
    await page.getByTestId('exlib-name').fill('Zughaltung Ringe')
    await page.getByTestId('exlib-muscle').selectOption('back')
    await page.getByTestId('exlib-add-button').click()
    await expect(page.locator('[data-testid^="exlib-custom-"]')).toContainText('Zughaltung Ringe')
    await page.getByTestId('exlib-name').fill('zughaltung ringe')
    await page.getByTestId('exlib-add-button').click()
    await expect(page.getByTestId('exlib-message')).toContainText('schon')
    await page.goto('/plan/eigen', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('own-ex-search-s1').fill('zughalt')
    await page.locator('[data-testid^="own-ex-hit-"]').first().click()
    await page.getByTestId('own-ex-add-s1').click()
    await expect(page.getByTestId('own-ex-s1')).toContainText('Zughaltung Ringe: 3')
    await page.goto('/plan/uebungen', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-testid^="exlib-remove-"]').click()
    await expect(page.locator('[data-testid^="exlib-custom-"]')).toHaveCount(0)
  })
})
