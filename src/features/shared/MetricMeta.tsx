import { useTranslation } from 'react-i18next'
import type { DerivedMetric } from '@/domain/metricContract'
import { cn } from '@/lib/utils'

/**
 * Die Beschriftung einer Kennzahl nach dem Metric Contract.
 *
 * Eine Zeile unter der Zahl: auf wie vielen Werten sie steht, wie belastbar
 * sie ist, und was sie einschränkt. Die Fassung des Algorithmus steht im
 * Titel (Hover/Langdruck) — wer nachfragt, bekommt sie; wer nicht fragt,
 * wird nicht mit Versionsnummern belastet.
 *
 * Niedrige Konfidenz wird sichtbar markiert, aber die Zahl bleibt stehen
 * (Master-Spezifikation I2: «Kennzahl sichtbar, aber klar markiert»).
 */
export function MetricMeta({ metric, className }: { metric: Pick<DerivedMetric<unknown>, 'sampleSize' | 'confidenceLabel' | 'warnings' | 'algorithm' | 'algorithmVersion' | 'value'>; className?: string }) {
  const { t } = useTranslation()
  const warnings = metric.warnings.filter((w) => w !== 'insufficient_data' || metric.value == null)
  return (
    <p
      className={cn('text-[11px] leading-relaxed text-ink-muted', metric.confidenceLabel === 'LOW' && 'text-warning', className)}
      title={t('metric.algorithm', { algorithm: metric.algorithm, version: metric.algorithmVersion })}
      data-testid="metric-meta"
    >
      {t('metric.sample', { count: metric.sampleSize })}
      {metric.confidenceLabel && ` · ${t(`metric.confidence.${metric.confidenceLabel}`)}`}
      {warnings.length > 0 && ` · ${warnings.map((w) => t(`metric.warning.${w}`)).join(' · ')}`}
    </p>
  )
}
