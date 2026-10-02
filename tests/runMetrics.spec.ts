import { expect, test } from '@playwright/test'
import {
  acuteChronic,
  activityLoad,
  computeRunMetrics,
  consistency,
  currentVdot,
  dailySeries,
  formWord,
  habit,
  maxHeartRate,
  monotony,
  paceAtSameHr,
  predictions,
  raceOutlook,
  records,
  riegel,
  shiftDay,
  taperProjection,
  thresholdHr,
  timeForVdot,
  vdotOf,
  volumeJump,
  weekStart,
  weeklyVolume,
  zoneBounds,
  zoneOf,
  paceAtVo2Fraction,
  intensity,
} from '../src/domain/runMetrics'
import type { StoredActivity } from '../src/lib/store/localStore'

/** Läufe, Stufe 2: Rechnung. Handgerechnete Werte, keine Zufallszahlen. */

let n = 0
function act(day: string, o: Partial<StoredActivity> & { km?: number; min?: number } = {}): StoredActivity {
  const km = o.km ?? 10
  const min = o.min ?? 55
  const { km: _k, min: _m, ...rest } = o
  return {
    id: `a${n++}`,
    source: 'strava',
    startedAt: `${day}T07:00:00.000Z`,
    day,
    hour: 7,
    sport: 'run',
    name: 'Lauf',
    distanceM: km * 1000,
    movingS: min * 60,
    elapsedS: min * 60,
    avgHr: 150,
    maxHr: 175,
    elevM: 50,
    gear: null,
    calories: null,
    cadence: null,
    ...rest,
  } as StoredActivity
}

const TODAY = '2026-10-01' // ein Donnerstag

test.describe('VDOT und Prognosen', () => {
  test('VDOT gegen die Tabelle von Daniels', () => {
    expect(vdotOf(5000, 20)).toBeCloseTo(49.8, 0)
    expect(vdotOf(42195, 180)).toBeCloseTo(53.5, 0)
    expect(vdotOf(10000, 45)).toBeGreaterThan(44)
    expect(vdotOf(10000, 45)).toBeLessThan(46)
  })
  test('Zeit zum VDOT ist die Umkehrung', () => {
    expect(Math.abs(timeForVdot(vdotOf(10000, 45), 10000) - 2700)).toBeLessThanOrEqual(1)
    expect(timeForVdot(50, 5000)).toBeLessThan(timeForVdot(45, 5000))
  })
  test('Riegel', () => {
    expect(riegel(1200, 5000, 10000)).toBe(Math.round(1200 * Math.pow(2, 1.06)))
  })
  test('aktueller VDOT: nur Läufe ab 3 km, nur 150 Tage, Trail zählt nicht', () => {
    const acts = [
      act(shiftDay(TODAY, -10), { km: 10, min: 45 }),
      act(shiftDay(TODAY, -5), { km: 10, min: 40, sport: 'trail' }),
      act(shiftDay(TODAY, -3), { km: 2, min: 8 }),
      act(shiftDay(TODAY, -200), { km: 10, min: 38 }),
    ]
    const v = currentVdot(acts, TODAY)!
    expect(v.activityId).toBe(acts[0].id)
    expect(v.vdot).toBeCloseTo(vdotOf(10000, 45), 6)
  })
  test('Prognose: Spanne aus VDOT-Zeit und Riegel; Einordnung der Zielzeit', () => {
    const acts = [act(shiftDay(TODAY, -10), { km: 10, min: 45 })]
    const p = predictions(acts, TODAY)!
    const tenK = p.list.find((x) => x.key === '10k')!
    expect(Math.abs(tenK.vdotTime - 2700)).toBeLessThanOrEqual(1)
    expect(tenK.riegelTime).toBe(2700)
    const half = p.list.find((x) => x.key === 'half')!
    expect(half.low).toBeLessThanOrEqual(half.high)
    expect(raceOutlook(half.low - 60, half)).toBe('ambitious')
    expect(raceOutlook(half.high + 60, half)).toBe('safe')
    expect(raceOutlook(Math.round((half.low + half.high) / 2), half)).toBe('realistic')
  })
  test('Lockerbereich: schnelles Ende schneller als langsames, beide langsamer als 10-km-Tempo', () => {
    const fast = paceAtVo2Fraction(50, 0.7)
    const slow = paceAtVo2Fraction(50, 0.62)
    expect(fast).toBeLessThan(slow)
    expect(fast).toBeGreaterThan(timeForVdot(50, 10000) / 10)
  })
})

