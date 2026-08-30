import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className="inline-flex items-stretch border border-line bg-surface-sunken p-[2px]"
    >
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={t(labelKey)}
            onClick={() => setPreference(value)}
            className={cn(
              // 44 px Kantenlänge: die kleinste zuverlässig treffbare Fläche.
              'flex h-11 w-11 items-center justify-center transition-colors',
              selected ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon size={14} strokeWidth={2} aria-hidden />
            <span className="sr-only">{t(labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}
