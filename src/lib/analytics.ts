import { supabaseConfig, getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { allowProperties } from '@/lib/analyticsEvents'

/**
 * Nutzungsstatistik — die Seite im Browser.
 *
 * NICHTS OHNE EINWILLIGUNG. Solange der Mensch nicht «Ja» gesagt hat, legt
 * diese Datei nichts an und schickt nichts ab: keine Sitzungskennung, kein
 * Ereignis, kein Aufruf. Das ist nicht Höflichkeit, sondern § 25 TDDDG — eine
 * Kennung im Speicher des Geräts zu Analysezwecken ist nicht «unbedingt
 * erforderlich» und braucht deshalb die Einwilligung VOR dem ersten Speichern.
 *
 * NICHTS AUS DER GESUNDHEITSSCHICHT. Auf /gesundheit, /peakweek und
 * /freigaben wird nicht gezählt — auch nicht der Seitenaufruf. Der Server
 * verwirft so etwas zusätzlich; diese Datei schickt es gar nicht erst.
 *
 * NIE BLOCKIEREND. `trackEvent` kehrt sofort zurück und wirft nie. Eine
 * Statistik, die die App bremst oder ein Fehlerfenster auslöst, wäre
 * teurer als ihr Nutzen.
 */

const CONSENT_KEY = 'kydon.analytics.consent.v1'
const SESSION_KEY = 'kydon.analytics.session.v1'
const TAB_KEY = 'kydon.analytics.tab.v1'

export type ConsentState = 'granted' | 'denied' | 'unset'

/** Pfade, auf denen nie gezählt wird. Dieselbe Liste wie auf dem Server. */
export const UNTRACKED_PATHS = ['/gesundheit', '/peakweek', '/freigaben']

export function isUntrackedPath(path: string): boolean {
  const p = path.split('?')[0].split('#')[0].toLowerCase()
  return UNTRACKED_PATHS.some((u) => p === u || p.startsWith(`${u}/`))
}

const listeners = new Set<(state: ConsentState) => void>()

export function consentState(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return 'unset'
    const v = (JSON.parse(raw) as { state?: string }).state
    return v === 'granted' || v === 'denied' ? v : 'unset'
  } catch {
    return 'unset'
  }
}

/**
 * Einwilligung erteilen oder zurückziehen.
 *
 * Der Widerruf löscht die Sitzungskennung sofort. Was schon auf dem Server
 * liegt, bleibt dort bis zur Löschfrist von 90 Tagen — ohne Kennung lässt es
 * sich aber keinem Gerät mehr zuordnen, das künftig etwas schickt.
 */
export function setConsent(state: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ state, at: new Date().toISOString() }))
    if (state === 'denied') {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(TAB_KEY)
    }
  } catch {
    /* Ohne Speicher gibt es keine Einwilligung — und damit auch keine Zählung. */
  }
  for (const listener of listeners) listener(state)
  if (state === 'granted') trackEvent('analytics_consent_given')
}

export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Die Sitzungskennung — angelegt erst hier, und nur mit Einwilligung. */
function sessionId(): string | null {
  if (consentState() !== 'granted') return null
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/**
 * Das Zugriffstoken des angemeldeten Kontos, falls es eines gibt.
 *
 * Es geht mit, damit der SERVER die Kontokennung feststellt. Eine Kennung
 * im Klartext mitzuschicken hiesse, dass jeder Ereignisse im Namen jedes
 * Kontos anlegen könnte — der Server liest so ein Feld deshalb gar nicht.
 */
let cachedToken: { value: string | null; at: number } | null = null
async function accessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  if (cachedToken && Date.now() - cachedToken.at < 60_000) return cachedToken.value
  try {
    const supabase = await getSupabase()
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
    cachedToken = { value: data.session?.access_token ?? null, at: Date.now() }
    return cachedToken.value
  } catch {
    return null
  }
}

function endpoint(): string | null {
  const config = supabaseConfig()
  return config ? `${config.url.replace(/\/$/, '')}/functions/v1/track` : null
}

/**
 * Schickt einen Körper ab, ohne auf die Antwort zu warten.
 *
 * `sendBeacon` zuerst: Er überlebt das Schliessen des Tabs. Der Körper geht
 * als `text/plain` — mit `application/json` bräuchte der Browser eine
 * Vorabanfrage, und die kann ein Beacon nicht abwarten.
 */
function dispatch(url: string, body: string): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return
    }
  } catch {
    /* weiter mit fetch */
  }
  try {
    void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' }, mode: 'cors', credentials: 'omit' }).catch(() => {})
  } catch {
    /* Eine verlorene Zählung ist kein Fehler, der den Menschen etwas angeht. */
  }
}

/**
 * Ein Ereignis festhalten.
 *
 * Kehrt sofort zurück. Ohne Einwilligung, ohne Projekt oder auf einer
 * gesperrten Seite passiert schlicht nichts.
 */
export function trackEvent(eventName: string, properties: Record<string, unknown> = {}): void {
  if (consentState() !== 'granted') return
  // Nur Ereignisse aus der Liste, nur deren Eigenschaften (analyticsEvents.ts).
  const allowed = allowProperties(eventName, properties)
  if (allowed == null) {
    if (import.meta.env.DEV) console.warn(`[analytics] Ereignis nicht in der Liste: ${eventName}`)
    return
  }
  properties = allowed
  const url = endpoint()
  if (!url) return
  const here = typeof location !== 'undefined' ? location.pathname : ''
  if (isUntrackedPath(here)) return
  if (typeof properties.path === 'string' && isUntrackedPath(properties.path)) return

  const session = sessionId()
  void accessToken().then((token) => {
    const body = JSON.stringify({ event_name: eventName, properties, session_id: session, access_token: token })
    dispatch(url, body)
  })
}

/**
 * Ein Pfad ohne Kennungen: /ergebnis/3f2a… wird zu /ergebnis/:id.
 *
 * Zwei Gründe. Die Auswertung soll «wie oft wurde ein Ergebnis angesehen»
 * beantworten, nicht hundert Einzelpfade zählen. Und eine Kennung im Pfad
 * ist eine Kennung, die nicht in die Statistik gehört.
 */
export function normalizePath(path: string): string {
  return path
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .map((part) => (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part) || /^[0-9a-z]{16,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part))
    .join('/')
}

/**
 * Einmal je Tab: der Beginn einer Sitzung. Daraus wird im Dashboard die
 * Wiederkehr — wer kommt nach einem Tag, einer Woche, einem Monat zurück.
 */
export function trackSessionStart(): void {
  if (consentState() !== 'granted') return
  try {
    if (sessionStorage.getItem(TAB_KEY)) return
    sessionStorage.setItem(TAB_KEY, '1')
  } catch {
    return
  }
  trackEvent('session_start', {
    standalone: typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches,
    lang: typeof document !== 'undefined' ? document.documentElement.lang : '',
  })
}
