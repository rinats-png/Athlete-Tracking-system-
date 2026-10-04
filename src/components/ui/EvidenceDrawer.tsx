import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { FUEL_SOURCES, type FuelEvidence, type SportSpecificity } from '@/data/fuelRules'
import { transferOf } from '@/domain/evidence'

/**
 * Evidence Drawer (Produktdoktrin §12): zu einer Empfehlung die Grundlage
 * auf einen Blick — Stärke, Art, Spezifität, Übertragung auf die Disziplin,
 * Quellen. Zeigt die Evidence Confidence der AUSSAGE; die Datenlage der
 * Person steht woanders und wird nicht eingerechnet.
 */
export function EvidenceDrawer({
  recommendation,
  evidence,
  specificity,
  appliedTo,
}: {
  recommendation: string
  evidence: FuelEvidence
  specificity: SportSpecificity
  appliedTo: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const row = (label: string, value: string, id: string) => (
    <div className="flex justify-between gap-4 border-t border-line py-2 first:border-t-0" data-testid={id}>
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="evidence-open"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-11 items-center rounded-pill border border-line px-4 text-[12px] hover:bg-surface-sunken"
      >
        {t('evidence.drawer.open')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-stretch sm:justify-end" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('evidence.drawer.title')}
            data-testid="evidence-drawer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-xl bg-surface p-4 sm:max-h-none sm:w-[420px] sm:rounded-none"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-[20px] font-bold">{t('evidence.drawer.title')}</h2>
              <button ref={closeRef} type="button" onClick={close} aria-label={t('evidence.drawer.close')} className="grid size-11 place-items-center rounded-pill hover:bg-surface-sunken">
                <X size={18} aria-hidden />
              </button>
            </div>
            <dl className="mt-2 text-[14px]">
              {row(t('evidence.drawer.recommendation'), recommendation, 'evidence-recommendation')}
              {row(t('evidence.drawer.strength'), t(`fueling.rule.evidence.strength.${evidence.strength}`), 'evidence-strength')}
              {row(t('evidence.drawer.type'), t(`fueling.rule.evidence.type.${evidence.type}`), 'evidence-type')}
              {row(t('evidence.drawer.specificity'), t(`fueling.rule.evidence.specificity.${specificity}`), 'evidence-specificity')}
              {row(t('evidence.drawer.appliedTo'), appliedTo, 'evidence-applied')}
              {row(t('evidence.drawer.transfer'), t(`evidence.drawer.transferValue.${transferOf(specificity)}`), 'evidence-transfer')}
              {row(t('evidence.drawer.verification'), t(`fueling.rule.evidence.verification.${evidence.verification}`), 'evidence-verification')}
              {row(t('evidence.drawer.version'), t('fueling.rule.version', { version: evidence.ruleVersion, date: evidence.reviewed }), 'evidence-version')}
            </dl>
            <h3 className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{t('evidence.drawer.sources')}</h3>
            <ul className="mt-1 space-y-1 text-[12px] leading-relaxed text-ink-secondary" data-testid="evidence-sources">
              {evidence.sourceIds.map((id) => {
                const src = FUEL_SOURCES[id]
                if (!src) return null
                return (
                  <li key={id}>
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                        {src.citation}
                      </a>
                    ) : (
                      src.citation
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">{t('evidence.drawer.note')}</p>
          </div>
        </div>
      )}
    </>
  )
}
