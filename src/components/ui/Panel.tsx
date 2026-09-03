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
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="label-tag">{title}</h2>
        {subtitle && (
          // Kein `truncate`: der Untertitel erklärt, was die Fläche zeigt.
          // Abgeschnitten wäre die Erklärung weg — und die Nichtumbruch-Regel
          // machte den Text zugleich zur breitesten Stelle der Seite.
          <p className="mt-1 text-[13px] leading-snug text-ink-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
