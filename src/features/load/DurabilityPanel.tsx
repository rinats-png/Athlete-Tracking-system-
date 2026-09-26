import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { MetricMeta } from '@/features/shared/MetricMeta'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { DURABILITY_SOURCES, durabilityOverview, type DurabilitySeries } from '@/domain/durability'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Ermüdungsresistenz aus Tests — je Quelle der jüngste Erhalt (ermüdet in
 * Prozent von frisch), der eigene frühere Median, die erkennbare
 * Veränderung und das Urteil gegen die eigene Streuung.
 *
 * Ohne passende Tests erklärt die Fläche, welche Tests die Zahl liefern
 * (Spezifikation I2: Empty erklärt), statt zu verschwinden.
 */
export function DurabilityPanel({ className }: { className?: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const series = useMemo(() => durabilityOverview(data.results), [data.results])

  return (
    <Panel className={className} data-testid="durability">
      <PanelHeader title={t('durability.title')} subtitle={t('durability.why')} />
      {series.length === 0 ? (
        <div className="px-4 py-4 text-[13px] leading-relaxed text-ink-secondary">
          <p>{t('durability.empty')}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {DURABILITY_SOURCES.map((slug) => {
              const test = getTest(slug)
              return (
                <li key={slug}>
                  <Link to={`/tests/${slug}`} className="inline-block rounded-pill border border-line px-2.5 py-1 text-[12px] hover:border-line-strong">
                    {test ? pick(test.name, locale) : slug}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {series.map((s) => (
            <SeriesRow key={s.source} s={s} />
          ))}
        </ul>
      )}
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('durability.method')}</p>
    </Panel>
  )
}

function SeriesRow({ s }: { s: DurabilitySeries }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const test = getTest(s.source)
  const last = s.points.at(-1)!
  const values = s.points.map((p) => p.retentionPct)
  const lo = Math.min(...values, s.baselineMedian ?? Infinity) - 2
  const hi = Math.max(...values, s.baselineMedian ?? -Infinity) + 2
  const y = (v: number) => 28 - ((v - lo) / Math.max(1, hi - lo)) * 24
  const x = (i: number) => (values.length === 1 ? 50 : (i / (values.length - 1)) * 100)

  return (
    <li className="px-4 py-3" data-source={s.source} data-verdict={s.verdict}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px]">{test ? pick(test.name, locale) : s.source}</span>
        <span className="readout text-[20px] tabular-nums">
          {formatNumber(last.retentionPct, locale, 1)} <span className="text-[12px] text-ink-muted">%</span>
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-muted">
        {t(`durability.detail.${last.unit}`, {
          fresh: formatNumber(last.fresh, locale, last.unit === 'throws_per_s' ? 2 : 0),
          fatigued: formatNumber(last.fatigued, locale, last.unit === 'throws_per_s' ? 2 : 0),
        })}{' '}
        · {formatDate(last.day, locale)}
      </p>
      {values.length > 1 && (
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 h-8 w-full" aria-hidden>
          {s.baselineMedian != null && (
            <line x1="0" x2="100" y1={y(s.baselineMedian)} y2={y(s.baselineMedian)} className="stroke-line-strong" strokeDasharray="2 2" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          )}
          <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" className="stroke-accent" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <p className={cn('mt-1.5 text-[12px]', s.verdict === 'worsened' ? 'text-warning' : 'text-ink-secondary')}>
        {s.verdict === 'unknown'
          ? t('durability.verdict.unknown', { count: s.points.length })
          : t(`durability.verdict.${s.verdict}`, {
              baseline: formatNumber(s.baselineMedian, locale, 1),
              detectable: formatNumber(s.detectablePp, locale, 1),
            })}
      </p>
      <MetricMeta metric={s.latest} className="mt-0.5" />
    </li>
  )
}
