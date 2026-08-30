import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { getTest } from '@/data/testCatalog'
import { newId } from '@/lib/store/localStore'
import type { StoredBiometric, StoredData, StoredResult } from '@/lib/store/types'

/**
 * Demodatensatz.
 *
 * Kein Zufallsrauschen, sondern ein durchgerechneter Fall: derselbe Athlet
 * über drei Diagnostiktermine, dazwischen ein Kraftblock und ein
 * Ausdauerblock. Dadurch zeigt das Radar in beiden Modi eine sinnvolle Form —
 * im Bestleistungsmodus den Formstand, im Referenzmodus Stärken und Schwächen.
 *
 * Erzeugt wird derselbe Datensatz, den auch der Gastmodus schreibt: die
 * Metriken laufen durch dieselbe Ableitung. Der Demomodus ist damit kein
 * Sonderweg, sondern ein normaler, bearbeitbarer Bestand.
 */

interface Session {
  date: string
  bodyWeightKg: number
  restingHr: number
  values: Record<string, Record<string, number>>
}

const SESSIONS: Session[] = [
  {
    date: '2025-08-20',
    bodyWeightKg: 82.0,
    restingHr: 52,
    values: {
      cooper_12min: { distanceM: 3080, maxHeartRate: 188, rpe: 9 },
      row_2000m: { durationSeconds: 424, maxHeartRate: 190, rpe: 10 },
      back_squat_1rm: { loadKg: 150, reps: 1, rpe: 9 },
      deadlift_1rm: { loadKg: 190, reps: 1, rpe: 9.5 },
      bench_press_1rm: { loadKg: 112.5, reps: 1, rpe: 9 },
      bear_complex: { loadKg: 72.5, rpe: 9 },
      cindy_20min_amrap: { rounds: 13, partialReps: 0, rpe: 10 },
      assault_bike_10min_cal: { calories: 141, rpe: 9.5 },
      illinois_agility: { durationSeconds: 17.42, rpe: 8 },
      standing_broad_jump: { distanceM: 2.3, rpe: 7 },
    },
  },
  {
    date: '2026-01-18',
    bodyWeightKg: 85.6,
    restingHr: 50,
    values: {
      cooper_12min: { distanceM: 2960, maxHeartRate: 189, rpe: 9.5 },
      row_2000m: { durationSeconds: 428, maxHeartRate: 191, rpe: 10 },
      back_squat_1rm: { loadKg: 172.5, reps: 1, rpe: 9.5 },
      deadlift_1rm: { loadKg: 215, reps: 1, rpe: 10 },
      bench_press_1rm: { loadKg: 127.5, reps: 1, rpe: 9.5 },
      bear_complex: { loadKg: 87.5, rpe: 9.5 },
      cindy_20min_amrap: { rounds: 13, partialReps: 15, rpe: 10 },
      assault_bike_10min_cal: { calories: 148, rpe: 9.5 },
      illinois_agility: { durationSeconds: 17.05, rpe: 8 },
      standing_broad_jump: { distanceM: 2.38, rpe: 7 },
    },
  },
  {
    date: '2026-06-14',
    bodyWeightKg: 83.2,
    restingHr: 48,
    values: {
      cooper_12min: { distanceM: 3320, maxHeartRate: 189, rpe: 9.5 },
      row_2000m: { durationSeconds: 402, maxHeartRate: 192, rpe: 10 },
      back_squat_1rm: { loadKg: 165, reps: 1, rpe: 9 },
      deadlift_1rm: { loadKg: 207.5, reps: 1, rpe: 9.5 },
      bench_press_1rm: { loadKg: 122.5, reps: 1, rpe: 9 },
      bear_complex: { loadKg: 82.5, rpe: 9 },
      cindy_20min_amrap: { rounds: 14, partialReps: 25, rpe: 10 },
      assault_bike_10min_cal: { calories: 158, rpe: 9.5 },
      illinois_agility: { durationSeconds: 16.42, rpe: 8 },
      standing_broad_jump: { distanceM: 2.44, rpe: 7 },
    },
  },
]

export function buildDemoData(): StoredData {
  const profile: StoredData['profile'] = {
    firstName: 'Alex',
    lastName: 'Roth',
    sex: 'male',
    birthDate: '1994-03-11',
    heightCm: 181,
    restingHr: 48,
    maxHr: 189,
    locale: 'de',
    unitSystem: 'metric',
  }

  const biometrics: StoredBiometric[] = SESSIONS.map((s) => ({
    id: newId(),
    measuredOn: s.date,
    bodyWeightKg: s.bodyWeightKg,
    bodyFatPercent: null,
    restingHr: s.restingHr,
    createdAt: new Date(`${s.date}T08:00:00Z`).toISOString(),
  }))

  const age = (iso: string) => {
    const born = new Date(profile.birthDate as string)
    const at = new Date(iso)
    let years = at.getFullYear() - born.getFullYear()
    const m = at.getMonth() - born.getMonth()
    if (m < 0 || (m === 0 && at.getDate() < born.getDate())) years -= 1
    return years
  }

  const results: StoredResult[] = []
  for (const session of SESSIONS) {
    // Die Tests eines Termins liegen über wenige Tage verteilt, wie in echt.
    let dayOffset = 0
    for (const [slug, values] of Object.entries(session.values)) {
      const test = getTest(slug)
      if (!test) continue
      const performedAt = new Date(`${session.date}T17:00:00Z`)
      performedAt.setDate(performedAt.getDate() - dayOffset)
      dayOffset = (dayOffset + 1) % 4

      const iso = performedAt.toISOString()
      const ctx = { bodyWeightKg: session.bodyWeightKg, ageYears: age(iso), sex: profile.sex }
      const metrics = deriveMetrics(test, values, ctx)
      results.push({
        id: newId(),
        testSlug: slug,
        performedAt: iso,
        values,
        metrics,
        score: primaryValue(test, values, metrics),
        bodyWeightKg: ctx.bodyWeightKg,
        ageYears: ctx.ageYears,
        sex: ctx.sex,
        createdAt: iso,
      })
    }
  }

  results.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
  return { version: 1, profile, biometrics, results }
}
