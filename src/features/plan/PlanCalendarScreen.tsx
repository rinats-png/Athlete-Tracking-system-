import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarArrowDown, Check, ChevronLeft, ChevronRight, MoveRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { addDays, blockEndDay, blockWeek, calendarDays, calendarWeek, missedOccurrences, mondayOf, moveOccurrence, moveWarnings, occurrences, overrideSession, weekdayOf, type CalendarDay, type Occurrence } from '@/domain/trainingBlock'
import { sessionName } from '@/features/plan/planText'
import { buildPlanIcs } from '@/lib/export/ics'
import { downloadFile } from '@/lib/export/csv'
import { cn } from '@/lib/utils'

/**
 * Plankalender: die Einheiten des Blocks mit echtem Datum — Woche, Monat, Phase.
 *
 * Verschieben ist frei: Termin antippen (oder ziehen) und einen Tag wählen,
 * auch über Wochengrenzen, bis zwei Wochen nach Blockende. Ein einzelner
 * Termin braucht keinen Grund — der Athlet plant seine Woche. Gesperrt sind
 * nur Erledigtes, die Vergangenheit und zwei Schlüsseleinheiten an einem Tag
 * (Planungsregel 1); alles andere steht als Hinweis da (harte Tage
 * hintereinander, Wettkampfnähe, voller Tag). Die ganze Serie auf einen
 * anderen Wochentag zu legen bleibt Coach Override mit Grund.
 */
