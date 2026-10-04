import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { bestInputIndex, kioskResult, kioskSupported, nextOpen, MAX_ATTEMPTS } from '../src/domain/kiosk'
import { roundWindow, runPlan } from '../src/domain/testDay'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'
import type { StoredTestDay } from '../src/lib/store/localStore'

/** Etappe 4: Kiosk-Modus und Zeitplan des Testtags. */

test.describe('Kiosk: Fachlogik', () => {
  test('der beste GÜLTIGE Versuch zählt; ungültige bleiben gespeichert und markiert', () => {
    // Standweitsprung: höher ist besser; Versuch 2 ist der weiteste, aber ungültig.
    const r = kioskResult('standing_broad_jump', [
      { value: 2.1, valid: true },
      { value: 2.5, valid: false },
      { value: 2.3, valid: true },
    ])!
    expect(Object.values(r.values)).toEqual([2.3])
    expect(r.attempts).toHaveLength(3)
    expect(r.invalidIndexes).toEqual([1])
    expect(r.bestIndex).toBe(2)
  })

  test('leere Felder werden übersprungen, die Markierung folgt der Eingabeposition', () => {
    const inputs = [
      { value: null, valid: true },
      { value: 2.0, valid: true },
      { value: 2.2, valid: true },
    ]
    expect(kioskResult('standing_broad_jump', inputs)!.attempts).toHaveLength(2)
    expect(bestInputIndex('standing_broad_jump', inputs)).toBe(2)
  })

  test('ohne gültigen Versuch gibt es kein Ergebnis', () => {
    expect(kioskResult('standing_broad_jump', [{ value: 2.0, valid: false }])).toBeNull()
    expect(kioskResult('standing_broad_jump', [{ value: null, valid: true }])).toBeNull()
    expect(kioskResult('gibt_es_nicht', [{ value: 1, valid: true }])).toBeNull()
  })

  test('bei «niedriger ist besser» (Sprintzeit) gewinnt die kleinste gültige Zeit', () => {
    const r = kioskResult('sprint_30m', [
      { value: 4.9, valid: true },
      { value: 4.5, valid: false },
      { value: 4.7, valid: true },
    ])!
    expect(Object.values(r.values)).toEqual([4.7])
  })

  test('höchstens drei Versuche; der Kiosk unterstützt nur Tests mit einem Zahlenfeld', () => {
    expect(MAX_ATTEMPTS).toBe(3)
    expect(kioskSupported('standing_broad_jump')).toBe(true)
    expect(kioskSupported('gibt_es_nicht')).toBe(false)
  })

  test('der nächste offene Athlet: nach dem aktuellen, am Ende wieder von vorn, null wenn alle fertig', () => {
    const order = ['a', 'b', 'c', 'd']
    expect(nextOpen(order, new Set(['a']), null)).toBe('b')
    expect(nextOpen(order, new Set(['a', 'b']), 'b')).toBe('c')
    expect(nextOpen(order, new Set(['b', 'c', 'd']), 'd')).toBe('a')
    expect(nextOpen(order, new Set(order), 'a')).toBeNull()
    expect(nextOpen([], new Set(), null)).toBeNull()
  })
})

