import { getTest } from '@/data/testCatalog'
import { resultPercentile } from '@/domain/analytics'
import { assessQuality } from '@/domain/dataQuality'
import type { AppLocale } from '@/types/domain'
import type { StoredData } from '@/lib/store/localStore'

/**
 * CSV-Export der Messwerte.
 *
 * Bewusst die Rohwerte in metrischen Einheiten und mit ISO-Datum, nicht die
 * Anzeigeform: eine Exportdatei wird in Excel, R oder einer Trainingssoftware
 * weiterverarbeitet, und dort ist «240 cm» eine Zeichenkette, «2.4» eine Zahl.
 * Die Einheit steht in einer eigenen Spalte daneben.
 */

const COLUMNS = [
  'result_id',
  'assessment_id',
  'assessment_title',
  'performed_at',
  'test_slug',
  'test_name',
  'dimension',
  'primary_metric',
  'primary_value',
  'primary_unit',
  'direction',
  'percentile',
  'quality',
  'body_weight_kg',
  'age_years',
  'sex',
  'attempt_selection',
  'attempt_count',
  'notes',
] as const

/**
 * Ein Feld für CSV maskieren.
 *
 * Die führende Apostrophierung bei =, +, -, @ verhindert, dass Excel den
 * Inhalt als Formel ausführt. Das Notizfeld ist Nutzereingabe, und eine
 * Exportdatei, die beim Öffnen etwas ausführt, ist ein Sicherheitsproblem —
 * nicht nur ein Anzeigefehler.
 */
function escapeField(value: unknown): string {
  if (value == null) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/["\n\r,;]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function resultsToCsv(data: StoredData, locale: AppLocale): string {
  const titles = new Map(data.assessments.map((a) => [a.id, a.title ?? a.performedOn]))

  const rows = [...data.results]
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((result) => {
      const test = getTest(result.testSlug)
      const quality = assessQuality(result)
      return [
        result.id,
        result.assessmentId ?? '',
        result.assessmentId ? (titles.get(result.assessmentId) ?? '') : '',
        result.performedAt,
        result.testSlug,
        test?.name[locale] ?? '',
        test?.dimension ?? '',
        test?.primaryMetric ?? '',
        result.score ?? '',
        test?.primaryUnit ?? '',
        test?.direction ?? '',
        resultPercentile(result) ?? '',
        quality.status,
        result.bodyWeightKg ?? '',
        result.ageYears ?? '',
        result.sex ?? '',
        result.attemptSelection ?? '',
        result.attempts.length,
        result.notes ?? '',
      ].map(escapeField)
    })

  // CRLF: die Zeilenendung, die Excel unter Windows ohne Rückfrage versteht.
  return [COLUMNS.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

/** Körperwerte als eigene Datei — andere Zeilenbedeutung, andere Tabelle. */
export function biometricsToCsv(data: StoredData): string {
  const columns = ['measured_on', 'body_weight_kg', 'body_fat_percent', 'resting_hr']
  const rows = [...data.biometrics]
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
    .map((entry) =>
      [entry.measuredOn, entry.bodyWeightKg ?? '', entry.bodyFatPercent ?? '', entry.restingHr ?? '']
        .map(escapeField)
        .join(','),
    )
  return [columns.join(','), ...rows].join('\r\n')
}

/**
 * Datei zum Download anbieten.
 *
 * Über einen Blob und nicht über eine data:-URL: Safari bricht bei längeren
 * data:-URLs ab, und ein Bestand mit einigen hundert Messungen ist schnell
 * länger, als dort zuverlässig funktioniert.
 */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Der Blob bleibt sonst bis zum Neuladen im Speicher.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
