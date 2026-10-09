import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ChevronRight, Flag, ShieldCheck } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { PhotoCard } from '@/components/ui/PhotoCard'
import { InfoNote } from '@/features/shared/InfoNote'
import { sessionName } from '@/features/plan/planText'
import { planMode } from '@/domain/planMode'
import { missedOccurrences, occurrences, openOccurrencesOn } from '@/domain/trainingBlock'
import { intentImage, sessionImage } from '@/data/visuals'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { CheckInPanel } from './CheckInPanel'
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
 * was zu trainieren ist. Oben steht die Einheit des Tages aus dem aktiven
 * Block als Fotokarte («Los geht’s» → Player), darunter eine kurze Zeitleiste
 * (verpasst, als Nächstes, Wettkampf); Erklärungen liegen hinter einem ⓘ.
 * Ohne Messung zeigt die Seite den Einstieg der
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
  const { data, workouts, trainingBlocks } = useAppData()
  const today = useMemo(() => athleteToday({ profile: data.profile, results: data.results, workouts }), [data.profile, data.results, workouts])
  const discipline = disciplineById(data.profile.disciplineId)
  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'morning' : hour < 18 ? 'day' : 'evening'
  const name = data.profile.firstName || ''
  const nextTest = today.nextTest ? getTest(today.nextTest.slug) : null
  const testName = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug

  // Der Plan des Tages (aktiver Block): heute offen, zuletzt verpasst, als Nächstes.
  const day = new Date().toISOString().slice(0, 10)
  const block = planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off' ? null : trainingBlocks.find((b) => b.status === 'active') ?? null
  const plan = useMemo(() => {
    if (!block) return null
    const open = openOccurrencesOn(block, day)[0] ?? null
    const missed = missedOccurrences(block, day).at(-1) ?? null
    const upcoming = occurrences(block).find((o) => !o.done && o.date > day) ?? null
    return { open, missed, upcoming }
  }, [block, day])
  const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
  const row = 'flex min-h-13 items-center gap-3 py-2'

  return (
    <div data-testid="athlete-today">
      <header className="mb-4">
        <p className="label-tag">{pick(discipline?.name, locale) ?? t('athleteToday.eyebrow')}</p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-bold sm:text-[36px]">{t(`athleteToday.greeting.${greeting}`, { name: name ? `, ${name}` : '' })}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
          <span className={cn('inline-flex items-center gap-1.5', confidenceTone(today.confidence.level))} data-testid="today-confidence">
            <ShieldCheck size={14} aria-hidden />
            {t('athleteToday.confidence', { level: t(`performance.level.${today.confidence.level}`) })}
          </span>
          {today.coverage && <span data-testid="today-coverage">{t('athleteToday.coverage', { measured: today.coverage.measured, total: today.coverage.total })}</span>}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Startkarte: die Einheit des Tages als Bild, ein Knopf. */}
        <div data-testid="today-session" className="lg:col-span-2">
          {plan?.open ? (
            <PhotoCard image={sessionImage(plan.open.session)} className="min-h-[250px] p-4" data-testid="today-start">
              <span className="label-tag">
                {t('look.today.label')}
                {plan.open.session.plannedDurationMin != null && ` · ${t('athleteToday.session.minutes', { minutes: plan.open.session.plannedDurationMin })}`}
              </span>
              <span className="mt-1 font-display text-[34px] leading-none font-bold">{sessionName(plan.open.session, t)}</span>
              <span className="mt-1 text-[13px] text-[#B9CCC7]">{t(`plan.intent.${plan.open.session.primaryIntent}`)}</span>
              <Link to="/plan/heute" data-testid="today-go" className="mt-3 flex min-h-12 items-center justify-center rounded-pill bg-[#F4FBF8] text-[15px] font-semibold text-[#101A18]">
                {t('look.today.go')}
              </Link>
            </PhotoCard>
          ) : today.workoutToday ? (
            <PhotoCard image={intentImage(null)} className="min-h-[180px] p-4">
              <span className="label-tag">{t('athleteToday.session.title')}</span>
              <span className="mt-1 font-display text-[28px] leading-none font-bold">{today.workoutToday.title || t('athleteToday.session.untitled')}</span>
              {today.workoutToday.durationMin != null && <span className="mt-1 text-[13px] text-[#B9CCC7]">{t('athleteToday.session.minutes', { minutes: today.workoutToday.durationMin })}</span>}
              <Link to="/training" className="mt-3 flex min-h-12 items-center justify-center rounded-pill bg-[#F4FBF8] text-[15px] font-semibold text-[#101A18]">
                {t('athleteToday.session.open')}
              </Link>
            </PhotoCard>
          ) : (
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="label-tag">{t('athleteToday.session.title')}</p>
                  <p className="mt-0.5 text-[14px] text-ink-secondary">{t('athleteToday.session.none')}</p>
                </div>
                <Link to={block ? '/plan' : '/training'} className="inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text">
                  {block ? t('look.today.toPlan') : t('athleteToday.session.add')} <ChevronRight size={15} aria-hidden />
                </Link>
              </div>
            </Panel>
          )}
        </div>

        {/* Zeitleiste: verpasst, als Nächstes, Wettkampf. */}
        <Panel data-testid="today-timeline" className="lg:col-span-2">
          <ul className="divide-y divide-line px-4">
            {plan?.missed && (
              <li>
                <Link to="/plan/kalender" className={row} data-testid="tl-missed">
                  <span className="readout w-16 shrink-0 whitespace-nowrap text-[12px] text-ink-secondary">{shortDay(plan.missed.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-warning">{sessionName(plan.missed.session, t)}</span>
                    <span className="block text-[12px] text-ink-secondary">{t('look.today.missed')}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden className="text-ink-muted" />
                </Link>
              </li>
            )}
            {plan?.upcoming && (
              <li>
                <Link to="/plan/kalender" className={row} data-testid="tl-next">
                  <span className="readout w-16 shrink-0 whitespace-nowrap text-[12px] text-ink-secondary">{shortDay(plan.upcoming.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{sessionName(plan.upcoming.session, t)}</span>
                    <span className="block text-[12px] text-ink-secondary">
                      {t(`plan.intent.${plan.upcoming.session.primaryIntent}`)}
                      {plan.upcoming.session.plannedDurationMin != null && ` · ${t('athleteToday.session.minutes', { minutes: plan.upcoming.session.plannedDurationMin })}`}
                    </span>
                  </span>
                  <ChevronRight size={16} aria-hidden className="text-ink-muted" />
                </Link>
              </li>
            )}
            <li>
              <Link to="/profil" className={row} data-testid="today-event">
                <span className="readout w-16 shrink-0 whitespace-nowrap text-[12px] text-ink-secondary">{today.event ? shortDay(today.event.on) : <Flag size={15} aria-hidden />}</span>
                <span className="min-w-0 flex-1">
                  {today.event ? (
                    <>
                      <span className="block truncate text-[14px]">{today.event.name || t('athleteToday.event.unnamed')}</span>
                      <span className="block text-[12px] text-ink-secondary">
                        {t('athleteToday.event.title')} · {t('athleteToday.event.days', { count: today.event.daysLeft })} · {formatDate(`${today.event.on}T12:00:00Z`, locale)}
                      </span>
                    </>
                  ) : (
                    <span className="block text-[14px] text-ink-secondary">{t('athleteToday.event.set')}</span>
                  )}
                </span>
                <ChevronRight size={16} aria-hidden className="text-ink-muted" />
              </Link>
            </li>
          </ul>
        </Panel>

        <Panel float data-testid="today-changes" className="lg:col-span-2">
          <PanelHeader
            title={t('athleteToday.changes.title')}
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
                const Icon = v === 'better' ? ArrowUp : v === 'worse' ? ArrowDown : null
                const tone = v === 'better' ? 'text-accent-text' : v === 'worse' ? 'text-critical' : 'text-ink-secondary'
                return (
                  <li key={c.slug} className="bg-surface px-4 py-3" data-testid={`change-${c.slug}`}>
                    <p className="truncate text-[12px] text-ink-secondary">{testName(c.slug)}</p>
                    <p className={cn('mt-1 flex items-center gap-1.5 readout text-[22px] font-light', tone)}>
                      {Icon && <Icon size={18} aria-hidden />}
                      {c.report.changePercent != null ? `${c.report.changePercent > 0 ? '+' : ''}${formatNumber(c.report.changePercent, locale, 1)} %` : '–'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{t(`athleteToday.changes.verdict.${v}`)}</p>
                  </li>
                )
              })}
            </ul>
          )}
          <InfoNote text={t('athleteToday.changes.sub')} className="px-4 pb-2" />
        </Panel>

        <ImageCard image={testImageUrl(today.nextTest?.slug ?? 'countermovement_jump')} data-testid="today-gap" className="lg:col-span-2">
          <div className="px-4 py-4">
            <p className="label-tag">{t('athleteToday.gap.title')}</p>
            {today.gap ? (
              <>
                <p className="mt-1 font-display text-[26px] leading-tight font-bold">{axisLabel(today.gap.axisId, t, locale)}</p>
                <p className="mt-0.5 text-[13px] text-ink-secondary">{t('look.today.percentile', { score: Math.round(today.gap.score ?? 0) })}</p>
                <InfoNote text={t('athleteToday.gap.body', { score: Math.round(today.gap.score ?? 0) })} />
              </>
            ) : (
              <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-ink-secondary">{t('athleteToday.gap.none')}</p>
            )}
            <Link to="/performance" className="inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text">
              {t('athleteToday.gap.open')} <ChevronRight size={15} aria-hidden />
            </Link>
          </div>
        </ImageCard>

        <ImageCard image={today.nextTest ? testImageUrl(today.nextTest.slug) : null} data-testid="today-next">
          <div className="px-4 py-4">
            <p className="label-tag">{t('athleteToday.next.title')}</p>
            {nextTest && today.nextTest ? (
              <>
                <p className="mt-1 font-display text-[22px] leading-tight font-bold">{pick(nextTest.name, locale)}</p>
                <p className="mt-1 max-w-[34ch] text-[12px] text-ink-secondary">{t(`overview.reasons.${today.nextTest.reasons[0] ?? 'core'}`)}</p>
                <Link to={`/tests/${today.nextTest.slug}`} className="mt-1 inline-flex min-h-11 items-center gap-1 text-[13px] text-accent-text">
                  {t('athleteToday.next.open')} <ChevronRight size={15} aria-hidden />
                </Link>
              </>
            ) : (
              <p className="mt-1 text-[14px] text-ink-secondary">{t('athleteToday.next.none')}</p>
            )}
          </div>
        </ImageCard>

        <CheckInPanel />

        <Link to="/woche" data-testid="today-week-link" className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-line px-4 text-[14px] hover:bg-surface-sunken lg:col-span-2">
          <span>{t('athleteToday.week.link')}</span>
          <ChevronRight size={16} aria-hidden className="text-ink-muted" />
        </Link>
      </div>
    </div>
  )
}
