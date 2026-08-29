import { useTranslation } from 'react-i18next'
import { ArrowRight, Apple, Mail } from 'lucide-react'
import { Atmosphere } from './Atmosphere'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

/**
 * Willkommensbildschirm.
 *
 * Kein zentriertes Formular auf weissem Grund: der Einstieg ist eine
 * Milchglasfläche über einer atmosphärischen Szene, mit der Körperfigur als
 * Wasserzeichen. Die Eingabefelder kommen erst nach der Wahl des Verfahrens —
 * der erste Bildschirm verkauft, er fragt noch nichts ab.
 */
export function WelcomeScreen({ onDemo }: { onDemo: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="relative min-h-dvh overflow-hidden bg-plane">
      <Atmosphere />

      <div className="relative flex min-h-dvh flex-col px-4 pt-4 pb-6 sm:px-6">
        <header className="flex items-center justify-between">
          <span className="font-display text-[17px] font-bold tracking-[0.18em] uppercase">
            Baseline
          </span>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-end justify-center">
          <div className="w-full max-w-[440px]">
            {/* Die Glasfläche. Der Rand ist heller als die Füllung — so liest
                sich eine Glaskante, ohne dass ein harter Rahmen entsteht. */}
            <div
              className="relative overflow-hidden rounded-[20px] p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-7"
              style={{
                background:
                  'linear-gradient(158deg, var(--glass-strong), var(--glass))',
                border: '1px solid var(--glass-border)',
              }}
            >
              {/* Lichtkante oben — daran erkennt das Auge eine Glasscheibe. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, var(--glass-edge), transparent)',
                }}
              />
              <span className="label-tag">{t('welcome.eyebrow')}</span>
              <h1 className="mt-3 font-display text-[34px] leading-[0.98] font-bold tracking-[0.005em] sm:text-[44px]">
                {t('welcome.headline')}
              </h1>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-ink-secondary">
                {t('welcome.body')}
              </p>

              <div className="mt-6 space-y-2">
                <GlassButton variant="primary">
                  <Mail size={15} strokeWidth={2} aria-hidden />
                  {t('welcome.continueEmail')}
                </GlassButton>
                <div className="grid grid-cols-2 gap-2">
                  <GlassButton>
                    <Apple size={15} strokeWidth={2} aria-hidden />
                    Apple
                  </GlassButton>
                  <GlassButton>
                    <GoogleMark />
                    Google
                  </GlassButton>
                </div>
              </div>

              <div
                className="mt-5 flex items-center justify-between pt-4 text-[13px]"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                <button type="button" className="text-ink-secondary hover:text-ink">
                  {t('welcome.haveAccount')}
                </button>
                <button
                  type="button"
                  onClick={onDemo}
                  className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:opacity-80"
                >
                  {t('welcome.viewDemo')}
                  <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            </div>

            <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-ink-muted">
              {t('welcome.legal')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GlassButton({
  children,
  variant = 'glass',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'glass'
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-[12px] font-display text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors',
        variant === 'primary'
          ? 'bg-accent text-accent-ink hover:bg-accent/85'
          : 'text-ink backdrop-blur-md hover:brightness-110',
      )}
      style={
        variant === 'glass'
          ? { background: 'var(--glass)', border: '1px solid var(--glass-border)' }
          : undefined
      }
    >
      {children}
    </button>
  )
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.06-1.36-.18-2H12v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.31Z"
      />
      <path
        fill="currentColor"
        opacity=".75"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        opacity=".55"
        d="M6.41 13.9a6 6 0 0 1 0-3.8V7.5H3.06a10 10 0 0 0 0 9l3.35-2.6Z"
      />
      <path
        fill="currentColor"
        opacity=".85"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.94 5.5l3.35 2.6C7.2 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  )
}
