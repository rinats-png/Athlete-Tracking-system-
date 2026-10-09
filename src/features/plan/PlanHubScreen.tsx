import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarRange, Check, ClipboardList, Flag, Library, MessageSquareText, Play, Timer } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { planAssignEnabled } from '@/lib/planAssign'
import { PlanOffersPanel } from '@/features/plan/PlanOffersPanel'
import { addDays, blockEndDay, blockWeek, mondayOf, occurrences, openSessionsOn, sessionInWeek, weekChecks } from '@/domain/trainingBlock'
import { PhotoCard, Segments } from '@/components/ui/PhotoCard'
import { HUB_IMAGES, intentImage, sessionImage } from '@/data/visuals'
import { sessionName } from '@/features/plan/planText'
import { daysTo } from '@/domain/weeklyPlan'
import { TRAINING_RULES } from '@/data/trainingRules'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Training-Hub (Tab «Plan»): in drei Sekunden erkennen, was heute dran ist,
 * wo man im Block steht und worauf er zielt. Der Plan als Bildkarte, die
 * Woche als Liste mit Bildern, die Begründung aufklappbar, vier Wege als
 * Bildkacheln.
 */
const chipDark = 'inline-flex min-h-6 items-center gap-1 rounded-pill bg-white/12 px-2.5 py-0.5 text-[11px] text-[#DCE7E4]'
const chip = 'inline-flex min-h-6 items-center gap-1 rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-ink-secondary'