test.describe('Testtag: Zeitfenster', () => {
  const day = (over: Partial<StoredTestDay>): StoredTestDay =>
    ({ id: 'd', title: '', plannedOn: '2026-10-10', batterySlug: null, testSlugs: ['sprint_30m', 'standing_broad_jump', 'plank_hold'], athleteIds: ['a', 'b', 'c'], stationMinutes: 20, startTime: '09:00', breakMinutes: 5, conditions: { surface: '', temperatureC: null, equipment: '' }, createdAt: '2026-10-01T08:00:00.000Z', completedAt: null, ...over }) as StoredTestDay

  test('Uhrzeit je Runde aus Beginn, Stationsdauer und Pause', () => {
    const d = day({})
    expect(roundWindow(d, 1)).toEqual({ start: '09:00', end: '09:20' })
    expect(roundWindow(d, 2)).toEqual({ start: '09:25', end: '09:45' })
    expect(roundWindow(d, 3)).toEqual({ start: '09:50', end: '10:10' })
    expect(roundWindow(day({ startTime: null }), 1)).toBeNull()
    expect(roundWindow(d, 0)).toBeNull()
  })

  test('der Laufplan rechnet die Pause mit: Start der Runde und Gesamtdauer', () => {
    const plan = runPlan(day({}))
    expect(plan.slots.filter((s) => s.round === 2)[0].startMinute).toBe(25)
    expect(plan.totalMinutes).toBe(3 * 20 + 2 * 5)
    expect(runPlan(day({ breakMinutes: 0 })).totalMinutes).toBe(60)
  })
})

test('Schema 31: ein Bestand der Version 30 bekommt Startzeit und Pause für bestehende Testtage', () => {
  const old = { ...emptyData(), version: 30, testDays: [{ id: 't', title: '', plannedOn: '2026-10-10', batterySlug: null, testSlugs: ['sprint_30m'], athleteIds: [], stationMinutes: 20, conditions: { surface: '', temperatureC: null, equipment: '' }, createdAt: '2026-10-01T08:00:00.000Z', completedAt: null }] } as any
  const { data, report } = parseStoredData(old)
  expect(report.migratedFrom).toBe(30)
  expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
  expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(31)
  expect(data?.testDays[0]).toMatchObject({ startTime: null, breakMinutes: 0 })
})

async function asCoachWithTeam(page: import('@playwright/test').Page, withDay = true) {
  await openDemo(page)
  await page.evaluate((withDayInner) => {
    const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const base = store.athletes[0]
    const ids: string[] = [base.id]
    for (const [i, name] of ['Liam', 'Noah', 'Ethan'].entries()) {
      const a = JSON.parse(JSON.stringify(base))
      a.id = `k-${i}`
      a.name = name
      a.results = []
      a.audit = []
      store.athletes.push(a)
      ids.push(a.id)
    }
    store.athletes[0].results = store.athletes[0].results.filter((r: any) => r.testSlug !== 'standing_broad_jump')
    store.role = 'coach'
    if (withDayInner) {
      const today = new Date().toISOString().slice(0, 10)
      store.testDays = [{ id: 'td', title: 'Testtag', plannedOn: today, batterySlug: null, testSlugs: ['standing_broad_jump', 'sprint_30m'], athleteIds: ids, stationMinutes: 20, startTime: '09:00', breakMinutes: 5, conditions: { surface: 'Halle', temperatureC: null, equipment: '' }, createdAt: new Date().toISOString(), completedAt: null }]
    }
    localStorage.setItem('kydon.data.v1', JSON.stringify(store))
  }, withDay)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test('Bildschirm: Kiosk ohne Kopfzeile und Leiste; drei Versuche, ungültig markieren, speichern, weiter', async ({ page }) => {
  await asCoachWithTeam(page)
  await page.goto('/trainer/kiosk?test=standing_broad_jump', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('kiosk')).toBeVisible()
  // Kein Dashboard, keine Navigation.
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0)
  await expect(page.getByTestId('kiosk-progress')).toContainText('von 4')
  await page.getByTestId('kiosk-next-open').click()
  const name = await page.getByTestId('kiosk-athlete-name').innerText()
  await page.getByTestId('kiosk-input-1').fill('2,10')
  await page.getByTestId('kiosk-input-2').fill('2.50')
  await page.getByTestId('kiosk-invalid-2').click()
  await page.getByTestId('kiosk-input-3').fill('2.30')
  await expect(page.getByTestId('kiosk-attempt-3').getByTestId('kiosk-best')).toBeVisible()
  await expect(page.getByTestId('kiosk-attempt-2').getByTestId('kiosk-best')).toHaveCount(0)
  await page.getByTestId('kiosk-save').click()
  await expect(page.getByTestId('kiosk-flash')).toContainText(name)
  // Direkt weiter beim nächsten Athleten, ohne Umweg über eine Liste.
  await expect(page.getByTestId('kiosk-entry')).toBeVisible()
  await expect(page.getByTestId('kiosk-athlete-name')).not.toHaveText(name)
  const saved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    const all = s.athletes.flatMap((a: any) => a.results.filter((x: any) => x.testSlug === 'standing_broad_jump' && x.attempts.length === 3))
    const r = all[0]
    return { count: all.length, values: r.values, attempts: r.attempts.length, invalid: r.protocol.invalidAttempts, selection: r.attemptSelection, surface: r.context.surface }
  })
  expect(saved.count).toBe(1)
  expect(Object.values(saved.values)).toEqual([2.3])
  expect(saved.attempts).toBe(3)
  expect(saved.invalid).toEqual([{ index: 1, reason: '' }])
  expect(saved.selection).toBe('best')
  expect(saved.surface).toBe('Halle')
})

