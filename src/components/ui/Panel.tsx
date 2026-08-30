import { cn } from '@/lib/utils'

/**
 * Grundfläche des Systems. Rechteckig, Haarlinie, keine Schatten — die
 * Anmutung eines Messgerätegehäuses statt einer Material-Karte.
 */
export function Panel({
  className,
  ticked = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ticked?: boolean }) {
  // min-w-0: eine Fläche ist fast immer Kind eines Rasters. Ohne die Angabe
  // bestimmt ihr breitester Inhalt die Spaltenbreite, und ein einziger langer
  // Satz schiebt die ganze Seite seitlich aus dem Bildschirm.
  return <div className={cn('panel min-w-0', ticked && 'panel-ticked', className)} {...props} />
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
