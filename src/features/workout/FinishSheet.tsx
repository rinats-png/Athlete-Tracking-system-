import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Abschluss für Uhr, Lauf und Kamera: Anstrengung (RPE 1–10) und Speichern —
 * oder Verwerfen. Die Dauer ist die gemessene; sie steht danach in der
 * Zusammenfassung. Ohne RPE kein Speichern: die Last im Tagebuch braucht sie.
 */
export function FinishSheet({ onSave, onDiscard, onCancel }: { onSave: (rpe: number) => void; onDiscard: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [rpe, setRpe] = useState<number | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/50" role="dialog" aria-modal="true" aria-label={t('workout.finish')}>
      <div className="w-full rounded-t-3xl bg-surface px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink" data-testid="finish-sheet">
        <p className="font-display text-[26px] leading-none font-bold">{t('workout.finish')}</p>
        <div role="radiogroup" aria-label={t('player.rpe')} className="mt-3">
          <span className="label-tag">{t('player.rpe')}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rpe === n} data-testid={`finish-rpe-${n}`} onClick={() => setRpe(n)} className={cn('min-h-11 min-w-11 rounded-pill border text-[14px]', rpe === n ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button type="button" disabled={rpe == null} onClick={() => rpe != null && onSave(rpe)} data-testid="finish-save" className="mt-4 min-h-14 w-full rounded-pill bg-accent text-[17px] font-semibold text-accent-ink disabled:opacity-45">{t('workout.save')}</button>
        <div className="mt-2 flex justify-between gap-2">
          <button type="button" onClick={onCancel} className="min-h-11 px-2 text-[14px] text-ink-secondary">{t('workout.continue')}</button>
          {confirmDiscard ? (
            <button type="button" onClick={onDiscard} data-testid="finish-discard-confirm" className="min-h-11 px-2 text-[14px] font-semibold text-warning">{t('workout.discardConfirm')}</button>
          ) : (
            <button type="button" onClick={() => setConfirmDiscard(true)} data-testid="finish-discard" className="min-h-11 px-2 text-[14px] text-ink-secondary">{t('workout.discard')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
