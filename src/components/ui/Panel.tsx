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
  return <div className={cn('panel', ticked && 'panel-ticked', className)} {...props} />
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
          <p className="mt-1 truncate text-[13px] text-ink-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
