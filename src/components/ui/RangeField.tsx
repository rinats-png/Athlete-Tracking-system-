import { useId } from 'react'

/**
 * Ein Schieberegler mit Zahl daneben — für Grössen, die wirklich stetig
 * sind: Minuten, Stunden. Für Stufen von 1 bis 5 ist das die falsche
 * Bedienung, siehe TapScale.
 *
 * Die Zahl steht in Mono-Ziffern und ist Teil des Reglers, nicht Dekoration:
 * beim Ziehen sieht man, wo man ist. Ohne sie wäre ein Regler ein Ratespiel.
 */
export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  format,
  className,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  /** Eigene Darstellung des Werts, sonst die Zahl. */
  format?: (value: number) => string
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label-tag">
          {label}
        </label>
        <span className="readout text-[15px]">
          {format ? format(value) : value}
          {unit && <span className="ml-1 text-[12px] text-ink-muted">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full accent-[var(--accent)]"
      />
    </div>
  )
}