test.describe('Parameter', () => {
  test('Maximalpuls: nur was ein zweiter Lauf bestätigt, nie über 215', () => {
    const acts = [190, 189, 205, 230].map((m, i) => act(shiftDay(TODAY, -i), { maxHr: m }))
    expect(maxHeartRate(acts)).toBe(190)
    expect(maxHeartRate([act(TODAY, { maxHr: 190 })])).toBeNull()
  })
  test('Schwellenpuls: stärkster Lauf, unter 15 km mal 0,98; Zonen', () => {
    const acts = [act(shiftDay(TODAY, -3), { km: 12, min: 54, avgHr: 160 }), act(shiftDay(TODAY, -2), { km: 10, min: 60, avgHr: 140 }), act(shiftDay(TODAY, -1), { km: 5, min: 20, avgHr: 175 })]
    const t = thresholdHr(acts)!
    expect(t.hr).toBe(Math.round(160 * 0.98))
    expect(t.activityId).toBe(acts[0].id)
    expect(zoneBounds(157)).toEqual([133, 141, 149, 157])
    expect([100, 133, 141, 149, 157].map((h) => zoneOf(h, [133, 141, 149, 157]))).toEqual([1, 2, 3, 4, 5])
  })
})

test.describe('Belastung', () => {
  test('eine Stunde an der Schwelle sind 100 Punkte; ohne Puls geschätzt und gezählt', () => {
    const p = { restHr: 50, thresholdHr: 150 }
    expect(activityLoad(act(TODAY, { min: 60, avgHr: 150 }), p)).toEqual({ load: 100, estimated: false })
    const est = activityLoad(act(TODAY, { min: 60, avgHr: null }), p)
    expect(est.estimated).toBe(true)
    expect(est.load).toBeCloseTo(0.75 * 0.75 * 100, 6)
    expect(activityLoad(act(TODAY, { min: 60, avgHr: null, sport: 'strength' }), p).load).toBeCloseTo(0.55 * 0.55 * 100, 6)
  })
  test('Bewegungszeit vor Gesamtzeit', () => {
    const a = act(TODAY, { min: 60, movingS: 1800, avgHr: 150 })
    expect(activityLoad(a, { restHr: 50, thresholdHr: 150 }).load).toBe(50)
  })
  test('gleichbleibende Last: Fitness = Ermüdung = Last, Form 0, akut/chronisch 1, Monotonie nicht definiert', () => {
    const acts = Array.from({ length: 60 }, (_, i) => act(shiftDay(TODAY, -59 + i), { min: 60, avgHr: 150 }))
    const s = dailySeries(acts, { restHr: 50, thresholdHr: 150 }, TODAY)!
    expect(s.days).toHaveLength(60)
    expect(s.fitness[59]).toBeCloseTo(100, 6)
    expect(s.form[59]).toBeCloseTo(0, 6)
    expect(acuteChronic(s)).toBeCloseTo(1, 6)
    expect(monotony(s)).toBeNull()
  })
  test('Fitness steigt langsam, Ermüdung schnell', () => {
    const acts = [act(shiftDay(TODAY, -40), { min: 5, avgHr: 100 }), ...Array.from({ length: 7 }, (_, i) => act(shiftDay(TODAY, -6 + i), { min: 120, avgHr: 160 }))]
    const s = dailySeries(acts, { restHr: 50, thresholdHr: 150 }, TODAY)!
    const k = s.days.length - 1
    expect(s.fatigue[k]).toBeGreaterThan(s.fitness[k])
    expect(s.form[k]).toBeLessThan(0)
  })
  test('Formwort an den Grenzen', () => {
    expect([-26, -25, -10, -9, 5, 6, 15, 16].map(formWord)).toEqual(['very_loaded', 'building', 'building', 'balanced', 'balanced', 'fresh', 'fresh', 'very_fresh'])
  })
  test('Taper: 14 Tage vor dem Rennen beginnt er, die Form am Renntag steigt', () => {
    const acts = Array.from({ length: 60 }, (_, i) => act(shiftDay(TODAY, -59 + i), { min: 60, avgHr: 150 }))
    const s = dailySeries(acts, { restHr: 50, thresholdHr: 150 }, TODAY)!
    const race = shiftDay(TODAY, 21)
    const t = taperProjection(s, race)!
    expect(t.taperStart).toBe(shiftDay(race, -14))
    expect(t.formOnRaceDay).toBeGreaterThan(0)
    expect(taperProjection(s, shiftDay(TODAY, -3))).toBeNull()
  })
})

