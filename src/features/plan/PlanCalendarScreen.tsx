import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { blockWeek, calendarWeek, overrideSession, type CalendarCell } from '@/domain/trainingBlock'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import { sessionName } from '@/features/plan/planText'
import { cn } from '@/lib/utils'

/**
 * Plankalender (Trainingsbereich Etappe 3): Woche, Phase, Monat.
 *
 * Verschieben: Einheit antippen oder ziehen, dann den Zieltag wählen. Wie jede
 * Änderung braucht auch das Verschieben einen Grund (Coach Override), und es
 * gilt für die Einheit in allen ihren Wochen.
 */
const VIEWS = ['week', 'phase', 'month'] as const
type View = (typeof VIEWS)[number]
const today = () => new Date().toISOString().slice(0, 10)

function Card({ s, done, picked, onPick }: { s: StoredPlannedSession; done: boolean; picked: boolean; onPick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', s.id)
        onPick()
      }}
      onClick={onPick}
      aria-pressed={picked}
      data-testid={`cal-session-${s.id}`}
      className={cn('w-full rounded-md border px-3 py-2 text-left', picked ? 'border-accent bg-accent-quiet' : 'border-line bg-surface-raised', done && 'opacity-70')}
    >
      <span className="flex items-center gap-2 font-display text-[14px] font-bold">
        {done && <Check size={14} aria-label={t('cal.done')} />}
        {sessionName(s, t)}
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-ink-secondary">
        {s.plannedDurationMin != null && <span>{t('cal.minutes', { n: s.plannedDurationMin })}</span>}
        {s.highIntensity && <span>{t('cal.key')}</span>}
        <span>{s.kind === 'own' ? t('own.tag') : s.evidenceStrength ? t('plan.evidence.strength', { level: t(`plan.strength.${s.evidenceStrength}`) }) : t('cal.open')}</span>
      </span>
    </button>
  )
}

export function PlanCalendarScreen() {
  const { t } = useTranslation()
  const { trainingBlocks, saveTrainingBlock } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const [view, setView] = useState<View>('week')
  const [week, setWeek] = useState<number | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (!block) return <EmptyState title={t('cal.title')} body={t('cal.noBlock')} action={<Link to="/plan/waehlen" className="text-accent-text underline">{t('planHub.empty.cta')}</Link>} />

  const nowWeek = blockWeek(block, today())
  const shown = week ?? (typeof nowWeek === 'number' ? nowWeek : nowWeek === 'after' ? block.weeks : 1)
  const cells = calendarWeek(block, shown)
  const picked = block.sessions.find((s) => s.id === pickedId) ?? null

  const choose = (id: string | null) => {
    setPickedId(id === pickedId ? null : id)
    setTarget(null)
    setReason('')
    setError(null)
  }
  const confirm = (b: StoredTrainingBlock) => {
    if (!picked || target == null) return
    const r = overrideSession(b, picked.id, { day: target }, reason, new Date().toISOString())
    if (!r.ok) return setError(t(`cal.err.${r.error}`))
    saveTrainingBlock(r.block)
    choose(null)
  }
  const dropOn = (weekday: number, id: string) => {
    const s = block.sessions.find((x) => x.id === id)
    if (!s || s.day === weekday) return
    setPickedId(id)
    setTarget(weekday)
    setError(null)
  }
  const dayCell = (c: CalendarCell) => (
    <li
      key={c.weekday}
      data-testid={`cal-day-${c.weekday}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => dropOn(c.weekday, e.dataTransfer.getData('text/plain'))}
      className={cn('rounded-md border border-line p-2', c.date === today() && 'border-accent')}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label-tag">{t(`plan.day.${c.weekday}`)} · {c.date.slice(8, 10)}.{c.date.slice(5, 7)}.</span>
        {picked && picked.day !== c.weekday && (
          <button type="button" data-testid={`cal-move-${c.weekday}`} aria-pressed={target === c.weekday} onClick={() => setTarget(c.weekday)} className={cn('min-h-9 rounded-pill border px-3 text-[12px]', target === c.weekday ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
            {t('cal.moveHere')}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {c.sessions.length === 0 ? <p className="text-[12px] text-ink-muted">{t('cal.rest')}</p> : c.sessions.map((x) => <Card key={x.session.id} s={x.session} done={x.done} picked={x.session.id === pickedId} onPick={() => choose(x.session.id)} />)}
      </div>
    </li>
  )

  return (
    <div data-testid="plan-calendar">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('cal.title')} intro={t('cal.intro')} />
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t('cal.view')}>
        {VIEWS.map((v) => (
          <button key={v} type="button" aria-pressed={view === v} data-testid={`cal-view-${v}`} onClick={() => setView(v)} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', view === v ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
            {t(`cal.v.${v}`)}
          </button>
        ))}
      </div>

      {view !== 'phase' && (
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label={t('cal.prev')} disabled={shown <= 1} onClick={() => setWeek(shown - 1)} data-testid="cal-prev" className="min-h-11 min-w-11 disabled:opacity-40"><ChevronLeft size={20} /></button>
          <p className="font-display text-[16px] font-bold" data-testid="cal-week">{t('cal.weekOf', { n: shown, of: block.weeks })}</p>
          <button type="button" aria-label={t('cal.next')} disabled={shown >= block.weeks} onClick={() => setWeek(shown + 1)} data-testid="cal-next" className="min-h-11 min-w-11 disabled:opacity-40"><ChevronRight size={20} /></button>
        </div>
      )}

      {view === 'week' && <ul className="space-y-2">{cells.map(dayCell)}</ul>}

      {view === 'month' && (
        <div className="space-y-2" data-testid="cal-month">
          {Array.from({ length: Math.min(4, block.weeks - shown + 1) }, (_, i) => shown + i).map((w) => (
            <div key={w} className="grid grid-cols-7 gap-1">
              {calendarWeek(block, w).map((c) => (
                <button key={c.date} type="button" onClick={() => { setWeek(w); setView('week') }} aria-label={`${t(`plan.day.${c.weekday}`)} ${c.date}`} className={cn('flex min-h-14 flex-col items-center justify-between rounded-md border p-1 text-[11px]', c.date === today() ? 'border-accent' : 'border-line')}>
                  <span>{c.date.slice(8, 10)}</span>
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {c.sessions.map((x) => <span key={x.session.id} className={cn('h-2 w-2 rounded-full', x.done ? 'bg-accent' : 'border border-accent')} />)}
                  </span>
                </button>
              ))}
            </div>
          ))}
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
                  <button type="button" onClick={() => { setWeek(w); setView('week') }} className="w-full text-left" data-testid={`cal-phase-week-${w}`}>
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

      {picked && (
        <Panel className="mt-4" data-testid="cal-move">
          <div className="space-y-2 px-4 py-4">
            <p className="text-[14px]">{target == null ? t('cal.pickTarget', { intent: t(`plan.intent.${picked.primaryIntent}`) }) : t('cal.moveTo', { intent: t(`plan.intent.${picked.primaryIntent}`), day: t(`plan.day.${target}`) })}</p>
            {target != null && (
              <>
                <label className="block text-[13px]">
                  <span className="label-tag">{t('block.reason')}</span>
                  <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} data-testid="cal-reason" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
                </label>
                <button type="button" data-testid="cal-confirm" onClick={() => confirm(block)} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('cal.confirm')}</button>
              </>
            )}
            {error && <p role="alert" className="text-[13px] text-accent-text" data-testid="cal-error">{error}</p>}
            <p className="text-[11px] text-ink-muted">{t('cal.seriesNote')}</p>
          </div>
        </Panel>
      )}
    </div>
  )
}
