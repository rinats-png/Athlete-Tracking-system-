/**
 * Bremse gegen schnelles Durchprobieren von Passwörtern.
 *
 * WAS SIE IST UND WAS NICHT. Sie läuft im Browser. Ein Angreifer, der ein
 * Skript gegen die API richtet, sieht sie nie — er lädt diese Seite gar nicht.
 * Sie ist deshalb ausdrücklich KEIN Ersatz für die Begrenzung beim Dienst,
 * und `docs/sicherheit.md` sagt das an der Stelle, an der sie gezählt wird.
 *
 * WOFÜR SIE TROTZDEM DA IST: für den Fall, der tatsächlich häufiger vorkommt
 * als der Skript-Angriff — jemand sitzt an einem fremden oder geteilten Gerät
 * und probiert Passwörter durch, die er von einem Menschen kennt. Gegen
 * dieses Durchprobieren von Hand wirkt eine Wartezeit im Browser vollständig,
 * weil der Angreifer genau hier sitzt.
 *
 * Die Wartezeit wächst, statt hart zu sperren. Eine Sperre trifft am Ende
 * fast immer den Falschen — den Menschen, der sein eigenes Passwort dreimal
 * falsch getippt hat — und sie ist für einen Angreifer nur eine Aufforderung,
 * den Speicher zu leeren. Eine wachsende Wartezeit kostet ihn Zeit und den
 * Rechtmässigen fast nichts.
 */

const KEY = 'kydon.auth.attempts'

/** Ab dem wievielten Fehlversuch überhaupt gewartet wird. */
export const FREE_ATTEMPTS = 3
/** Grundwartezeit; sie verdoppelt sich je weiterem Fehlversuch. */
export const BASE_DELAY_MS = 2000
/** Obergrenze — darüber hinaus wäre es faktisch die Sperre, die wir nicht wollen. */
export const MAX_DELAY_MS = 60_000
/** Nach dieser Ruhe zählt die Reihe von vorn. */
export const RESET_AFTER_MS = 15 * 60_000

interface Attempts {
  count: number
  last: number
}

function read(): Attempts {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { count: 0, last: 0 }
    const parsed = JSON.parse(raw) as Partial<Attempts>
    const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0
    const last = typeof parsed.last === 'number' ? parsed.last : 0
    // Eine alte Reihe ist keine Reihe mehr.
    if (last && Date.now() - last > RESET_AFTER_MS) return { count: 0, last: 0 }
    return { count, last }
  } catch {
    return { count: 0, last: 0 }
  }
}

function write(state: Attempts): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* Ohne Speicher gilt die Bremse für diese Sitzung nicht. Kein Fehler. */
  }
}

/**
 * Die reine Rechnung: wie lange nach dem n-ten Fehlversuch zu warten ist.
 *
 * Ausdrücklich getrennt vom Speicher, damit sie prüfbar ist, ohne einen
 * Browser zu starten — und damit die Regel an einer Stelle steht, an der man
 * sie lesen kann, statt sie aus einem Zustandsautomaten zu rekonstruieren.
 */
export function delayForAttempt(count: number): number {
  if (count <= FREE_ATTEMPTS) return 0
  return Math.min(BASE_DELAY_MS * 2 ** (count - FREE_ATTEMPTS - 1), MAX_DELAY_MS)
}

/** Wie lange ab jetzt noch gewartet werden muss. 0 heisst: sofort. */
export function remainingDelayMs(now: number = Date.now()): number {
  const { count, last } = read()
  const step = delayForAttempt(count)
  if (step === 0) return 0
  return Math.max(0, last + step - now)
}

/** Ein Fehlversuch. */
export function noteFailure(now: number = Date.now()): void {
  const { count } = read()
  write({ count: count + 1, last: now })
}

/** Erfolg — die Reihe endet. */
export function noteSuccess(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* Nichts zu räumen. */
  }
}
