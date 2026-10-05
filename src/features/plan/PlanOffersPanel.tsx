import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { planAssignEnabled } from '@/lib/planAssign'
import { fetchMyAssignments, respondAssignment, type Assignment, type Shares } from '@/lib/supabase/planAssign'
import { importPlan } from '@/domain/planFile'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { planMode } from '@/domain/planMode'
import { cn } from '@/lib/utils'

/**
 * Angebote des Trainers (Trainingsbereich Etappe 10). Der Athlet entscheidet:
 * annehmen oder ablehnen, und mit drei getrennten, ausgeschalteten Freigaben,
 * was der Trainer vom Fortschritt sehen darf. Ein Plan wird nie ungefragt zum
 * Block und nie über einen aktiven Block gelegt.
 */
export function PlanOffersPanel() {
  const { t } = useTranslation()
  const { data, trainingBlocks, saveTrainingBlock } = useAppData()
  const [offers, setOffers] = useState<Assignment[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [shares, setShares] = useState<Shares>({ done: false, results: false, hr: false })
  const [message, setMessage] = useState<string | null>(null)
  const hasActive = trainingBlocks.some((b) => b.status === 'active')

  useEffect(() => {
    if (!planAssignEnabled()) return
    let alive = true
    void fetchMyAssignments().then((r) => alive && r.ok && setOffers(r.value.filter((a) => a.status === 'offered')))
    return () => {
      alive = false
    }
  }, [])

  if (!planAssignEnabled() || offers.length === 0) return null

  const decide = async (a: Assignment, accept: boolean) => {
    setMessage(null)
    if (!accept) {
      const r = await respondAssignment(a.id, false, { done: false, results: false, hr: false })
      if (!r.ok || !r.value) return setMessage(t('offers.failed'))
      setOffers((o) => o.filter((x) => x.id !== a.id))
      return
    }
    // Erst prüfen, ob der Plan lesbar ist: angenommen wird nichts, was die App nicht öffnen kann.
    const now = new Date().toISOString()
    const profile = data.profile
    const imported = importPlan(JSON.stringify(a.payload ?? null), { newId, now, startDay: now.slice(0, 10), disciplineId: profile.disciplineId, family: familyOfDiscipline(profile.disciplineId), trainingAgeYears: profile.trainingAgeYears, mode: planMode(import.meta.env?.VITE_TRAINING_PLAN), assignmentId: a.id })
    if (!imported.ok) return setMessage(t('offers.unreadable'))
    const r = await respondAssignment(a.id, true, shares)
    if (!r.ok || !r.value) return setMessage(t('offers.failed'))
    saveTrainingBlock({ ...imported.block, name: a.name || imported.block.name })
    setOffers((o) => o.filter((x) => x.id !== a.id))
    setOpenId(null)
  }

  const toggle = (key: keyof Shares) =>
    setShares((s) => {
      const next = { ...s, [key]: !s[key] }
      if (!next.done) return { done: false, results: false, hr: false }
      return next
    })

  return (
    <Panel className="mb-4" data-testid="plan-offers">
      <PanelHeader title={t('offers.title')} subtitle={t('offers.sub')} />
      <ul>
        {offers.map((a) => (
          <li key={a.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`offer-${a.id}`}>
            <p className="font-display text-[15px] font-bold">{a.name || t('offers.unnamed')}</p>
            {openId !== a.id ? (
              <button type="button" data-testid={`offer-open-${a.id}`} onClick={() => { setOpenId(a.id); setShares({ done: false, results: false, hr: false }) }} className="mt-1 min-h-11 text-[13px] text-accent-text underline underline-offset-2">{t('offers.decide')}</button>
            ) : (
              <div className="mt-2 space-y-3">
                <p className="text-[13px] text-ink-secondary">{t('offers.consent')}</p>
                {([['done', 'offers.shareDone'], ['results', 'offers.shareResults'], ['hr', 'offers.shareHr']] as const).map(([key, label]) => (
                  <label key={key} className={cn('flex min-h-11 items-start gap-3 text-[14px]', key !== 'done' && !shares.done && 'opacity-50')}>
                    <input type="checkbox" checked={shares[key]} disabled={key !== 'done' && !shares.done} onChange={() => toggle(key)} data-testid={`offer-share-${key}`} className="mt-1 h-5 w-5" />
                    <span>{t(label)}</span>
                  </label>
                ))}
                <p className="text-[12px] text-ink-muted">{t('offers.revocable')}</p>
                {hasActive && <p className="text-[12px] text-accent-text" data-testid="offer-blocked">{t('offers.activeBlock')}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" data-testid={`offer-accept-${a.id}`} disabled={hasActive} onClick={() => void decide(a, true)} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45">{t('offers.accept')}</button>
                  <button type="button" data-testid={`offer-decline-${a.id}`} onClick={() => void decide(a, false)} className="min-h-11 rounded-pill border border-line px-5 text-[13px]">{t('offers.decline')}</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p role="alert" className="px-4 pb-3 text-[13px] text-accent-text" data-testid="offers-message">{message}</p>}
    </Panel>
  )
}
