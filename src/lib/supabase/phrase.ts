import { getSupabase, isSupabaseConfigured } from './client'
import { passesGuard } from '@/domain/answerGuard'
import type { Fact } from '@/domain/askKydon'
import { NAME_TOKEN, sanitizeFacts, type PhraseKind } from '../../../supabase/functions/_shared/phrase'

/**
 * Sprachmodell-Texte (docs/ask-kydon.md): optional, nur mit Konto, Pro und
 * Bau-Schalter. Jede Störung führt zur festen Vorlage — nie zu einem Fehler.
 *
 * Der Client ist die letzte Wache: er bereinigt die Fakten vor dem Senden
 * (Namen und Freitext gehen nie raus) und prüft die Antwort mit dem
 * Zahlenwächter, bevor sie angezeigt wird.
 */

export const phraseEnabled = (): boolean => import.meta.env?.VITE_AI_PHRASE === 'on'

export type PhraseOutcome = { source: 'model'; text: string; used: number | null; limit: number | null } | { source: 'template'; reason: 'disabled' | 'unavailable' | 'not_entitled' | 'limit_reached' | 'rejected' | 'failed' }

export async function phraseFacts(kind: PhraseKind, locale: string, facts: Fact[], opts: { name?: string } = {}): Promise<PhraseOutcome> {
  if (!phraseEnabled()) return { source: 'template', reason: 'disabled' }
  if (!isSupabaseConfigured()) return { source: 'template', reason: 'unavailable' }
  // Namen und anderer Freitext gehen nie raus; was übrig bleibt, prüft die gemeinsame Regel.
  const clean = sanitizeFacts(facts.map((f) => ({ key: f.key, params: Object.fromEntries(Object.entries(f.params).filter(([k]) => k !== 'name')) })))
  if (!clean) return { source: 'template', reason: 'rejected' }
  try {
    const supabase = await getSupabase()
    if (!supabase) return { source: 'template', reason: 'unavailable' }
    const { data, error } = await supabase.functions.invoke('phrase', { body: { kind, locale, facts: clean } })
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      return { source: 'template', reason: status === 403 ? 'not_entitled' : status === 429 ? 'limit_reached' : 'failed' }
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
