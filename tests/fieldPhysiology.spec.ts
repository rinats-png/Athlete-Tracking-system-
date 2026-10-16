import { expect, test } from '@playwright/test'
import {
  boscoPowerWkg,
  criticalSpeedFromRuns,
  csIntensityDomains,
  eccentricUtilizationRatio,
  jumpHeightFromFlightTime,
  predictedTimeFromCs,
  reactiveStrengthIndex,
  ruffierIndices,
  samozinoJumpProfile,
  speedReserve,
  stairPowerWatts,
  threeMinuteAllOut,
  vo2maxFromIft,
} from '../src/domain/fieldPhysiology'
import { eurReadout, speedReserveReadout } from '../src/domain/combinedMetrics'
import { FORMULA_BY_METRIC } from '../src/domain/formulaRegistry'
import { TEST_CATALOG } from '../src/data/testCatalog'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Feldphysiologie (Mastertabelle v2). Geprüft wird zweierlei: dass die
 * Formeln rechnen, was ihre Quelle sagt, und dass sie ausserhalb ihres
 * Gültigkeitsbereichs keine Zahl liefern statt einer falschen.
 */

test.describe('Critical Speed', () => {
  test('drei Läufe auf einer Geraden ergeben genau deren Steigung und Achsenabschnitt', () => {
    // d = 4 · t + 200
    const fit = criticalSpeedFromRuns([
      { meters: 4 * 180 + 200, seconds: 180 },
      { meters: 4 * 420 + 200, seconds: 420 },
      { meters: 4 * 720 + 200, seconds: 720 },
    ])!
    expect(fit.speed).toBeCloseTo(4, 6)
    expect(fit.reserve).toBeCloseTo(200, 6)
    expect(fit.seeMeters).toBeCloseTo(0, 6)
    expect(fit.used).toBe(3)
  })

  test('zwei Läufe: Gerade durch beide, aber kein Standardfehler', () => {
    const fit = criticalSpeedFromRuns([
      { meters: 1200, seconds: 240 },
      { meters: 3600, seconds: 800 },
    ])!
    expect(fit.speed).toBeCloseTo(2400 / 560, 6)
    expect(fit.seeMeters).toBeNull()
  })

  test('ein 400-m-Lauf liegt unter zwei Minuten und zählt nicht', () => {
    const fit = criticalSpeedFromRuns([
      { meters: 400, seconds: 65 },
      { meters: 1500, seconds: 310 },
    ])
    expect(fit).toBeNull()
  })

  test('negative Reserve heisst: das Modell passt nicht — keine Zahl', () => {
    expect(criticalSpeedFromRuns([
      { meters: 600, seconds: 200 },
      { meters: 3000, seconds: 600 },
    ])).toBeNull()
  })

  test('3-Minuten-Test: CS aus den letzten 30 s, D′ als Strecke darüber', () => {
    const r = threeMinuteAllOut(1100, 980)!
    expect(r.speed).toBeCloseTo(4, 6)
    expect(r.reserve).toBeCloseTo(1100 - 4 * 180, 6)
    expect(threeMinuteAllOut(900, 950)).toBeNull()
  })

  test('Intensitätsbereiche: moderat bis 82,3 % CS', () => {
    const d = csIntensityDomains(5)!
    expect(d.moderateUpper).toBeCloseTo(4.115, 3)
    expect(d.heavyUpper).toBe(5)
  })

  test('Zeitvorhersage nur im Gültigkeitsbereich des Modells', () => {
    expect(predictedTimeFromCs(3000, 4.5, 150)).toBeCloseTo((3000 - 150) / 4.5, 6)
    expect(predictedTimeFromCs(10000, 4.5, 150)).toBeNull()
    expect(predictedTimeFromCs(400, 4.5, 150)).toBeNull()
  })
})