const VIEWS = ['week', 'month', 'phase'] as const
type View = (typeof VIEWS)[number]
const todayStr = () => new Date().toISOString().slice(0, 10)
const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`
const keyOf = (o: Pick<Occurrence, 'session' | 'planned'>) => `${o.session.id}|${o.planned}`

function Card({ o, picked, missed, onPick }: { o: Occurrence; picked: boolean; missed: boolean; onPick: () => void }) {
  const { t } = useTranslation()
  const s = o.session
  return (
    <button
      type="button"
      draggable={!o.done}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', keyOf(o))
        onPick()
      }}
      onClick={onPick}
      aria-pressed={picked}
      data-testid={`cal-session-${s.id}`}
      data-planned={o.planned}
      className={cn('w-full rounded-md border px-3 py-2 text-left', picked ? 'border-accent bg-accent-quiet' : 'border-line bg-surface-raised', o.done && 'opacity-70', missed && 'border-dashed border-warning')}
    >
      <span className="flex items-center gap-2 font-display text-[14px] font-bold">
        {o.done && <Check size={14} aria-label={t('cal.done')} />}
        {sessionName(s, t)}
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-ink-secondary">
        {s.plannedDurationMin != null && <span>{t('cal.minutes', { n: s.plannedDurationMin })}</span>}
        {s.highIntensity && <span>{t('cal.key')}</span>}
        {o.moved && <span className="text-accent-text" data-testid={`cal-moved-${s.id}`}>{t('cal.movedFrom', { date: dm(o.planned) })}</span>}
        {missed && <span className="text-warning">{t('cal.missed')}</span>}
        <span>{s.kind === 'own' ? t('own.tag') : s.evidenceStrength ? t('plan.evidence.strength', { level: t(`plan.strength.${s.evidenceStrength}`) }) : !o.done && !missed ? t('cal.open') : ''}</span>
      </span>
    </button>
  )
}

export function PlanCalendarScreen() {
  const { t } = useTranslation()
  const { trainingBlocks, saveTrainingBlock } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const today = todayStr()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<string | null>(null)
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [series, setSeries] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!block) return <EmptyState title={t('cal.title')} body={t('cal.noBlock')} action={<Link to="/plan/waehlen" className="text-accent-text underline">{t('planHub.empty.cta')}</Link>} />

  const end = blockEndDay(block)
  const shown = anchor ?? (today < block.startDay ? block.startDay : today > end ? end : today)
  const all = occurrences(block)
  const picked = all.find((o) => keyOf(o) === pickedKey) ?? null
  const missed = missedOccurrences(block, today)
  const isMissed = (o: Occurrence) => !o.done && o.date < today
  const recurring = picked != null && picked.session.weekFrom !== picked.session.weekTo

  const reset = () => {
    setPickedKey(null)
    setTarget(null)
    setSeries(false)
    setReason('')
    setError(null)
  }
  const choose = (o: Occurrence) => {
    if (keyOf(o) === pickedKey) return reset()
    reset()
    if (o.done) return setError(t('cal.err.done'))
    setPickedKey(keyOf(o))
  }
  const pickTarget = (date: string) => {
    setTarget(date)
    setError(null)
  }
  const confirm = () => {
    if (!picked || target == null) return
    const now = new Date().toISOString()
    if (series) {
      const r = overrideSession(block, picked.session.id, { day: weekdayOf(target) }, reason, now)
      if (!r.ok) return setError(t(`cal.err.${r.error}`))
      saveTrainingBlock(r.block)
    } else {
      const r = moveOccurrence(block, picked.session.id, picked.planned, target, today, now)
      if (!r.ok) return setError(t(`cal.err.${r.error}`))
      saveTrainingBlock(r.block)
    }
    setAnchor(target)
    reset()
  }
  const catchUp = (o: Occurrence) => {
    const r = moveOccurrence(block, o.session.id, o.planned, today, today, new Date().toISOString())
    if (!r.ok) return setError(t(`cal.err.${r.error}`))
    saveTrainingBlock(r.block)
    setAnchor(today)
  }
  const unmove = () => {
    if (!picked) return
    const r = moveOccurrence(block, picked.session.id, picked.planned, picked.planned, today, new Date().toISOString())
    if (!r.ok) return setError(t(`cal.err.${r.error}`))
    saveTrainingBlock(r.block)
    reset()
  }
  const dropOn = (date: string, key: string) => {
    const o = all.find((x) => keyOf(x) === key)
    if (!o || o.date === date) return
    setPickedKey(key)
    setSeries(false)
    pickTarget(date)
  }
  const exportIcs = () => {
    const events = all.filter((o) => !o.done && o.date >= today).map((o) => ({ uid: `${block.id}-${o.session.id}-${o.planned}`, date: o.date, title: sessionName(o.session, t), description: [t(`plan.intent.${o.session.primaryIntent}`), o.session.plannedDurationMin != null ? t('cal.minutes', { n: o.session.plannedDurationMin }) : ''].filter(Boolean).join(' · ') }))
    downloadFile('kydon-trainingsplan.ics', buildPlanIcs(events), 'text/calendar')
  }

  const monday = mondayOf(shown)
  const week = blockWeek(block, monday)
  const weekLabel = typeof week === 'number' ? t('cal.weekOf', { n: week, of: block.weeks }) : week === 'before' ? t('cal.beforeBlock') : t('cal.afterBlock')
  const warnings = picked && target && !series ? moveWarnings(block, picked.session.id, picked.planned, target) : []

  const dayCell = (c: CalendarDay) => (
    <li
      key={c.date}
      data-testid={`cal-day-${c.weekday}`}
      data-date={c.date}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => dropOn(c.date, e.dataTransfer.getData('text/plain'))}
      className={cn('rounded-md border border-line p-2', c.date === today && 'border-accent', target === c.date && 'bg-accent-quiet')}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="label-tag">
          {t(`plan.day.${c.weekday}`)} · {dm(c.date)}
          {c.date === today && <span className="ml-1.5 text-accent-text">{t('cal.today')}</span>}
          {block.eventDay === c.date && <span className="ml-1.5 text-warning" data-testid="cal-event">{t('cal.event')}</span>}
        </span>
        {picked && picked.date !== c.date && c.date >= today && (
          <button type="button" data-testid={`cal-move-${c.weekday}`} aria-pressed={target === c.date} onClick={() => pickTarget(c.date)} className={cn('min-h-9 rounded-pill border px-3 text-[12px]', target === c.date ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
            {t('cal.moveHere')}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {c.items.length === 0 ? <p className="text-[12px] text-ink-muted">{t('cal.rest')}</p> : c.items.map((o) => <Card key={keyOf(o)} o={o} picked={keyOf(o) === pickedKey} missed={isMissed(o)} onPick={() => choose(o)} />)}
      </div>
    </li>
  )

  const monthFirst = `${shown.slice(0, 7)}-01`
  const monthStart = mondayOf(monthFirst)
  const nextMonth = (() => {
    const d = new Date(`${monthFirst}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const prevMonth = (() => {
    const d = new Date(`${monthFirst}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const monthDays = calendarDays(block, monthStart, Math.ceil((Date.parse(`${nextMonth}T00:00:00Z`) - Date.parse(`${monthStart}T00:00:00Z`)) / 86_400_000 / 7) * 7)

  return (
    <div data-testid="plan-calendar">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('cal.title')} intro={t('cal.intro')} />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={t('cal.view')}>
        {VIEWS.map((v) => (
          <button key={v} type="button" aria-pressed={view === v} data-testid={`cal-view-${v}`} onClick={() => setView(v)} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', view === v ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
            {t(`cal.v.${v}`)}
          </button>
        ))}
        <button type="button" onClick={() => setAnchor(today)} data-testid="cal-today" className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('cal.today')}</button>
        <button type="button" onClick={exportIcs} data-testid="cal-ics" className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-[13px]"><CalendarArrowDown size={16} aria-hidden />{t('cal.ics')}</button>
      </div>

      {missed.length > 0 && (
        <Panel className="mb-3 border-warning" data-testid="cal-missed">
          <PanelHeader title={t('cal.missedTitle', { n: missed.length })} subtitle={t('cal.missedNote')} />
          <ul className="px-4 pb-3">
            {missed.slice(0, 6).map((o) => (
              <li key={keyOf(o)} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 first:border-t-0">
                <span className="text-[13px]"><span className="font-semibold">{sessionName(o.session, t)}</span> · {t(`plan.day.${weekdayOf(o.date)}`)} {dm(o.date)}</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => catchUp(o)} data-testid={`cal-catchup-${o.session.id}`} className="min-h-11 rounded-pill bg-accent px-4 text-[12px] font-semibold text-accent-ink">{t('cal.catchUpToday')}</button>
                  <button type="button" onClick={() => { choose(o); setAnchor(today); setView('week') }} data-testid={`cal-catchpick-${o.session.id}`} className="min-h-11 rounded-pill border border-line px-4 text-[12px]">{t('cal.pickDay')}</button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {view === 'week' && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label={t('cal.prev')} onClick={() => setAnchor(addDays(monday, -7))} data-testid="cal-prev" className="min-h-11 min-w-11"><ChevronLeft size={20} /></button>
            <p className="text-center font-display text-[16px] font-bold" data-testid="cal-week">{weekLabel}<span className="block text-[12px] font-normal text-ink-secondary">{dm(monday)}–{dm(addDays(monday, 6))}</span></p>
            <button type="button" aria-label={t('cal.next')} onClick={() => setAnchor(addDays(monday, 7))} data-testid="cal-next" className="min-h-11 min-w-11"><ChevronRight size={20} /></button>
          </div>
          <ul className="space-y-2">{calendarDays(block, monday, 7).map(dayCell)}</ul>
        </>
      )}

      {view === 'month' && (
        <div data-testid="cal-month">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label={t('cal.prevMonth')} onClick={() => setAnchor(prevMonth)} data-testid="cal-prev-month" className="min-h-11 min-w-11"><ChevronLeft size={20} /></button>
            <p className="font-display text-[16px] font-bold" data-testid="cal-month-label">{new Date(`${monthFirst}T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
            <button type="button" aria-label={t('cal.nextMonth')} onClick={() => setAnchor(nextMonth)} data-testid="cal-next-month" className="min-h-11 min-w-11"><ChevronRight size={20} /></button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-ink-secondary">{[1, 2, 3, 4, 5, 6, 7].map((d) => <span key={d}>{t(`plan.day.${d}`)}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((c) => {
              const inMonth = c.date.slice(0, 7) === monthFirst.slice(0, 7)
              const canTarget = picked != null && picked.date !== c.date && c.date >= today
              return (
                <button
                  key={c.date}
                  type="button"
                  data-testid={`cal-mday-${c.date}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOn(c.date, e.dataTransfer.getData('text/plain'))}
                  onClick={() => (canTarget ? pickTarget(c.date) : (setAnchor(c.date), setView('week')))}
                  aria-label={`${t(`plan.day.${c.weekday}`)} ${c.date}${c.items.length ? ` · ${c.items.length}` : ''}`}
                  className={cn('flex min-h-14 flex-col items-center justify-between rounded-md border p-1 text-[11px]', c.date === today ? 'border-accent' : 'border-line', !inMonth && 'opacity-40', target === c.date && 'bg-accent-quiet', canTarget && 'border-dashed')}
                >
                  <span className={cn(block.eventDay === c.date && 'font-bold text-warning')}>{c.date.slice(8, 10)}</span>
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {c.items.map((o) => <span key={keyOf(o)} className={cn('h-2 w-2 rounded-full', o.done ? 'bg-accent' : isMissed(o) ? 'border border-warning' : 'border border-accent', o.session.highIntensity && !o.done && 'bg-accent/40')} />)}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">{t('cal.monthHint')}</p>
        </div>
      )}

      {view === 'phase' && (
        <Panel data-testid="cal-phase">
          <PanelHeader title={t(`plan.phase.${block.phase}`)} />
          <ul>
            {Array.from({ length: block.weeks }, (_, i) => i + 1).map((w) => {
              const list = calendarWeek(block, w).flatMap((c) => c.sessions)
              return (
                <li key={w} className="border-t border-line px-4 py-2 first:border-t-0">
                  <button type="button" onClick={() => { setAnchor(addDays(block.startDay, (w - 1) * 7)); setView('week') }} className="w-full text-left" data-testid={`cal-phase-week-${w}`}>
                    <span className="font-display text-[14px] font-bold">{t('cal.weekShort', { n: w })}</span>
                    <span className="ml-2 text-[12px] text-ink-secondary">{t('cal.count', { done: list.filter((x) => x.done).length, total: list.length })}</span>
                    <span className="block text-[12px] text-ink-muted">{[...new Set(list.map((x) => t(`plan.intent.${x.session.primaryIntent}`)))].join(' · ')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {(picked || error) && (
        <Panel float className="sticky bottom-24 mt-4 border-accent" data-testid="cal-move">
          <div className="space-y-2 px-4 py-4">
            {picked && (
              <p className="text-[14px]">
                {target == null
                  ? t('cal.pickTarget', { intent: sessionName(picked.session, t) })
                  : series
                    ? t('cal.moveSeriesTo', { intent: sessionName(picked.session, t), day: t(`plan.day.${weekdayOf(target)}`) })
                    : <><span className="font-semibold">{sessionName(picked.session, t)}</span> {dm(picked.date)} <MoveRight size={14} aria-hidden className="inline" /> {t(`plan.day.${weekdayOf(target)}`)} {dm(target)}</>}
              </p>
            )}
            {picked && recurring && (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('cal.mode')}>
                <button type="button" role="radio" aria-checked={!series} onClick={() => setSeries(false)} data-testid="cal-mode-single" className={cn('min-h-11 rounded-pill border px-4 text-[12px]', !series ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>{t('cal.modeSingle')}</button>
                <button type="button" role="radio" aria-checked={series} onClick={() => setSeries(true)} data-testid="cal-mode-series" className={cn('min-h-11 rounded-pill border px-4 text-[12px]', series ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>{t('cal.modeSeries')}</button>
              </div>
            )}
            {warnings.length > 0 && (
              <ul className="space-y-1 text-[13px]" data-testid="cal-warnings">
                {warnings.map((w) => <li key={w} className="flex items-start gap-2"><AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-warning" />{t(`cal.warn.${w}`)}</li>)}
              </ul>
            )}
            {picked && target != null && series && (
              <label className="block text-[13px]">
                <span className="label-tag">{t('block.reason')}</span>
                <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} data-testid="cal-reason" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {picked && target != null && <button type="button" data-testid="cal-confirm" onClick={confirm} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('cal.confirm')}</button>}
              {picked?.moved && !series && <button type="button" data-testid="cal-unmove" onClick={unmove} className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('cal.unmove', { date: dm(picked.planned) })}</button>}
              <button type="button" onClick={reset} data-testid="cal-cancel" className="min-h-11 px-3 text-[13px] text-ink-secondary underline underline-offset-2">{t('cal.cancel')}</button>
            </div>
            {error && <p role="alert" className="text-[13px] text-accent-text" data-testid="cal-error">{error}</p>}
            <p className="text-[11px] text-ink-muted">{series ? t('cal.seriesNote') : t('cal.singleNote')}</p>
          </div>
        </Panel>
      )}
    </div>
  )
}
