import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * Kopfzeile der App-Hülle. Bleibt beim Scrollen stehen, weil die
 * Moduswahl darunter ständig gebraucht wird.
 */
export function AppHeader({ demo }: { demo: boolean }) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-plane/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Wordmark />
        <div className="hidden min-w-0 flex-1 sm:block">
          <span className="label-tag">{t('app.tagline')}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {demo && (
            <span className="hidden border border-line px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted sm:inline-block">
              {t('badges.demo')}
            </span>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      {/* Die Marke ist eine Messkurve: Grundlinie, Ausschlag, neue Grundlinie. */}
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect width="32" height="32" rx="2" fill="var(--ink)" />
        <path
          d="M5 21h4l4-11 4 16 4-13 2 8h4"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="square"
        />
      </svg>
      <span className="font-display text-[19px] font-bold uppercase tracking-[0.16em]">
        Baseline
      </span>
    </div>
  )
}
