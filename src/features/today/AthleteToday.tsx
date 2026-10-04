import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ChevronRight, Minus, ShieldCheck } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { DiaryTodayCard } from '@/features/overview/DiaryTodayCard'
import { athleteToday, type ConfidenceLevel } from '@/domain/performanceView'
import { axisLabel } from '@/data/profileAxes'
import { disciplineById } from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { testImageUrl } from '@/data/testImages'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Heute — die Startseite des Athleten (Produktdoktrin §7).
 *
 * Wenige, belegte Aussagen: was sich über der Messschwankung verändert hat,
 * die größte messbare Lücke im vorhandenen Profil, die heutige Einheit, der
 * nächste Test, der Wettkampf. Jede Karte nennt ihre Grundlage; keine sagt,
 * was zu trainieren ist. Ohne Messung zeigt die Seite den Einstieg der
 * bisherigen Übersicht, der Schritt für Schritt zur ersten Messung führt.
 */
export function AthleteToday() {
  const { data } = useAppData()
  if (!data.results.some((r) => r.score != null)) return <OverviewScreen />
  return <TodayWithData />
}

export function confidenceTone(level: ConfidenceLevel): string {
  return level === 'HIGH' ? 'text-accent-text' : level === 'MODERATE' ? 'text-ink' : 'text-ink-secondary'
}

function TodayWithData() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, workouts } = useAppData()
  const today = useMemo(() => athleteToday({ profile: data.profile, results: data.results, workouts }), [data.profile, data.results, workouts])
  const discipline = disciplineById(data.profile.disciplineId)
  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'morning' : hour < 18 ? 'day' : 'evening'
  const name = data.profile.firstName || ''
  const nextTest = today.nextTest ? getTest(today.nextTest.slug) : null
  const testName = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug

  return (
    <div data-testid="athlete-today">
      <header className="mb-4">
        <p className="label-tag">{pick(discipline?.name, locale) ?? t('athleteToday.eyebrow')}</p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-bold sm:text-[36px]">{t(`athleteToday.greeting.${greeting}`, { name: name ? `, ${name}` : '' })}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-secondary">
          <span className={cn('inline-flex items-center gap-1.5', confidenceTone(today.confidence.level))} data-testid="today-confidence">
            <ShieldCheck size={15} aria-hidden />
            {t('athleteToday.confidence', { level: t(`performance.level.${today.confidence.level}`) })}
          </span>
          {today.coverage && <span data-testid="today-coverage">{t('athleteToday.coverage', { measured: today.coverage.measured, total: today.coverage.total })}</span>}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel float data-testid="today-changes" className="lg:col-span-2">
          <PanelHeader
            title={t('athleteToday.changes.title')}
            subtitle={t('athleteToday.changes.sub')}
            action={
              <Link to="/verlauf" className="inline-flex min-h-11 min-w-11 items-center justify-end text-[12px] text-accent-text underline underline-offset-2">
                {t('athleteToday.changes.all')}
              </Link>
            }
          />
          {today.changes.length === 0 ? (
            <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('athleteToday.changes.none')}</p>
          ) : (
            <ul className="grid gap-px bg-line sm:grid-cols-3">
              {today.changes.map((c) => {
                const v = c.report.verdict
                const Icon = v === 'better' ? ArrowUp : v === 'worse' ? ArrowDown : Minus
                const tone = v === 'better' ? 'text-accent-text' : v === 'worse' ? 'text-critical' : 'text-ink-muted'
                return (
                  <li key={c.slug} className="bg-surface px-4 py-3" data-testid={`change-${c.slug}`}>
                    <p className="truncate text-[12px] text-ink-secondary">{testName(c.slug)}</p>
                    <p className={cn('mt-1 flex items-center gap-1.5 readout text-[22px] font-light', tone)}>
                      <Icon size={18} aria-hidden />
                      {c.report.changePercent != null && (v === 'better' || v === 'worse') ? `${c.report.changePercent > 0 ? '+' : ''}${formatNumber(c.report.changePercent, locale, 1)} %` : '–'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{t(`athleteToday.changes.verdict.${v}`)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <ImageCard image={testImageUrl(today.nextTest?.slug ?? 'countermovement_jump')} data-testid="today-gap" className="lg:col-span-2">
          <Link to="/performance" className="block px-4 py-4">
            <p className="label-tag">{t('athleteToday.gap.title')}</p>
            {today.gap ? (
              <>
                <p className="mt-1 font-display text-[26px] leading-tight font-bold">{axisLabel(today.gap.axisId, t, locale)}</p>
                <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-secondary">
                  {t('athleteToday.gap.body', { score: Math.round(today.gap.score ?? 0) })}
                </p>
              </>
            ) : (
              <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-ink-secondary">{t('athleteToday.gap.none')}</p>
            )}
            <span className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text">
              {t('athleteToday.gap.open')} <ChevronRight size={15} aria-hidden />
            </span>
          </Link>
        </ImageCard>

        <Panel data-testid="today-session">
          <PanelHeader title={t('athleteToday.session.title')} />
          <div className="px-4 pb-4">
            {today.workoutToday ? (
              <p className="text-[16px] font-medium">
                {today.workoutToday.title || t('athleteToday.session.untitled')}
                {today.workoutToday.durationMin != null && <span className="ml-2 text-[13px] font-normal text-ink-secondary">{t('athleteToday.session.minutes', { minutes: today.workoutToday.durationMin })}</span>}
              </p>
            ) : (
              <p className="text-[14px] text-ink-secondary">{t('athleteToday.session.none')}</p>
            )}
            <Link to="/training" className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text underline underline-offset-2">
              {today.workoutToday ? t('athleteToday.session.open') : t('athleteToday.session.add')}
            </Link>
          </div>
        </Panel>

        <DiaryTodayCard />

        <ImageCard image={today.nextTest ? testImageUrl(today.nextTest.slug) : null} data-testid="today-next">
          <div className="px-4 py-4">
            <p className="label-tag">{t('athleteToday.next.title')}</p>
            {nextTest && today.nextTest ? (
              <>
                <p className="mt-1 font-display text-[22px] leading-tight font-bold">{pick(nextTest.name, locale)}</p>
                <p className="mt-1 max-w-[34ch] text-[12px] text-ink-secondary">{t(`overview.reasons.${today.nextTest.reasons[0] ?? 'core'}`)}</p>
                <Link to={`/tests/${today.nextTest.slug}`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text underline underline-offset-2">
                  {t('athleteToday.next.open')}
                </Link>
              </>
            ) : (
              <p className="mt-1 text-[14px] text-ink-secondary">{t('athleteToday.next.none')}</p>
            )}
          </div>
        </ImageCard>

        <ImageCard image={null} data-testid="today-event">
          <div className="px-4 py-4">
            <p className="label-tag">{t('athleteToday.event.title')}</p>
            {today.event ? (
              <>
                <p className="mt-1 font-display text-[22px] leading-tight font-bold">{today.event.name || t('athleteToday.event.unnamed')}</p>
                <p className="text-[13px] text-ink-secondary">
                  {t('athleteToday.event.days', { count: today.event.daysLeft })} · {formatDate(`${today.event.on}T12:00:00Z`, locale)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[14px] text-ink-secondary">{t('athleteToday.event.none')}</p>
            )}
            <Link to="/profil" className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text underline underline-offset-2">
              {today.event ? t('athleteToday.event.open') : t('athleteToday.event.set')}
            </Link>
          </div>
        </ImageCard>
      </div>
    </div>
  )
}
