import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { aiConsentState, grantAiConsent, onAiConsentChange, retryPendingWithdrawal, withdrawAiConsent, type AiConsentState } from '@/lib/aiConsent'
import { phraseEnabled } from '@/lib/supabase/phrase'

/**
 * Die Frage nach der Einwilligung — bevor zum ersten Mal etwas an den Anbieter
 * des Sprachmodells geht (docs/ki-einwilligung.md).
 *
 * Gestaltet nach den Anforderungen an eine wirksame Einwilligung (Art. 4 Nr. 11,
 * Art. 7 DSGVO): informiert (die fünf Punkte stehen hier, nicht nur in der
 * Erklärung), freiwillig (die App funktioniert ohne, «Nicht jetzt» ist gleich
 * gross), eindeutig (aktiver Tipp, nichts vorausgewählt), widerrufbar (der
 * Weg steht dabei). Das Mindestalter von 16 (Art. 8 DSGVO) bestätigt die
 * Person selbst.
 */
export function AiConsentPanel({ onDone }: { onDone: (granted: boolean) => void }) {
  const { t } = useTranslation()
  const [age, setAge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const points = ['what', 'notSent', 'who', 'label', 'voluntary'] as const

  const accept = async () => {
    setBusy(true)
    setFailed(false)
    const ok = await grantAiConsent(age)
    setBusy(false)
    if (ok) onDone(true)
    else setFailed(true)
  }

  return (
    <div role="dialog" aria-labelledby="ai-consent-title" className="mt-2 rounded-md border border-line p-3 text-[13px] leading-relaxed" data-testid="ai-consent">
      <p id="ai-consent-title" className="font-medium text-ink">{t('aiConsent.title')}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-ink-secondary">
        {points.map((p) => (
          <li key={p}>{t(`aiConsent.point.${p}`)}</li>
        ))}
      </ul>
      <p className="mt-2 text-ink-secondary">
        {t('aiConsent.withdraw')}{' '}
        <Link to="/datenschutz" className="text-accent-text underline underline-offset-2">{t('aiConsent.more')}</Link>
      </p>
      <label className="mt-3 flex min-h-11 items-start gap-3">
        <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} data-testid="ai-consent-age" className="mt-1 h-5 w-5" />
        <span>{t('aiConsent.age')}</span>
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!age || busy} onClick={() => void accept()} data-testid="ai-consent-accept">
          {t('aiConsent.accept')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onDone(false)} data-testid="ai-consent-decline">
          {t('aiConsent.decline')}
        </Button>
      </div>
      {failed && <p role="alert" className="mt-2 text-critical" data-testid="ai-consent-failed">{t('aiConsent.failed')}</p>}
    </div>
  )
}

/** Stand und Widerruf im Profil unter «Daten». */
export function AiConsentSetting() {
  const { t } = useTranslation()
  const [state, setState] = useState<AiConsentState>(() => aiConsentState())
  const [asking, setAsking] = useState(false)
  const [serverMissed, setServerMissed] = useState(false)
  useEffect(() => onAiConsentChange(setState), [])
  useEffect(() => void retryPendingWithdrawal(), [])
  if (!phraseEnabled()) return null

  return (
    <div className="text-[13px] leading-relaxed" data-testid="ai-setting">
      <p className="font-medium">{t('aiConsent.settingTitle')}</p>
      <p className="mt-1 text-ink-muted" data-testid="ai-setting-state">{t(`aiConsent.state.${state}`)}</p>
      {state === 'granted' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          data-testid="ai-withdraw"
          onClick={() => void withdrawAiConsent().then((ok) => setServerMissed(!ok))}
        >
          {t('aiConsent.withdrawButton')}
        </Button>
      ) : asking ? (
        <AiConsentPanel onDone={() => setAsking(false)} />
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-2" data-testid="ai-ask" onClick={() => setAsking(true)}>
          {t('aiConsent.grantButton')}
        </Button>
      )}
      {serverMissed && state === 'withdrawn' && <p className="mt-2 text-ink-secondary">{t('aiConsent.withdrawnLocal')}</p>}
    </div>
  )
}
