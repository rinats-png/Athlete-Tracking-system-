import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '@/components/charts/TrendChart'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { testTrend } from '@/domain/analytics'
import { benchmarkResult } from '@/domain/benchmark'
import { assessQuality, isOutlier } from '@/domain/dataQuality'
import { formatDate, formatMeasurement } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { NORM_DATASET } from '@/data/norms'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Detailseite eines Tests (§65).
 *
 * Beantwortet in dieser Reihenfolge: Was misst der Test? Wie führe ich ihn
 * durch? Wo stehe ich? Wie hat sich das entwickelt? Und was habe ich
 * tatsächlich gemessen?
 *
 * Die Bestleistung steht neben dem letzten Wert und nicht darüber: was
 * jemand vor zwei Jahren einmal geschafft hat, ist eine andere Aussage als
 * das, was er heute kann — beide Zahlen gehören nebeneinander, damit der
 * Unterschied sichtbar ist.
 */
export function TestDetailScreen() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data } = useAppData()

  const test = getTest(slug)

  const history = useMemo(
    () =>
      data.results
        .filter((r) => r.testSlug === slug && r.score != null)
        .sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
    [data.results, slug],
  )

  const trend = useMemo(() => testTrend(data.results, slug), [data.results, slug])

  if (!test) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('tests.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/tests">{t('actions.backToCatalog')}</Link>
        </Button>
      </Panel>
    )
  }

  const latest = history[0] ?? null
  const best =
    history.length === 0
      ? null
      : history.reduce((acc, r) =>
          test.direction === 'higher_is_better'
            ? (r.score as number) > (acc.score as number)
              ? r
              : acc
            : (r.score as number) < (acc.score as number)
              ? r
              : acc,
        )
  const verdict = latest ? benchmarkResult(latest, data.profile) : null

  const points = [...history]
    .reverse()
    .map((r) => ({ performedAt: r.performedAt, value: r.score as number }))

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/tests">
          <ArrowLeft size={14} aria-hidden />
          {t('actions.backToCatalog')}
        </Link>
      </Button>

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label-tag">
            {t(`categories.${test.category}`)} · {t(`dimensions.${test.dimension}`)}
          </span>
          <h1 className="mt-1 font-display text-[28px] leading-tight font-bold sm:text-[34px]">
            {test.name[locale]}
          </h1>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
            {test.summary[locale]}
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link to={`/tests/${test.slug}`}>
            <Play size={15} strokeWidth={2.4} aria-hidden />
            {t('testDetail.run')}
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader title={t('testDetail.standing')} />
            {latest == null ? (
              <p className="px-4 py-6 text-[14px] text-ink-secondary">
                {t('testDetail.noResults')}
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-4">
                <Figure
                  label={t('testDetail.latest')}
                  value={formatResultValue(latest, locale, data.profile.unitSystem)}
                  note={formatDate(latest.performedAt, locale)}
                />
                <Figure
                  label={t('testDetail.personalBest')}
                  value={
                    best ? formatResultValue(best, locale, data.profile.unitSystem) : '—'
                  }
                  note={best ? formatDate(best.performedAt, locale) : undefined}
                />
                <Figure
                  label={t('table.percentile')}
                  value={
                    verdict?.percentile != null ? `P${Math.round(verdict.percentile)}` : '—'
                  }
                  note={
                    verdict?.missingReason
                      ? t(`benchmark.missing.${verdict.missingReason}`)
                      : undefined
                  }
                />
                <Figure
                  label={t('benchmark.band')}
                  value={verdict?.band ? t(`profile.level.${verdict.band}`) : '—'}
                  note={
                    verdict?.percentile != null
                      ? t('benchmark.bandFrom', { percentile: Math.round(verdict.percentile) })
                      : undefined
                  }
                />
              </dl>
            )}
            {verdict?.populationMismatch && (
              <p className="border-t border-line bg-warning/10 px-4 py-2.5 text-[12px] leading-relaxed text-ink-secondary">
                {t('benchmark.mismatch')}
              </p>
            )}
            {verdict?.percentile != null && !verdict.validated && (
              <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-ink-muted">
                {t('benchmark.notValidated')} {NORM_DATASET.population[locale]}.
              </p>
            )}
          </Panel>

          {points.length >= 2 && (
            <Panel>
              <PanelHeader
                title={t('testDetail.progression')}
                subtitle={
                  trend.label === 'insufficient'
                    ? t('analysis.trendLabel.insufficient', { count: trend.points })
                    : t('analysis.trendBasis', {
                        points: trend.points,
                        days: trend.spanDays,
                        r2: (trend.rSquared ?? 0).toFixed(2),
                      })
                }
              />
              <div className="px-2 py-3">
                <TrendChart
                  points={points}
                  unit={test.primaryUnit}
                  locale={locale}
                  label={test.name[locale]}
                  showFit
                />
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title={t('testDetail.history')} />
            {history.length === 0 ? (
              <p className="px-4 py-6 text-[14px] text-ink-secondary">
                {t('testDetail.noResults')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="px-4 py-2 font-medium">{t('table.date')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('table.value')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('table.quality')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('context.title')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => {
                      const quality = assessQuality(r)
                      const conditions = [
                        r.context.surface,
                        r.context.temperatureC != null ? `${r.context.temperatureC} °C` : '',
                        r.context.equipment,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <tr key={r.id} className="border-b border-line last:border-b-0">
                          <th scope="row" className="px-4 py-2.5 text-left font-normal">
                            {formatDate(r.performedAt, locale)}
                            {r === best && (
                              <span className="ml-1.5 text-[11px] text-accent-text">
                                {t('badges.personalBest')}
                              </span>
                            )}
                          </th>
                          <td className="readout px-4 py-2.5 tabular-nums">
                            {formatResultValue(r, locale, data.profile.unitSystem)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                'text-[12px]',
                                quality.status === 'valid' ? 'text-ink-secondary' : 'text-warning',
                              )}
                            >
                              {t(`quality.status.${quality.status}`)}
                              {isOutlier(r, data.results) && ` · ${t('quality.outlier')}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-ink-muted">
                            {conditions || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader title={t('tests.protocol')} subtitle={test.equipment[locale]} />
            <p className="px-4 py-3 text-[14px] leading-relaxed text-ink-secondary">
              {test.instructions[locale]}
            </p>
            <dl className="border-t border-line px-4 py-3 text-[13px]">
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">{t('testDetail.measures')}</dt>
                <dd className="text-right">
                  {Object.keys(test.dimensionMetrics)
                    .map((d) => t(`dimensions.${d}`))
                    .join(', ')}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">{t('testDetail.unit')}</dt>
                <dd className="readout text-right">
                  {formatMeasurement(1, test.primaryUnit, locale, data.profile.unitSystem).unit ||
                    test.primaryUnit}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">{t('testDetail.direction')}</dt>
                <dd className="text-right">{t(`testDetail.${test.direction}`)}</dd>
              </div>
              {test.protocol.attempts != null && (
                <div className="flex justify-between gap-2 py-1">
                  <dt className="text-ink-muted">{t('testDetail.attempts')}</dt>
                  <dd className="readout text-right tabular-nums">{test.protocol.attempts}</dd>
                </div>
              )}
              {test.requiresBodyWeight && (
                <div className="flex justify-between gap-2 py-1">
                  <dt className="text-ink-muted">{t('testDetail.needs')}</dt>
                  <dd className="text-right">{t('testDetail.bodyWeight')}</dd>
                </div>
              )}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="label-tag">{label}</dt>
      <dd className="readout mt-1 font-display text-[20px] leading-tight font-bold tabular-nums">
        {value}
      </dd>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{note}</p>}
    </div>
  )
}
