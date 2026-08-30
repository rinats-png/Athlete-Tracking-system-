import { cn } from '@/lib/utils'

/**
 * Leerzustand.
 *
 * Bewusst als eigene Komponente: ein Diagnostikwerkzeug ist am Anfang immer
 * leer, und ein leeres Radar wäre kein Fehler, sondern nur unverständlich.
 * Der Leerzustand sagt deshalb, was zu tun ist, statt eine Null zu zeichnen.
 */
export function EmptyState({
  title,
  body,
  action,
  secondary,
  className,
}: {
  title: string
  body: string
  action?: React.ReactNode
  secondary?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'panel panel-ticked mx-auto max-w-lg px-6 py-12 text-center sm:py-16',
        className,
      )}
    >
      <h1 className="font-display text-[26px] leading-tight font-bold sm:text-[32px]">{title}</h1>
      <p className="mx-auto mt-3 max-w-[38ch] text-[14px] leading-relaxed text-ink-secondary">
        {body}
      </p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
      {secondary && <div className="mt-3 flex justify-center">{secondary}</div>}
    </div>
  )
}
