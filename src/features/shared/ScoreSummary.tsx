import { useTranslation } from 'react-i18next'
import { useLocale } from './useLocale'
import { formatNumber } from '@/lib/format'
import { missingAxesForScore, type PerformanceScore } from '@/domain/performanceScore'
import type { RadarAxis } from '@/types/domain'

/**
 * Die Zusammenfassung als Zahl, mit ihrer Abdeckung untrennbar daneben.
 *
 * Die Abdeckung ist kein Zusatz und keine Fussnote: ohne sie wäre die Zahl
 * eine Behauptung über einen Menschen, die aus zwei Messungen genauso
 * aussieht wie aus sechs. Deshalb steht sie in derselben Zeile und wird nicht
 * weggelassen, wenn der Platz knapp wird.
 */
export function ScoreSummary({ score, axes }: { score: PerformanceScore; axes: RadarAxis[] }) {
  const { t } = useTranslation()
  const locale = useLocale()

  if (score.value == null) {
    return (
      <div className="px-4 py-4">
        <span className="label-tag">{t('score.title')}</span>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          {t('score.tooFew', { count: missingAxesForScore(axes) })}
        </p>
        {score.measuredWithoutReference > 0 && (
          <p className="mt-1 text-[12px] text-ink-muted">
            {t('score.measuredWithoutReference', { count: score.measuredWithoutReference })}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <span className="label-tag">{t('score.title')}</span>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="readout text-[44px] leading-none font-medium tabular-nums">
          {formatNumber(score.value, locale, 0)}
        </span>
        <span className="text-[13px] leading-snug text-ink-secondary">
          {t('score.coverage', { rated: score.ratedAxes, total: score.totalAxes })}
        </span>
      </div>
      <div className="mt-3 h-1.5 bg-surface-sunken" aria-hidden>
        <div
          className="h-full bg-accent"
          style={{ width: `${Math.round(score.coverage * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t('score.caveat')}</p>
      {score.measuredWithoutReference > 0 && (
        <p className="mt-1 text-[12px] text-ink-muted">
          {t('score.measuredWithoutReference', { count: score.measuredWithoutReference })}
        </p>
      )}
    </div>
  )
}
