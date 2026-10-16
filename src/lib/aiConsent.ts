import { getSupabase } from '@/lib/supabase/client'
import { AI_CONSENT_VERSION } from '../../supabase/functions/_shared/phrase'

/**
 * Einwilligung in die Formulierung durch ein Sprachmodell (docs/ki-einwilligung.md).
 *
 * MASSGEBLICH IST DER SERVER: die Edge Function `phrase` prüft
 * `ai_consents`, bevor sie etwas an den Anbieter schickt. Der Eintrag hier
 * auf dem Gerät ist nur der schnelle Weg, die Frage nicht bei jedem Tipp zu
 * stellen — und die sichere Seite beim Widerruf: wer widerruft, für den geht
 * ab sofort nichts mehr raus, auch wenn der Server gerade nicht erreichbar ist.
 *
 * Eine neue Fassung des Textes (AI_CONSENT_VERSION) gilt als «nicht gefragt».
 */

const KEY = 'kydon.ai.consent.v1'

export type AiConsentState = 'granted' | 'withdrawn' | 'unset'

const listeners = new Set<(s: AiConsentState) => void>()

export function aiConsentState(): AiConsentState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 'unset'
    const v = JSON.parse(raw) as { state?: string; version?: string }
    if (v.state === 'withdrawn') return 'withdrawn'
    return v.state === 'granted' && v.version === AI_CONSENT_VERSION ? 'granted' : 'unset'
  } catch {
    return 'unset'
  }
}

function remember(state: AiConsentState, serverPending = false) {
  try {
    if (state === 'unset') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ state, version: AI_CONSENT_VERSION, at: new Date().toISOString(), serverPending }))
  } catch {
    /* ohne Speicher wird beim nächsten Mal wieder gefragt */
  }
  for (const l of listeners) l(state)
}

export function onAiConsentChange(listener: (s: AiConsentState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Einwilligen. Erst wenn der Server den Nachweis gespeichert hat, gilt sie —
 * eine Einwilligung, die nur im Browser steht, liesse sich nicht belegen.
 */
export async function grantAiConsent(ageConfirmed: boolean): Promise<boolean> {
  if (!ageConfirmed) return false
  try {
    const supabase = await getSupabase()
    if (!supabase) return false
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return false
    const { error } = await supabase.from('ai_consents').upsert(
      { user_id: userId, version: AI_CONSENT_VERSION, granted_at: new Date().toISOString(), withdrawn_at: null, age_confirmed: true },
      { onConflict: 'user_id' },
    )
    if (error) return false
    remember('granted')
    return true
  } catch {
    return false
  }
}

/**
 * Widerrufen (Art. 7 Abs. 3 DSGVO). Auf dem Gerät gilt der Widerruf sofort,
 * auch ohne Verbindung; der Server bekommt ihn, sobald er erreichbar ist.
 * Rückgabe: ob er auch auf dem Server steht.
 */
export async function withdrawAiConsent(): Promise<boolean> {
  remember('withdrawn', true)
  const ok = await sendWithdrawal()
  if (ok) remember('withdrawn', false)
  return ok
}

async function sendWithdrawal(): Promise<boolean> {
  try {
    const supabase = await getSupabase()
    if (!supabase) return false
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return false
    const { error } = await supabase.from('ai_consents').update({ withdrawn_at: new Date().toISOString() }).eq('user_id', userId).is('withdrawn_at', null)
    return !error
  } catch {
    return false
  }
}

/** Ein Widerruf, der den Server noch nicht erreicht hat, wird nachgetragen. */
export async function retryPendingWithdrawal(): Promise<void> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw || !(JSON.parse(raw) as { serverPending?: boolean }).serverPending) return
  } catch {
    return
  }
  if (await sendWithdrawal()) remember('withdrawn', false)
}

/** Der Server kennt keine gültige Einwilligung (neue Fassung, anderes Gerät): neu fragen. */
export function forgetAiConsent(): void {
  if (aiConsentState() === 'granted') remember('unset')
}
