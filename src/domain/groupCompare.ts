import { getTest } from '@/data/testCatalog'
import { radarProfile } from '@/lib/scoring'
import { axisIdsFor } from '@/lib/scoring'
import { axisById } from '@/data/profileAxes'
import type { RadarAxis } from '@/types/domain'
import type { StoredAthlete, StoredResult } from '@/lib/store/localStore'

/**
 * Athleten nebeneinander (§37, §38).
 *
 * Der teuerste Fehler eines Vergleichs ist nicht eine falsche Reihenfolge,
 * sondern eine Reihenfolge, die es gar nicht gibt: zwei Sprintzeiten auf
 * verschiedenem Untergrund, mit verschiedener Zeitnahme, aus verschiedenen
 * Jahreszeiten. Sie lassen sich untereinander schreiben, aber sie messen
 * nicht dasselbe.
 *
 * Deshalb vergleicht dieses Modul nur, was denselben Test trägt, nennt zu
 * jedem Vergleich, wie viele der Ausgewählten ihn überhaupt haben, und hält
 * fest, wo die festgehaltenen Bedingungen auseinandergehen. Ein Rang ohne
 * diese Angaben wäre eine Behauptung (§81).
 */

/** Wie weit zwei Messungen zeitlich auseinanderliegen dürfen, in Tagen. */
export const COMPARABLE_WINDOW_DAYS = 180

export type ContextGap = 'surface' | 'equipment' | 'time_of_day' | 'age_spread'

export interface CompareEntry {
  athleteId: string
  name: string
  /** Der Rohwert in der Einheit des Tests. */
  value: number
  performedAt: string
  /** Rang innerhalb der Ausgewählten, 1 ist der beste. Gleiche Werte teilen den Rang. */
  rank: number
  /** Anteil am besten Wert der Gruppe, 0–100. Kein Perzentil und keine Norm. */
  shareOfBest: number
}

export interface TestComparison {
  slug: string
  /** Wie viele der Ausgewählten diesen Test haben. */
  covered: number
  /** Wie viele ausgewählt waren. Der Nenner gehört neben jede Zahl. */
  selected: number
  entries: CompareEntry[]
  /**
   * Womit der Vergleich zu nehmen ist: auseinandergehende Bedingungen oder
   * ein zu weiter Zeitraum. Leer heisst nicht «geprüft», sondern nur: in dem,
   * was festgehalten wurde, kein Unterschied.
   */
  gaps: ContextGap[]
  /** Spanne der Messdaten in Tagen. */
  spreadDays: number
}

export interface AxisComparison {
  axisId: string
  /** Ein Eintrag je Ausgewähltem; `score` ist null, wo nicht gemessen wurde. */
  scores: { athleteId: string; name: string; score: number | null }[]
  /** Wie viele der Ausgewählten auf dieser Achse etwas haben. */
  covered: number
  selected: number
}

function latestFor(results: StoredResult[], slug: string): StoredResult | null {
  const forTest = results
    .filter((r) => r.testSlug === slug && r.score != null)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  return forTest[0] ?? null
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000
}

/**
 * Die Tests, die mindestens zwei der Ausgewählten gemessen haben.
 *
 * Ein Test, den nur eine Person hat, ist kein Vergleich — er stünde als
 * einzelne Zeile da und sähe aus wie ein Ergebnis von allen.
 */
export function comparableTests(athletes: StoredAthlete[]): string[] {
  const count = new Map<string, number>()
  for (const athlete of athletes) {
    const slugs = new Set(athlete.results.filter((r) => r.score != null).map((r) => r.testSlug))
    for (const slug of slugs) count.set(slug, (count.get(slug) ?? 0) + 1)
  }
  return [...count.entries()]
    .filter(([, n]) => n >= 2)
    .map(([slug]) => slug)
    .sort((a, b) => (getTest(a)?.sortOrder ?? 0) - (getTest(b)?.sortOrder ?? 0))
}

/**
 * Ein Test über die Ausgewählten hinweg.
 *
 * Verglichen wird die jeweils jüngste Messung. Nicht die beste: die beste
 * Messung eines Athleten kann drei Jahre alt sein, und der Vergleich hiesse
 * dann «damals gegen heute».
 */
