import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { deleteTemplate, deleteVersion, latestVersion, MAX_TEMPLATES, MAX_TOTAL_CHARS, MAX_VERSIONS, saveAsTemplate } from '../src/domain/planLibrary'
import { importPlan } from '../src/domain/planFile'
import { addOwnSession, createOwnBlock } from '../src/domain/trainingBlock'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/** Trainingsbereich Etappe 12: eigene Planvorlagen mit Versionen. */

const NOW = '2026-10-05T09:00:00.000Z'
let n = 0
const id = () => `t${n++}`
const block = (sessions = 1) => {
  let b = createOwnBlock({ id: 'b', name: 'Mein Block', family: null, disciplineId: null, phase: 'BUILD', weeks: 4, startDay: '2026-10-05', now: NOW })
  for (let i = 0; i < sessions; i++) {
    const r = addOwnSession(b, { id: `s${i}`, day: i + 1, intent: 'MAX_STRENGTH', title: `E${i}`, note: '', minutes: 30, weekFrom: 1, weekTo: null, highIntensity: false }, '')
    if (!r.ok) throw new Error('x')
    b = r.block
  }
  return b
}

test.describe('Planvorlagen: Fachlogik', () => {
  test('gleicher Name ergibt eine neue Version, andere Namen neue Vorlagen; Groß-/Kleinschreibung zählt nicht', () => {
    const a = saveAsTemplate([], block(1), 'Basis', id, NOW)
    if (!a.ok) throw new Error('x')
    expect(a.version).toBe(1)
    const b = saveAsTemplate(a.list, block(2), ' basis ', id, '2026-10-06T00:00:00.000Z')
    if (!b.ok) throw new Error('x')
    expect(b.list).toHaveLength(1)
    expect(b.version).toBe(2)
    expect(b.list[0].versions.map((v) => v.version)).toEqual([1, 2])
    const c = saveAsTemplate(b.list, block(1), 'Andere', id, NOW)
    if (!c.ok) throw new Error('x')
    expect(c.list).toHaveLength(2)
  })
  test('höchstens fünf Versionen und zwanzig Vorlagen; leerer Name und leerer Plan werden abgewiesen', () => {
    let list = [] as ReturnType<typeof deleteTemplate>
    for (let i = 0; i < 7; i++) {
      const r = saveAsTemplate(list, block(1 + (i % 2)), 'V', id, NOW)
      if (!r.ok) throw new Error('x')
      list = r.list
    }
    expect(list[0].versions).toHaveLength(MAX_VERSIONS)
    expect(list[0].versions[0].version).toBe(3)
    expect(latestVersion(list[0]).version).toBe(7)
    expect(saveAsTemplate([], block(1), '  ', id, NOW)).toEqual({ ok: false, error: 'no_name' })
    expect(saveAsTemplate([], block(0), 'Leer', id, NOW)).toEqual({ ok: false, error: 'no_sessions' })
    let many = [] as typeof list
    for (let i = 0; i < MAX_TEMPLATES; i++) many = (saveAsTemplate(many, block(1), `N${i}`, id, NOW) as { list: typeof list }).list
    expect(saveAsTemplate(many, block(1), 'Zu viel', id, NOW)).toEqual({ ok: false, error: 'too_many' })
  })
  test('eine Version lässt sich einzeln löschen, die letzte nimmt die Vorlage mit; Verwenden liefert den Inhalt der Version', () => {
    const a = saveAsTemplate([], block(1), 'Basis', id, NOW) as { list: ReturnType<typeof deleteTemplate> }
    const b = saveAsTemplate(a.list, block(2), 'Basis', id, NOW) as { list: ReturnType<typeof deleteTemplate> }
    const tpl = b.list[0]
    const ctx = { newId: id, now: NOW, startDay: '2026-10-05', disciplineId: null, family: null, trainingAgeYears: null, mode: 'preview' as const }
    const v1 = importPlan(tpl.versions[0].content, ctx)
    const v2 = importPlan(tpl.versions[1].content, ctx)
    if (!v1.ok || !v2.ok) throw new Error('x')
    expect([v1.block.sessions.length, v2.block.sessions.length]).toEqual([1, 2])
    const afterOne = deleteVersion(b.list, tpl.id, 1)
    expect(afterOne[0].versions.map((v) => v.version)).toEqual([2])
    expect(deleteVersion(afterOne, tpl.id, 2)).toEqual([])
    expect(deleteTemplate(b.list, tpl.id)).toEqual([])
  })
  test('Speicherschutz: eine zu große Version und eine zu große Gesamtmenge werden abgewiesen', () => {
    // Die Gesamtmenge: viele Vorlagen mit je großem Inhalt.
    const filler = Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, name: `F${i}`, weeks: 4, versions: [{ version: 1, savedAt: NOW, content: 'x'.repeat(MAX_TOTAL_CHARS / 10) }] }))
    expect(saveAsTemplate(filler, block(1), 'Neu', id, NOW)).toEqual({ ok: false, error: 'too_big' })
    expect(saveAsTemplate(filler.slice(0, 3), block(1), 'Neu', id, NOW).ok).toBe(true)
  })
  test('Schema 39: ältere Bestände bekommen leere Vorlagen', () => {
    const old = emptyData() as any
    old.version = 38
    for (const a of old.athletes) delete a.planTemplates
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(38)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(39)
    expect(data!.athletes[0].planTemplates).toEqual([])
  })
})

test.describe('Planvorlagen: Bildschirm', () => {
  test('Plan als Vorlage speichern, erneut als Version 2, in der Bibliothek verwenden', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const now = new Date().toISOString()
      d.athletes[0].planTemplates = []
      d.athletes[0].trainingBlocks = [{ id: 'x', name: 'Mein Plan', family: null, disciplineId: null, phase: 'BUILD', startDay: '2026-10-05', weeks: 4, retestMetrics: [], templateId: null, assignmentId: null, eventDay: null, completions: [], status: 'active', createdAt: now, updatedAt: now,
        sessions: [{ id: 's', day: 1, weekFrom: 1, weekTo: null, kind: 'own', title: 'Beine', note: '', ruleId: null, ruleVersion: null, primaryIntent: 'MAX_STRENGTH', evidenceStrength: null, evidenceSpecificity: null, plannedDurationMin: 60, highIntensity: false, blocks: [], retestMetric: '', coachModified: false, coachModificationReason: null, removed: false }] }]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/block', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('save-template-open').click()
    await page.getByTestId('save-template-confirm').click()
    await expect(page.getByTestId('save-template-message')).toContainText('Version 1')
    await page.getByTestId('save-template-open').click()
    await page.getByTestId('save-template-confirm').click()
    await expect(page.getByTestId('save-template-message')).toContainText('Version 2')
    // Block schließen, damit die Vorlage verwendet werden kann.
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      d.athletes[0].trainingBlocks[0].status = 'closed'
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
    })
    await page.goto('/plan/vorlagen', { waitUntil: 'domcontentloaded' })
    const card = page.getByTestId('my-templates')
    await expect(card).toContainText('Mein Plan')
    await expect(card).toContainText('Version 2')
    await page.locator('[data-testid^="my-template-version-"]').selectOption('1')
    await page.locator('[data-testid^="my-template-use-"]').click()
    await expect(page).toHaveURL(/\/plan\/block/)
    const blocks = await page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0].trainingBlocks)
    expect(blocks.some((b: { status: string; name: string }) => b.status === 'active' && b.name === 'Mein Plan')).toBe(true)
  })
})
