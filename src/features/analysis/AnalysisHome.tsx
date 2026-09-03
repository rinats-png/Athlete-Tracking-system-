import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Play, Users } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { RatingWord } from '@/features/shared/RatingScale'
import { BenchmarkRow } from '@/features/shared/BenchmarkRow'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf, disciplineIdsOf } from '@/features/shared/profileContext'
import { AnalysisDeepDive } from './AnalysisScreen'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { axisLabel } from '@/data/profileAxes'
import { radarProfile } from '@/lib/scoring'
import { limiters, strengths } from '@/domain/insights'
import { nextTests } from '@/domain/nextTest'
import { rateResult, ratingFromPercentile } from '@/domain/rating'
import { formatNumber } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Die Analyse (Konzept §19–§20): Stärken, Potenzial, die Empfehlung mit
 * Begründung, das Performance-Profil je Sportart und das Benchmarking.
 * Darunter die vertiefte Auswertung des bisherigen Analysebereichs —
 * Belastbarkeit, Ausgewogenheit, Terminvergleich —, die weiter gilt.
 */
export function AnalysisHome() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const profile = data.profile
  const context = ratingContextOf(profile)
  const sports = disciplineIdsOf(profile).map((id) => disciplineById(id)).filter((d): d is NonNullable<typeof d> => d != null)

  const axes = useMemo(() => radarProfile(data.results, 'population', new Date(), profile.disciplineId), [data.results, profile.disciplineId])
  const strong = useMemo(() => strengths(axes, data.results), [axes, data.results])
  const weak = useMemo(() => limiters(axes, data.results), [axes, data.results])
  const suggestion = useMemo(
    () =>
      nextTests({
        disciplineId: profile.disciplineId,
        additionalDisciplineIds: profile.additionalDisciplineIds,
        goalKey: profile.goalKey,
        sex: profile.sex,
        birthDate: profile.birthDate,
        reminderIntervalDays: profile.reminderIntervalDays,
        results: data.results,
      })[0] ?? null,
    [profile, data.results],
  )
  const suggestedTest = suggestion ? getTest(suggestion.slug) : null

  const measuredSlugs = useMemo(
    () => [...new Set(data.results.filter((r) => r.score != null).map((r) => r.testSlug))].filter((slug) => getTest(slug)),
    [data.results],
  )
  const [benchmarkSlug, setBenchmarkSlug] = useState<string | null>(null)
  const activeSlug = benchmarkSlug ?? measuredSlugs[0] ?? null
  const latest = activeSlug ? data.results.find((r) => r.testSlug === activeSlug && r.score != null) : null
  const rating = latest ? rateResult(latest, context) : null
  const comparisons = rating ? [...(rating.comparison ? [rating.comparison] : []), ...rating.alternatives] : []

  if (data.results.length === 0) {
    return (
      <EmptyState
        title={t('analysis.emptyTitle')}
        body={t('analysis.emptyBody')}
        action={
          <Button asChild variant="primary">
            <Link to="/diagnostik">{t('nav.diagnostics')}</Link>
          </Button>
        }
      />
    )
  }

  const potential = weak[0] ?? axes.find((a) => !a.hasData) ?? null
  const shownStrengths =
    strong.length > 0
      ? strong.slice(0, 3)
      : [...axes].filter((a) => a.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 2).map((a) => ({ axisId: a.axisId, score: a.score as number }))

  return (
    <>
      <ScreenHeader eyebrow={t('analysisHome.eyebrow')} title={t('analysisHome.title')} intro={t('analysisHome.intro')} />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <PanelHeader title={t('overview.strengths')} />
          <ul className="divide-y divide-line">
            {shownStrengths.map((f) => (
              <li key={f.axisId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-[14px] font-medium">{axisLabel(f.axisId, t, locale)}</span>
                <RatingWord level={ratingFromPercentile(f.score)} />
              </li>
            ))}
            {shownStrengths.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-secondary">{t('overview.noStrengths')}</li>}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title={t('overview.potential')} />
          <div className="px-4 py-3">
            {potential ? (
              <>
                <p className="font-display text-[22px] leading-none font-bold">{axisLabel(potential.axisId, t, locale)}</p>
                <p className="mt-1.5 text-[13px] text-ink-secondary">
                  {'hasData' in potential && !potential.hasData ? t('overview.potentialUnmeasured') : t('overview.potentialBody')}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-ink-secondary">{t('insights.noFindings')}</p>
            )}
          </div>
        </Panel>
        <Panel ticked>
          <PanelHeader title={t('analysisHome.recommendation')} />
          {suggestion && suggestedTest ? (
            <div className="px-4 py-3">
              <p className="font-display text-[22px] leading-none font-bold">{suggestedTest.name[locale]}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
                <span className="label-tag mr-1.5">{t('analysisHome.reasonLabel')}</span>
                {suggestion.reasons.slice(0, 3).map((r) => t(`overview.reasons.${r}`)).join(' ')}
              </p>
              <Button asChild variant="primary" size="sm" className="mt-3">
                <Link to={`/tests/${suggestedTest.slug}`}>
                  <Play size={13} strokeWidth={2.5} aria-hidden />
                  {t('overview.testNow')}
                </Link>
              </Button>
            </div>
          ) : (
            <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('insights.nextNone')}</p>
          )}
        </Panel>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {sports.map((sport) => (
          <SportProfilePanel key={sport.id} sportId={sport.id} name={sport.name[locale]} />
        ))}
      </section>

      <Panel className="mt-4">
        <PanelHeader
          title={t('analysisHome.benchmark')}
          subtitle={t('analysisHome.benchmarkHint')}
          action={
            measuredSlugs.length > 1 ? (
              <select
                aria-label={t('analysisHome.chooseTest')}
                value={activeSlug ?? ''}
                onChange={(e) => setBenchmarkSlug(e.target.value)}
                className="h-11 max-w-[200px] border border-line bg-surface-sunken px-2 text-[16px]"
              >
                {measuredSlugs.map((slug) => (
                  <option key={slug} value={slug}>
                    {getTest(slug)!.name[locale]}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        {comparisons.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-ink-secondary">{latest ? t('result.noBenchmark') : t('analysisHome.noMeasured')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {comparisons.map((c, i) => (
              <BenchmarkRow key={i} comparison={c} />
            ))}
          </ul>
        )}
        {latest && (
          <div className="border-t border-line px-2 py-1.5">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/ergebnis/${latest.id}`}>
                {t('testInfo.seeResult')}
                <ArrowRight size={13} aria-hidden />
              </Link>
            </Button>
          </div>
        )}
      </Panel>

      <Link to="/community" className="mt-4 flex min-h-14 items-center justify-between gap-3 border border-line bg-surface px-4 py-3 hover:bg-accent-quiet">
        <span className="flex items-center gap-3">
          <Users size={18} className="text-ink-muted" aria-hidden />
          <span>
            <span className="block text-[14px] font-medium">{t('analysisHome.community')}</span>
            <span className="block text-[12px] text-ink-secondary">{t('analysisHome.communityHint')}</span>
          </span>
        </span>
        <ArrowRight size={16} className="text-ink-muted" aria-hidden />
      </Link>

      <h2 className="label-tag mt-8 mb-3">{t('analysisHome.deepDive')}</h2>
      <AnalysisDeepDive />
    </>
  )
}

/** Performance-Profil einer Sportart (Konzept §20, §27) als Zahlen und als Diagramm. */
function SportProfilePanel({ sportId, name }: { sportId: string; name: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const sport = disciplineById(sportId)
  const axes = useMemo(() => radarProfile(data.results, 'population', new Date(), sportId), [data.results, sportId])
  return (
    <Panel>
      <PanelHeader title={`${t('analysisHome.profiles')} · ${name}`} subtitle={t('analysisHome.profileNote')} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-[13px] sm:grid-cols-3">
        {axes.map((axis) => (
          <li key={axis.axisId} className="flex items-baseline justify-between gap-2 border-b border-line py-1">
            <span className="truncate">{axisLabel(axis.axisId, t, locale)}</span>
            <span className="readout shrink-0">
              {axis.score != null ? `${formatNumber(axis.score, locale, 0)} / 100` : axis.hasData ? t('overview.axisNoRating') : '—'}
            </span>
          </li>
        ))}
      </ul>
      <RadarProfile axes={axes} mode="population" locale={locale} disciplineWeights={sport?.dimensionWeights} disciplineLabel={name} />
    </Panel>
  )
}