test.describe('Umfang und Konstanz', () => {
  test('Wochen laufen Montag bis Sonntag: 52 abgeschlossene plus die laufende', () => {
    expect(weekStart(TODAY)).toBe('2026-09-28')
    const w = weeklyVolume([act(TODAY, { km: 10 }), act('2026-09-27', { km: 8 })], TODAY)
    expect(w).toHaveLength(53)
    expect(w.filter((x) => x.closed)).toHaveLength(52)
    expect(w[52]).toMatchObject({ start: '2026-09-28', km: 10, closed: false })
    expect(w[51]).toMatchObject({ start: '2026-09-21', km: 8, closed: true })
  })
  test('Sprung: nur die jüngste abgeschlossene Woche, ab 30 km und über 30 % über dem Schnitt', () => {
    const mk = (kms: number[]) => kms.flatMap((k, i) => (k > 0 ? [act(shiftDay('2026-09-21', -7 * (kms.length - 1 - i)), { km: k })] : []))
    const w = (kms: number[]) => weeklyVolume(mk(kms), TODAY)
    const j = volumeJump(w([30, 30, 30, 30, 45]))!
    expect(j.pct).toBe(50)
    expect(volumeJump(w([30, 30, 30, 30, 38]))).toBeNull() // 27 % über dem Schnitt
    expect(volumeJump(w([20, 20, 20, 20, 28]))).toBeNull() // unter 30 km
    expect(volumeJump(w([30, 30, 30, 30, 45, 31]))).toBeNull() // Sprung liegt nicht in der jüngsten
  })
  test('Konstanz: Wochen mit mindestens drei Läufen, Serien, aktive Tage', () => {
    const acts: StoredActivity[] = []
    for (let wk = 8; wk >= 1; wk--) {
      const start = shiftDay(weekStart(TODAY), -7 * wk)
      const runs = wk === 4 ? 2 : 3
      for (let r = 0; r < runs; r++) acts.push(act(shiftDay(start, r * 2)))
    }
    const c = consistency(acts, TODAY)
    expect(c.currentStreak).toBe(3)
    expect(c.longestStreak).toBe(4)
    expect(c.hitsLastSix).toBe(5)
    expect(c.activeDays).toBe(acts.length)
    expect(c.longestActiveDayStreak).toBe(1)
  })
})

test.describe('Tempo bei gleichem Puls', () => {
  test('Band mit den meisten Läufen, Quartalsvergleich, Aussortiertes gezählt', () => {
    const acts: StoredActivity[] = []
    // 12 Monate, alle 4 Tage ein 10-km-Lauf; Tempo wird über das Jahr besser (von 6:00 auf 5:30 /km), Puls 151–156.
    for (let i = 0; i < 90; i++) {
      const day = shiftDay(TODAY, -360 + i * 4)
      const pace = 360 - (30 * i) / 89
      acts.push(act(day, { km: 10, min: (pace * 10) / 60, avgHr: 151 + (i % 6) }))
    }
    acts.push(act(shiftDay(TODAY, -2), { km: 10, min: 40, avgHr: 170, name: '5 x 1000 Intervall' }))
    const r = paceAtSameHr(acts, TODAY)!
    expect(r.bandHi - r.bandLo).toBe(5)
    expect(r.bandLo).toBe(151)
    expect(r.deltaSPerKm).not.toBeNull()
    expect(r.deltaSPerKm!).toBeLessThan(-15)
    expect(r.lastQuarter! - r.firstQuarter!).toBe(r.deltaSPerKm)
    expect(r.excluded).toBeGreaterThanOrEqual(1)
    expect(r.monthly.length).toBeGreaterThan(6)
  })
  test('ohne genug saubere Läufe kein Ergebnis', () => {
    expect(paceAtSameHr([act(TODAY, { km: 2 })], TODAY)).toBeNull()
  })
})

