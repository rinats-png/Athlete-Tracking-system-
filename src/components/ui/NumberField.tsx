import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ValidationIssue } from '@/domain/validation'

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
  issues = [],
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
  /** Meldungen zu genau diesem Feld. */
  issues?: ValidationIssue[]
  className?: string
}) {
  const id = useId()
  const { t } = useTranslation()
  const errorId = `${id}-error`
  const errors = issues.filter((issue) => issue.severity === 'error')

  return (
    <div className={className}>
      <label htmlFor={id} className="label-tag">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <div
        className={cn(
          'mt-1.5 flex items-center border bg-surface-sunken focus-within:border-accent',
          errors.length > 0 ? 'border-critical' : 'border-line',
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          required={required}
          aria-invalid={errors.length > 0 || undefined}
          aria-describedby={errors.length > 0 ? errorId : undefined}
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
      {errors.length > 0 ? (
        // role="alert" statt stiller roter Rahmen: Farbe allein erreicht
        // niemanden, der die Seite vorgelesen bekommt.
        <p id={errorId} role="alert" className="mt-1 text-[11px] text-critical">
          {errors.map((issue) => t(issue.messageKey, issue.values)).join(' · ')}
        </p>
      ) : (
        (min != null || max != null) && (
          <p className="mt-1 text-[11px] text-ink-muted">
            {min ?? '—'} – {max ?? '—'} {unit}
          </p>
        )
      )}
    </div>
  )
}