export function PlanHubScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, trainingBlocks, role } = useAppData()
  const mode = planMode(import.meta.env?.VITE_TRAINING_PLAN)
  const today = new Date().toISOString().slice(0, 10)
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null

  const view = useMemo(() => {
    if (!block) return null
    const week = blockWeek(block, today)
    const checks = weekChecks(block, today)
    const current = typeof week === 'number' ? checks.find((c) => c.week === week) ?? { week, planned: block.sessions.filter((s) => !s.removed && sessionInWeek(s, week, block.weeks)).length, done: 0 } : null
    const open = openSessionsOn(block, today)
    const intents = [...new Set(block.sessions.filter((s) => !s.removed).map((s) => s.primaryIntent))]
    const strengths = [...new Set(block.sessions.filter((s) => !s.removed).map((s) => s.evidenceStrength).filter((x): x is NonNullable<typeof x> => x != null))]
    const unreviewed = block.sessions.some((s) => s.kind === 'open' || TRAINING_RULES.find((r) => r.id === s.ruleId)?.review.state !== 'reviewed')
    const monday = mondayOf(today)
    const sunday = addDays(monday, 6)
    const week7 = occurrences(block).filter((o) => o.date >= monday && o.date <= sunday).sort((a, b) => a.date.localeCompare(b.date))
    const first = block.sessions.find((s) => !s.removed)
    const image = first ? sessionImage(first) : intentImage(null)
    return { week, current, open, intents, strengths, unreviewed, week7, image, endsIn: daysTo(blockEndDay(block), new Date()) }
  }, [block, today])

  if (mode === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const competition = data.profile.competition
  const toGo = competition ? daysTo(competition.on, new Date()) : null
  const intentText = (list: string[]) => list.map((i) => t(`plan.intent.${i}`)).join(' · ')
  const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  const retestName = block?.retestMetrics[0] ? pick(getTest(block.retestMetrics[0])?.name, locale) ?? block.retestMetrics[0] : null

  const tile = 'min-h-[110px] p-3'
  return (
    <div data-testid="plan-hub">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('planHub.title')} intro={competition ? t('planHub.competition', { name: competition.name || t('planHub.competitionUnnamed') }) : undefined} />

      <PlanOffersPanel />

      {/* Immer da: Training starten — aus dem Plan (auch an einem anderen Tag) oder frei. */}
      <Link to="/plan/start" data-testid="hub-start-training" className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded-pill bg-accent px-5 text-[15px] font-semibold text-accent-ink">
        <Play size={16} aria-hidden /> {t('start.button')}
      </Link>

      {!block || !view ? (
        <Panel className="mb-4" data-testid="hub-empty">
          <div className="space-y-3 px-4 py-4">
            <h2 className="font-display text-[20px] font-bold">{t('planHub.empty.title')}</h2>
            <p className="text-[14px] text-ink-secondary">{t('planHub.empty.body')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/plan/programme" data-testid="hub-ready" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
                {t('planHub.empty.ready')}
              </Link>
              <Link to="/plan/waehlen" data-testid="hub-choose" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">
                {t('planHub.empty.otherWays')}
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          {/* Der laufende Plan als Bild: Woche, Fortschritt, Termine. */}
          <PhotoCard image={view.image} className="mb-4 min-h-[180px] gap-1 p-4" data-testid="hub-block">
            <span className="label-tag" data-testid="hub-week">
              {typeof view.week === 'number' ? t('planHub.weekOf', { week: view.week, weeks: block.weeks, phase: t(`plan.phase.${block.phase}`) }) : view.week === 'before' ? t('planHub.notStarted') : t('planHub.over')}
            </span>
            <h2 className="font-display text-[26px] leading-tight font-bold">{intentText(view.intents.slice(0, 2))}</h2>
            <Segments total={block.weeks} done={typeof view.week === 'number' ? view.week - 1 : view.week === 'after' ? block.weeks : 0} current={typeof view.week === 'number' ? view.week - 1 : undefined} className="mt-1" />
            <span className="mt-2 flex flex-wrap gap-1.5" data-testid="hub-retest">
              <span className={chipDark}>
                <Timer size={12} aria-hidden /> {retestName ? `${retestName} · ` : ''}{t('planHub.retestIn', { count: Math.max(0, view.endsIn) })}
              </span>
              {toGo != null && toGo >= 0 && (
                <span className={chipDark}>
                  <Flag size={12} aria-hidden /> {t('planHub.competitionIn', { count: toGo })}
                </span>
              )}
            </span>
          </PhotoCard>

          {/* Diese Woche: jede Einheit mit Bild und Stand. */}
          <Panel className="mb-4" data-testid="hub-weekcount">
            <div className="flex items-baseline justify-between px-4 pt-3">
              <span className="label-tag">{t('planHub.thisWeek')}</span>
              <span className="readout text-[13px] text-ink-secondary">
                {view.current?.done ?? 0} {t('planHub.ofCount', { count: view.current?.planned ?? 0 })}
              </span>
            </div>
            <ul className="divide-y divide-line px-4" data-testid="hub-today">
              {view.week7.length === 0 && <li className="py-3 text-[14px] text-ink-secondary">{t('planHub.todayNone')}</li>}
              {view.week7.map((o, i) => {
                const isToday = o.date === today && !o.done
                const firstToday = isToday && view.week7.findIndex((x) => x.date === today && !x.done) === i
                const missed = !o.done && o.date < today
                return (
                  <li key={`${o.session.id}|${o.planned}`} className="flex min-h-16 items-center gap-3 py-2">
                    <img src={sessionImage(o.session)} alt="" loading="lazy" decoding="async" className="thumb" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{weekday(o.date)} · {sessionName(o.session, t)}</span>
                      <span className="block text-[12px] text-ink-secondary">
                        {missed ? t('cal.missed') : t(`plan.intent.${o.session.primaryIntent}`)}
                        {o.session.plannedDurationMin != null && !missed && ` · ${t('cal.minutes', { n: o.session.plannedDurationMin })}`}
                      </span>
                    </span>
                    {o.done ? (
                      <span className="inline-flex size-7 items-center justify-center rounded-pill bg-accent-quiet text-accent-text" aria-label={t('cal.done')}><Check size={14} aria-hidden /></span>
                    ) : isToday ? (
                      <Link to="/plan/heute" data-testid={firstToday ? 'hub-start' : undefined} className="inline-flex min-h-11 items-center rounded-pill bg-accent px-4 text-[13px] font-semibold text-accent-ink">{t('player.start')}</Link>
                    ) : missed ? (
                      <Link to="/plan/kalender" className="inline-flex min-h-11 items-center text-[12px] text-warning">{t('look.hub.catchUp')}</Link>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </Panel>

          <details className="panel mb-4 min-w-0" data-testid="hub-why">
            <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2">
              <span className="font-display text-[15px] font-bold">{t('planHub.why.title')}</span>
              <span className="flex flex-wrap gap-1.5" data-testid="hub-goal">
                {view.strengths.map((s) => (
                  <span key={s} className={cn(chip, 'border-accent text-accent-text')}>
                    {t('plan.evidence.strength', { level: t(`plan.strength.${s}`) })}
                  </span>
                ))}
                {view.unreviewed && <span className={cn(chip, 'border-dashed text-ink-muted')}>{t('plan.review.unreviewed')}</span>}
              </span>
            </summary>
            <div className="space-y-2 px-4 pb-3">
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t('planHub.why.text', { intents: intentText(view.intents) })}</p>
              <Link to="/plan/block" className="inline-flex min-h-11 items-center text-[13px] font-semibold text-accent-text">
                {t('planHub.why.link')}
              </Link>
            </div>
          </details>
        </>
      )}

      {/* Vier Wege als Bildkacheln. */}
      <nav className="mb-4 grid grid-cols-2 gap-2.5" aria-label={t('planHub.more')} data-testid="hub-links">
        <Link to="/plan/programme" data-testid="hub-to-programs">
          <PhotoCard image={HUB_IMAGES.programs} className={tile}>
            <span className="font-display text-[18px] leading-tight font-bold">{t('prog.title')}</span>
          </PhotoCard>
        </Link>
        <Link to="/plan/uebungen" data-testid="hub-to-exercises">
          <PhotoCard image={HUB_IMAGES.exercises} className={tile}>
            <span className="font-display text-[18px] leading-tight font-bold">{t('look.hub.exercises')}</span>
          </PhotoCard>
        </Link>
        <Link to="/plan/eigen" data-testid="hub-to-own">
          <PhotoCard image={HUB_IMAGES.own} className={tile}>
            <span className="font-display text-[18px] leading-tight font-bold">{t('look.hub.own')}</span>
          </PhotoCard>
        </Link>
        <Link to="/plan/kalender" data-testid="hub-to-calendar">
          <PhotoCard image={HUB_IMAGES.calendar} className={tile}>
            <span className="font-display text-[18px] leading-tight font-bold">{t('cal.link')}</span>
          </PhotoCard>
        </Link>
      </nav>
      <p className="mb-4 flex flex-wrap gap-x-5">
        <Link to="/plan/entwicklung" data-testid="hub-to-development" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('dev.link')}</Link>
        {role === 'coach' && planAssignEnabled() && (
          <Link to="/plan/zuweisen" data-testid="hub-to-assign" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('assign.link')}</Link>
        )}
      </p>

      <div className="grid grid-cols-4 gap-2" data-testid="hub-shortcuts">
        {(
          [
            ['/plan/block', CalendarRange, 'plan'],
            ['/diagnostik', ClipboardList, 'tests'],
            ['/training', Library, 'library'],
            ['/fragen', MessageSquareText, 'ask'],
          ] as const
        ).map(([to, Icon, key]) => (
          <Link key={key} to={to} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border border-line bg-surface px-1 py-2 text-[11px] text-ink-secondary hover:bg-surface-sunken">
            <Icon size={16} aria-hidden />
            {t(`planHub.shortcut.${key}`)}
          </Link>
        ))}
      </div>
    </div>
  )
}
