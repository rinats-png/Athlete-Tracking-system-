import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValidatedContext } from '@/lib/store/schema'

/**
 * Bedingungen der Messung (§27).
 *
 * Eingeklappt, weil es beim allergrössten Teil der Tests egal ist — und
 * ausklappbar, weil es beim Rest den Unterschied macht: ein Sprint auf
 * nassem Rasen und einer auf der Bahn sind zwei verschiedene Messungen, und
 * ohne die Angabe sieht der Unterschied später wie Formverlust aus.
 *
 * Nichts davon ist ein Pflichtfeld.
 */
export function ContextFields({
  value,
  onChange,
}: {
  value: Partial<ValidatedContext>
  onChange: (patch: Partial<ValidatedContext>) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const filled = [
    value.surface,
    value.equipment,
    value.trainingStatus,
    value.temperatureC != null ? String(value.temperatureC) : '',
    value.timeOfDay ?? '',
  ].filter(Boolean).length

  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
      >
        <span className="label-tag">
          {t('context.title')}
          {filled > 0 && ` · ${t('context.filled', { count: filled })}`}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {!open && <p className="text-[12px] leading-snug text-ink-muted">{t('context.hint')}</p>}

      {open && (
        <div className="mt-2 space-y-3">
          <label className="block">
            <span className="label-tag">{t('context.surface')}</span>
            <input
              type="text"
              value={value.surface ?? ''}
              maxLength={60}
              placeholder={t('context.surfacePlaceholder')}
              onChange={(e) => onChange({ surface: e.target.value })}
              className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-tag">{t('context.temperature')}</span>
              <input
                type="number"
                inputMode="decimal"
                min={-30}
                max={55}
                step={1}
                value={value.temperatureC ?? ''}
                onChange={(e) =>
                  onChange({ temperatureC: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
              />
            </label>
            <label className="block">
              <span className="label-tag">{t('context.timeOfDay')}</span>
              <input
                type="time"
                value={value.timeOfDay ?? ''}
                onChange={(e) => onChange({ timeOfDay: e.target.value || null })}
                className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
              />
            </label>
          </div>

          <label className="block">
            <span className="label-tag">{t('context.equipment')}</span>
            <input
              type="text"
              value={value.equipment ?? ''}
              maxLength={80}
              placeholder={t('context.equipmentPlaceholder')}
              onChange={(e) => onChange({ equipment: e.target.value })}
              className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
            />
          </label>

          <label className="block">
            <span className="label-tag">{t('context.trainingStatus')}</span>
            <input
              type="text"
              value={value.trainingStatus ?? ''}
              maxLength={60}
              placeholder={t('context.trainingStatusPlaceholder')}
              onChange={(e) => onChange({ trainingStatus: e.target.value })}
              className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
            />
          </label>
        </div>
      )}
    </div>
  )
}
