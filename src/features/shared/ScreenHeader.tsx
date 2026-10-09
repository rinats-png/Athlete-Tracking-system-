import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Kopf eines Bereichs: Kennung, Titel, optional Aktionen.
 *
 * Die Einleitung steht eine Ebene tiefer (Neugestaltung «weniger Text»):
 * ein kleines ⓘ neben dem Titel klappt sie auf. Sichtbar bleibt nur, was
 * man zum Bedienen braucht.
 */
export function ScreenHeader({
  eyebrow,
  title,
  intro,
  action,
  art,
  className,
}: {
  eyebrow: string
  title: string
  intro?: string
  action?: React.ReactNode
  /** Ein Bild links vom Text — die Sportart als Motiv. */
  art?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <header className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      {art}
      <div className="min-w-0 flex-1">
        <span className="label-tag">{eyebrow}</span>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-display text-[30px] leading-none font-bold sm:text-[38px]">{title}</h1>
          {intro && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={id}
              aria-label={t('look.info')}
              onClick={() => setOpen((o) => !o)}
              data-testid="header-info"
              className={cn('-my-2 inline-flex size-11 shrink-0 items-center justify-center rounded-pill', open ? 'text-accent-text' : 'text-ink-muted')}
            >
              <Info size={17} aria-hidden />
            </button>
          )}
        </div>
        {intro && (
          <p id={id} hidden={!open} className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-ink-secondary">
            {intro}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </header>
  )
}
