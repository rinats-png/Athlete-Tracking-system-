import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Grundfläche des Systems.
 *
 * Drei Zustände, und jeder sagt etwas über den Inhalt:
 *
 *   (nichts)  Ebene 1 — die Fläche trägt Kontext und liegt ruhig.
 *   float     Ebene 2 — die Fläche trägt einen Messwert und hebt sich ab.
 *   lift      sie reagiert auf Berührung, weil sie anklickbar IST.
 *
 * `lift` ohne eine tatsächliche Aktion wäre eine Lüge über die
 * Bedienbarkeit: eine Fläche, die sich hebt und nichts tut, wird angetippt.
 */
export function Panel({
  className,
  ticked = false,
  float = false,
  lift = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ticked?: boolean
  float?: boolean
  lift?: boolean
}) {
  // min-w-0: eine Fläche ist fast immer Kind eines Rasters. Ohne die Angabe
  // bestimmt ihr breitester Inhalt die Spaltenbreite, und ein einziger langer
  // Satz schiebt die ganze Seite seitlich aus dem Bildschirm.
  return (
    <div
      className={cn(
        'panel min-w-0',
        ticked && 'panel-ticked',
        float && 'float',
        lift && 'float-lift',
        className,
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  title,
  subtitle,
  note,
  action,
  className,
}: {
  title: string
  /** Kurze Angabe, die man zum Lesen der Fläche braucht (Anzahl, Datum, Einheit). */
  subtitle?: string
  /** Erklärung eine Ebene tiefer: ein ⓘ neben dem Titel klappt sie auf. */
  note?: string
  action?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <h2 className="label-tag">{title}</h2>
          {note && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={id}
              aria-label={`${t('look.info')}: ${title}`}
              onClick={() => setOpen((o) => !o)}
              data-testid="panel-info"
              className={cn('-my-3 inline-flex size-11 shrink-0 items-center justify-center rounded-pill', open ? 'text-accent-text' : 'text-ink-muted')}
            >
              <Info size={15} aria-hidden />
            </button>
          )}
        </div>
        {subtitle && (
          // Kein `truncate`: der Untertitel erklärt, was die Fläche zeigt.
          // Abgeschnitten wäre die Erklärung weg — und die Nichtumbruch-Regel
          // machte den Text zugleich zur breitesten Stelle der Seite.
          <p className="mt-1 text-[13px] leading-snug text-ink-secondary">{subtitle}</p>
        )}
        {note && (
          <p id={id} hidden={!open} className="mt-1 max-w-[62ch] text-[13px] leading-snug text-ink-secondary">
            {note}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
