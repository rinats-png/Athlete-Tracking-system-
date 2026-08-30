import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Zahleneingabe für Messwerte.
 *
 * `inputMode="decimal"` blendet auf dem Telefon die Zifferntastatur ein — bei
 * Werteingabe in der Halle der Unterschied zwischen zwei und sechs Tipps.
 * Die Höhe von 44 px ist die Untergrenze für zuverlässiges Treffen.
 */
export function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  required = false,
  className,
}: {
  label: string
  unit?: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  required?: boolean
  className?: string
}) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="label-tag">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <div className="mt-1.5 flex items-center border border-line bg-surface-sunken focus-within:border-accent">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          required={required}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            const parsed = Number(raw)
            onChange(Number.isFinite(parsed) ? parsed : null)
          }}
          className={cn(
            'readout h-11 w-full bg-transparent px-3 text-[16px] outline-none',
            // 16 px verhindert den Auto-Zoom von iOS Safari beim Fokus.
          )}
        />
        {unit && <span className="px-3 text-[12px] text-ink-muted">{unit}</span>}
      </div>
      {(min != null || max != null) && (
        <p className="mt-1 text-[11px] text-ink-muted">
          {min ?? '—'} – {max ?? '—'} {unit}
        </p>
      )}
    </div>
  )
}
