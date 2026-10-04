import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { mondayBrief } from '../src/domain/mondayBrief'
import { passesGuard } from '../src/domain/answerGuard'
import { emptyData } from '../src/lib/store/schema'

/** Etappe 7a: Montagsbrief aus festen Fakten. */

const asOf = new Date('2026-10-05T08:00:00.000Z')
const off = { remindersEnabled: false, reminderIntervalDays: {} }

test.describe('Montagsbrief: Fachlogik', () => {
  test('ohne Daten: unzureichende Datenlage, kein Befund, keine Basislinie, kein nächster Schritt', () => {
    const a = emptyData().athletes[0]
    const b = mondayBrief({ athlete: { profile: a.profile, results: [], workouts: [], diary: [] }, reminders: off }, asOf)
    expect(b.to).toBe('2026-10-05')
    expect(b.from).toBe('2026-09-29')
    expect(b.facts.map((f) => f.key)).toEqual(['form', 'noFinding', 'loadNoBaseline', 'checkins', 'nextNone'])
    expect(b.facts[0].params.level).toBe('INSUFFICIENT')
  })

  test('der Brief besteht aus Fakten, die der Zahlenwächter kennt', () => {
    const a = emptyData().athletes[0]
    const b = mondayBrief({ athlete: { profile: a.profile, results: [], workouts: [], diary: [] }, reminders: off }, asOf)
    expect(passesGuard('Diese Woche 0 AU, Check-in an 0 Tagen.', b.facts)).toBe(true)
    expect(passesGuard('Diese Woche 40 AU.', b.facts)).toBe(false)
  })
})

test('Bildschirm: Brief zeigt vier Karten ohne rohe Schlüssel', async ({ page }) => {
  await openDemo(page)
  await page.goto('/brief')
  await expect(page.getByTestId('monday-brief')).toBeVisible()
  for (const id of ['form', 'finding', 'load', 'next']) await expect(page.getByTestId(`brief-${id}`)).toBeVisible()
  expect(await page.getByTestId('monday-brief').innerText()).not.toMatch(/brief\.|\{\{/)
})

import { daysTo, hasTarget, weeksAgainstTarget } from '../src/domain/weeklyPlan'
import { CURRENT_SCHEMA_VERSION, parseStoredData } from '../src/lib/store/schema'

test.describe('Wochenziel gegen Ist (Etappe 7b)', () => {
  const entry = (day: string, durationMin: number, rpe: number) =>
    ({ day, sessions: [{ id: day, durationMin, rpe }] }) as never
  const diary = [entry('2026-10-05', 60, 5), entry('2026-10-03', 30, 6), entry('2026-09-28', 45, 4)]

  test('Ist je Sieben-Tage-Fenster, Differenz Ist minus Ziel, ohne Wertung', () => {
    const w = weeksAgainstTarget(diary, { sessions: 3, loadAU: 500 }, asOf, 2)
    // Fenster 1: 29.09.–05.10. = 60×5 + 30×6 = 480 AU, 2 Einheiten.
    expect(w[0]).toMatchObject({ from: '2026-09-29', to: '2026-10-05', sessions: 2, loadAU: 480, sessionsDelta: -1, loadDelta: -20 })
    // Fenster 2: 22.–28.09. = 45×4 = 180 AU, 1 Einheit.
    expect(w[1]).toMatchObject({ sessions: 1, loadAU: 180 })
  })
  test('ohne Ziel keine Differenz, hasTarget erkennt leere Ziele', () => {
    expect(hasTarget({ sessions: null, loadAU: null })).toBe(false)
    expect(hasTarget({ sessions: 0, loadAU: null })).toBe(true)
    expect(weeksAgainstTarget(diary, { sessions: null, loadAU: null }, asOf, 1)[0].sessionsDelta).toBeNull()
  })
  test('Tage bis zum Wettkampf', () => {
    expect(daysTo('2026-10-15', asOf)).toBe(10)
    expect(daysTo('2026-10-01', asOf)).toBe(-4)
  })
  test('Migration 31 → 32 setzt ein leeres Wochenziel', () => {
    const old = { ...emptyData(), version: 31 } as any
    for (const a of old.athletes) delete a.profile.weeklyTarget
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(31)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(32)
    expect(data?.athletes[0].profile.weeklyTarget).toEqual({ sessions: null, loadAU: null })
  })
})
