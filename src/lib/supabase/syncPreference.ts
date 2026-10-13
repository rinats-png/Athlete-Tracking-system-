/**
 * Ob dieses Gerät mit dem Konto abgleicht.
 *
 * DER ABGLEICH IST AN, BIS JEMAND IHN AUSSCHALTET. KYDON braucht ein Konto;
 * der Abgleich ist Teil des Dienstes (Sicherung, zweites Gerät, Freigaben an
 * den Trainer, Pläne vom Trainer) und läuft deshalb von selbst. Ausschalten
 * ist möglich — das Profil zeigt vorher, was es kostet (SyncPanel).
 *
 * Bewusst ohne Import von Supabase: «Heute» liest diese Einstellung beim
 * Start, und das Startpaket soll den Client nicht tragen.
 */

const ENABLED_KEY = 'kydon.sync.enabled'
const PAUSED_KEY = 'kydon.sync.pausedAt'
const EVENT = 'kydon:sync-preference'

/** An, solange nicht ausdrücklich «off» gespeichert ist. */
export function syncEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Seit wann der Abgleich ausgeschaltet ist — der Stand der Serverkopie. */
export function syncPausedAt(): string | null {
  try {
    return localStorage.getItem(PAUSED_KEY)
  } catch {
    return null
  }
}

export function setSyncEnabled(on: boolean, at: string = new Date().toISOString()): void {
  try {
    if (on) {
      localStorage.setItem(ENABLED_KEY, 'on')
      localStorage.removeItem(PAUSED_KEY)
    } else {
      localStorage.setItem(ENABLED_KEY, 'off')
      localStorage.setItem(PAUSED_KEY, at)
    }
  } catch {
    /* Ohne Speicher gilt die Wahl für diese Sitzung. */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

/** Auf eine Änderung der Einstellung hören (Profil → automatischer Abgleich). */
export function onSyncPreferenceChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
