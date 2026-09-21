import { getSupabase, isSupabaseConfigured } from './client'
import { writeDpaAcceptance } from '@/features/auth/account'

/**
 * Die Annahme des Vertrags zur Auftragsverarbeitung — auf dem Server.
 *
 * Der Nachweis nach Art. 28 gehört nicht auf ein Gerät, das morgen gelöscht
 * sein kann: Zeitpunkt und Fassung stehen in `accounts` am Konto des
 * Trainers, geschrieben nur von ihm selbst (RLS: eigene Zeile). Das Gerät
 * hält eine Kopie, damit der Hinweis im Trainerbereich auch ohne Netz
 * stimmt — und holt beim Öffnen der Vertragsseite den Serverstand nach.
 */

export interface DpaState {
  acceptedAt: string | null
  version: string | null
}

export async function fetchDpaState(): Promise<DpaState | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.from('accounts').select('dpa_accepted_at, dpa_version').eq('id', auth.user.id).maybeSingle()
  if (error || !data) return null
  const state: DpaState = {
    acceptedAt: typeof data.dpa_accepted_at === 'string' ? data.dpa_accepted_at : null,
    version: typeof data.dpa_version === 'string' ? data.dpa_version : null,
  }
  writeDpaAcceptance(state.acceptedAt, state.version)
  return state
}

export type AcceptOutcome = { ok: true; acceptedAt: string } | { ok: false; reason: 'not_configured' | 'offline' | 'not_signed_in' | 'failed' }

/** Annehmen: erst der Server, dann die Gerätekopie — nie umgekehrt. */
export async function acceptDpa(version: string): Promise<AcceptOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, reason: 'not_signed_in' }
  const acceptedAt = new Date().toISOString()
  const { error } = await supabase.from('accounts').update({ dpa_accepted_at: acceptedAt, dpa_version: version }).eq('id', auth.user.id)
  if (error) return { ok: false, reason: 'failed' }
  writeDpaAcceptance(acceptedAt, version)
  return { ok: true, acceptedAt }
}