export function compareOnTest(slug: string, athletes: StoredAthlete[]): TestComparison | null {
  const test = getTest(slug)
  if (!test) return null

  const raw = athletes
    .map((athlete) => {
      const result = latestFor(athlete.results, slug)
      return result ? { athlete, result } : null
    })
    .filter((x): x is { athlete: StoredAthlete; result: StoredResult } => x != null)

  if (raw.length === 0) return null

  const higher = test.direction === 'higher_is_better'
  const values = raw.map((r) => r.result.score as number)
  const best = higher ? Math.max(...values) : Math.min(...values)

  const sorted = [...raw].sort((a, b) => {
    const av = a.result.score as number
    const bv = b.result.score as number
    return higher ? bv - av : av - bv
  })

  const entries: CompareEntry[] = sorted.map((r, i) => {
    const value = r.result.score as number
    // Gleiche Werte teilen den Rang — sonst behauptete die Liste einen
    // Unterschied, den die Messung nicht hergibt.
    const previous = i > 0 ? (sorted[i - 1].result.score as number) : null
    const rank = previous != null && previous === value ? -1 : i + 1
    return {
      athleteId: r.athlete.id,
      name: r.athlete.name || r.athlete.profile.firstName || r.athlete.id,
      value,
      performedAt: r.result.performedAt,
      rank,
      shareOfBest: best === 0 ? 0 : Math.round((higher ? value / best : best / value) * 100),
    }
  })
  // Geteilte Ränge nachtragen: -1 übernimmt den Rang des Vorgängers.
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].rank === -1) entries[i].rank = entries[i - 1].rank
  }

  const dates = entries.map((e) => e.performedAt).sort()
  const spreadDays = Math.round(daysBetween(dates[0], dates[dates.length - 1]))

  const gaps: ContextGap[] = []
  const distinct = (pick: (r: StoredResult) => string | null) =>
    new Set(raw.map((r) => pick(r.result)).filter((v) => v != null && v !== '')).size > 1
  if (distinct((r) => r.context.surface)) gaps.push('surface')
  if (distinct((r) => r.context.equipment)) gaps.push('equipment')
  if (distinct((r) => r.context.timeOfDay)) gaps.push('time_of_day')
  if (spreadDays > COMPARABLE_WINDOW_DAYS) gaps.push('age_spread')

  return { slug, covered: raw.length, selected: athletes.length, entries, gaps, spreadDays }
}

/**
 * Die Profilachsen über die Ausgewählten hinweg.
 *
 * Eine fehlende Achse bleibt null und wird nicht als Null gezeichnet: nicht
 * gemessen und schlecht sind zwei verschiedene Aussagen (§89).
 */
export function compareOnAxes(
  athletes: StoredAthlete[],
  disciplineId: string | null,
  asOf: Date = new Date(),
): AxisComparison[] {
  const profiles = new Map<string, RadarAxis[]>(
    athletes.map((a) => [a.id, radarProfile(a.results, 'personal_best', asOf, disciplineId)]),
  )

  return axisIdsFor(disciplineId).map((axisId) => {
    const scores = athletes.map((athlete) => {
      const axis = profiles.get(athlete.id)?.find((x) => x.axisId === axisId)
      return {
        athleteId: athlete.id,
        name: athlete.name || athlete.profile.firstName || athlete.id,
        score: axis?.hasData ? axis.score : null,
      }
    })
    return {
      axisId,
      scores,
      covered: scores.filter((s) => s.score != null).length,
      selected: athletes.length,
    }
  })
}

export interface GroupAxisStat {
  axisId: string
  label: { de: string; en: string } | null
  covered: number
  selected: number
  /** Median über die belegten Achsen. Null, wenn keine belegt ist. */
  median: number | null
  min: number | null
  max: number | null
}

/**
 * Die Achsen einer Gruppe als Verteilung.
 *
 * Median statt Mittelwert: bei acht Athleten verschiebt ein einzelner
 * Ausreisser den Mittelwert um mehr, als eine Trainingsperiode die Gruppe
 * bewegt. Und immer mit dem Nenner daneben — ein Median über zwei von zwölf
 * ist keine Aussage über die Gruppe.
 */
export function groupAxisStats(
  athletes: StoredAthlete[],
  disciplineId: string | null,
  asOf: Date = new Date(),
): GroupAxisStat[] {
  return compareOnAxes(athletes, disciplineId, asOf).map((axis) => {
    const values = axis.scores
      .map((s) => s.score)
      .filter((s): s is number => s != null)
      .sort((a, b) => a - b)
    const median =
      values.length === 0
        ? null
        : values.length % 2 === 1
          ? values[(values.length - 1) / 2]
          : Math.round((values[values.length / 2 - 1] + values[values.length / 2]) / 2)
    return {
      axisId: axis.axisId,
      label: axisById(axis.axisId)?.name ?? null,
      covered: axis.covered,
      selected: axis.selected,
      median,
      min: values[0] ?? null,
      max: values[values.length - 1] ?? null,
    }
  })
}
