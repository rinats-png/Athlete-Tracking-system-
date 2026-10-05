import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planAssignEnabled } from '@/lib/planAssign'
import { planMode } from '@/domain/planMode'
import { exportPlan } from '@/domain/planFile'
import { fetchCoachAssignments, fetchLinkedAthletes, fetchProgress, offerAssignment, withdrawAssignment, type Assignment, type LinkedAthlete, type ProgressRow } from '@/lib/supabase/planAssign'
import { cn } from '@/lib/utils'

/**
 * Plan zuweisen (Trainer, Trainingsbereich Etappe 10). Der Trainer schickt
 * seinen aktiven Plan an einen verbundenen Athleten mit Konto. Der Athlet
 * entscheidet; der Trainer sieht den Fortschritt nur so weit, wie der Athlet
 * ihn freigegeben hat, und die Freigaben stehen offen daneben.
 */
export function AssignScreen() {
  const { t } = useTranslation()
  const { trainingBlocks } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const [athletes, setAthletes] = useState<LinkedAthlete[] | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [target, setTarget] = useState<string | null>(null)
  const [name, setName] = useState(block?.name ?? '')
  const [state, setState] = useState<'idle' | 'sent' | 'failed' | 'unavailable'>('idle')
  const [progress, setProgress] = useState<{ id: string; rows: ProgressRow[] } | null>(null)

  const reload = () => void fetchCoachAssignments().then((r) => r.ok && setAssignments(r.value))
  useEffect(() => {
    if (!planAssignEnabled()) return
    void fetchLinkedAthletes().then((r) => (r.ok ? setAthletes(r.value) : setState('unavailable')))
    reload()
  }, [])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off' || !planAssignEnabled()) return <EmptyState title={t('plan.title')} body={t('assign.off')} />
  const nameOf = (id: string) => athletes?.find((a) => a.athleteId === id)?.name || t('assign.athlete')

  const send = async () => {
    if (!block || !target) return
    const r = await offerAssignment(target, name, JSON.parse(exportPlan(block)))
    setState(r.ok ? 'sent' : 'failed')
    if (r.ok) reload()
  }

  return (
    <div data-testid="plan-assign">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('assign.title')} intro={t('assign.intro')} />
      {state === 'unavailable' ? (
        <p className="text-[14px] text-ink-secondary" data-testid="assign-unavailable">{t('assign.unavailable')}</p>
      ) : (
        <>
          <Panel className="mb-4" data-testid="assign-form">
            <PanelHeader title={t('assign.send')} />
            <div className="space-y-3 px-4 pb-4">
              {!block ? (
                <p className="text-[14px]" data-testid="assign-noblock">{t('assign.noBlock')} <Link to="/plan/waehlen" className="text-accent-text underline">{t('planHub.empty.cta')}</Link></p>
              ) : (
                <>
                  <label className="block text-[13px]"><span className="label-tag">{t('own.name')}</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="assign-name" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" /></label>
                  <div role="radiogroup" aria-label={t('assign.athlete')} data-testid="assign-athletes">
                    <span className="label-tag">{t('assign.athlete')}</span>
                    {athletes && athletes.length === 0 && <p className="mt-1.5 text-[13px] text-ink-secondary" data-testid="assign-noathletes">{t('assign.noAthletes')}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {athletes?.map((a) => (
                        <button key={a.athleteId} type="button" role="radio" aria-checked={target === a.athleteId} data-testid={`assign-athlete-${a.athleteId}`} onClick={() => setTarget(a.athleteId)} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', target === a.athleteId ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>{a.name || t('assign.athlete')}</button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-ink-secondary">{t('assign.note')}</p>
                  <button type="button" data-testid="assign-send" disabled={!target} onClick={() => void send()} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45">{t('assign.sendButton')}</button>
                  {state === 'sent' && <p className="text-[13px]" data-testid="assign-sent">{t('assign.sent')}</p>}
                  {state === 'failed' && <p role="alert" className="text-[13px] text-accent-text" data-testid="assign-failed">{t('assign.failed')}</p>}
                </>
              )}
            </div>
          </Panel>

          <Panel data-testid="assign-list">
            <PanelHeader title={t('assign.list')} />
            {assignments.length === 0 ? (
              <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('assign.none')}</p>
            ) : (
              <ul>
                {assignments.map((a) => (
                  <li key={a.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`assignment-${a.id}`}>
                    <p className="font-display text-[15px] font-bold">{a.name || t('offers.unnamed')} · {nameOf(a.athleteId)}</p>
                    <p className="text-[12px] text-ink-secondary" data-testid={`assignment-status-${a.id}`}>{t(`assign.status.${a.status}`)}</p>
                    {a.status === 'accepted' && (
                      <p className="mt-1 text-[12px] text-ink-secondary" data-testid={`assignment-shares-${a.id}`}>
                        {t('assign.shares', { done: t(a.shareDone ? 'assign.yes' : 'assign.no'), results: t(a.shareResults ? 'assign.yes' : 'assign.no'), hr: t(a.shareHr ? 'assign.yes' : 'assign.no') })}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.status === 'accepted' && a.shareDone && <button type="button" data-testid={`assignment-progress-${a.id}`} onClick={() => void fetchProgress(a.id).then((r) => r.ok && setProgress({ id: a.id, rows: r.value }))} className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('assign.progress')}</button>}
                      {(a.status === 'offered' || a.status === 'accepted') && <button type="button" data-testid={`assignment-withdraw-${a.id}`} onClick={() => void withdrawAssignment(a.id).then(reload)} className="min-h-11 px-3 text-[13px] text-accent-text underline underline-offset-2">{t('assign.withdraw')}</button>}
                    </div>
                    {progress?.id === a.id && (
                      <ul className="mt-2 text-[13px]" data-testid={`progress-${a.id}`}>
                        {progress.rows.length === 0 && <li className="text-ink-secondary">{t('assign.noProgress')}</li>}
                        {progress.rows.map((r) => (
                          <li key={`${r.key}-${r.day}`} className="border-t border-line py-1.5">
                            {r.day} · {t('assign.sessionN', { n: Number(r.key.split('-').pop()) + 1 })}
                            {r.durationMin != null && ` · ${t('cal.minutes', { n: r.durationMin })}`}
                            {r.rpe != null && ` · RPE ${r.rpe}`}
                            {r.avgHr != null && ` · Ø ${r.avgHr}`}
                            {r.maxHr != null && ` · max ${r.maxHr}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

