import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { readFileSync } from 'node:fs'
import { fuelRuleFor } from '../src/domain/fuel'
import { planFuel, tournamentPlan } from '../src/domain/fuelPlan'
import { FUEL_RULES, FUEL_SOURCES } from '../src/data/fuelRules'

/** Fuel Stufe 4: Kampfsport und Teamsport, Turniertag-Planer, Hinweis zu Gewichtsklassen. */

const rule = (id: string) => fuelRuleFor(id)!.rule

test.describe('Regeln Kampf- und Teamsport', () => {
  test('Judo, Karate, Fussball, Handball haben Regeln; Ju-Jutsu nicht', () => {
    expect(fuelRuleFor('judo')?.rule.carbsPerKg).toEqual([4, 7])
    expect(fuelRuleFor('karate')?.rule.carbsPerKg).toEqual([3, 6])
    expect(fuelRuleFor('football')?.rule.carbsPerKg).toEqual([5, 10])
    expect(fuelRuleFor('rugby')?.rule.carbsPerKg).toEqual([5, 8])
    expect(fuelRuleFor('ju_jutsu')).toBeNull()
  })

  test('Kampfsport mit Gewichtsklasse trägt den Hinweis, Fechten und Teamsport nicht', () => {
    for (const id of ['judo', 'wrestling', 'boxing', 'taekwondo', 'mma', 'bjj', 'kickboxing', 'pencak_silat', 'karate']) expect(rule(id).weightClass, id).toBe(true)
    for (const id of ['fencing', 'football', 'handball']) expect(rule(id).weightClass, id).toBeFalsy()
  })

  test('dünne Studienlage steht als «low» und «Übertragen», nicht als hoch', () => {
    for (const id of ['bjj', 'kickboxing', 'pencak_silat', 'karate']) {
      const e = rule(id).evidence
      expect(e.strength, id).toBe('low')
      expect(e.type, id).toBe('extrapolation')
    }
    for (const r of FUEL_RULES) for (const s of r.evidence.sourceIds) expect(FUEL_SOURCES[s], `${r.id}: ${s}`).toBeTruthy()
  })

  test('Kampf im Wettkampf: keine Zufuhr während des Kampfes', () => {
    const p = planFuel({ rule: rule('judo'), weightKg: 80, durationMin: 5, kind: 'race', hoursToNext: null, gutTroubleGPerH: null, lossKg: null })
    expect(p.during.betweenBouts).toBe(true)
    expect(p.during.band).toEqual({ kind: 'none' })
    const train = planFuel({ rule: rule('judo'), weightKg: 80, durationMin: 90, kind: 'training', hoursToNext: null, gutTroubleGPerH: null, lossKg: null })
    expect(train.during.betweenBouts).toBe(false)
  })

  test('Fussball im Spiel: 30–60 g/h', () => {
    const p = planFuel({ rule: rule('football'), weightKg: 75, durationMin: 100, kind: 'race', hoursToNext: null, gutTroubleGPerH: null, lossKg: null })
    expect(p.during.band).toEqual({ kind: 'range', lo: 30, hi: 60 })
  })
})

test.describe('Turniertag', () => {
  test('kurze Pause: nur Flüssigkeit', () => {
    const t = tournamentPlan({ bouts: 6, boutMin: 4, gapMin: 8 })!
    expect(t.gapKind).toBe('sips')
    expect(t.carbsPerGapG).toBeNull()
    expect(t.totalG).toBeNull()
    expect(t.gaps).toBe(5)
    expect(t.spanMin).toBe(6 * 4 + 5 * 8)
  })
  test('Pause von 20 Minuten: kleine Menge, 30–60 g/h auf die Pause gerechnet', () => {
    const t = tournamentPlan({ bouts: 4, boutMin: 5, gapMin: 20 })!
    expect(t.gapKind).toBe('small')
    expect(t.carbsPerGapG).toEqual([10, 20])
    expect(t.totalG).toEqual([30, 60])
  })
  test('lange Pause: Snack; ein Kampf hat keine Pause; ungültige Eingaben ergeben nichts', () => {
    expect(tournamentPlan({ bouts: 3, boutMin: 5, gapMin: 60 })!.gapKind).toBe('snack')
    expect(tournamentPlan({ bouts: 1, boutMin: 5, gapMin: 60 })!.gaps).toBe(0)
    expect(tournamentPlan({ bouts: 0, boutMin: 5, gapMin: 60 })).toBeNull()
  })
  test('die Texte sprechen weder von Wiegen-Zeitplan noch von Abkochen als Anleitung', () => {
    const d = JSON.parse(readFileSync('src/i18n/de.extra.json', 'utf-8')).fueling
    const text = JSON.stringify(d.tournament)
    expect(text).not.toMatch(/abkoch|entwässer|Sauna/i)
    expect(d.weightClass.body).toMatch(/keine Anleitung/)
  })
})

test('Judo: Hinweis zu Gewichtsklassen und Turniertag in der Ernährung', async ({ page }) => {
  await openDemo(page)
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    data.athletes[0].profile.disciplineId = 'judo'
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  })
  await page.goto('/ernaehrung', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('fuel-weightclass')).toBeVisible()
  await expect(page.getByTestId('fuel-tournament')).toHaveCount(0)
  await page.getByTestId('fuel-plan').getByRole('button', { name: /Wettkampf/ }).click()
  await expect(page.getByTestId('fuel-tournament')).toBeVisible()
  await expect(page.getByTestId('fuel-tournament-gap')).toContainText('g')
  await expect(page.getByTestId('fuel-plan-bouts-note')).toBeVisible()
})
