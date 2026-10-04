import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { addOwnSession, copyWeek, createOwnBlock, deleteOwnSession, duplicateSession, openSessionsOn } from '../src/domain/trainingBlock'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Trainingsbereich Etappe 4: eigener Plan. */

const NOW = '2026-10-04T09:00:00.000Z'
const mk = () => createOwnBlock({ id: 'b', name: '  Mein Block  ', family: null, disciplineId: null, phase: 'BUILD', weeks: 4, startDay: '2026-10-04', now: NOW })
const input = (id: string, day: number, over = {}) => ({ id, day, intent: 'MAX_STRENGTH', title: 'Beine', note: '', minutes: 60, weekFrom: 1, weekTo: null, highIntensity: false, ...over })
const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error('erwartet ok')
  return (r as unknown as { block: ReturnType<typeof mk> }).block
}

test.describe('Eigener Plan: Fachlogik', () => {
  test('leerer Plan: Name gekürzt, Start am Montag, keine Einheit, keine Vorlage', () => {
    const b = mk()
    expect(b).toMatchObject({ name: 'Mein Block', startDay: '2026-10-05', weeks: 4, sessions: [], templateId: null, family: null })
  })

  test('eigene Einheit trägt keine Regel und keine Evidenz; Tag doppelt wird abgewiesen, andere Wochen gehen', () => {
    let b = ok(addOwnSession(mk(), input('a', 1), NOW))
    expect(b.sessions[0]).toMatchObject({ kind: 'own', ruleId: null, evidenceStrength: null, title: 'Beine', plannedDurationMin: 60 })
    expect(addOwnSession(b, input('x', 1), NOW)).toEqual({ ok: false, error: 'day_taken' })
    b = ok(addOwnSession(b, input('c', 2), NOW))
    expect(addOwnSession(b, input('y', 5, { weekFrom: 3, weekTo: 9 }), NOW)).toEqual({ ok: false, error: 'bad_weeks' })
    expect(addOwnSession(b, input('y', 5, { intent: '' }), NOW)).toEqual({ ok: false, error: 'no_intent' })
  })

  test('kopieren, löschen: Kopie ist eigenständig; nur eigene Einheiten lassen sich löschen', () => {
    const b = ok(addOwnSession(mk(), input('a', 1), NOW))
    expect(duplicateSession(b, 'a', 1, 'n', NOW)).toEqual({ ok: false, error: 'day_taken' })
    const b2 = ok(duplicateSession(b, 'a', 3, 'n', NOW))
    expect(b2.sessions.map((s) => s.day).sort()).toEqual([1, 3])
    expect(ok(deleteOwnSession(b2, 'n', NOW)).sessions).toHaveLength(1)
    const withRule = { ...b2, sessions: [...b2.sessions, { ...b2.sessions[0], id: 'r', kind: 'rule' as const, day: 6 }] }
    expect(deleteOwnSession(withRule, 'r', NOW)).toEqual({ ok: false, error: 'unknown_session' })
  })

  test('Woche kopieren: Einheiten der Quellwoche gelten auch in der Zielwoche; belegte Tage werden gezählt übersprungen', () => {
    let b = ok(addOwnSession(mk(), input('a', 1, { weekFrom: 1, weekTo: 1 }), NOW))
    b = ok(addOwnSession(b, input('b', 3, { weekFrom: 1, weekTo: 1 }), NOW))
    b = ok(addOwnSession(b, input('c', 3, { weekFrom: 2, weekTo: 2 }), NOW))
    let n = 0
    const r = copyWeek(b, 1, 2, () => `k${n++}`, NOW)
    expect(r).toMatchObject({ copied: 1, skipped: 1 })
    const day = (week: number, wd: number) => new Date(Date.parse('2026-10-05T00:00:00Z') + ((week - 1) * 7 + wd - 1) * 86_400_000).toISOString().slice(0, 10)
    expect(openSessionsOn(r.block, day(2, 1))).toHaveLength(1)
    expect(openSessionsOn(r.block, day(3, 1))).toHaveLength(0)
  })

  test('Schema 35: ein Bestand der Version 34 bekommt Name, Titel und Notiz', () => {
    const old = emptyData() as any
    old.version = 34
    old.athletes[0].trainingBlocks = [{ id: 'b', family: 'hybrid', disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 6, retestMetrics: [], templateId: null, eventDay: null, sessions: [{ id: 's', day: 1, weekFrom: 1, weekTo: null, kind: 'open', ruleId: null, ruleVersion: null, primaryIntent: 'AEROBIC_BASE', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: null, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false }], completions: [], status: 'active', createdAt: NOW, updatedAt: NOW }]
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(34)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(35)
    expect(data!.athletes[0].trainingBlocks[0]).toMatchObject({ name: '' })
    expect(data!.athletes[0].trainingBlocks[0].sessions[0]).toMatchObject({ title: '', note: '' })
  })
})

test.describe('Eigener Plan: Bildschirm', () => {
  test('anlegen, Einheit hinzufügen, kopieren, Woche kopieren; Kalender zeigt den Titel', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].trainingBlocks = []
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/eigen', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('own-create-button')).toBeDisabled()
    await page.getByTestId('own-name').fill('Mein Block')
    await page.getByTestId('own-weeks').fill('4')
    await page.getByTestId('own-create-button').click()
    await expect(page.getByTestId('own-plan')).toBeVisible()
    await page.getByTestId('own-title').fill('Beintag')
    await page.getByTestId('own-minutes').fill('60')
    await page.getByTestId('own-add-button').click()
    await expect(page.getByTestId('own-list')).toContainText('Beintag')
    await expect(page.getByTestId('own-list')).toContainText('Eigene Einheit')
    await page.getByTestId('own-add-button').click()
    await expect(page.getByTestId('own-message')).toContainText('schon eine Einheit')
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks[0].sessions[0].id)
    await page.getByTestId(`own-dup-${id}`).selectOption('4')
    await expect(page.locator('[data-testid^="own-session-"]')).toHaveCount(2)
    await page.getByTestId('own-copy-button').click()
    await expect(page.getByTestId('own-message')).toContainText('übersprungen')
    await page.goto('/plan/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('cal-day-1')).toContainText('Beintag')
    await page.goto(`/plan/eigen`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId(`own-del-${id}`).click()
    await expect(page.locator('[data-testid^="own-session-"]')).toHaveCount(1)
  })
})
