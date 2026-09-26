import { normalizePath, trackEvent } from '@/lib/analytics'

/**
 * Eigene Fehlererfassung — gefiltert, über dieselbe Einwilligung wie die
 * Nutzungsstatistik (Master-Spezifikation L, Entscheidung 10).
 *
 * WAS MITGEHT: die Art des Fehlers (TypeError …), die Seite ohne Kennungen,
 * die Fassung der App und der oberste Rahmen des Stacks als «Datei:Zeile:
 * Spalte» ohne Herkunft. Damit lässt sich ein Fehler einer Stelle im Bau
 * zuordnen.
 *
 * WAS NICHT MITGEHT: die Meldung. Sie kann eingegebene Werte enthalten
 * («Cannot read … of 82,5») — und Eingaben gehören nicht in eine Statistik.
 * Ebenso nicht der ganze Stack, keine Adresse, kein Gerät.
 *
 * GEDROSSELT: höchstens fünf Fehler je Tab, derselbe Fehler nur einmal. Eine
 * Schleife, die tausendmal wirft, soll nicht tausend Ereignisse erzeugen.
 */

const MAX_PER_TAB = 5
const seen = new Set<string>()

/** Oberster Rahmen des Stacks als «datei.js:12:34», ohne Pfad und Herkunft. */
export function topFrame(stack: string | undefined): string {
  if (!stack) return ''
  for (const line of stack.split('\n')) {
    const m = /([^/\\\s()@?]+\.(?:m?js|tsx?))(?:\?[^:)\s]*)?:(\d+):(\d+)/.exec(line)
    if (m) return `${m[1].split('?')[0]}:${m[2]}:${m[3]}`
  }
  return ''
}

export function errorEvent(error: unknown, path: string): { errorType: string; route: string; release: string; frame: string } {
  const e = error instanceof Error ? error : null
  return {
    errorType: (e?.name ?? typeof error).slice(0, 40),
    route: normalizePath(path),
    release: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '',
    frame: topFrame(e?.stack),
  }
}

export function captureError(error: unknown): void {
  try {
    if (seen.size >= MAX_PER_TAB) return
    const event = errorEvent(error, typeof location !== 'undefined' ? location.pathname : '')
    const key = `${event.errorType}|${event.frame}`
    if (seen.has(key)) return
    seen.add(key)
    trackEvent('client_error', event)
  } catch {
    /* Die Fehlererfassung darf selbst nie einen Fehler auslösen. */
  }
}

let installed = false
export function installErrorCapture(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => captureError(e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => captureError(e.reason))
}
