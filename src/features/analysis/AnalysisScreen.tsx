import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { ConfidencePanel } from './ConfidencePanel'
import { InsightsPanel } from './InsightsPanel'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  baselineComparisons,
  compareAssessments,
  confidenceScore,
  latestComparablePair,
  performanceBalance,
  testTrend,
  type TrendLabel,
} from '@/domain/analytics'
import { buildInsights } from '@/domain/insights'
import { radarProfile } from '@/lib/scoring'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Auswertung über die Zeit.
 *
 * Vier Fragen in dieser Reihenfolge, weil sie aufeinander aufbauen:
 *   1. Wie belastbar ist das, was hier steht?
 *   2. Wo stehe ich im Verhältnis zu mir selbst (Ausgewogenheit)?
 *   3. Was hat sich seit dem Anfang verändert?
 *   4. Was hat sich zwischen zwei konkreten Terminen verändert?
 *
 * Frage 1 steht bewusst vorn: eine Veränderung von 4 % bei zwei Messungen im
 * Abstand von zehn Tagen ist Rauschen, und wer das erst hinterher erfährt,
 * hat die Zahl schon geglaubt.
 */
export function AnalysisScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data } = useAppData()

  const confidence = useMemo(() => confidenceScore(data.results), [data.results])
  const axes = useMemo(() => radarProfile(data.results, 'population'), [data.results])
  const balance = useMemo(() => performanceBalance(axes), [axes])
  const insights = useMemo(
    () => buildInsights(axes, data.results, data.assessments, data.profile),
    [axes, data.results, data.assessments, data.profile],
  )
  const comparisons = useMemo(() => baselineComparisons(data.results), [data.results])

  const completed = useMemo(
    () =>
      [...data.assessments]
        .filter((a) => a.status === 'completed')
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn)),
    [data.assessments],
  )
  const defaultPair = useMemo(() => latestComparablePair(data.assessments), [data.assessments])
  const [beforeId, setBeforeId] = useState(() => defaultPair?.[0].id ?? '')
  const [afterId, setAfterId] = useState(() => defaultPair?.[1].id ?? '')

  const comparisonRows = useMemo(
    () => (beforeId && afterId && beforeId !== afterId ? compareAssessments(data, beforeId, afterId) : []),
    [data, beforeId, afterId],
  )

  if (data.results.length === 0) {
    return (
      <EmptyState
        title={t('analysis.emptyTitle')}
        body={t('analysis.emptyBody')}
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/diagnostik/neu">{t('assessments.new')}</Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {t('analysis.title')}
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
          {t('analysis.intro')}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConfidencePanel confidence={confidence} />

        <Panel>
          <PanelHeader title={t('analysis.balance')} subtitle={t('analysis.balanceHint')} />
          <div className="px-4 py-4">
            {balance.balance == null ? (
              <p className="text-[13px] text-ink-secondary">{t('analysis.balanceTooFew')}</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="readout font-display text-[40px] leading-none font-bold tabular-nums">
                    {Math.round(balance.balance)}
                  </span>
                  <span className="text-[13px] text-ink-muted">/ 100</span>
                </div>
                <dl className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-secondary">{t('analysis.strongest')}</dt>
                    <dd className="text-right">
                      {t(`dimensions.${balance.strongest!.dimension}`)}{' '}
                      <span className="readout tabular-nums">
                        {Math.round(balance.strongest!.score)}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-secondary">{t('analysis.weakest')}</dt>
                    <dd className="text-right">
                      {t(`dimensions.${balance.weakest!.dimension}`)}{' '}
                      <span className="readout tabular-nums">
                        {Math.round(balance.weakest!.score)}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-secondary">{t('analysis.spread')}</dt>
                    <dd className="readout tabular-nums">{balance.spread} {t('analysis.points')}</dd>
                  </div>
                </dl>
              </>
            )}
            {balance.unmeasured.length > 0 && (
              <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
                {t('analysis.unmeasuredNote', {
                  axes: balance.unmeasured.map((d) => t(`dimensions.${d}`)).join(', '),
                })}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <InsightsPanel report={insights} locale={locale} />
      </div>

      <Panel className="mt-4">
        <PanelHeader title={t('analysis.sinceBaseline')} subtitle={t('analysis.sinceBaselineHint')} />
        {comparisons.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('analysis.needTwoPerTest')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th scope="col" className="px-4 py-2 font-medium">{t('table.test')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('analysis.first')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('analysis.latest')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('analysis.change')}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t('analysis.trend')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => {
                  const test = getTest(row.testSlug)
                  const trend = testTrend(data.results, row.testSlug)
                  return (
                    <tr key={row.testSlug} className="border-b border-line last:border-b-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">
                        {test?.name[locale] ?? row.testSlug}
                        <span className="block text-[11px] text-ink-muted">
                          {t('analysis.overDays', { count: row.daysBetween })}
                        </span>
                      </th>
                      <td className="readout px-4 py-2.5 tabular-nums text-ink-secondary">
                        {formatResultValue(row.baseline, locale, data.profile.unitSystem)}
                        <span className="block text-[11px] text-ink-muted">
                          {formatDate(row.baseline.performedAt, locale)}
                        </span>
                      </td>
                      <td className="readout px-4 py-2.5 tabular-nums">
                        {formatResultValue(row.current, locale, data.profile.unitSystem)}
                        <span className="block text-[11px] text-ink-muted">
                          {formatDate(row.current.performedAt, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ChangeBadge value={row.changePercent} />
                      </td>
                      <td className="px-4 py-2.5">
                        <TrendBadge trend={trend} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title={t('analysis.compareAssessments')}
          subtitle={t('analysis.compareHint')}
        />
        {completed.length < 2 ? (
          <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('analysis.needTwoAssessments')}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
              <label className="min-w-0 flex-1">
                <span className="label-tag">{t('analysis.before')}</span>
                <select
                  value={beforeId}
                  onChange={(e) => setBeforeId(e.target.value)}
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
                >
                  {completed.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? formatDate(a.performedOn, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight size={16} className="mb-3 shrink-0 text-ink-muted" aria-hidden />
              <label className="min-w-0 flex-1">
                <span className="label-tag">{t('analysis.after')}</span>
                <select
                  value={afterId}
                  onChange={(e) => setAfterId(e.target.value)}
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
                >
                  {completed.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? formatDate(a.performedOn, locale)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {beforeId === afterId ? (
              <p className="px-4 py-6 text-[14px] text-ink-secondary">{t('analysis.samePair')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="px-4 py-2 font-medium">{t('table.test')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('analysis.before')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('analysis.after')}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{t('analysis.change')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.testSlug} className="border-b border-line last:border-b-0">
                        <th scope="row" className="px-4 py-2.5 text-left font-normal">
                          {getTest(row.testSlug)?.name[locale] ?? row.testSlug}
                        </th>
                        <td className="readout px-4 py-2.5 tabular-nums text-ink-secondary">
                          {row.before
                            ? formatResultValue(row.before, locale, data.profile.unitSystem)
                            : '—'}
                        </td>
                        <td className="readout px-4 py-2.5 tabular-nums">
                          {row.after
                            ? formatResultValue(row.after, locale, data.profile.unitSystem)
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.onlyIn ? (
                            <span className="text-[12px] text-ink-muted">
                              {t(`analysis.onlyIn.${row.onlyIn}`)}
                            </span>
                          ) : (
                            <ChangeBadge value={row.changePercent} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>

      <p className="mt-6 max-w-[70ch] border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">
        {t('assessments.disclaimer')}
      </p>
    </>
  )
}

/**
 * Veränderung in Prozent.
 *
 * Richtung über Pfeil UND Vorzeichen, nicht über Farbe allein — sonst ist die
 * Aussage für rot-grün-blinde Leser weg.
 */
function ChangeBadge({ value }: { value: number | null }) {
  const { t } = useTranslation()
  if (value == null) return <span className="text-[12px] text-ink-muted">—</span>

  const Icon = value > 0.05 ? ArrowUp : value < -0.05 ? ArrowDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[13px] tabular-nums',
        value > 0.05 ? 'text-accent-text' : value < -0.05 ? 'text-critical' : 'text-ink-secondary',
      )}
      title={t('analysis.changeHint')}
    >
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {value > 0 ? '+' : ''}
      {value.toFixed(1)} %
    </span>
  )
}

/** Trend mit Datengrundlage — die Zahl allein wäre eine Behauptung. */
function TrendBadge({
  trend,
}: {
  trend: { label: TrendLabel; points: number; spanDays: number; rSquared: number | null }
}) {
  const { t } = useTranslation()

  if (trend.label === 'insufficient') {
    return (
      <span className="text-[12px] text-ink-muted" title={t('analysis.trendInsufficientHint')}>
        {t('analysis.trendLabel.insufficient', { count: trend.points })}
      </span>
    )
  }

  return (
    <span className="text-[12px]">
      {t(`analysis.trendLabel.${trend.label}`)}
      <span className="block text-ink-muted">
        {t('analysis.trendBasis', {
          points: trend.points,
          days: trend.spanDays,
          r2: (trend.rSquared ?? 0).toFixed(2),
        })}
      </span>
    </span>
  )
}
