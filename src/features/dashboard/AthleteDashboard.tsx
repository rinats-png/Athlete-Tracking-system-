import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { TrendChart } from '@/components/charts/TrendChart'
import { BodyHero } from './BodyHero'
import { KeyMetrics } from './KeyMetrics'
import { BottomNav } from './BottomNav'
import { DimensionBreakdown } from './DimensionBreakdown'
import { RecentTests } from './RecentTests'
import { AppHeader } from './AppHeader'
import { formatDate, formatRelativeMonths } from '@/lib/format'
import { addMonths } from 'date-fns'
import {
  DEMO_ASSESSMENT_DATES,
  DEMO_ATHLETE,
  DEMO_RADAR,
  getDemoTests,
  DEMO_TREND,
} from '@/data/demo'
import type { AppLocale, ScoreMode } from '@/types/domain'

/** Empfohlener Abstand zwischen zwei Diagnostikterminen. */
const RETEST_INTERVAL_MONTHS = 4

export function AthleteDashboard({ demo }: { demo: boolean }) {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const [mode, setMode] = useState<ScoreMode>('population')

  const athlete = DEMO_ATHLETE
  const profile = DEMO_RADAR[mode]

  const { strongest, weakest } = useMemo(() => {
    const scored = profile.current.filter((axis) => axis.score != null)
    if (scored.length === 0) return { strongest: null, weakest: null }
    const sorted = [...scored].sort((a, b) => (b.score as number) - (a.score as number))
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
  }, [profile])

  const nextDue = athlete.lastAssessmentOn
    ? addMonths(new Date(athlete.lastAssessmentOn), RETEST_INTERVAL_MONTHS).toISOString()
    : null


  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader demo={demo} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
        {/* Identität des Athleten und die beiden Hauptaktionen. */}
        <section className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="label-tag">{t('dashboard.greeting')}</span>
            <h1 className="mt-1 font-display text-[30px] leading-none font-bold tracking-[0.01em] sm:text-[38px]">
              {athlete.firstName} {athlete.lastName}
            </h1>
            <p className="mt-1.5 text-[13px] text-ink-secondary">
              {t('dashboard.lastAssessment')}:{' '}
              <span className="readout">{formatDate(athlete.lastAssessmentOn, locale)}</span>
              <span className="text-ink-muted">
                {' '}
                ({formatRelativeMonths(athlete.lastAssessmentOn, locale)})
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="md">
              <Play size={14} strokeWidth={2.5} aria-hidden />
              {t('actions.startTest')}
            </Button>
            <Button variant="outline" size="md">
              <FileText size={14} strokeWidth={2} aria-hidden />
              {t('actions.exportReport')}
            </Button>
          </div>
        </section>

        {demo && (
          <p className="mb-4 border-l-2 border-accent bg-accent-quiet px-3 py-2 text-[12px] text-ink-secondary">
            {t('dashboard.demoNotice')}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          {/* Der Körper als Einstieg: zeigt vor jeder Zahl, wo die Reserve
              liegt. Die Stammdaten stehen daneben, nicht darunter — auf dem
              Desktop bleibt so alles Wesentliche über der Falz. */}
          <Panel ticked className="lg:col-span-3">
            <PanelHeader
              title={t('body.index')}
              subtitle={
                mode === 'population'
                  ? t('radar.modePopulation')
                  : t('radar.modePersonalBest')
              }
              action={
                <SegmentedControl<ScoreMode>
                  label={t('radar.title')}
                  value={mode}
                  onChange={setMode}
                  options={[
                    {
                      value: 'personal_best',
                      label: t('radar.personalBest'),
                      hint: t('radar.modeHintPersonalBest'),
                    },
                    {
                      value: 'population',
                      label: t('radar.population'),
                      hint: t('radar.modeHintPopulation'),
                    },
                  ]}
                />
              }
            />
            <div className="px-3 pt-3">
              <BodyHero axes={profile.current} mode={mode} locale={locale} />
            </div>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader
              title={t('dashboard.keyData')}
              subtitle={t('dashboard.strongestIs', {
                dimension: strongest ? t(`dimensions.${strongest.dimension}`) : '—',
              })}
            />
            <KeyMetrics athlete={athlete} nextDueIso={nextDue} locale={locale} />
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">

          {/* Radar — das Herzstück, bekommt die grösste Fläche. */}
          <Panel ticked className="lg:col-span-3">
            <PanelHeader
              title={t('radar.title')}
              subtitle={t('radar.subtitle', {
                mode:
                  mode === 'population'
                    ? t('radar.modePopulation')
                    : t('radar.modePersonalBest'),
              })}
              action={
                <span className="label-tag">
                  {weakest ? t(`dimensions.${weakest.dimension}`) : ''}
                </span>
              }
            />
            <RadarProfile
              axes={profile.current}
              previousAxes={profile.previous}
              previousLabel={`${t('radar.previous')} · ${formatDate(
                DEMO_ASSESSMENT_DATES.previous,
                locale,
              )}`}
              mode={mode}
              locale={locale}
            />
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader
              title={t('dashboard.breakdown')}
              subtitle={
                mode === 'population'
                  ? t('radar.axisUnitPopulation')
                  : t('radar.axisUnitPersonalBest')
              }
            />
            <DimensionBreakdown
              current={profile.current}
              previous={profile.previous}
              locale={locale}
            />
          </Panel>

          <Panel className="lg:col-span-3">
            <PanelHeader
              title={t('dashboard.recentTests')}
              action={
                <Button variant="ghost" size="sm">
                  {t('actions.seeAll')}
                </Button>
              }
            />
            <RecentTests tests={getDemoTests(locale)} locale={locale} />
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader title={t('dashboard.trend')} subtitle="Cooper-Test · m" />
            <div className="px-2 py-3">
              <TrendChart
                points={DEMO_TREND.cooper_12min}
                unit="m"
                locale={locale}
                label="Cooper-Test"
              />
            </div>
          </Panel>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
