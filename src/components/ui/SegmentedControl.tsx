import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Erscheint als title-Attribut — erklärt die Bedeutung des Modus. */
  hint?: string
}

/**
 * Der Umschalter, der im Dashboard über der Normierung des Radar-Charts sitzt.
 * Als echte Radiogruppe umgesetzt, damit Tastatur und Screenreader ihn als
 * eine Auswahl und nicht als mehrere Schalter lesen.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (next: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex border border-line bg-surface-sunken p-[2px]', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
              selected
                ? 'bg-accent text-accent-ink'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
