import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useExtraReady } from '@/features/shared/useExtraReady'
import { isFirstStart, markWhatsNewSeen, pendingReleases } from './whatsNewState'

/**
 * «Neu bei KYDON:» — ein Hinweisfenster, genau einmal je neuem Stand.
 *
 * Es liegt in der App-Hülle und erscheint damit erst nach Anmeldung und
 * Einstieg, nie über Willkommensseite oder Onboarding. Grundlage ist das
 * native `<dialog>`: Fokusfalle, Escape und das Abdunkeln des Hintergrunds
 * kommen vom Browser, ohne Bibliothek.
 *
 * GESEHEN wird beim SCHLIESSEN — egal wie (Knopf, Escape, Tippen daneben).
 * Wird die Seite vorher neu geladen, kommt es noch einmal; wer es nicht
 * gelesen hat, verliert nichts.
 */
export function WhatsNewDialog() {
  const { t } = useTranslation()
  const ready = useExtraReady()
  // Einmal beim Start gelesen, nicht bei jedem Rendern: nach dem Schliessen
  // soll das Fenster nicht neu aufgehen, weil sich die Marke geändert hat.
  const [releases] = useState(() => pendingReleases())
  const [open, setOpen] = useState(releases.length > 0)
  const ref = useRef<HTMLDialogElement>(null)

  // Erststart: die App-Hülle steht, jetzt ist der aktuelle Stand «gesehen».
  useEffect(() => {
    if (isFirstStart()) markWhatsNewSeen()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (ready && open && el && !el.open) el.showModal()
  }, [ready, open])

  if (!open || releases.length === 0 || !ready) return null

  const items = releases.flatMap((r) => r.items)
  const close = () => {
    markWhatsNewSeen()
    setOpen(false)
  }

  return (
    <dialog
      ref={ref}
      data-testid="whats-new"
      aria-labelledby="whats-new-title"
      onClose={close}
      // Tippen auf das abgedunkelte Feld neben dem Fenster schliesst es.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      className="m-auto w-[min(92vw,32rem)] rounded-panel border border-card-border bg-surface-raised p-0 text-ink shadow-elev-3 backdrop:bg-black/50"
    >
      <div className="px-5 pt-5 pb-3">
        <p className="label-tag">{t('whatsNew.eyebrow')}</p>
        <h2 id="whats-new-title" className="mt-1 font-display text-[26px] font-bold uppercase tracking-[0.04em]">
          {t('whatsNew.title')}
        </h2>
      </div>
      <ul className="max-h-[55vh] space-y-2.5 overflow-y-auto px-5 pb-4 text-[14px] leading-relaxed text-ink-secondary" data-testid="whats-new-list">
        {items.map((key) => (
          <li key={key} className="flex gap-2.5">
            <span aria-hidden className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-accent" />
            <span>{t(`whatsNew.items.${key}`)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button type="button" variant="primary" size="sm" autoFocus onClick={() => ref.current?.close()}>
          {t('whatsNew.close')}
        </Button>
      </div>
    </dialog>
  )
}
