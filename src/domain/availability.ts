import { readinessScore } from '@/domain/readiness'
import { radarProfile } from '@/lib/scoring'
import { limiters } from '@/domain/insights'
import { requirementGap } from '@/domain/requirementGap'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Zwei Signale für den Trainer, die er ohne Daten nicht hat.
 *
 * VERFÜGBARKEIT. Saisons werden über Verfügbarkeit entschieden, nicht über
 * Spitzenwerte. Die Selbsteinschätzung vor jedem Termin (readiness.ts) ist
 * ausdrücklich subjektiv und leitet KEINE Trainingsfreigabe ab (§82). Was
 * sie kann: über mehrere Termine hinweg zeigen, dass jemand fällt. Das ist
 * ein Anlass für ein Gespräch — nicht mehr, aber auch nicht weniger. Ein
 * Trainer, der es drei Wochen früher sieht, hat drei Wochen mehr.
 *
 * NEUZUGANG. Ein neuer Athlet ist nach einem Testtermin eingeordnet: gegen
 * die Anforderung seiner Disziplin und, wo eine Referenz existiert, gegen
 * die Kohorte. Ohne Daten braucht ein Trainer dafür ein halbes Jahr
 * Beobachtung. Diese Datei sammelt, wer neu ist und was der erste Termin
 * schon zeigt — und was noch fehlt.
 */

export type AvailabilityStatus = 'declining' | 'steady' | 'insufficient'

export interface AvailabilitySignal {
  athleteId: string
  name: string
  status: AvailabilityStatus
  /** Der jüngste Wert, 0–100. */
  latest: number | null
  /** Median der Werte davor. */
  baseline: number | null
  /** Baseline minus jüngster Wert, in Punkten. Positiv = gefallen. */
  drop: number | null
  points: number
  latestOn: string | null
}

export interface NewcomerSignal {
  athleteId: string
  name: string
  /** Erste Messung, als Tag. */
  firstOn: string
  daysSinceFirst: number
  results: number
  /** Achsen der Disziplin, die schon belegt sind, und wie viele es gibt. */
  axesCovered: number
  axesTotal: number
  /** Die Achse mit dem grössten Hebel gegenüber der Anforderung, falls einreihbar. */
  leverAxisId: string | null
  /** Die Achse, die gegenüber den übrigen abfällt, falls auffällig. */
  limiterAxisId: string | null
}

/** Ab wie vielen Selbsteinschätzungen ein Trend überhaupt lesbar ist. */
export const AVAILABILITY_MIN_POINTS = 3
/** Ab wie vielen Punkten Abstand zum eigenen Median es ein Signal ist. */
export const AVAILABILITY_DROP_POINTS = 15
/** So lange gilt jemand als Neuzugang, gerechnet ab der ersten Messung. */
export const NEWCOMER_DAYS = 45

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function availabilitySignals(athletes: StoredAthlete[]): AvailabilitySignal[] {
  return athletes
    .filter((a) => !a.archived)
    .map((athlete): AvailabilitySignal => {
      const scored = athlete.assessments
        .filter((a) => a.readiness != null)
        .sort((a, b) => a.performedOn.localeCompare(b.performedOn))
        .map((a) => ({ on: a.performedOn, score: readinessScore(a.readiness).score }))
        .filter((e): e is { on: string; score: number } => e.score != null)
      const name = athlete.name || athlete.profile.firstName || ''
      if (scored.length < AVAILABILITY_MIN_POINTS) {
        return {
          athleteId: athlete.id,
          name,
          status: 'insufficient',
          latest: scored[scored.length - 1]?.score ?? null,
          baseline: null,
          drop: null,
          points: scored.length,
          latestOn: scored[scored.length - 1]?.on ?? null,
        }
      }
      const latest = scored[scored.length - 1]
      const previous = scored[scored.length - 2]
      const earlier = scored.slice(0, -1).map((e) => e.score)
      const baseline = median(earlier) as number
      const drop = Math.round(baseline - latest.score)
      // Zwei Termine unter der Linie, nicht einer: ein einzelner schlechter
      // Morgen ist kein Trend, und ein Signal, das bei jedem schlechten
      // Morgen anschlägt, wird nach zwei Wochen ignoriert.
      const declining = drop >= AVAILABILITY_DROP_POINTS && previous.score < baseline
      return {
        athleteId: athlete.id,
        name,
        status: declining ? 'declining' : 'steady',
        latest: latest.score,
        baseline: Math.round(baseline),
        drop,
        points: scored.length,
        latestOn: latest.on,
      }
    })
    .sort((a, b) => (b.drop ?? -1) - (a.drop ?? -1))
}

export function newcomerSignals(athletes: StoredAthlete[], asOf: Date = new Date()): NewcomerSignal[] {
  const out: NewcomerSignal[] = []
  for (const athlete of athletes) {
    if (athlete.archived) continue
    const scored = athlete.results.filter((r) => r.score != null)
    if (scored.length === 0) continue
    const firstAt = scored.map((r) => r.performedAt).sort()[0]
    const daysSinceFirst = Math.floor((asOf.getTime() - new Date(firstAt).getTime()) / 86_400_000)
    if (daysSinceFirst < 0 || daysSinceFirst > NEWCOMER_DAYS) continue

    const disciplineId = athlete.profile.disciplineId
    const axes = radarProfile(athlete.results, 'population', asOf, disciplineId)
    const gap = requirementGap(axes, disciplineId)
    const limiter = limiters(axes, athlete.results)[0] ?? null
    out.push({
      athleteId: athlete.id,
      name: athlete.name || athlete.profile.firstName || '',
      firstOn: firstAt.slice(0, 10),
      daysSinceFirst,
      results: scored.length,
      axesCovered: axes.filter((a) => a.score != null).length,
      axesTotal: axes.length,
      leverAxisId: gap.ranked[0]?.axisId ?? null,
      limiterAxisId: limiter?.axisId ?? null,
    })
  }
  return out.sort((a, b) => a.daysSinceFirst - b.daysSinceFirst)
}
