import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, FileText, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatTile } from '@/components/ui/StatTile'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { TrendChart } from '@/components/charts/TrendChart'
import { DimensionBreakdown } from './DimensionBreakdown'
import { RecentTests } from './RecentTests'
import { AppHeader } from './AppHeader'
import { ageFromBirthDate, formatDate, formatNumber, formatRelativeMonths } from '@/lib/format'
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

  const age = ageFromBirthDate(athlete.birthDate)
  const scoreSuffix =
    mode === 'population' ? t('units.percentile') : t('units.percentOfBest')

  return (
    <div className="min-h-dvh">
      <AppHeader demo={demo} />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
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

        {/* Kennzahlenleiste: eine Reihe Zahlen, kein Diagramm — hier ist die
            blosse Zahl die klarste Darstellung. */}
        <section className="mb-4 grid grid-cols-2 gap-px bg-line md:grid-cols-4">
          <Panel className="border-0">
            <StatTile
              label={t('dashboard.strongest')}
              value={strongest ? formatNumber(strongest.score, locale, 0) : '—'}
              unit={scoreSuffix}
              emphasis
              meta={strongest ? t(`dimensions.${strongest.dimension}`) : undefined}
            />
          </Panel>
          <Panel className="border-0">
            <StatTile
              label={t('dashboard.weakest')}
              value={weakest ? formatNumber(weakest.score, locale, 0) : '—'}
              unit={scoreSuffix}
              emphasis
              meta={weakest ? t(`dimensions.${weakest.dimension}`) : undefined}
            />
          </Panel>
          <Panel className="border-0">
            <StatTile
              label={t('dashboard.bodyWeight')}
              value={formatNumber(athlete.bodyWeightKg, locale, 1)}
              unit="kg"
              meta={`${athlete.heightCm} cm · ${age} ${t('dashboard.years')}`}
            />
          </Panel>
          <Panel className="border-0">
            <StatTile
              label={t('dashboard.nextDue')}
              value={nextDue ? formatDate(nextDue, locale) : '—'}
              meta={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={12} aria-hidden />
                  {t('dashboard.restingHr')} {athlete.restingHr} · {t('dashboard.maxHr')}{' '}
                  {athlete.maxHr}
                </span>
              }
            />
          </Panel>
        </section>

        <div className="grid gap-4 lg:grid-cols-5">
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
    </div>
  )
}
