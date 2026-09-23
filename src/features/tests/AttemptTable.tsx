import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatNumber } from '@/lib/format'
import type { AttemptSelection } from '@/lib/store/schema'
import { INVALID_REASONS } from '@/data/protocolV1'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'

/**
 * Erfassung mehrerer Versuche.
 *
 * Alle Versuche werden aufbewahrt, nicht nur der gewertete. Ohne die
 * verworfenen Versuche lässt sich später weder die Tagesform beurteilen noch
 * erkennen, ob ein Maximum sauber angesteuert oder erraten wurde — und ein
 * gelöschter Versuch ist nicht rekonstruierbar.
 */
export function AttemptTable({
  attempts,
  onChange,
  selection,
  onSelectionChange,
  valueKey,
  unit,
  invalid = {},
  onInvalidChange,
}: {
  attempts: Record<string, number>[]
  onChange: (next: Record<string, number>[]) => void
  /** Index -> Grund. Ungültige Versuche bleiben stehen, zählen aber nicht. */
  invalid?: Record<number, string>
  onInvalidChange?: (next: Record<number, string>) => void
  selection: AttemptSelection
  onSelectionChange: (next: AttemptSelection) => void
  valueKey: string
  unit: string | null
}) {
  const { t } = useTranslation()

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label-tag">{t('attempts.title')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...attempts, {}])}
          disabled={attempts.length >= 12}
        >
          <Plus size={13} aria-hidden />
          {t('attempts.add')}
        </Button>
      </div>

      {attempts.length === 0 ? (
        <p className="mt-1 text-[12px] leading-snug text-ink-muted">{t('attempts.hint')}</p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {attempts.map((attempt, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-[12px] text-ink-muted tabular-nums">
                  {index + 1}.
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={Number.isFinite(attempt[valueKey]) ? attempt[valueKey] : ''}
                  aria-label={t('attempts.value', { index: index + 1 })}
                  onChange={(e) => {
                    const parsed = e.target.value === '' ? null : Number(e.target.value)
                    const next = [...attempts]
                    next[index] =
                      parsed == null || !Number.isFinite(parsed)
                        ? {}
                        : { ...next[index], [valueKey]: parsed }
                    onChange(next)
                  }}
                  className="h-11 min-w-0 flex-1 border border-line bg-surface-sunken px-3 text-[16px]"
                />
                {unit && <span className="shrink-0 text-[12px] text-ink-muted">{unit}</span>}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('attempts.remove', { index: index + 1 })}
                  onClick={() => {
                    onChange(attempts.filter((_, i) => i !== index))
                    // Markierungen hinter dem gelöschten Versuch rücken nach.
                    if (onInvalidChange) {
                      const next: Record<number, string> = {}
                      for (const [key, reason] of Object.entries(invalid)) {
                        const i = Number(key)
                        if (i < index) next[i] = reason
                        else if (i > index) next[i - 1] = reason
                      }
                      onInvalidChange(next)
                    }
                  }}
                >
                  <Trash2 size={14} aria-hidden />
                </Button>
                {onInvalidChange && (
                  <select
                    value={invalid[index] ?? ''}
                    aria-label={t('attempts.validity', { index: index + 1 })}
                    onChange={(e) => {
                      const next = { ...invalid }
                      if (e.target.value === '') delete next[index]
                      else next[index] = e.target.value
                      onInvalidChange(next)
                    }}
                    className={cn(
                      'h-11 w-28 shrink-0 border border-line bg-surface-sunken px-2 text-[13px]',
                      invalid[index] != null && 'border-critical text-critical',
                    )}
                  >
                    <option value="">{t('attempts.valid')}</option>
                    {INVALID_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`attempts.invalid.${r}`)}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3">
            <div>
              <SegmentedControl<AttemptSelection>
                label={t('attempts.selection')}
                value={selection}
                onChange={onSelectionChange}
                options={(['best', 'worst', 'mean', 'median'] as const).map((key) => ({
                  value: key,
                  label: t(`assessments.attempt.${key}`),
                }))}
              />
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">
              {t(`attempts.explain.${selection}`)}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/** Formatierte Anzeige des gewerteten Versuchs. */
export function formatSelected(
  value: number | undefined,
  unit: string | null,
  locale: AppLocale,
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${formatNumber(value, locale, 1)}${unit ? ` ${unit}` : ''}`
}
