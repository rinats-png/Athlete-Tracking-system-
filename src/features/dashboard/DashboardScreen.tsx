import { useMemo, useState } from 'react'
import { DecisionRow } from './DecisionRow'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Play } from 'lucide-react'
import { addMonths } from 'date-fns'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { TrendChart } from '@/components/charts/TrendChart'
import { BodyHero } from './BodyHero'
import { KeyMetrics } from './KeyMetrics'
import { DimensionBreakdown } from './DimensionBreakdown'
import { RecentTests } from './RecentTests'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppData } from '@/lib/store/AppDataProvider'
import { baselineIndex, radarProfile } from '@/lib/scoring'
import { toSummaries } from '@/lib/resultView'
import { getTest } from '@/data/testCatalog'
import { ageFromBirthDate, formatDate, formatRelativeMonths } from '@/lib/format'
import type { AppLocale, ScoreMode } from '@/types/domain'

/** Empfohlener Abstand zwischen zwei Diagnostikterminen. */
const RETEST_INTERVAL_MONTHS = 4

export function DashboardScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const [mode, setMode] = useState<ScoreMode>('population')
  const { data } = useAppData()

  const current = useMemo(() => radarProfile(data.results, mode), [data.results, mode])

  // Vormessung: derselbe Rechenweg mit einem Stichtag vor dem jüngsten Test.
  const previous = useMemo(() => {
    if (data.results.length === 0) return undefined
    const latest = new Date(data.results[0].performedAt)
    const cutoff = new Date(latest)
    cutoff.setDate(cutoff.getDate() - 30)
    const profile = radarProfile(data.results, mode, cutoff)
    return profile.some((axis) => axis.hasData) ? profile : undefined
  }, [data.results, mode])

  const summaries = useMemo(() => toSummaries(data.results, locale), [data.results, locale])
  const index = baselineIndex(current)

  const { strongest, weakest } = useMemo(() => {
    const scored = current.filter((axis) => axis.score != null)
    if (scored.length === 0) return { strongest: null, weakest: null }
    const sorted = [...scored].sort((a, b) => (b.score as number) - (a.score as number))
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
  }, [current])

  const lastAssessment = data.results[0]?.performedAt ?? null
  const nextDue = lastAssessment
    ? addMonths(new Date(lastAssessment), RETEST_INTERVAL_MONTHS).toISOString()
    : null

  const athlete = {
    id: 'local',
    firstName: data.profile.firstName || t('dashboard.anonymousAthlete'),
    lastName: data.profile.lastName,
    sex: data.profile.sex,
    birthDate: data.profile.birthDate,
    bodyWeightKg: data.biometrics.find((b) => b.bodyWeightKg != null)?.bodyWeightKg ?? null,
    heightCm: data.profile.heightCm,
    restingHr: data.profile.restingHr,
    maxHr: data.profile.maxHr,
    lastAssessmentOn: lastAssessment,
  }

  // Verlauf: der Test mit den meisten Messpunkten ist der aussagekräftigste.
  const trend = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of data.results) counts.set(r.testSlug, (counts.get(r.testSlug) ?? 0) + 1)
    const [slug] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
    if (!slug) return null
    const test = getTest(slug)
    if (!test) return null
    const points = data.results
      .filter((r) => r.testSlug === slug && r.score != null)
      .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime())
      .map((r) => ({ performedAt: r.performedAt, value: r.score as number }))
    return points.length >= 2 ? { test, points } : null
  }, [data.results])

  if (data.results.length === 0) {
    return (
      <EmptyState
        title={t('dashboard.emptyTitle')}
        body={t('dashboard.emptyBody')}
        action={
          <Button asChild variant="primary">
            <Link to="/diagnostik/neu">
              <Play size={14} strokeWidth={2.5} aria-hidden />
              {t('actions.startAssessment')}
            </Link>
          </Button>
        }
        secondary={
          ageFromBirthDate(data.profile.birthDate) == null ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/profil">{t('dashboard.completeProfile')}</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <>
      <section className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-tag">{t('dashboard.greeting')}</span>
          <h1 className="mt-1 font-display text-[30px] leading-none font-bold tracking-[0.01em] sm:text-[38px]">
            {athlete.firstName} {athlete.lastName ?? ''}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-secondary">
            {t('dashboard.lastAssessment')}:{' '}
            <span className="readout">{formatDate(lastAssessment, locale)}</span>
            <span className="text-ink-muted"> ({formatRelativeMonths(lastAssessment, locale)})</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="primary" size="md">
            <Link to="/diagnostik/neu">
              <Play size={14} strokeWidth={2.5} aria-hidden />
              {t('actions.startAssessment')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="md">
            <Link to="/bericht">
              <FileText size={14} strokeWidth={2} aria-hidden />
              {t('report.open')}
            </Link>
          </Button>
        </div>
      </section>

      {/* Die vier Zahlen, wegen derer jemand dieses Dashboard öffnet. Sie
          stehen vor dem Profil, nicht darunter. */}
      <DecisionRow locale={locale} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel ticked className="lg:col-span-3">
          <PanelHeader
            title={t('body.index')}
            subtitle={mode === 'population' ? t('radar.modePopulation') : t('radar.modePersonalBest')}
            action={
              <SegmentedControl<ScoreMode>
                label={t('radar.title')}
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'personal_best', label: t('radar.personalBest'), hint: t('radar.modeHintPersonalBest') },
                  { value: 'population', label: t('radar.population'), hint: t('radar.modeHintPopulation') },
                ]}
              />
            }
          />
          <div className="bg-display px-3 pt-3 text-white/90">
            <BodyHero axes={current} mode={mode} locale={locale} index={index} />
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title={t('dashboard.keyData')}
            subtitle={t('dashboard.strongestIs', {
              dimension: strongest ? t(`dimensions.${strongest.dimension}`) : '—',
            })}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/profil">{t('actions.edit')}</Link>
              </Button>
            }
          />
          <KeyMetrics athlete={athlete} nextDueIso={nextDue} locale={locale} />
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHeader
            title={t('radar.title')}
            subtitle={t('radar.subtitle', {
              mode: mode === 'population' ? t('radar.modePopulation') : t('radar.modePersonalBest'),
            })}
            action={
              <span className="label-tag">
                {weakest ? t(`dimensions.${weakest.dimension}`) : ''}
              </span>
            }
          />
          <RadarProfile axes={current} previousAxes={previous} mode={mode} locale={locale} />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title={t('dashboard.breakdown')} />
          <DimensionBreakdown current={current} previous={previous} locale={locale} />
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHeader
            title={t('dashboard.recentTests')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/verlauf">{t('actions.seeAll')}</Link>
              </Button>
            }
          />
          <RecentTests tests={summaries.slice(0, 8)} locale={locale} />
        </Panel>

        {trend && (
          <Panel className="lg:col-span-2">
            <PanelHeader
              title={t('dashboard.trend')}
              subtitle={`${trend.test.name[locale]} · ${trend.test.primaryUnit}`}
            />
            <div className="px-2 py-3">
              <TrendChart
                points={trend.points}
                unit={trend.test.primaryUnit === 's' ? 's' : trend.test.primaryUnit}
                locale={locale}
                label={trend.test.name[locale]}
              />
            </div>
          </Panel>
        )}
      </div>
    </>
  )
}
