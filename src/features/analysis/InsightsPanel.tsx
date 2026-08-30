import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AxisFinding, InsightReport, Recommendation } from '@/domain/insights'
import type { AppLocale } from '@/types/domain'

/**
 * Hinweise aus dem Profil.
 *
 * Jede Zeile nennt ihre Herleitung mit. Ein Hinweis ohne sichtbare Grundlage
 * wäre in dieser App ein Orakel — und ein Orakel, dem man nicht widersprechen
 * kann, ist genau das, was eine Diagnostik nicht sein darf.
 */
export function InsightsPanel({
  report,
  locale,
}: {
  report: InsightReport
  locale: AppLocale
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelHeader title={t('insights.findings')} subtitle={t('insights.findingsHint')} />
        <div className="px-4 py-4">
          {report.limiters.length === 0 && report.strengths.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              {t('insights.noFindings')}
            </p>
          ) : (
            <ul className="space-y-3">
              {report.limiters.map((finding) => (
                <FindingRow key={`l-${finding.dimension}`} finding={finding} kind="limiter" />
              ))}
              {report.strengths.map((finding) => (
                <FindingRow key={`s-${finding.dimension}`} finding={finding} kind="strength" />
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
            {t('insights.findingsMethod')}
          </p>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel>
          <PanelHeader title={t('insights.nextAssessment')} />
          <div className="px-4 py-4">
            {report.next.date == null ? (
              <p className="text-[13px] text-ink-secondary">{t('insights.nextNone')}</p>
            ) : (
              <>
                <p className="flex items-center gap-2">
                  <CalendarClock size={18} className="shrink-0 text-ink-muted" aria-hidden />
                  <span
                    className={cn(
                      'readout font-display text-[20px] font-bold',
                      report.next.overdue && 'text-warning',
                    )}
                  >
                    {formatDate(report.next.date, locale)}
                  </span>
                  {report.next.overdue && (
                    <span className="text-[12px] text-warning">{t('insights.overdue')}</span>
                  )}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                  {t(`insights.nextBasis.${report.next.basis}`, {
                    days: report.next.intervalDays,
                  })}
                </p>
              </>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t('insights.recommendations')} subtitle={t('insights.recommendationsHint')} />
          {report.recommendations.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('insights.noRecommendations')}</p>
          ) : (
            <ul>
              {report.recommendations.slice(0, 6).map((recommendation, index) => (
                <RecommendationRow
                  key={`${recommendation.kind}-${recommendation.dimension ?? index}`}
                  recommendation={recommendation}
                  locale={locale}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function FindingRow({ finding, kind }: { finding: AxisFinding; kind: 'limiter' | 'strength' }) {
  const { t } = useTranslation()
  const Icon = kind === 'limiter' ? TrendingDown : TrendingUp

  return (
    <li className="flex gap-2.5">
      <Icon
        size={16}
        aria-hidden
        className={cn('mt-0.5 shrink-0', kind === 'limiter' ? 'text-warning' : 'text-accent-text')}
      />
      <div className="min-w-0">
        <p className="text-[14px]">
          {t(`dimensions.${finding.dimension}`)}{' '}
          <span className="text-ink-secondary">
            {t(`insights.${kind}Gap`, { gap: Math.abs(finding.gapToMean) })}
          </span>
        </p>
        {/* Die Belegstärke steht direkt an der Aussage, nicht in einer Fussnote. */}
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {t('insights.basedOn', { count: finding.measurements })} ·{' '}
          {t(`insights.evidence.${finding.evidence}`)}
        </p>
      </div>
    </li>
  )
}

function RecommendationRow({
  recommendation,
  locale,
}: {
  recommendation: Recommendation
  locale: AppLocale
}) {
  const { t } = useTranslation()
  const suggested = recommendation.suggestedTestSlugs
    .map((slug) => getTest(slug))
    .filter((test): test is NonNullable<typeof test> => test != null)

  const dimensionName = recommendation.dimension
    ? t(`dimensions.${recommendation.dimension}`)
    : ''

  return (
    <li className="border-t border-line px-4 py-3 first:border-t-0">
      <p className="text-[14px] leading-snug">
        {t(`insights.recommendation.${recommendation.kind}`, {
          ...recommendation.values,
          dimension: dimensionName,
          test: suggested[0]?.name[locale] ?? '',
        })}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">
        {t(`insights.evidence.${recommendation.evidence}`)}
      </p>
      {/* Trainingsschwerpunkt (§30). Ausdrücklich als Performance-Empfehlung
          gekennzeichnet — was daraus für den Trainingsplan folgt, entscheidet
          der Athlet oder sein Trainer. */}
      {recommendation.emphasis && (
        <div className="mt-2 border-l-2 border-accent bg-accent/8 px-3 py-2">
          <p className="label-tag">{t('emphasis.title')}</p>
          <p className="mt-1 text-[13px] leading-snug">
            {recommendation.emphasis.focusKeys.map((key) => t(key)).join(' · ')}
          </p>
          <p className="mt-1 text-[12px] text-ink-secondary">
            {t('emphasis.volume', {
              minSessions: recommendation.emphasis.sessionsPerWeek[0],
              maxSessions: recommendation.emphasis.sessionsPerWeek[1],
              minWeeks: recommendation.emphasis.weeksToRetest[0],
              maxWeeks: recommendation.emphasis.weeksToRetest[1],
            })}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            {t('emphasis.verifyWith', {
              tests: recommendation.emphasis.verifyWith
                .map((slug) => getTest(slug)?.shortName[locale] ?? slug)
                .join(', '),
            })}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
            {t(`emphasis.confidence.${recommendation.emphasisConfidence}`)} ·{' '}
            {t('emphasis.disclaimer')}
          </p>
        </div>
      )}

      {suggested.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {suggested.map((test) => (
            <li key={test.slug}>
              <Link
                to={`/tests/${test.slug}`}
                className="inline-flex min-h-11 items-center gap-1 border border-line px-2.5 text-[12px] transition-colors hover:bg-surface-sunken"
              >
                {test.name[locale]}
                <ChevronRight size={12} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
