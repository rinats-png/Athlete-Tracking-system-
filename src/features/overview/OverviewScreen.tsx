import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Play } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
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

      <div className="grid gap-4 md:grid-cols-2">
        <Panel ticked>
          <PanelHeader title={t('overview.profileTitle')} subtitle={t('overview.profileHint')} />
          <ul className="divide-y divide-line">
            {axes.map((axis) => (
              <li key={axis.axisId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-2/5 min-w-0 truncate text-[13px]">{axisLabel(axis.axisId, t, locale)}</span>
                <div className="h-1.5 flex-1 bg-surface-sunken">
                  {axis.score != null && <div className="h-full bg-accent" style={{ width: `${axis.score}%` }} />}
                </div>
                <span className="readout w-10 text-right text-[15px]">
                  {axis.score != null ? formatNumber(axis.score, locale, 0) : '—'}
                </span>
              </li>
            ))}
          </ul>
          {axes.some((a) => a.hasData && a.score == null) && (
            <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('overview.axisNoRating')}</p>
          )}
        </Panel>

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

        {next && nextTest && (
          <Panel ticked>
            <PanelHeader title={t('overview.nextTest')} />
            <div className="px-4 py-3">
              <p className="font-display text-[22px] leading-none font-bold">{nextTest.name[locale]}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                <dt className="text-ink-muted">{t('overview.lastResult')}</dt>
                <dd className="readout text-right">
                  {(() => {
                    const last = data.results.find((r) => r.testSlug === next.slug && r.score != null)
                    return last ? formatResultValue(last, locale) : '—'
                  })()}
                </dd>
                <dt className="text-ink-muted">{t('overview.lastTested')}</dt>
                <dd className="text-right">
                  {next.daysSince == null ? t('overview.neverTested') : t('overview.daysAgo', { count: next.daysSince })}
                </dd>
              </dl>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
                <span className="label-tag mr-1.5">{t('overview.why')}</span>
                {next.reasons.slice(0, 2).map((r) => t(`overview.reasons.${r}`)).join(' ')}
              </p>
              <Button asChild variant="primary" size="sm" className="mt-3">
                <Link to={`/tests/${nextTest.slug}`}>
                  <Play size={13} strokeWidth={2.5} aria-hidden />
                  {t('overview.testNow')}
                </Link>
              </Button>
            </div>
          </Panel>
        )}

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
