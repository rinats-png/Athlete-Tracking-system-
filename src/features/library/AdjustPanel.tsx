import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { applyAdjustment, INTENT_STEPS, proposeAdjustment, reviewFeedback, revertLast, type IntentPct, type Proposal } from '@/domain/adaptation'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId, type StoredTrainingBlock } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'
import { useLibrary } from './useLibrary'

/**
 * «Training anpassen» für Bibliothekspläne: ein Vorschlag aus den
 * Rückmeldungen (frühestens nach 3 Tagen) oder ein eigener Wunsch von −30 bis
 * +30. Die Vorschau zeigt jede Änderung mit Vorher/Nachher; erst «Übernehmen»
 * erzeugt eine neue Planversion. Die letzte Version lässt sich zurücknehmen.
 */
export function AdjustPanel({ block }: { block: StoredTrainingBlock }) {
  const { t } = useTranslation()
  const { saveTrainingBlock } = useAppData()
  const { index } = useLibrary()
  const today = new Date().toISOString().slice(0, 10)
  const review = useMemo(() => reviewFeedback(block, today), [block, today])
  const [pct, setPct] = useState<IntentPct | null>(null)
  const [source, setSource] = useState<'feedback' | 'manual'>('manual')
  const proposal: Proposal | null = useMemo(() => (pct != null && index ? proposeAdjustment(block, pct, index.methodRules, today) : null), [pct, index, block, today])
  const name = (sessionId: string, part: number) => {
    const s = block.sessions.find((x) => x.id === sessionId)
    const p = s?.blocks[part]
    const label = p && (p.type === 'library_exercise' ? p.name : p.type === 'library_conditioning' ? p.description : '')
    return `${t('adapt.weekShort', { n: s?.weekFrom ?? 0 })} · ${s?.title ?? ''} · ${label}`
  }

  const choose = (p: IntentPct, src: 'feedback' | 'manual') => {
    setPct(p)
    setSource(src)
  }
  const accept = () => {
    if (!proposal) return
    saveTrainingBlock(applyAdjustment(block, proposal, { id: newId(), now: new Date().toISOString(), source }))
    setPct(null)
  }

  return (
    <Panel className="mb-4" data-testid="adjust-panel">
      <PanelHeader title={t('adapt.title')} subtitle={t('adapt.version', { n: block.planVersion })} />
      <div className="space-y-3 px-4 pb-4">
        <p className="text-[13px] text-ink-secondary" data-testid="adjust-review">
          {t(`adapt.review.${review.reason}`, { n: review.feedbackCount })}
        </p>
        {review.suggestedPct != null && (
          <button type="button" onClick={() => choose(review.suggestedPct!, 'feedback')} data-testid="adjust-suggested" className="min-h-11 rounded-pill border border-accent px-4 text-[13px] text-accent-text">
            {t('adapt.useSuggestion', { pct: review.suggestedPct > 0 ? `+${review.suggestedPct}` : review.suggestedPct })}
          </button>
        )}
        <div>
          <span className="label-tag">{t('adapt.manual')}</span>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5" role="group" aria-label={t('adapt.manual')}>
            {INTENT_STEPS.map((p) => (
              <button key={p} type="button" aria-pressed={pct === p && source === 'manual'} onClick={() => choose(p, 'manual')} data-testid={`adjust-${p}`} className={cn('min-h-11 rounded-md border text-[13px]', pct === p ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
                {p > 0 ? `+${p}` : p} %
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-secondary">{t('adapt.manualNote')}</p>
        </div>

        {proposal && (
          <div className="rounded-md border border-line bg-surface-sunken px-3 py-3" data-testid="adjust-preview">
            {proposal.blocked ? (
              <p className="text-[13px]" data-testid="adjust-blocked">{t('adapt.blocked')}</p>
            ) : proposal.changes.length === 0 ? (
              <p className="text-[13px]" data-testid="adjust-none">{t('adapt.none', { n: proposal.atLimit })}</p>
            ) : (
              <>
                <p className="mb-2 text-[13px]">{t('adapt.preview', { n: proposal.changes.length, limit: proposal.atLimit })}</p>
                <ul className="max-h-56 space-y-1 overflow-y-auto text-[12px]" data-testid="adjust-changes">
                  {proposal.changes.slice(0, 40).map((c, i) => (
                    <li key={i}>{name(c.sessionId, c.part)}: {t(`adapt.field.${c.field}`)} {c.from} → <strong>{c.to}</strong></li>
                  ))}
                </ul>
                {proposal.changes.length > 40 && <p className="mt-1 text-[12px] text-ink-muted">{t('adapt.more', { n: proposal.changes.length - 40 })}</p>}
                <p className="mt-2 text-[12px] text-ink-secondary">{t('adapt.withinRules')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={accept} data-testid="adjust-accept" className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('adapt.accept')}</button>
                  <button type="button" onClick={() => setPct(null)} data-testid="adjust-reject" className="min-h-11 rounded-pill border border-line px-5 text-[13px]">{t('adapt.reject')}</button>
                </div>
              </>
            )}
          </div>
        )}

        {block.adjustments.length > 0 && (
          <div data-testid="adjust-history">
            <span className="label-tag">{t('adapt.history')}</span>
            <ul className="mt-1 space-y-1 text-[12px] text-ink-secondary">
              {[...block.adjustments].reverse().slice(0, 5).map((a) => (
                <li key={a.id}>{t('adapt.historyRow', { from: a.fromVersion, to: a.toVersion, pct: a.intentPct > 0 ? `+${a.intentPct}` : a.intentPct, n: a.changes.length, date: a.at.slice(0, 10) })}</li>
              ))}
            </ul>
            <button type="button" onClick={() => saveTrainingBlock(revertLast(block, { id: newId(), now: new Date().toISOString() }))} data-testid="adjust-revert" className="mt-1 min-h-11 text-[13px] text-accent-text underline underline-offset-2">{t('adapt.revert')}</button>
          </div>
        )}
      </div>
    </Panel>
  )
}
