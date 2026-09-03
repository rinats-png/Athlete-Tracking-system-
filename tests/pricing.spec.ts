import { expect, test } from '@playwright/test'
import { PLANS, PLAN_BY_ID, coachMonthlyEur } from '../src/data/pricing'
import { openGuest } from './helpers'

/**
 * Preise.
 *
 * Zwei Fehler wären hier teuer: eine Seite, die nach einem Kauf aussieht,
 * obwohl nichts abgerechnet werden kann — und eine Stufe, die den Export der
 * eigenen Daten hinter eine Bezahlschranke stellt (§32). Beides prüfen diese
 * Fälle.
 */

test.describe('Preisstufen', () => {
  test('die Zahlen stehen so, wie sie vereinbart sind', () => {
    expect(PLAN_BY_ID.get('solo')!.monthlyEur).toBe(9.9)
    const coach = PLAN_BY_ID.get('coach')!
    expect(coach.monthlyEur).toBe(99.9)
    expect(coach.includedAthletes).toBe(10)
    expect(coach.extraAthleteEur).toBe(4.99)
    // Die Vereinsstufe wird vereinbart, nicht ausgepreist.
    expect(PLAN_BY_ID.get('club')!.monthlyEur).toBeNull()
  })

  test('bis zehn Athleten kostet die Trainerstufe den Grundpreis', () => {
    expect(coachMonthlyEur(1)).toBeCloseTo(99.9, 2)
    expect(coachMonthlyEur(10)).toBeCloseTo(99.9, 2)
    expect(coachMonthlyEur(11)).toBeCloseTo(104.89, 2)
    expect(coachMonthlyEur(15)).toBeCloseTo(124.85, 2)
  })

  test('keine Stufe stellt den Export hinter eine Schranke', () => {
    const frei = PLAN_BY_ID.get('free')!
    expect(
      frei.features.some((f) => /Export/i.test(f.de)),
      'der Export muss auch ohne Konto zugesagt sein (§32)',
    ).toBe(true)
    for (const plan of PLANS) {
      const werbend = plan.features.map((f) => f.de).join(' ')
      expect(/nur mit Abo|nur im Abo/i.test(werbend), plan.id).toBe(false)
    }
  })

  test('die Seite sagt, dass noch nichts gekauft werden kann', async ({ page }) => {
    await openGuest(page)
    await page.goto('/preise', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preise')
    await expect(page.getByText(/Noch kann nichts gekauft werden/)).toBeVisible()
    await expect(page.getByText('9,90 € im Monat', { exact: true })).toBeVisible()
    await expect(page.getByText('99,90 € im Monat')).toBeVisible()
  })

  test('vom Profil führt ein Weg dorthin', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Preise' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preise')
  })
})
