import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const active = i18n.resolvedLanguage === 'en' ? 'en' : 'de'

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className="inline-flex border border-line bg-surface-sunken p-[2px]"
    >
      {(['de', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={active === code}
          onClick={() => void i18n.changeLanguage(code)}
          className={cn(
            'h-7 px-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
            active === code ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