test.describe('Weitere Formeln', () => {
  test('30-15 IFT nach Buchheit braucht Alter, Gewicht und Geschlecht', () => {
    const v = vo2maxFromIft(19, 25, 75, 'male')!
    expect(v).toBeCloseTo(28.3 - 2.15 - 0.741 * 25 - 0.0357 * 75 + 0.0586 * 25 * 19 + 1.03 * 19, 6)
    expect(vo2maxFromIft(19, null, 75, 'male')).toBeNull()
    expect(vo2maxFromIft(19, 25, 75, null)).toBeNull()
  })

  test('Sprunghöhe aus Flugzeit: 0,5 s ergeben 30,7 cm', () => {
    expect(jumpHeightFromFlightTime(0.5)).toBeCloseTo(30.656, 2)
  })

  test('RSI = Höhe in m / Kontaktzeit in s', () => {
    expect(reactiveStrengthIndex(30, 200)).toBeCloseTo(1.5, 6)
  })

  test('Bosco: Leistung aus Flugzeit, Testdauer und Sprüngen', () => {
    const p = boscoPowerWkg(30, 60, 60)!
    expect(p).toBeCloseTo((9.81 ** 2 * 30 * 60) / (4 * 60 * 30), 6)
    expect(boscoPowerWkg(60, 60, 50)).toBeNull()
  })

  test('Treppensprint: m · g · h / t', () => {
    expect(stairPowerWatts(80, 1.05, 0.6)).toBeCloseTo((80 * 9.81 * 1.05) / 0.6, 6)
  })

  test('Ruffier- und Dickson-Index', () => {
    const r = ruffierIndices(60, 120, 80)!
    expect(r.ruffier).toBeCloseTo(6, 6)
    expect(r.dickson).toBeCloseTo((50 + 40) / 10, 6)
  })

  test('Speed Reserve: nur, wenn der Sprint schneller ist als die MAS', () => {
    const r = speedReserve(9, 5)!
    expect(r.asr).toBeCloseTo(4, 6)
    expect(r.srr).toBeCloseTo(1.8, 6)
    expect(speedReserve(4, 5)).toBeNull()
  })

  test('CMJ/SJ-Verhältnis', () => {
    expect(eccentricUtilizationRatio(44, 40)).toBeCloseTo(1.1, 6)
  })

  test('Kraft-Geschwindigkeits-Profil: Pmax = F0 · v0 / 4', () => {
    const fv = samozinoJumpProfile(80, 0.4, [
      { addedKg: 0, jumpHeightCm: 35 },
      { addedKg: 20, jumpHeightCm: 27 },
      { addedKg: 40, jumpHeightCm: 20 },
    ])!
    expect(fv.slope).toBeLessThan(0)
    expect(fv.pmaxWPerKg).toBeCloseTo((fv.f0NPerKg * fv.v0Ms) / 4, 6)
    expect(samozinoJumpProfile(80, 0.4, [{ addedKg: 0, jumpHeightCm: 35 }])).toBeNull()
  })
})

const result = (testSlug: string, performedAt: string, values: Record<string, number>, metrics: Record<string, number>) =>
  ({ id: testSlug + performedAt, testSlug, performedAt, values, metrics }) as unknown as StoredResult

test.describe('Kennzahlen aus zwei Tests', () => {
  test('Speed Reserve aus fliegendem Sprint und 5-Minuten-Lauf', () => {
    const r = speedReserveReadout([
      result('flying_sprint_20m', '2026-09-01', { durationSeconds: 2.2 }, { avg_velocity_m_s: 20 / 2.2 }),
      result('run_5min_mas', '2026-09-10', { distanceM: 1500 }, { mas_kmh: 18 }),
    ])!
    expect(r.mas).toBeCloseTo(5, 6)
    expect(r.srr).toBeCloseTo(20 / 2.2 / 5, 6)
  })

  test('mehr als 30 Tage auseinander: keine Speed Reserve', () => {
    expect(speedReserveReadout([
      result('flying_sprint_20m', '2026-06-01', {}, { avg_velocity_m_s: 9 }),
      result('run_5min_mas', '2026-09-10', {}, { mas_kmh: 18 }),
    ])).toBeNull()
  })

  test('CMJ/SJ nur vom selben Tag', () => {
    expect(eurReadout([
      result('countermovement_jump', '2026-09-01', { jumpHeightCm: 44 }, {}),
      result('squat_jump', '2026-09-01', { jumpHeightCm: 40 }, {}),
    ])!.ratio).toBeCloseTo(1.1, 6)
    expect(eurReadout([
      result('countermovement_jump', '2026-09-01', { jumpHeightCm: 44 }, {}),
      result('squat_jump', '2026-09-02', { jumpHeightCm: 40 }, {}),
    ])).toBeNull()
  })
})

test('jede neue Kennzahl steht mit Quelle im Formelregister', () => {
  const keys = [
    'critical_speed_m_s', 'd_prime_m', 'cs_see_m', 'mas_kmh', 'vo2max_ift_ml_kg_min', 'ruffier_index',
    'dickson_index', 'stair_power_w', 'rsi_m_s', 'bosco_power_w_per_kg', 'pmax_w_per_kg_fv',
    'speed_reserve_ratio', 'eccentric_utilization_ratio', 'cs_intensity_domains',
  ]
  for (const key of keys) {
    const entry = FORMULA_BY_METRIC.get(key)
    expect(entry, key).toBeTruthy()
    expect(entry!.source, key).toBe('published')
    expect(entry!.reference, key).toBeTruthy()
  }
})

test('die bewusst ausgelassenen Tests stehen nicht im Katalog', () => {
  const slugs = new Set(TEST_CATALOG.map((t) => t.slug))
  for (const slug of ['bolt_breath_hold', 'run_6min_mas', 'ankle_dorsiflexion_wblt', 'sebt_balance_test']) {
    expect(slugs.has(slug), slug).toBe(false)
  }
})
