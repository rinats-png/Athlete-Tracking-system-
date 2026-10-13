import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from './client'
import {
  SENSITIVE_CONSENT_VERSION,
  chooseSensitiveConsent,
  readSensitiveConsent,
  writeSensitiveConsent,
  type SensitiveConsentKind,
} from '@/lib/sensitiveConsent'

/**
 * Einwilligung in den Abgleich gesundheitsnaher Angaben — der Weg zum Server.
 *
 * `resolveSensitiveConsent` läuft am Anfang jedes Abgleichs und beantwortet
 * genau eine Frage: dürfen gesundheitsnahe Angaben in DIESEM Lauf mit? Ja nur,
 * wenn der Server eine gültige Einwilligung für die aktuelle Fassung kennt.
 * Kann er nicht gefragt werden (Tabelle fehlt, Fehler), lautet die Antwort
 * nein — auf der sicheren Seite bleibt etwas auf dem Gerät, nichts geht zu
 * viel hinaus.
 */

interface ConsentRow {
  version: string
  kind: string
  withdrawn_at: string | null
}

async function pushPending(supabase: SupabaseClient, userId: string, email: string | null): Promise<void> {
  const local = readSensitiveConsent()
  if (!local.pending) return
  // Eine Wahl aus der Registrierung gilt nur für das Konto, für das sie
  // getroffen wurde — nicht für den, der sich danach zufällig anmeldet.
  if (local.email && email && local.email !== email.trim().toLowerCase()) {
    writeSensitiveConsent({ ...local, state: 'unset', pending: false })
    return
  }
  if (local.state === 'granted') {
    const { error } = await supabase.from('sensitive_consents').upsert(
      {
        user_id: userId,
        version: SENSITIVE_CONSENT_VERSION,
        kind: local.kind,
        granted_at: local.at ?? new Date().toISOString(),
        withdrawn_at: null,
        age_confirmed: true,
      },
      { onConflict: 'user_id' },
    )
    if (!error) writeSensitiveConsent({ ...local, pending: false, email: null })
    return
  }
  if (local.state === 'withdrawn') {
    // Ohne Zeile gibt es nichts zu widerrufen; das Update trifft dann nichts.
    const { error } = await supabase
      .from('sensitive_consents')
      .update({ withdrawn_at: local.at ?? new Date().toISOString() })
      .eq('user_id', userId)
      .is('withdrawn_at', null)
    if (!error) writeSensitiveConsent({ ...local, pending: false, email: null })
  }
}

export async function resolveSensitiveConsent(supabase: SupabaseClient, userId: string, email: string | null): Promise<boolean> {
  try {
    await pushPending(supabase, userId, email)
    const local = readSensitiveConsent()
    // Ein Widerruf, der noch nicht oben ist, gilt hier schon.
    if (local.pending) return false

    const { data, error } = await supabase
      .from('sensitive_consents')
      .select('version, kind, withdrawn_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return false
    const row = data as ConsentRow | null
    const valid = row != null && row.version === SENSITIVE_CONSENT_VERSION && row.withdrawn_at == null
    const kind: SensitiveConsentKind = row?.kind === 'coach' ? 'coach' : 'self'
    // Der Server ist die Wahrheit — auch für eine Wahl, die ein anderes Gerät getroffen hat.
    if (valid) {
      if (local.state !== 'granted') writeSensitiveConsent({ state: 'granted', kind, pending: false, ageConfirmed: true, email: null, at: local.at })
    } else if (row?.withdrawn_at) {
      if (local.state !== 'withdrawn') writeSensitiveConsent({ state: 'withdrawn', kind, pending: false, ageConfirmed: false, email: null, at: row.withdrawn_at })
    } else if (local.state === 'granted') {
      // Auf dem Server steht keine (gültige) Einwilligung mehr — etwa eine neue Fassung.
      writeSensitiveConsent({ ...local, state: 'unset', pending: false })
    }
    return valid
  } catch {
    return false
  }
}

/**
 * Im Profil einwilligen oder widerrufen. Die Wahl gilt auf dem Gerät sofort
 * (ein Widerruf hält ab sofort alles zurück); der Server bekommt sie jetzt
 * oder beim nächsten Abgleich. Rückgabe: ob sie schon auf dem Server steht.
 */
export async function setSensitiveConsent(granted: boolean, kind: SensitiveConsentKind, ageConfirmed: boolean): Promise<boolean> {
  chooseSensitiveConsent({ granted, kind, ageConfirmed })
  try {
    const supabase = await getSupabase()
    if (!supabase) return false
    const { data } = await supabase.auth.getUser()
    if (!data.user?.id) return false
    await pushPending(supabase, data.user.id, data.user.email ?? null)
    return !readSensitiveConsent().pending
  } catch {
    return false
  }
}
