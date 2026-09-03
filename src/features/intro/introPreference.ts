/**
 * Ob die Intro-Sequenz laufen soll, und ob sie in dieser Sitzung schon lief.
 *
 * Beides liegt neben dem Bestand und nicht im Profil: es ist eine
 * Eigenschaft dieses Geräts, keine Angabe über einen Menschen (§50). Wer
 * seinen Bestand exportiert, exportiert keine Einstellung darüber, ob ihm
 * eine Animation gefällt.
 *
 * Die Sitzungsmarke steht im `sessionStorage`: sie soll mit dem Schliessen
 * des Tabs verfallen. Im `localStorage` liefe die Sequenz genau einmal und
 * nie wieder — das wäre keine Sequenz beim Öffnen, sondern eine beim
 * Installieren.
 */

const ENABLED_KEY = 'baseline.intro'
const SEEN_KEY = 'baseline.intro.seen'

export function introEnabled(): boolean {
  try {
    // Vorgabe an: wer nichts eingestellt hat, soll sie sehen.
    return localStorage.getItem(ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setIntroEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    /* Ohne Speicher gilt die Wahl für diese Sitzung. */
  }
}

export function introSeenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    // Ohne Sitzungsspeicher lieber gar nicht zeigen als bei jeder
    // Navigation erneut.
    return true
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* Siehe oben. */
  }
}

/** Nur für Prüfungen und die Vorschau aus dem Profil. */
export function clearIntroSeen(): void {
  try {
    sessionStorage.removeItem(SEEN_KEY)
  } catch {
    /* Nichts zu räumen. */
  }
}
