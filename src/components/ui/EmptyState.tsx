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
        'panel float rise mx-auto max-w-lg px-6 py-12 text-center sm:py-16',
        className,
      )}
    >
      {/*
       * Ein Ring statt eines Symbols: der Leerzustand ist der Anfang des
       * Profils, und der Orb ist die Form, in der das Profil später steht.
       * Damit ist die leere Seite schon Teil desselben Systems und nicht
       * eine Fehlerseite mit einem Achtungszeichen.
       */}
      <span
        aria-hidden
        className="mx-auto mb-6 flex size-14 items-center justify-center rounded-pill border border-accent/25"
      >
        <span className="size-2.5 rounded-pill bg-accent" />
      </span>
      <h1 className="font-display text-[26px] leading-tight font-bold sm:text-[32px]">{title}</h1>
      <p className="mx-auto mt-3 max-w-[38ch] text-[14px] leading-relaxed text-ink-secondary">
        {body}
      </p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
      {secondary && <div className="mt-3 flex justify-center">{secondary}</div>}
    </div>
  )
}
