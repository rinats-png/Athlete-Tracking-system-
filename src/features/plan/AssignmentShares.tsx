import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { planAssignEnabled } from '@/lib/planAssign'
import { fetchMyAssignments, setShares, type Shares } from '@/lib/supabase/planAssign'
import { syncAssignedCompletions } from '@/lib/assignSync'
import type { StoredTrainingBlock } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import { isMinor } from '@/domain/minor'
import { cn } from '@/lib/utils'

/** Freigaben des Athleten für einen zugewiesenen Block: jederzeit änderbar, Widerruf wirkt sofort. */
export function AssignmentShares({ block }: { block: StoredTrainingBlock }) {
  const { t } = useTranslation()
  const [shares, setLocal] = useState<Shares | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const id = block.assignmentId
  const { data } = useAppData()
  const minor = isMinor(data.profile.birthDate, new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!planAssignEnabled() || !id) return
    let alive = true
    void fetchMyAssignments().then((r) => {
      if (!alive || !r.ok) return
      const a = r.value.find((x) => x.id === id && x.status === 'accepted')
      if (a) setLocal({ done: a.shareDone, results: a.shareResults, hr: a.shareHr })
    })
    // Nachmelden, was ohne Netz liegen blieb.
    void syncAssignedCompletions(block)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!planAssignEnabled() || !id || !shares) return null

  const change = async (key: keyof Shares) => {
    const next = { ...shares, [key]: !shares[key] }
    if (!next.done) Object.assign(next, { done: false, results: false, hr: false })
    const r = await setShares(id, next)
    if (!r.ok || !r.value) return setMessage(t('offers.failed'))
    setMessage(null)
    setLocal(next)
    if (next.done) void syncAssignedCompletions(block)
  }

  return (
    <Panel className="mb-4" data-testid="assignment-shares">
      <PanelHeader title={t('offers.sharesTitle')} subtitle={t('offers.sharesSub')} />
      <div className="space-y-1 px-4 pb-4">
        {([['done', 'offers.shareDone'], ['results', 'offers.shareResults'], ['hr', 'offers.shareHr']] as const).map(([key, label]) => (
          <label key={key} className={cn('flex min-h-11 items-start gap-3 text-[14px]', ((key !== 'done' && !shares.done) || (key === 'hr' && minor)) && 'opacity-50')}>
            <input type="checkbox" checked={shares[key]} disabled={(key !== 'done' && !shares.done) || (key === 'hr' && minor)} onChange={() => void change(key)} data-testid={`share-${key}`} className="mt-1 h-5 w-5" />
            <span>{t(label)}</span>
          </label>
        ))}
        {minor && <p className="text-[12px] text-accent-text" data-testid="shares-minor">{t('offers.minor')}</p>}
        <p className="text-[12px] text-ink-muted">{t('offers.revocable')}</p>
        {message && <p role="alert" className="text-[13px] text-accent-text" data-testid="shares-message">{message}</p>}
      </div>
    </Panel>
  )
}
