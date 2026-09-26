/**
 * Prüfung eines eingehenden Nutzungsereignisses — reine Logik.
 *
 * Diese Datei kennt weder Deno noch Netz noch Datenbank. Sie entscheidet nur,
 * was von einem Ereignis übrig bleibt, bevor es gespeichert wird. Genau
 * deshalb liegt sie hier und nicht in `track/index.ts`: So lässt sie sich im
 * Browser-Testlauf prüfen, ohne eine Edge Function zu starten.
 *
 * VIER DINGE WERDEN HIER GARANTIERT, UNABHÄNGIG VOM CLIENT:
 *
 *   0. NUR BEKANNTE EREIGNISSE, NUR ERLAUBTE EIGENSCHAFTEN (eventRegistry.ts).
 *
 *   1. NICHTS AUS DER GESUNDHEITSSCHICHT. Ein Ereignis, dessen Pfad unter
 *      /gesundheit, /peakweek oder /freigaben liegt, wird verworfen — ganz,
 *      nicht nur der Pfad. Schon die Tatsache, dass jemand diese Seiten
 *      öffnet, ist ein Hinweis auf Art.-9-Daten. Der Client schickt so etwas
 *      gar nicht erst; der Server verlässt sich darauf nicht.
 *   2. KEINE KENNUNG AUS DEM KÖRPER. Eine `user_id` im Anfragekörper wird
 *      nicht gelesen. Die Kennung kommt ausschliesslich aus einem geprüften
 *      Token — sonst könnte jeder Ereignisse im Namen jedes Kontos anlegen.
 *   3. KEINE INHALTE. Schlüssel, die nach Wert, Name, E-Mail oder Gesundheit
 *      klingen, fliegen raus; lange Zeichenketten werden gekürzt. Ein
 *      Ereignis sagt, DASS etwas passierte, nicht WAS darin stand.
 */

import { allowProperties } from './eventRegistry.ts'

export const EVENT_NAME = /^[a-z][a-z0-9_]{1,63}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Pfade, zu denen nie ein Ereignis gespeichert wird. */
export const BLOCKED_PATH_PREFIXES = ['/gesundheit', '/peakweek', '/freigaben']

/**
 * Schlüssel, die nie gespeichert werden — egal, wie tief sie stecken.
 * Verglichen wird in Kleinbuchstaben und ohne Unterstriche, damit weder
 * `userEmail` noch `user_email` durchrutscht.
 *
 * ZWEI LISTEN, weil ein einziger Vergleich in beide Richtungen falsch wäre:
 *
 *   - EINDEUTIGE WORTTEILE treffen überall im Schlüssel. «email» steckt in
 *     `userEmail`, `contactEmail`, `email_address` — alle drei sind Inhalt.
 *   - KURZE, MEHRDEUTIGE WÖRTER treffen nur exakt. «key» steckt auch in
 *     `keyboard`, «name» auch in `event_name`-artigen Feldern, «value» auch in
 *     `valueCard`. Als Wortteil würden sie harmlose Eigenschaften mitnehmen.
 */
export const BLOCKED_KEY_PARTS = [
  'email', 'password', 'passwd', 'token', 'secret', 'phrase', 'birth', 'phone', 'address',
  'useragent', 'ipaddress', 'userid', 'firstname', 'lastname', 'fullname',
  'symptom', 'medication', 'weight', 'dataurl', 'photo', 'health', 'labvalue', 'marker',
]
export const BLOCKED_KEYS_EXACT = [
  'name', 'key', 'ip', 'value', 'values', 'result', 'results', 'score', 'note', 'notes',
  'lab', 'labs', 'cycle', 'meds', 'mail',
]

const MAX_STRING = 200
const MAX_KEYS = 30
const MAX_DEPTH = 3
export const MAX_PROPERTIES_BYTES = 4096

export interface CleanEvent {
  event_name: string
  session_id: string | null
  properties: Record<string, unknown>
  /** Nicht gespeichert — nur weitergereicht, damit der Server es prüft. */
  access_token: string | null
}

export type Outcome = { ok: true; event: CleanEvent } | { ok: false; reason: 'bad_json' | 'bad_name' | 'unknown_event' | 'blocked_path' | 'too_large' }

const normKey = (k: string) => k.toLowerCase().replace(/[_\-\s]/g, '')

export function isBlockedKey(key: string): boolean {
  const k = normKey(key)
  return BLOCKED_KEYS_EXACT.includes(k) || BLOCKED_KEY_PARTS.some((part) => k.includes(part))
}

function isBlockedPath(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const path = value.split('?')[0].split('#')[0].toLowerCase()
  return BLOCKED_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Säubert ein Eigenschaftenobjekt. Gibt null zurück, wenn es einen gesperrten Pfad trägt. */
function clean(value: unknown, depth: number): unknown {
  if (value == null) return null
  if (typeof value === 'string') return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (depth >= MAX_DEPTH) return null
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => clean(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    let count = 0
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (count >= MAX_KEYS) break
      if (isBlockedKey(k)) continue
      out[k.slice(0, 64)] = clean(v, depth + 1)
      count += 1
    }
    return out
  }
  return null
}

/** Sucht in allen Zeichenketten eines Objekts nach einem gesperrten Pfad. */
function carriesBlockedPath(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH + 1) return false
  if (typeof value === 'string') return isBlockedPath(value)
  if (Array.isArray(value)) return value.some((v) => carriesBlockedPath(v, depth + 1))
  if (value && typeof value === 'object') return Object.values(value).some((v) => carriesBlockedPath(v, depth + 1))
  return false
}

/**
 * Aus einem rohen Anfragekörper ein speicherbares Ereignis machen — oder
 * begründet ablehnen.
 *
 * Der Körper darf Text sein: `navigator.sendBeacon` schickt `text/plain`,
 * weil ein Beacon mit `application/json` eine Vorabanfrage auslösen würde,
 * die er nicht abwarten kann.
 */
export function sanitizeEvent(raw: unknown): Outcome {
  let body: unknown = raw
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw)
    } catch {
      return { ok: false, reason: 'bad_json' }
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'bad_json' }
  const b = body as Record<string, unknown>

  const name = typeof b.event_name === 'string' ? b.event_name.trim() : ''
  if (!EVENT_NAME.test(name)) return { ok: false, reason: 'bad_name' }

  const rawProps = b.properties && typeof b.properties === 'object' && !Array.isArray(b.properties) ? b.properties : {}
  if (carriesBlockedPath(rawProps)) return { ok: false, reason: 'blocked_path' }

  // Erste Schicht: die Positivliste. Zweite Schicht: die Sperrwörter.
  const allowed = allowProperties(name, rawProps as Record<string, unknown>)
  if (allowed == null) return { ok: false, reason: 'unknown_event' }
  const properties = (clean(allowed, 0) ?? {}) as Record<string, unknown>
  if (JSON.stringify(properties).length > MAX_PROPERTIES_BYTES) return { ok: false, reason: 'too_large' }

  const session = typeof b.session_id === 'string' && UUID.test(b.session_id) ? b.session_id.toLowerCase() : null
  const token = typeof b.access_token === 'string' && b.access_token.length > 20 && b.access_token.length < 4096 ? b.access_token : null

  // `b.user_id` wird absichtlich NICHT gelesen. Siehe oben, Punkt 2.
  return { ok: true, event: { event_name: name, session_id: session, properties, access_token: token } }
}
