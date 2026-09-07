import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { targetForNextLevel } from '@/domain/targetValue'
import { formatDate, formatMeasurement } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import type { Rating } from '@/domain/rating'
import type { TestDefinition } from '@/data/testCatalog'
import type { StoredResult } from '@/lib/store/localStore'
import { pick } from '@/i18n/pick'

/**
 * Was die nächste Stufe verlangt.
 *
 * «Gut» sagt, wo jemand steht — nicht, wie weit es bis «Sehr gut» ist. Der
 * Wert hier ist die Umkehrung derselben Referenz und keine neue Aussage: er
 * verspricht ausdrücklich nicht, dass er erreichbar ist (§81).
 */
export function TargetPanel({
  test,
  rating,
  ownValue,
}: {
  test: TestDefinition
  rating: Rating
  ownValue: number | null
}) {
  const { t } = useTranslation()
  const locale = useLocale()

  const target = targetForNextLevel(rating.comparison, rating.level, ownValue, test.direction)
  if (!target) return null

  // Die Einheit der VERGLICHENEN Kennzahl, nicht die des Tests: beim Cooper
  // wird die VO₂max eingeordnet, nicht die Distanz.
  const unit = rating.metricKey && rating.metricKey !== test.primaryMetric ? '' : test.primaryUnit
  const shown = formatMeasurement(target.value, unit, locale)
  const gap = formatMeasurement(target.distance, unit, locale)
  const withUnit = (m: { value: string; unit: string }) => `${m.value}${m.unit ? ` ${m.unit}` : ''}`

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title={t('result.target')} subtitle={t('result.targetHint')} />
      <p className="px-4 py-3 text-[13px] leading-relaxed">
        {t(test.direction === 'lower_is_better' ? 'result.targetLineLower' : 'result.targetLine', {
          level: t(`rating.levels.${target.level}`),
          value: withUnit(shown),
          distance: withUnit(gap),
        })}
      </p>
    </Panel>
  )
}

/** Was eine abgeleitete Kennzahl ist — zwei Sätze, keine medizinische Aussage (§82). */
export function MetricMeaning({ metricKey }: { metricKey: string | null }) {
  const { t, i18n } = useTranslation()
  if (!metricKey) return null
  const key = `metricMeaning.${metricKey}`
  // Ohne hinterlegte Erklärung bleibt der Abschnitt weg — der Schlüsselname
  // als Text wäre schlimmer als keine Erklärung.
  if (!i18n.exists(key)) return null

  return (
    <div className="border-t border-line px-4 py-3">
      <span className="label-tag">{t('result.metricTitle')}</span>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{t(key)}</p>
    </div>
  )
}

/**
 * Eine Zeile zum Weitergeben.
 *
 * Bewusst Text und kein Bild, kein Abzeichen und keine Punkte: was hier
 * herauskommt, soll in eine Nachricht passen und nachprüfbar bleiben.
 */
export function ShareLine({
  result,
  test,
  rating,
}: {
  result: StoredResult
  test: TestDefinition
  rating: Rating
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [done, setDone] = useState(false)

  const line = [
    formatDate(result.performedAt, locale),
    pick(test.name, locale),
    formatResultValue(result, locale),
    rating.level ? t(`rating.levels.${rating.level}`) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const copy = () => {
    void navigator.clipboard?.writeText(line).then(
      () => setDone(true),
      () => setDone(false),
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy} title={t('result.shareHint')}>
        {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {done ? t('result.shared') : t('result.share')}
      </Button>
      <span className="sr-only" aria-live="polite">
        {done ? t('result.shared') : ''}
      </span>
    </>
  )
}
