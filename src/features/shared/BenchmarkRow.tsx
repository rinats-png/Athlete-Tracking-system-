import { useTranslation } from 'react-i18next'
import { RatingWord } from './RatingScale'
import { useLocale } from './useLocale'
import { ratingFromBand, ratingFromPercentile } from '@/domain/rating'
import { formatNumber } from '@/lib/format'
import type { ReferenceComparison } from '@/data/references'

/** Perzentile über 99 werden nicht als «100» gezeigt: das Perzentil ist geklemmt, nicht gemessen. */
export function percentileLabel(percentile: number, locale: 'de' | 'en'): string {
  return percentile >= 99.5 ? '>99' : formatNumber(percentile, locale, 0)
}

/** Eine Referenzgruppe mit dem eigenen Ergebnis darin (Konzept §17, §18). */
export function BenchmarkRow({ comparison }: { comparison: ReferenceComparison }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { entry } = comparison
  const level = comparison.percentile != null ? ratingFromPercentile(comparison.percentile) : comparison.band ? ratingFromBand(comparison) : null
  const figure =
    comparison.percentile != null
      ? comparison.percentile >= 99.5
        ? t('result.percentileTop')
        : t('result.percentile', { percentile: percentileLabel(comparison.percentile, locale) })
      : comparison.band
        ? comparison.band.label[locale]
        : comparison.percentFromMedian != null
          ? t('result.percentFromMedian', {
              percent: `${comparison.percentFromMedian > 0 ? '+' : ''}${formatNumber(comparison.percentFromMedian, locale, 0)}`,
            })
          : comparison.percentOfAnchor != null
            ? t('result.percentOfAnchor', { percent: formatNumber(comparison.percentOfAnchor, locale, 0) })
            : '—'
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
      <span className="min-w-0">
        <span className="label-tag">{t(`result.groups.${entry.cohort}`)}</span>
        <span className="block text-[13px]">{entry.cohortLabel[locale]}</span>
        <span className="block text-[11px] text-ink-muted">
          {t('result.quality', { quality: entry.quality })} · {entry.source.study}
        </span>
      </span>
      <span className="flex items-center gap-3">
        {comparison.sdFromMean != null && (
          <span className="text-[12px] text-ink-secondary">{t('result.sdFromMean', { sd: formatNumber(comparison.sdFromMean, locale, 1) })}</span>
        )}
        <span className="readout text-[14px]">{figure}</span>
        <RatingWord level={level} />
      </span>
    </li>
  )
}
