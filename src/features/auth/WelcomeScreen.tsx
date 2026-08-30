import { useTranslation } from 'react-i18next'
import { ArrowRight, PlayCircle, ShieldCheck } from 'lucide-react'
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
export function WelcomeScreen({ onEnter }: { onEnter: (mode: 'guest' | 'demo') => void }) {
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
                {/* Der Weg hinein führt ohne Konto und ohne Datenerfassung.
                    Anmeldung folgt später und ersetzt nur die Datenschicht. */}
                <GlassButton variant="primary" onClick={() => onEnter('guest')}>
                  <ShieldCheck size={16} strokeWidth={2} aria-hidden />
                  {t('welcome.startLocal')}
                </GlassButton>
                <GlassButton onClick={() => onEnter('demo')}>
                  <PlayCircle size={16} strokeWidth={2} aria-hidden />
                  {t('welcome.viewDemo')}
                </GlassButton>
              </div>

              <div
                className="mt-5 flex items-start gap-2 pt-4 text-[12px] leading-relaxed text-ink-secondary"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                <ShieldCheck size={15} className="mt-px shrink-0 text-accent-text" aria-hidden />
                <span>{t('welcome.privacy')}</span>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
                {t('welcome.accountLater')}
                <ArrowRight size={13} strokeWidth={2} aria-hidden />
              </p>
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
  onClick,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'glass'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

