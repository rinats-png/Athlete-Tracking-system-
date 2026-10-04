import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

/** Wochentage zum Antippen: mehrere wählbar. */
export function DayChips({ label, value, onChange, testId }: { label: string; value: number[]; onChange: (v: number[]) => void; testId: string }) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={label} data-testid={testId}>
      <span className="label-tag">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {DAYS.map((d) => {
          const on = value.includes(d)
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              data-testid={`${testId}-${d}`}
              onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
              className={cn('min-h-11 min-w-11 rounded-pill border px-3 text-[13px]', on ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line hover:bg-surface-sunken')}
            >
              {t(`plan.day.${d}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
