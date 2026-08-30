import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AthleteSwitcher } from '@/features/coach/AthleteSwitcher'
import { NAV_ITEMS, type NavKey } from './BottomNav'
import { cn } from '@/lib/utils'

/**
 * Kopfzeile der App-Hülle. Bleibt beim Scrollen stehen, weil die
 * Moduswahl darunter ständig gebraucht wird.
 */
export function AppHeader({
  mode,
  active = 'dashboard',
  onNavigate,
}: {
  /** 'guest' = lokale Daten ohne Konto, 'demo' = mitgelieferter Beispielsatz. */
  mode: 'guest' | 'demo'
  active?: NavKey
  onNavigate?: (key: NavKey) => void
}) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-plane/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Wordmark />
        <div className="hidden min-w-0 flex-1 sm:block">
          <span className="label-tag lg:hidden">{t('app.tagline')}</span>

          {/* Ab lg übernimmt die Kopfzeile die Navigation von der Leiste.
              Unterhalb bleibt die Leiste zuständig — so gibt es auf jeder
              Breite genau eine sichtbare Navigation. */}
          <nav aria-label={t('nav.primary')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map(({ key }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(key)}
                    aria-current={active === key ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center rounded-[2px] px-3 font-display text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors',
                      active === key
                        ? 'text-ink'
                        : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {t(`nav.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AthleteSwitcher />
          <span
            className="hidden border border-line px-2 py-1 font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-muted sm:inline-block"
            title={t(mode === 'demo' ? 'badges.demoHint' : 'badges.guestHint')}
          >
            {t(mode === 'demo' ? 'badges.demo' : 'badges.guest')}
          </span>
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
