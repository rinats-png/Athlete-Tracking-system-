import { getTest } from '@/data/testCatalog'
import type { StoredAthlete, StoredResult, StoredTestDay } from '@/lib/store/localStore'

/**
 * Der Testtag: mehrere Athleten, mehrere Stationen, ein Termin.
 *
 * DER GRUND, WARUM ES DAS GIBT: die App konnte bisher eine Station für alle
 * (Gruppentest) oder alle Stationen für einen (Termin). Ein Trainer, der
 * fünfzehn Leute über fünf Stationen schickt, hat beides gleichzeitig — und
 * das eigentliche Problem ist keins der Messung, sondern der Organisation:
 * wer steht wann wo, ohne dass sich zwei Gruppen an derselben Station
 * treffen.
 *
 * Der Laufplan hier ist ein Rundlauf: Gruppe i beginnt an Station i und
 * rückt je Runde um eine weiter. Damit ist jede Station in jeder Runde von
 * genau einer Gruppe belegt — das ist keine Optimierung, sondern die
 * Bedingung dafür, dass der Plan überhaupt durchführbar ist.
 */

/** Grösser wird eine Gruppe an einer Station nicht sinnvoll. */
export const MAX_GROUP_SIZE = 6

export interface Station {
  slug: string
  /** Position im Plan, ab 1 — so steht es auf dem Stationsblatt. */
  number: number
}

export interface Slot {
  /** Runde, ab 1. */
  round: number
  /** Beginn in Minuten nach dem Start des Testtags. */
  startMinute: number
  stationSlug: string
  /** Die Athleten dieser Gruppe, in der Reihenfolge des Stationsblatts. */
  athleteIds: string[]
}

export interface RunPlan {
  stations: Station[]
  /** Die Gruppen in ihrer Nummerierung, ab 1. */
  groups: string[][]
  slots: Slot[]
  totalMinutes: number
}

/**
 * Teilt die Athleten in Gruppen — so viele, wie es Stationen gibt.
 *
 * Reihum verteilt statt blockweise: bei blockweiser Teilung stünden die
 * zuletzt hinzugefügten Athleten alle in derselben Gruppe, und wer eine
 * Liste alphabetisch pflegt, hätte das halbe Alphabet an einer Station.
 */
export function splitIntoGroups(athleteIds: string[], stationCount: number): string[][] {
  if (stationCount <= 0) return []
  const groups: string[][] = Array.from({ length: stationCount }, () => [])
  athleteIds.forEach((id, i) => groups[i % stationCount].push(id))
  return groups
}

/**
 * Der Laufplan.
 *
 * Runden = Stationen: nach so vielen Runden war jede Gruppe an jeder Station.
 */
export function runPlan(day: StoredTestDay): RunPlan {
  const stations: Station[] = day.testSlugs
    .filter((slug) => getTest(slug) != null)
    .map((slug, i) => ({ slug, number: i + 1 }))

  if (stations.length === 0) {
    return { stations: [], groups: [], slots: [], totalMinutes: 0 }
  }

  const groups = splitIntoGroups(day.athleteIds, stations.length)
  const slots: Slot[] = []

  for (let round = 0; round < stations.length; round++) {
    for (let group = 0; group < groups.length; group++) {
      // Der Rundlauf: Gruppe g steht in Runde r an Station (g + r).
      const station = stations[(group + round) % stations.length]
      slots.push({
        round: round + 1,
        startMinute: round * day.stationMinutes,
        stationSlug: station.slug,
        athleteIds: groups[group],
      })
    }
  }

  return {
    stations,
    groups,
    slots,
    totalMinutes: stations.length * day.stationMinutes,
  }
}

/** Wo eine Gruppe in einer bestimmten Runde steht. */
export function stationForGroup(plan: RunPlan, group: number, round: number): Station | null {
  if (plan.stations.length === 0) return null
  return plan.stations[(group + round - 2) % plan.stations.length] ?? null
}

export interface StationProgress {
  slug: string
  /** Wie viele Teilnehmer an dieser Station schon einen Wert haben. */
  measured: number
  /** Wie viele es sein sollten. */
  planned: number
}

/**
 * Was am Testtag schon erfasst ist.
 *
 * Gezählt wird gegen den Tag des Testtags, nicht gegen einen Zeitraum: eine
 * Messung von vorletzter Woche gehört nicht zu diesem Tag, auch wenn sie
 * denselben Test trägt.
 */
export function progressOf(day: StoredTestDay, athletes: StoredAthlete[]): StationProgress[] {
  const teilnehmer = athletes.filter((a) => day.athleteIds.includes(a.id))
  const onDay = (results: StoredResult[], slug: string) =>
    results.some((r) => r.testSlug === slug && r.performedAt.slice(0, 10) === day.plannedOn)

  return day.testSlugs.map((slug) => ({
    slug,
    measured: teilnehmer.filter((a) => onDay(a.results, slug)).length,
    planned: teilnehmer.length,
  }))
}

/** Alles gemessen? Grundlage dafür, den Tag abschliessen zu dürfen. */
export function isComplete(day: StoredTestDay, athletes: StoredAthlete[]): boolean {
  const progress = progressOf(day, athletes)
  return progress.length > 0 && progress.every((p) => p.planned > 0 && p.measured === p.planned)
}
