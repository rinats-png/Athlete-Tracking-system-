import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { consentState, onConsentChange, setConsent, type ConsentState } from '@/lib/analytics'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Die Frage nach der Nutzungsstatistik.
 *
 * EIN STREIFEN, KEIN FENSTER. Er liegt über dem Inhalt im Fluss der Seite,
 * verdeckt nichts und blockiert nichts — die App ist ohne Antwort voll
 * benutzbar. Ohne Antwort wird nicht gezählt.
 *
 * WARUM SCHON AUF DEM ERSTEN BILDSCHIRM: Die ehrlichste Frage an diese
 * Statistik ist «wo springen Leute ab», und die meisten springen im
 * Einstieg ab. Stünde die Frage erst auf der Übersicht, sähe man genau
 * diesen Teil nie.
 *
 * GLEICH GEWICHTET. «Nein» ist kein grauer Link neben einem leuchtenden
 * «Ja», sondern ein Knopf derselben Grösse. Eine Einwilligung, die man durch
 * Gestaltung erschleicht, ist keine.
 */
export function AnalyticsConsentStrip() {
  const { t } = useTranslation()
  const [state, setState] = useState<ConsentState>(() => consentState())
  useEffect(() => onConsentChange(setState), [])

  if (!isSupabaseConfigured() || state !== 'unset') return null

  return (
    <section
      role="region"
      aria-label={t('analytics.consent.title')}
      data-testid="analytics-consent"
      className="mb-4 border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed"
    >
      <p className="font-medium">{t('analytics.consent.title')}</p>
      <p className="mt-1 max-w-[70ch] text-ink-secondary">{t('analytics.consent.body')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setConsent('granted')}>
          {t('analytics.consent.yes')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConsent('denied')}>
          {t('analytics.consent.no')}
        </Button>
        <Link to="/datenschutz" className="text-[12px] text-ink-muted underline underline-offset-2">
          {t('analytics.consent.more')}
        </Link>
      </div>
    </section>
  )
}

/**
 * Derselbe Schalter im Profil — dauerhaft, damit man die Antwort ändern
 * kann. Ein Widerruf muss so leicht sein wie die Einwilligung.
 */
export function AnalyticsConsentSetting() {
  const { t } = useTranslation()
  const [state, setState] = useState<ConsentState>(() => consentState())
  useEffect(() => onConsentChange(setState), [])
  if (!isSupabaseConfigured()) return null

  return (
    <div className="text-[13px] leading-relaxed" data-testid="analytics-setting">
      <p className="font-medium">{t('analytics.setting.title')}</p>
      <p className="mt-1 max-w-[62ch] text-ink-secondary">{t('analytics.consent.body')}</p>
      <p className="mt-2 text-ink-muted">
        {state === 'granted' ? t('analytics.setting.on') : state === 'denied' ? t('analytics.setting.off') : t('analytics.setting.unset')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={state === 'granted'} onClick={() => setConsent('granted')}>
          {t('analytics.consent.yes')}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={state === 'denied'} onClick={() => setConsent('denied')}>
          {t('analytics.consent.no')}
        </Button>
      </div>
    </div>
  )
}
