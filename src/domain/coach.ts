import { getTest } from '@/data/testCatalog'
import { activeFocuses } from '@/domain/trainingFocus'
import { radarProfile, baselineIndex } from '@/lib/scoring'
import { confidenceScore, testTrend } from '@/domain/analytics'
import { limiters } from '@/domain/insights'
import { nextAssessment } from '@/domain/insights'
import type { PerformanceDimension } from '@/types/domain'
import type { AthleteData, StoredAthlete } from '@/lib/store/localStore'

/**
 * Übersicht über betreute Athleten (§37, §38).
 *
 * Ein Trainer mit zwölf Kunden liest keine zwölf Profile durch. Er braucht
 * eine Zeile je Person, aus der hervorgeht, wer Aufmerksamkeit braucht — und
 * zwar aus einem nachvollziehbaren Grund, nicht aus einem Ampelgefühl.
 */

export type AttentionReason =
  | 'overdue'
  | 'declining'
  | 'thin_data'
  | 'no_assessment'

export interface AthleteRow {
  id: string
  name: string
  /** Gesamtindex über die belegten Achsen. Null ohne Messungen. */
  overall: number | null
  /** Belastbarkeit des Profils in Prozent. */
  confidence: number
  /** Richtung über alle Tests mit ausreichender Historie. */
  trend: 'improving' | 'stable' | 'declining' | 'insufficient'
  primaryLimiter: PerformanceDimension | null
  lastAssessmentOn: string | null
  nextAssessmentOn: string | null
  resultCount: number
  /** Offene Trainingsschwerpunkte. */
  openFocuses: number
  /**
   * Wann die nächste Nachmessung eines Schwerpunkts ansteht — die früheste
   * offene. Null, wenn keiner ein Datum trägt.
   */
  nextFocusReviewOn: string | null
  /** Warum diese Person Aufmerksamkeit braucht. Leer = alles im Lot. */
  attention: AttentionReason[]
}

/**
 * Unterhalb dieser Belastbarkeit ist ein Profil zu dünn für Aussagen.
 *
 * 60 und nicht 40: die Belastbarkeit setzt sich aus vier gleich gewichteten
 * Anteilen zusammen, von denen zwei (Aktualität und Qualität) bei einer
 * einzigen frischen Messung schon voll ausschlagen. Eine einzelne Messung
 * kommt damit auf 58 — ein Wert, der für eine Aussage nicht reicht, aber
 * über einer 40er-Schwelle läge. Die Schwelle sitzt deshalb so, dass
 * mindestens zwei der vier Anteile stimmen müssen.
 */
export const THIN_DATA_CONFIDENCE = 60

function toView(athlete: StoredAthlete): AthleteData {
  return {
    // Die Marke gehört dem Gerät, nicht dem Athleten — für die Auswertung
    // ist sie ohne Bedeutung.
    branding: { organisation: '', logoDataUrl: null, footer: '' },
    profile: athlete.profile,
    biometrics: athlete.biometrics,
    assessments: athlete.assessments,
    results: athlete.results,
  }
}

/**
 * Gesamtrichtung eines Athleten.
 *
 * Mehrheitsentscheid über die Tests, für die ein Trend überhaupt gerechnet
 * werden kann. Bewusst kein Mittelwert der Steigungen: ein Test in Prozent
 * je 30 Tage lässt sich nicht sinnvoll mit einem anderen mitteln, und der
 * gemittelte Wert würde eine Genauigkeit vortäuschen, die er nicht hat.
 */
export function overallTrend(data: AthleteData): AthleteRow['trend'] {
  const slugs = [...new Set(data.results.map((r) => r.testSlug))].filter((s) => getTest(s))
  const labels = slugs
    .map((slug) => testTrend(data.results, slug).label)
    .filter((l) => l !== 'insufficient')

  if (labels.length === 0) return 'insufficient'

  const count = (label: string) => labels.filter((l) => l === label).length
  const improving = count('improving')
  const declining = count('declining')

  if (improving > declining) return 'improving'
  if (declining > improving) return 'declining'
  return 'stable'
}

export function athleteRows(
  athletes: StoredAthlete[],
  asOf: Date = new Date(),
): AthleteRow[] {
  return athletes
    .filter((a) => !a.archived)
    .map((athlete): AthleteRow => {
      const data = toView(athlete)
      const axes = radarProfile(data.results, 'population', asOf, data.profile.disciplineId)
      const confidence = confidenceScore(data.results, asOf).score
      const trend = overallTrend(data)
      const limiter = limiters(axes, data.results)[0] ?? null

      const completed = data.assessments
        .filter((a) => a.status === 'completed')
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn))
      const next = nextAssessment(data.assessments, data.results, asOf)

      const open = activeFocuses(athlete.focuses)
      const reviews = open
        .map((focus) => focus.reviewAt)
        .filter((date): date is string => date != null)
        .sort()

      const attention: AttentionReason[] = []
      if (data.results.length === 0) attention.push('no_assessment')
      else {
        if (next.overdue) attention.push('overdue')
        if (trend === 'declining') attention.push('declining')
        if (confidence < THIN_DATA_CONFIDENCE) attention.push('thin_data')
      }

      return {
        id: athlete.id,
        name: athlete.name || athlete.profile.firstName || '',
        overall: baselineIndex(axes),
        confidence,
        trend,
        primaryLimiter: limiter?.dimension ?? null,
        lastAssessmentOn: completed[0]?.performedOn ?? null,
        nextAssessmentOn: next.date,
        resultCount: data.results.length,
        openFocuses: open.length,
        nextFocusReviewOn: reviews[0] ?? null,
        attention,
      }
    })
}

export interface CoachSummary {
  athletes: number
  assessmentsThisMonth: number
  needsAttention: number
  improving: number
}

export function coachSummary(
  athletes: StoredAthlete[],
  asOf: Date = new Date(),
): CoachSummary {
  const rows = athleteRows(athletes, asOf)
  const month = asOf.toISOString().slice(0, 7)

  const assessmentsThisMonth = athletes
    .filter((a) => !a.archived)
    .reduce(
      (sum, athlete) =>
        sum +
        athlete.assessments.filter(
          (assessment) =>
            assessment.status === 'completed' && assessment.performedOn.startsWith(month),
        ).length,
      0,
    )

  return {
    athletes: rows.length,
    assessmentsThisMonth,
    needsAttention: rows.filter((r) => r.attention.length > 0).length,
    improving: rows.filter((r) => r.trend === 'improving').length,
  }
}