test.describe('Intensität und Gewohnheit', () => {
  test('lockere Läufe in Zone 3 oder höher, harte Einheiten über der Schwelle, zwei harte Tage hintereinander', () => {
    const thr = 160
    const acts = [
      act(shiftDay(TODAY, -20), { km: 10, min: 65, avgHr: 150 }), // Zone 3 (ab 144): zählt
      act(shiftDay(TODAY, -15), { km: 10, min: 65, avgHr: 130 }), // Zone 1
      act(shiftDay(TODAY, -10), { km: 13, min: 62, avgHr: 150, name: '13 km Marathontempo' }), // nicht locker
      act(shiftDay(TODAY, -6), { km: 10, min: 50, avgHr: 162, name: '5 x 1000 Intervall' }), // hart, über Schwelle
      act(shiftDay(TODAY, -5), { km: 8, min: 44, avgHr: 150, name: 'Schwelle 3 x 10 min' }), // hart, darunter
    ]
    const i = intensity(acts, TODAY, thr, 300) // Marathontempo 5:00 /km
    expect(i.easyRuns12w).toHaveLength(2)
    expect(i.easyAboveZ3).toBe(1)
    expect(i.hardSessions12w).toBe(2)
    expect(i.hardAtOrAboveThreshold).toBe(1)
    expect(i.hardBackToBack).toBe(1)
  })
  test('Gewohnheit: Anteil vor 9 Uhr und häufigster Termin', () => {
    const acts = [act('2026-09-28', { hour: 7 }), act('2026-09-21', { hour: 7 }), act('2026-09-29', { hour: 18 })]
    const h = habit(acts, TODAY)
    expect(h.before9Share).toBeCloseTo(2 / 3, 6)
    expect(h.mostCommon).toEqual({ weekday: 0, hour: 7, runs: 2 })
  })
})

test.describe('Rekorde', () => {
  test('Bestzeit: bis 2 % Überlänge die echte Zeit, darüber aufs Normmass umgerechnet', () => {
    const exact = records([act(TODAY, { km: 10.2, min: 45 })], TODAY)
    expect(exact.best10k).toEqual({ s: 2700, day: TODAY })
    const over = records([act(TODAY, { km: 10.4, min: 45 })], TODAY)
    expect(over.best10k!.s).toBe(Math.round((2700 * 10000) / 10400))
    expect(records([act(TODAY, { km: 8, min: 40 })], TODAY).best10k).toBeNull()
  })
})

test('Alles zusammen: Kennzahlen aus einem Jahr; leer ergibt nichts', () => {
  expect(computeRunMetrics([])).toBeNull()
  const acts: StoredActivity[] = []
  for (let i = 0; i < 100; i++) {
    const day = shiftDay(TODAY, -(i * 3))
    acts.push(act(day, { km: 8 + (i % 5), min: 48 + (i % 5) * 5, avgHr: 145 + (i % 8), gear: i % 2 ? 'Pegasus' : 'Vomero' }))
  }
  acts.push(act(shiftDay(TODAY, -12), { km: 21.1, min: 100, avgHr: 165, name: 'Halbmarathon Rennen', maxHr: 185 }))
  const m = computeRunMetrics(acts, { restHr: null })!
  expect(m.today).toBe(TODAY)
  expect(m.restHr).toBe(50)
  expect(m.restHrAssumed).toBe(true)
  expect(m.threshold).not.toBeNull()
  expect(m.zones).toHaveLength(4)
  expect(m.predictions!.list).toHaveLength(4)
  expect(m.easyPace!.fast).toBeLessThan(m.easyPace!.slow)
  expect(m.weeks).toHaveLength(53)
  expect(m.totals.runs).toBe(acts.filter((a) => new Date(a.day) >= new Date(shiftDay(TODAY, -364))).length)
  expect(m.shoes.map((s) => s.name).sort()).toEqual(['Pegasus', 'Vomero'])
  expect(m.form!.word).toMatch(/very_loaded|building|balanced|fresh|very_fresh/)
  // Ohne Puls bleibt die Rechnung stehen, mit Schätzung gezählt.
  const noHr = computeRunMetrics(acts.map((a) => ({ ...a, avgHr: null, maxHr: null })))!
  expect(noHr.threshold).toBeNull()
  expect(noHr.zones).toBeNull()
  expect(noHr.estimatedLoadCount).toBe(acts.length)
})
