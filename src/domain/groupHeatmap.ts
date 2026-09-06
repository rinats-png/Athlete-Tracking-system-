import { radarProfile, axisIdsFor } from '@/lib/scoring'
import { requirementGap, type RequirementRow } from '@/domain/requirementGap'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Die Gruppen-Heatmap — wo die GANZE Gruppe unter der Anforderung liegt.
 *
 * DER BEFUND, DEN NUR DATEN ZEIGEN: liegen 14 von 20 Athleten auf derselben
 * Achse unter der Anforderung ihrer Disziplin, sind das keine 14
 * Einzelbefunde. Es ist ein Muster — und ein Muster über eine Gruppe, die
 * derselbe Trainer betreut, ist eine Aussage über das Programm, nicht über
 * die Athleten. Kein Trainer sieht das an zwanzig einzelnen Profilen.
 *
 * WIE GERECHNET WIRD: je Athlet die Anforderungslücke (requirementGap.ts),
 * je Achse die Zahl derer, bei denen sie offen ist, neben der Zahl derer,
 * die dort überhaupt gemessen sind. Der Nenner steht immer daneben: «3 von
 * 4» ist eine andere Aussage als «3 von 20».
 *
 * Gruppiert wird nach Disziplin: die Achsen eines Marathonläufers und eines
 * Judoka lassen sich nicht in dieselbe Spalte schreiben. Athleten ohne
 * Disziplin bilden eine eigene Gruppe mit den sechs allgemeinen Achsen.
 *
 * WAS HIER NICHT PASSIERT: kein Mittelwert über die Gruppe als «Gruppenwert»
 * — ein Median über zwei von zwölf wäre keine Aussage über die Gruppe. Und
 * keine Empfehlung, was mit dem Muster zu tun ist (§81). Die Heatmap zeigt
 * es; der Trainer entscheidet.
 */

export interface HeatmapCell {
  athleteId: string
  axisId: string
  /** Perzentil 0–100, null ohne Messung oder ohne Referenz. */
  score: number | null
  open: boolean
  measured: boolean
}

export interface HeatmapColumn {
  axisId: string
  /** Anforderungshöhe der Disziplin, null bei Kennzahlachsen. */
  requirement: number | null
  /** Wie viele Athleten auf dieser Achse gemessen und eingeordnet sind. */
  covered: number
  /** Wie viele davon unter der Anforderung liegen. */
  openCount: number
  /** Anteil der Offenen an den Eingeordneten, 0–1. Null ohne Eingeordnete. */
  openShare: number | null
  /** Ob das als Muster der Gruppe gilt — siehe PATTERN_MIN_ATHLETES / _MIN_SHARE. */
  pattern: boolean
}

export interface HeatmapGroup {
  disciplineId: string | null
  athletes: { id: string; name: string }[]
  columns: HeatmapColumn[]
  cells: HeatmapCell[]
  /** Achsen, die als Muster der Gruppe gelten, stärkster Anteil zuerst. */
  patterns: HeatmapColumn[]
}

/**
 * Ab wann eine offene Achse ein Muster ist: mindestens so viele Athleten
 * UND mindestens dieser Anteil der Eingeordneten. Beides Produktentscheidungen.
 * Drei von drei wären ein Zufall mit kleinem Nenner; deshalb die Mindestzahl.
 */
export const PATTERN_MIN_ATHLETES = 4
export const PATTERN_MIN_SHARE = 0.5

export function groupHeatmap(athletes: StoredAthlete[], asOf: Date = new Date()): HeatmapGroup[] {
  const active = athletes.filter((a) => !a.archived)
  const byDiscipline = new Map<string | null, StoredAthlete[]>()
  for (const athlete of active) {
    const key = athlete.profile.disciplineId ?? null
    byDiscipline.set(key, [...(byDiscipline.get(key) ?? []), athlete])
  }

  const groups: HeatmapGroup[] = []
  for (const [disciplineId, members] of byDiscipline) {
    const axisIds = axisIdsFor(disciplineId)
    const rowsByAthlete = new Map<string, Map<string, RequirementRow>>()
    for (const athlete of members) {
      const axes = radarProfile(athlete.results, 'population', asOf, disciplineId)
      const gap = requirementGap(axes, disciplineId)
      const all = [...gap.ranked, ...gap.unmeasured, ...gap.unweighted]
      rowsByAthlete.set(athlete.id, new Map(all.map((r) => [r.axisId, r])))
    }

    const cells: HeatmapCell[] = []
    const columns: HeatmapColumn[] = axisIds.map((axisId) => {
      let covered = 0
      let openCount = 0
      let requirement: number | null = null
      for (const athlete of members) {
        const row = rowsByAthlete.get(athlete.id)?.get(axisId)
        const score = row?.score ?? null
        const open = row?.open ?? false
        if (row?.requirement != null) requirement = row.requirement
        if (score != null) covered++
        if (open) openCount++
        cells.push({ athleteId: athlete.id, axisId, score, open, measured: score != null })
      }
      const openShare = covered === 0 ? null : Math.round((openCount / covered) * 100) / 100
      return {
        axisId,
        requirement,
        covered,
        openCount,
        openShare,
        pattern: openCount >= PATTERN_MIN_ATHLETES && openShare != null && openShare >= PATTERN_MIN_SHARE,
      }
    })

    groups.push({
      disciplineId,
      athletes: members.map((a) => ({ id: a.id, name: a.name || a.profile.firstName || '' })),
      columns,
      cells,
      patterns: columns.filter((c) => c.pattern).sort((a, b) => (b.openShare ?? 0) - (a.openShare ?? 0)),
    })
  }

  // Grösste Gruppe zuerst — sie ist die, für die die Heatmap gebaut ist.
  return groups.sort((a, b) => b.athletes.length - a.athletes.length)
}
