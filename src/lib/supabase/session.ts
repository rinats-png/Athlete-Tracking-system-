/**
 * Liegt auf diesem Gerät eine Anmeldung?
 *
 * Geprüft wird nur, OB eine Sitzung gespeichert ist — nicht, ob sie noch
 * gilt. Das geht ohne Netz und ohne den Supabase-Client zu laden: in der
 * Halle ohne Empfang muss die App starten. Ob die Sitzung noch gilt, merkt
 * der Abgleich (Grund `not_signed_in`) und bittet dann um eine neue Anmeldung.
 *
 * Der Schlüssel ist der `storageKey` aus `client.ts`.
 */
const AUTH_KEY = 'kydon.auth'

export function hasStoredSession(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { access_token?: unknown; refresh_token?: unknown } | null
    return typeof parsed?.access_token === 'string' || typeof parsed?.refresh_token === 'string'
  } catch {
    return false
  }
}