test('Bildschirm: Ohne gültigen Versuch gibt es kein Speichern; am Ende «Alle gemessen»', async ({ page }) => {
  await asCoachWithTeam(page, false)
  // Nur zwei Athleten übrig lassen: der Rest wäre eine lange Schleife ohne Erkenntnis.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kydon.data.v1')!)
    s.athletes = s.athletes.slice(0, 2)
    localStorage.setItem('kydon.data.v1', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.goto('/trainer/kiosk?test=standing_broad_jump', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('kiosk-next-open').click()
  await expect(page.getByTestId('kiosk-save')).toBeDisabled()
  await page.getByTestId('kiosk-input-1').fill('2.0')
  await page.getByTestId('kiosk-invalid-1').click()
  await expect(page.getByTestId('kiosk-save')).toBeDisabled()
  await page.getByTestId('kiosk-invalid-1').click()
  await page.getByTestId('kiosk-save').click()
  await page.getByTestId('kiosk-input-1').fill('1.9')
  await page.getByTestId('kiosk-save').click()
  await expect(page.getByTestId('kiosk-all-done')).toBeVisible()
  await expect(page.getByTestId('kiosk-progress')).toContainText('2 von 2')
})

test('Bildschirm: der Testtag zeigt Uhrzeiten und führt in den Kiosk', async ({ page }) => {
  await asCoachWithTeam(page)
  await page.goto('/trainer/testtag/td', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('round-window-1')).toContainText('09:00–09:20')
  await expect(page.getByTestId('round-window-2')).toContainText('09:25–09:45')
  await page.getByTestId('kiosk-link-standing_broad_jump').click()
  await expect(page).toHaveURL(/\/trainer\/kiosk\?test=standing_broad_jump/)
  await expect(page.getByTestId('kiosk-progress')).toContainText('von 4')
  await page.getByTestId('kiosk-exit').click()
  await expect(page).toHaveURL(/\/trainer\/testtag\/td$/)
})

test('Bildschirm: Testtag anlegen mit Startzeit und Pause', async ({ page }) => {
  await asCoachWithTeam(page, false)
  await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Neuer Testtag|Testtag anlegen|Neu/i }).first().click()
  await expect(page.getByTestId('testday-start-time')).toBeVisible()
  await expect(page.getByTestId('testday-break')).toBeVisible()
})

test('Bildschirm: Kiosk ohne Überlaufen, hell und dunkel', async ({ page }) => {
  await asCoachWithTeam(page)
  for (const theme of ['light', 'dark']) {
    await page.goto('/trainer/kiosk?test=standing_broad_jump&tag=' + new Date().toISOString().slice(0, 10), { waitUntil: 'domcontentloaded' })
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    await page.getByTestId('kiosk').waitFor()
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over, theme).toBeLessThanOrEqual(0)
  }
})
