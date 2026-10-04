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
