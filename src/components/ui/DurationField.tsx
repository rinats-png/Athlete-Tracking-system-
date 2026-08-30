import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ValidationIssue } from '@/domain/validation'

/**
 * Zeiteingabe in Minuten und Sekunden.
 *
 * Ein einzelnes Sekundenfeld wäre für eine 2000-m-Zeit unbrauchbar — niemand
 * denkt in 402 Sekunden, sondern in 6:42. Nach aussen bleibt der Wert
 * Sekunden, damit Speicher und Rechnung eine Einheit haben.
 */
export function DurationField({
  label,
  value,
  onChange,
  required = false,
  issues = [],
}: {
  label: string
  value: number | null
  onChange: (seconds: number | null) => void
  required?: boolean
  issues?: ValidationIssue[]
}) {
  const id = useId()
  const { t } = useTranslation()
  const errors = issues.filter((issue) => issue.severity === 'error')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')

  // Von aussen gesetzte Werte (z. B. Zurücksetzen) in die Felder spiegeln.
  useEffect(() => {
    if (value == null) {
      setMinutes('')
      setSeconds('')
      return
    }
    setMinutes(String(Math.floor(value / 60)))
    setSeconds((value % 60).toFixed(value % 1 === 0 ? 0 : 2))
  }, [value])

  const push = (m: string, s: string) => {
    if (m === '' && s === '') return onChange(null)
    const total = (Number(m) || 0) * 60 + (Number(s) || 0)
    onChange(Number.isFinite(total) && total > 0 ? total : null)
  }

  return (
    <div>
      <label htmlFor={id} className="label-tag">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          placeholder="min"
          value={minutes}
          min={0}
          onChange={(e) => {
            setMinutes(e.target.value)
            push(e.target.value, seconds)
          }}
          className="readout h-11 w-full border border-line bg-surface-sunken px-3 text-[16px] outline-none focus:border-accent"
        />
        <span className="readout text-ink-muted">:</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="sek"
          value={seconds}
          min={0}
          max={59.99}
          step={0.01}
          onChange={(e) => {
            setSeconds(e.target.value)
            push(minutes, e.target.value)
          }}
          className="readout h-11 w-full border border-line bg-surface-sunken px-3 text-[16px] outline-none focus:border-accent"
        />
      </div>
      {errors.length > 0 && (
        <p role="alert" className="mt-1 text-[11px] text-critical">
          {errors.map((issue) => t(issue.messageKey, issue.values)).join(' · ')}
        </p>
      )}
    </div>
  )
}
