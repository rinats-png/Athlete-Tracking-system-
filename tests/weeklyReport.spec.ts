import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { RECIPIENTS, weeklyReport } from '../src/domain/weeklyReport'
import { emptyData } from '../src/lib/store/schema'

/** Etappe 8c: Wochenbericht des Trainers — Datensparsamkeit je Empfänger, Prüfung vor Weitergabe. */

const asOf = new Date('2026-10-05T08:00:00.000Z')
const input = () => {
  const a = emptyData().athletes[0]
  a.profile.weeklyTarget = { sessions: 3, loadAU: 400 }
  a.profile.competition = { name: 'Landesmeisterschaft', on: '2026-12-01' }
  a.diary = [{ day: '2026-10-04', sessions: [{ id: 's', durationMin: 60, rpe: 5 }] }] as never
  return { athlete: { profile: a.profile, results: [], workouts: [], diary: a.diary }, reminders: { remindersEnabled: false, reminderIntervalDays: {} } }
}
const keys = (r: ReturnType<typeof weeklyReport>) => r.facts.map((f) => f.key)

test.describe('Wochenbericht: Fachlogik', () => {
  test('Athlet bekommt alles, Eltern ohne Check-ins, Verband nur Datenlage, Befund, nächste Messung', () => {
    expect(keys(weeklyReport(input(), 'athlete', asOf))).toEqual(['form', 'noFinding', 'loadNoBaseline', 'checkins', 'plan', 'countdown', 'nextNone'])
    expect(keys(weeklyReport(input(), 'parents', asOf))).toEqual(['form', 'noFinding', 'loadNoBaseline', 'plan', 'countdown', 'nextNone'])
    expect(keys(weeklyReport(input(), 'association', asOf))).toEqual(['form', 'noFinding', 'nextNone'])
    expect(RECIPIENTS).toHaveLength(3)
  })
})

test('Bildschirm: Weitergabe erst nach Bestätigung, Verband sieht keine Belastung', async ({ page }) => {
  await openDemo(page)
  await page.goto('/trainer/wochenbericht')
  await expect(page.getByTestId('weekly-report')).toBeVisible()
  await expect(page.getByTestId('report-copy')).toBeDisabled()
  await expect(page.getByTestId('report-print')).toBeDisabled()
  await page.getByTestId('report-note').fill('Gute Woche im Team.')
  await page.getByTestId('report-checked').check()
  await expect(page.getByTestId('report-copy')).toBeEnabled()
  await expect(page.getByTestId('report-note-text')).toHaveText('Gute Woche im Team.')
  // Eine Änderung hebt die Bestätigung auf.
  await page.getByTestId('report-note').fill('Anders.')
  await expect(page.getByTestId('report-copy')).toBeDisabled()
  await page.getByTestId('report-to-association').click()
  const body = await page.getByTestId('report-body').innerText()
  expect(body).not.toMatch(/AU|weekly\.|brief\./)
  expect(body).not.toMatch(/weeklyReport\./)
})
