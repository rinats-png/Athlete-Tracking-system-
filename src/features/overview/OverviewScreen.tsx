import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { SportArt } from '@/components/signature/SportArt'
import { RatingWord } from '@/features/shared/RatingScale'
import { TestCard } from '@/features/shared/TestCard'
import { useLocale } from '@/features/shared/useLocale'
import { ratingContextOf, reminderSettingsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'
import { axisLabel, axisById } from '@/data/profileAxes'
import { getTest } from '@/data/testCatalog'
import { radarProfile } from '@/lib/scoring'
import { limiters, strengths } from '@/domain/insights'
import { nextTests } from '@/domain/nextTest'
import { overdueTests } from '@/domain/reminders'
import { ratingFromPercentile } from '@/domain/rating'
import { buildDiagnosticProfile } from '@/domain/diagnosticProfile'
import { formatDate, formatNumber } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { cn } from '@/lib/utils'
import { ScoreSummary } from '@/features/shared/ScoreSummary'
import { PerformanceOrb } from '@/components/signature/PerformanceOrb'
import { ValueCard } from '@/components/signature/ValueCard'
import { NextTestCard } from '@/components/signature/NextTestCard'
import { performanceScore } from '@/domain/performanceScore'

/**
 * Die Übersicht (Konzept §6): nur das Wichtigste.
 *
 *   Performance-Profil der Hauptsportart
 *   Stärken · grösstes Potenzial
 *   nächster empfohlener Test — mit dem Grund
 *   letzte Ergebnisse
 *
 * Alles hier ist eine Zusammenfassung; jede Zahl führt dorthin, wo sie
 * herkommt. Die Achsenwerte sind normalisierte Darstellungen (0–100), keine
 * Messwerte — der Messwert bleibt in der Ergebnisliste und im Verlauf
 * sichtbar (§20).
 */
export function OverviewScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const profile = data.profile
  const discipline = disciplineById(profile.disciplineId)
  const context = ratingContextOf(profile)
  const reminders = reminderSettingsOf(profile)

  const axes = useMemo(
    () => radarProfile(data.results, 'population', new Date(), profile.disciplineId),
    [data.results, profile.disciplineId],
  )
  const strong = useMemo(() => strengths(axes, data.results), [axes, data.results])
  const weak = useMemo(() => limiters(axes, data.results), [axes, data.results])
  const suggestions = useMemo(
    () =>
      nextTests({
        disciplineId: profile.disciplineId,
        additionalDisciplineIds: profile.additionalDisciplineIds,
        goalKey: profile.goalKey,
        sex: profile.sex,
        birthDate: profile.birthDate,
        reminderIntervalDays: profile.reminderIntervalDays,
        results: data.results,
      }),
    [profile, data.results],
  )
  const overdue = useMemo(() => overdueTests(data.results, reminders), [data.results, reminders])
  const next = suggestions[0] ?? null
  const nextTest = next ? getTest(next.slug) : null

  // Grösstes Potenzial: eine auffällig schwache Achse, sonst eine leere,
  // sonst die niedrigste. Stärken: die auffälligen, sonst die zwei besten.
  const lowest = [...axes].filter((a) => a.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] ?? null
  const potential = weak[0] ?? axes.find((a) => !a.hasData) ?? lowest
  const shownStrengths =
    strong.length > 0
      ? strong.slice(0, 3)
      : [...axes]
          .filter((a) => a.score != null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 2)
          .map((a) => ({ axisId: a.axisId, score: a.score as number }))
  const score = useMemo(() => performanceScore(axes), [axes])
  /**
   * Die drei Achsen für die Wertkarten: belegte zuerst, stärkste oben.
   * Eine unbelegte Achse steht nur dann in der Reihe, wenn es nicht genug
   * belegte gibt — und sie sagt dann auch, dass sie unbelegt ist.
   */
  const topAxes = useMemo(
    () =>
      [...axes]
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
        .slice(0, 3),
    [axes],
  )
  const latestResults = data.results.filter((r) => r.score != null).slice(0, 5)
  const name = profile.firstName || (discipline?.name[locale] ?? t('overview.noSport'))

  if (data.results.length === 0) {
    const plan = buildDiagnosticProfile({
      disciplineId: profile.disciplineId,
      sex: profile.sex,
      birthDate: profile.birthDate,
      results: data.results,
    })
    return (
      <>
        <ScreenHeader eyebrow={t('overview.eyebrow')} title={discipline?.name[locale] ?? t('overview.title')} intro={t('overview.emptyBody')} />
        <h2 className="label-tag mb-2">{t('overview.startTests')}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {plan.recommendedStart.map((entry) => (
            <TestCard key={entry.slug} slug={entry.slug} results={data.results} context={context} reminders={reminders} />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        eyebrow={t('overview.eyebrow')}
        title={name}
        intro={discipline ? discipline.name[locale] : undefined}
        art={
          discipline && (
            <SportArt
              disciplineId={discipline.id}
              categoryId={discipline.categoryId}
              className="float size-16 shrink-0 rounded-[var(--radius-md)]"
            />
          )
        }
        action={
          nextTest && (
            <Button asChild variant="primary">
              <Link to={`/tests/${nextTest.slug}`}>
                <Play size={14} strokeWidth={2.5} aria-hidden />
                {t('overview.testNow')}
              </Link>
            </Button>
          )
        }
      />

      {overdue.length > 0 && (
        <Link to="/verlauf/erinnerungen" className="mb-4 flex min-h-12 items-center justify-between gap-3 border border-warning/60 bg-warning/10 px-4 py-2 text-[13px]">
          <span>{t('overview.overdue', { count: overdue.length })}</span>
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}

      {/*
       * Das Leistungsprofil als Orb — das Signature-Element. Darunter die
       * drei bestbelegten Achsen als versetzte Wertkarten: die Versetzung
       * ist kontrolliert (feste Offsets), nicht zufällig, damit die Gruppe
       * lebendig wirkt und trotzdem lesbar bleibt.
       */}
      <section className="rise mb-4">
        <PerformanceOrb axes={axes} score={score} />

        <ul className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {topAxes.map((axis, i) => (
            <li key={axis.axisId} style={{ marginTop: [4, 22, 0][i] ?? 0 }}>
              <ValueCard
                className="rise"
                style={{ ['--rise-delay' as string]: `${150 + i * 90}ms` }}
                label={axisLabel(axis.axisId, t, locale)}
                value={axis.score == null ? '—' : formatNumber(axis.score, locale, 0)}
                delta={axis.score == null ? t('overview.axisNoRatingShort') : undefined}
              />
            </li>
          ))}
        </ul>

        <ScoreSummary score={score} axes={axes} />
      </section>

      {next && nextTest && (
        <NextTestCard
          className="rise mb-4"
          style={{ ['--rise-delay' as string]: '420ms' }}
          title={nextTest.name[locale]}
          reasons={next.reasons.slice(0, 2).map((r) => t(`overview.reasons.${r}`))}
          to={`/tests/${nextTest.slug}`}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-4">
          <Panel>
            <PanelHeader title={t('overview.strengths')} />
            {shownStrengths.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-ink-secondary">{t('overview.noStrengths')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {shownStrengths.map((finding) => (
                  <li key={finding.axisId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[14px] font-medium">{axisLabel(finding.axisId, t, locale)}</span>
                    <RatingWord level={ratingFromPercentile(finding.score)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t('overview.potential')} />
            <div className="px-4 py-3">
              {potential ? (
                <>
                  <p className="font-display text-[22px] leading-none font-bold">
                    {axisLabel(potential.axisId, t, locale)}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-secondary">
                    {'hasData' in potential && !potential.hasData ? t('overview.potentialUnmeasured') : t('overview.potentialBody')}
                  </p>
                  {axisById(potential.axisId) && (
                    <p className="mt-1 text-[12px] text-ink-muted">{axisById(potential.axisId)!.meaning[locale]}</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-ink-secondary">{t('overview.axisUnmeasured')}</p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/analyse">
                  {t('overview.openAnalysis')}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </Button>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title={t('overview.recent')}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/verlauf/werte">{t('overview.seeAll')}</Link>
              </Button>
            }
          />
          <ul className="divide-y divide-line">
            {latestResults.map((result) => {
              const test = getTest(result.testSlug)
              if (!test) return null
              return (
                <li key={result.id}>
                  <Link to={`/ergebnis/${result.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent-quiet">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{test.name[locale]}</span>
                      <span className="block text-[11px] text-ink-muted">{formatDate(result.performedAt, locale)}</span>
                    </span>
                    <span className={cn('readout shrink-0 text-[16px]')}>{formatResultValue(result, locale)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
