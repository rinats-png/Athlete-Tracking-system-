import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Fact } from '@/domain/askKydon'
import { phraseEnabled, phraseFacts, type PhraseOutcome } from '@/lib/supabase/phrase'
import type { PhraseKind } from '../../supabase/functions/_shared/phrase'

/**
 * «Als Text formulieren»: optionale Umformulierung der Fakten durch ein
 * Sprachmodell. Ohne Bau-Schalter erscheint nichts. Besteht der Text den
 * Zahlenwächter nicht oder fehlt Konto, Stufe oder Netz, bleibt die feste
 * Vorlage stehen und ein kurzer Satz sagt warum.
 */
export function PhraseButton({
  kind,
  facts,
  name,
  onText,
}: {
  kind: PhraseKind
  facts: Fact[]
  name?: string
  /** Statt das Ergebnis hier zu zeigen, den Text weitergeben (Entwurf im Textfeld). */
  onText?: (text: string) => void
}) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<PhraseOutcome | null>(null)
  if (!phraseEnabled()) return null
  const run = async () => {
    setBusy(true)
    const result = await phraseFacts(kind, (i18n.resolvedLanguage ?? i18n.language ?? 'de').slice(0, 2), facts, { name })
    setBusy(false)
    setOutcome(result)
    if (result.source === 'model') onText?.(result.text)
  }
  return (
    <div className="px-4 pb-3" data-testid="phrase">
      <button type="button" disabled={busy} onClick={() => void run()} data-testid="phrase-run" className="min-h-11 rounded-pill border border-line px-4 text-[13px] hover:bg-surface-sunken disabled:opacity-50">
        {t('phrase.button')}
      </button>
      {outcome?.source === 'model' && !onText && (
        <div className="mt-2 rounded-md border border-line p-3 text-[14px] leading-relaxed" data-testid="phrase-text">
          <p>{outcome.text}</p>
          <p className="mt-2 text-[11px] text-ink-muted">
            {t('phrase.note')}
            {outcome.used != null && outcome.limit != null && ` ${t('phrase.usage', { used: outcome.used, limit: outcome.limit })}`}
          </p>
        </div>
      )}
      {outcome?.source === 'model' && onText && <p className="mt-1 text-[11px] text-ink-muted">{t('phrase.note')}</p>}
      {outcome?.source === 'template' && (
        <p className="mt-2 text-[12px] text-ink-secondary" data-testid="phrase-fallback">
          {t(`phrase.reason.${outcome.reason}`)}
        </p>
      )}
    </div>
  )
}
