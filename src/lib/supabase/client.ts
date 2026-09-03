import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Zugang zum Supabase-Projekt — optional, nie Voraussetzung.
 *
 * BASELINE funktioniert vollständig ohne Konto: alles liegt auf dem Gerät.
 * Ein Konto ist ein Zusatz für die Synchronisierung zwischen Geräten und für
 * den Trainermodus. Deshalb gilt hier eine Regel ohne Ausnahme: **fehlende
 * Zugangsdaten sind kein Fehler.** Ist nichts gesetzt, gibt `getSupabase()`
 * `null` zurück, und die App läuft weiter wie bisher.
 *
 * Im Frontend steht ausschliesslich der publizierbare Schlüssel (§41). Er ist
 * öffentlich und darf es sein — die Absicherung liegt in den RLS-Regeln der
 * Datenbank, nicht in der Geheimhaltung dieses Werts. Ein Service-Role-Key
 * gehört niemals in dieses Verzeichnis.
 *
 * Die Bibliothek wird erst beim ersten Zugriff nachgeladen. Wer offline
 * arbeitet, zahlt sie nicht im Startpaket mit.
 */

export interface SupabaseConfig {
  url: string
  publishableKey: string
}

/**
 * Liest die Konfiguration, ohne je zu werfen.
 *
 * Der Zugriff steht in einem `try`, weil `import.meta.env` ausserhalb des
 * Bündelvorgangs — in einer Prüfdatei, in einem Node-Aufruf — gar nicht
 * existiert. Ein fehlendes Projekt darf dort so wenig eine Ausnahme werfen
 * wie im Browser.
 */
export function supabaseConfig(): SupabaseConfig | null {
  let url: unknown
  let key: unknown
  try {
    url = import.meta.env?.VITE_SUPABASE_URL
    key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
  } catch {
    return null
  }
  if (typeof url !== 'string' || typeof key !== 'string') return null
  if (url.trim() === '' || key.trim() === '') return null
  // Ein offensichtlich falscher Wert soll nicht erst beim Netzwerkaufruf
  // auffallen.
  if (!/^https:\/\/[^\s]+$/.test(url.trim())) return null
  return { url: url.trim(), publishableKey: key.trim() }
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() != null
}

let client: SupabaseClient | null = null
let pending: Promise<SupabaseClient | null> | null = null

/**
 * Der Client, oder `null`, wenn kein Projekt hinterlegt ist.
 *
 * Auch ein Fehler beim Nachladen führt zu `null` statt zu einer Ausnahme: eine
 * fehlende Synchronisierung darf die laufende Sitzung nicht beenden.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return Promise.resolve(client)
  const config = supabaseConfig()
  if (!config) return Promise.resolve(null)
  if (pending) return pending

  pending = import('@supabase/supabase-js')
    .then(({ createClient }) => {
      client = createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Der Anmeldezustand gehört in denselben Speicher wie der Bestand:
          // ein Gerät, ein Ort.
          storageKey: 'baseline.auth',
        },
      })
      return client
    })
    .catch(() => null)
    .finally(() => {
      pending = null
    })
  return pending
}

/** Nur für Tests: den zwischengespeicherten Client vergessen. */
export function resetSupabaseClient(): void {
  client = null
  pending = null
}
