import { getSupabase, isSupabaseConfigured } from './client'
import { passesGuard } from '@/domain/answerGuard'
import type { Fact } from '@/domain/askKydon'
import { NAME_TOKEN, PHRASE_KINDS_ENABLED, sanitizeFacts, type PhraseKind } from '../../../supabase/functions/_shared/phrase'
import { aiConsentState, forgetAiConsent } from '@/lib/aiConsent'

/**
 * Sprachmodell-Texte (docs/ask-kydon.md): optional, nur mit Konto, Pro und
 * Bau-Schalter. Jede Störung führt zur festen Vorlage — nie zu einem Fehler.
 *
 * Der Client ist die letzte Wache: er bereinigt die Fakten vor dem Senden
 * (Namen und Freitext gehen nie raus) und prüft die Antwort mit dem
 * Zahlenwächter, bevor sie angezeigt wird.
 */

export const phraseEnabled = (): boolean => import.meta.env?.VITE_AI_PHRASE === 'on'

export type PhraseOutcome = { source: 'model'; text: string; used: number | null; limit: number | null } | { source: 'template'; reason: 'disabled' | 'unavailable' | 'not_entitled' | 'limit_reached' | 'rejected' | 'failed' | 'no_consent' }

export async function phraseFacts(kind: PhraseKind, locale: string, facts: Fact[], opts: { name?: string } = {}): Promise<PhraseOutcome> {
  if (!phraseEnabled()) return { source: 'template', reason: 'disabled' }
  if (!PHRASE_KINDS_ENABLED.includes(kind)) return { source: 'template', reason: 'disabled' }
  if (!isSupabaseConfigured()) return { source: 'template', reason: 'unavailable' }
  // Ohne Einwilligung geht nichts raus — auch kein Versuch, den der Server ablehnen würde.
  if (aiConsentState() !== 'granted') return { source: 'template', reason: 'no_consent' }
  // Namen und anderer Freitext gehen nie raus; was übrig bleibt, prüft die gemeinsame Regel.
  const clean = sanitizeFacts(facts.map((f) => ({ key: f.key, params: Object.fromEntries(Object.entries(f.params).filter(([k]) => k !== 'name')) })))
  if (!clean) return { source: 'template', reason: 'rejected' }
  try {
    const supabase = await getSupabase()
    if (!supabase) return { source: 'template', reason: 'unavailable' }
    const { data, error } = await supabase.functions.invoke('phrase', { body: { kind, locale, facts: clean } })
    if (error) {
      const context = (error as { context?: Response }).context
      const status = context?.status
      if (status === 403) {
        const code = await context?.json().then((b: { error?: string }) => b?.error).catch(() => undefined)
        if (code === 'no_consent') {
          // Der Server kennt keine gültige Einwilligung: beim nächsten Tipp neu fragen.
          forgetAiConsent()
          return { source: 'template', reason: 'no_consent' }
        }
        if (code === 'kind_disabled') return { source: 'template', reason: 'disabled' }
        return { source: 'template', reason: 'not_entitled' }
      }
      return { source: 'template', reason: status === 429 ? 'limit_reached' : 'failed' }
    }
    let text = typeof data?.text === 'string' ? data.text : ''
    if (!text) return { source: 'template', reason: 'failed' }
    // Der Platzhalter zählt nicht als Zahl; der Name kommt erst hier hinein.
    const guardText = text.split(NAME_TOKEN).join(' ')
    if (!passesGuard(guardText, facts)) return { source: 'template', reason: 'rejected' }
    if (kind === 'draft') text = text.split(NAME_TOKEN).join(opts.name ?? '')
    return { source: 'model', text, used: typeof data?.used === 'number' ? data.used : null, limit: typeof data?.limit === 'number' ? data.limit : null }
  } catch {
    return { source: 'template', reason: 'failed' }
  }
}
