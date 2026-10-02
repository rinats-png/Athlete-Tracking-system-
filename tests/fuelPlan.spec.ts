import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { fuelRuleFor } from '../src/domain/fuel'
import { feelByBand, gutProfile, planFuel, sweatProfile } from '../src/domain/fuelPlan'
import { sessionFueling } from '../src/domain/fueling'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'
import type { StoredDiarySession } from '../src/lib/store/localStore'

/** Fuel Stufe 2: Plan je Einheit und eigene Werte. */

const rule = (id: string) => fuelRuleFor(id)!.rule
const base = { weightKg: 70, durationMin: 240, kind: 'race' as const, hoursToNext: null, gutTroubleGPerH: null, lossKg: null }
const fx = (id: string, durationMin: number, extra: Partial<StoredDiarySession> = {}) =>
  sessionFueling({ id, kind: 'endurance', durationMin, rpe: 6, note: '', ...extra }, '2026-09-20')

test.describe('Plan je Einheit', () => {
  test('Marathon im Wettkampf: Aufladen, Zufuhr in der Einheit, kein schnelles Auffüllen ohne Folgeeinheit', () => {
    const p = planFuel({ ...base, rule: rule('marathon') })
    expect(p.before.load?.carbsPerKg).toEqual([10, 12])
    expect(p.before.load?.carbsG).toEqual([700, 840])
    expect(p.before.carbsG).toEqual([70, 280])
    expect(p.before.fluidMl).toEqual([350, 700])
    expect(p.during.band).toEqual({ kind: 'range', lo: 60, hi: 90 })
    expect(p.during.needsMixAndPractice).toBe(true)
    expect(p.after.rapid).toBeNull()
    expect(p.after.proteinPerMealG).toBe(21)
  })

  test('Training braucht kein Aufladen; kurzes Rennen sagt, dass es nicht nötig ist', () => {
    expect(planFuel({ ...base, rule: rule('marathon'), kind: 'training' }).before.load).toBeNull()
    const short = planFuel({ ...base, rule: rule('run_10k_discipline'), durationMin: 45 })
    expect(short.before.load).toBeNull()
    expect(short.before.loadNotNeeded).toBe(true)
    expect(short.during.band).toEqual({ kind: 'small' })
  })

  test('unter 8 Stunden bis zur nächsten Einheit: schnelle Auffüllung 1,0–1,2 g/kg/h', () => {
    const p = planFuel({ ...base, rule: rule('road_race'), hoursToNext: 6 })
    expect(p.after.rapid).toEqual({ carbsPerKgH: [1.0, 1.2], hours: 4, carbsG: [70, 84] })
    expect(planFuel({ ...base, rule: rule('road_race'), hoursToNext: 8 }).after.rapid).toBeNull()
  })

  test('Ausgleich nur aus gemessenem Verlust: 125–150 %', () => {
    expect(planFuel({ ...base, rule: rule('road_race') }).after.rehydrateMl).toBeNull()
    expect(planFuel({ ...base, rule: rule('road_race'), lossKg: 1.2 }).after.rehydrateMl).toEqual([1500, 1800])
  })

  test('frühere Beschwerden senken die Obergrenze, nie darüber', () => {
    const p = planFuel({ ...base, rule: rule('marathon'), gutTroubleGPerH: 70 })
    expect(p.during.band).toEqual({ kind: 'range', lo: 60, hi: 70 })
    expect(p.during.gutCapGPerH).toBe(70)
    const high = planFuel({ ...base, rule: rule('marathon'), gutTroubleGPerH: 110 })
    expect(high.during.gutCapGPerH).toBeNull()
    expect((high.during.band as { hi: number }).hi).toBe(90)
  })

  test('Triathlon kurz: höchstens 60 g/h im Rennen; ohne Körpermasse keine Gramm', () => {
    const p = planFuel({ ...base, weightKg: null, rule: rule('triathlon_sprint'), durationMin: 180 })
    expect(p.during.band).toEqual({ kind: 'range', lo: 60, hi: 60 })
    expect(p.before.carbsG).toBeNull()
    expect(p.before.fluidMl).toBeNull()
    expect(p.after.proteinPerMealG).toBeNull()
  })
})

test.describe('Eigene Werte', () => {
  test('Schweissrate: Spanne und Mitte; ohne Messung null', () => {
    expect(sweatProfile([fx('a', 60)])).toBeNull()
    const rows = [fx('a', 60, { massBeforeKg: 70, massAfterKg: 69, fluidMl: 500 }), fx('b', 60, { massBeforeKg: 70, massAfterKg: 68.6, fluidMl: 500 })]
    const s = sweatProfile(rows)!
    expect(s.n).toBe(2)
    expect([s.min, s.max]).toEqual([1.5, 1.9])
    expect(s.median).toBe(1.7)
  })

  test('Magen-Darm-Grenze: vertragen bis, Beschwerden ab', () => {
    const rows = [
      fx('a', 90, { carbsG: 60, giScore: 0 }), // 40 g/h
      fx('b', 90, { carbsG: 105, giScore: 1 }), // 70 g/h
      fx('c', 90, { carbsG: 135, giScore: 2 }), // 90 g/h
      fx('d', 30, { carbsG: 60, giScore: 3 }), // zu kurz, zählt nicht
    ]
    const g = gutProfile(rows)!
    expect(g).toEqual({ toleratedGPerH: 70, troubleGPerH: 90, n: 3 })
    expect(gutProfile([fx('x', 90)])).toBeNull()
  })

  test('Energie nach Zufuhr erst ab je zwei Einheiten', () => {
    const w = (id: string, feel: number) => fx(id, 120, { carbsG: 120, energyFeel: feel }) // 60 g/h: in der Spanne
    const b = (id: string, feel: number) => fx(id, 120, { carbsG: 30, energyFeel: feel }) // 15 g/h: darunter
    expect(feelByBand([w('a', 4), b('b', 2)])).toBeNull()
    expect(feelByBand([w('a', 4), w('c', 5), b('b', 2), b('d', 3)])).toEqual({ within: { n: 2, mean: 4.5 }, below: { n: 2, mean: 2.5 } })
  })
})

test.describe('Schema 28', () => {
  test('ein Bestand der Version 27 wird angehoben', () => {
    const old = { ...emptyData(), version: 27 } as any
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(27)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(28)
  })
})

test('Plan in der Ernährung: Wettkampf über 90 min zeigt Aufladen', async ({ page }) => {
  await openDemo(page)
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    data.athletes[0].profile.disciplineId = 'marathon'
    localStorage.setItem('kydon.data.v1', JSON.stringify(data))
  })
  await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
  const plan = page.getByTestId('fuel-plan')
  await expect(plan).toBeVisible()
  await expect(page.getByTestId('fuel-plan-load')).toHaveCount(0)
  await plan.getByRole('button', { name: /Wettkampf/ }).click()
  await plan.getByLabel(/Dauer/).fill('240')
  await expect(page.getByTestId('fuel-plan-load')).toBeVisible()
  await expect(page.getByTestId('fuel-plan-during')).toContainText('g/h')
  await expect(page.getByTestId('fuel-profile')).toBeVisible()
})
