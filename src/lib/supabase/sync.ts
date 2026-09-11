import { getSupabase } from './client'
import { CURRENT_SCHEMA_VERSION } from '@/lib/store/schema'
import type { StoredAthlete, StoredData } from '@/lib/store/localStore'

/**
 * Synchronisierung: der Bestand als Zweitschrift auf dem Server.
 *
 * DIE EINE REGEL, DIE ALLES ANDERE BESTIMMT: es wird nie ein Stand
 * überschrieben, den dieses Gerät nicht kennt (§89 — keine Datenverluste).
 *
 * Dafür trägt jeder Athlet auf dem Server einen Zeitstempel. Beim Schreiben
 * verlangt die App, dass er noch derselbe ist wie beim letzten Abgleich; ist
 * er es nicht, hat ein anderes Gerät geschrieben, und der Schreibvorgang wird
 * ABGELEHNT statt durchgedrückt. Der Nutzer entscheidet dann — und beide
 * Stände existieren bis dahin unversehrt weiter.
 *
 * Das ist ein Vergleich-und-Setze auf der Datenbank, keine Prüfung im
 * Vorfeld: zwischen «lesen» und «schreiben» passt sonst genau der fremde
 * Schreibvorgang, den man verhindern wollte.
 *
 * WAS ÜBERTRAGEN WIRD: der geprüfte Bestand je Athlet, so wie er lokal liegt —
 * Messwerte, Profil, Notizen, Schwerpunkte. Also personenbezogene Daten. Die
 * Datenschutzerklärung beschreibt genau das; ohne Anmeldung passiert es nicht.
 */

const STATE_KEY = 'kydon.sync.v1'

export interface SyncState {
  /** Zeitstempel des Servers je Athlet, wie zuletzt gesehen. */
  seen: Record<string, string>
  lastSyncedAt: string | null
  /** Athleten, deren Serverstand fremd ist. Solange gesetzt: nicht schreiben. */
  conflicts: string[]
}

const EMPTY: SyncState = { seen: {}, lastSyncedAt: null, conflicts: [] }

export function readSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<SyncState>
    return {
      seen: typeof parsed.seen === 'object' && parsed.seen ? (parsed.seen as Record<string, string>) : {},
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts.filter((c) => typeof c === 'string') : [],
    }
  } catch {
    return EMPTY
  }
}

function writeSyncState(state: SyncState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    /* Ohne Speicher gilt der Stand für diese Sitzung. */
  }
}

export function clearSyncState(): void {
  try {
    localStorage.removeItem(STATE_KEY)
  } catch {
    /* Nichts zu räumen. */
  }
}

/**
 * Kennung dieses Geräts. Nur für die Konfliktmeldung — «auf einem anderen
 * Gerät geändert» ist eine andere Aussage als «du selbst».
 */
function deviceId(): string {
  try {
    const key = 'kydon.device'
    let id = localStorage.getItem(key)
    if (!id) {
      id = Math.random().toString(36).slice(2, 10)
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return ''
  }
}

export interface SyncReport {
  ok: boolean
  pushed: number
  pulled: number
  /** Athleten, bei denen der Serverstand fremd ist. */
  conflicts: string[]
  reason: null | 'offline' | 'not_signed_in' | 'unknown'
}

interface RemoteRow {
  athlete_id: string
  schema_version: number
  document: unknown
  updated_at: string
  device_id: string
}

/**
 * Einmal abgleichen.
 *
 * Reihenfolge mit Absicht: erst HOLEN, dann SCHREIBEN. Wer auf einem zweiten
 * Gerät etwas eingetragen hat, soll es sehen, bevor sein eigener Stand
 * hochgeht — sonst entstünde bei jedem zweiten Abgleich ein Konflikt, den
 * niemand verursacht hat.
 */
export async function syncOnce(
  store: StoredData,
  onPull: (athletes: StoredAthlete[]) => void,
): Promise<SyncReport> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, pushed: 0, pulled: 0, conflicts: [], reason: 'offline' }

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return { ok: false, pushed: 0, pulled: 0, conflicts: [], reason: 'not_signed_in' }

  const state = readSyncState()
  const seen = { ...state.seen }
  const conflicts: string[] = []
  let pushed = 0
  let pulled = 0

  // --- 1. Holen ------------------------------------------------------------
  const { data: rows, error: readError } = await supabase
    .from('athlete_documents')
    .select('athlete_id, schema_version, document, updated_at, device_id')
    .eq('owner_id', uid)
  if (readError) return { ok: false, pushed: 0, pulled: 0, conflicts: [], reason: 'unknown' }

  const remote = new Map<string, RemoteRow>((rows ?? []).map((r) => [r.athlete_id, r as RemoteRow]))
  const local = new Map(store.athletes.map((a) => [a.id, a]))

  const incoming: StoredAthlete[] = []
  for (const [id, row] of remote) {
    if (local.has(id)) continue
    /*
     * Ein Bestand aus einer NEUEREN App-Fassung wird nicht angefasst. Ihn
     * herunterzurechnen hiesse, Felder wegzuwerfen, die diese Fassung nicht
     * kennt — und das wäre ein Datenverlust auf dem Server, den niemand
     * bemerkt.
     */
    if (row.schema_version > CURRENT_SCHEMA_VERSION) continue
    incoming.push(row.document as StoredAthlete)
    seen[id] = row.updated_at
    pulled += 1
  }
  if (incoming.length > 0) onPull(incoming)

  // --- 2. Schreiben --------------------------------------------------------
  const device = deviceId()
  for (const athlete of store.athletes) {
    const row = remote.get(athlete.id)
    const expected = seen[athlete.id] ?? null

    if (row && row.updated_at !== expected) {
      // Fremder Stand: nicht schreiben, sondern melden.
      conflicts.push(athlete.id)
      continue
    }

    const payload = {
      owner_id: uid,
      athlete_id: athlete.id,
      schema_version: CURRENT_SCHEMA_VERSION,
      document: athlete,
      device_id: device,
    }

    if (!row) {
      const { data, error } = await supabase
        .from('athlete_documents')
        .insert(payload)
        .select('updated_at')
        .maybeSingle()
      // Ein Doppelschlüssel heisst: ein anderes Gerät war schneller.
      if (error) {
        conflicts.push(athlete.id)
        continue
      }
      if (data?.updated_at) seen[athlete.id] = data.updated_at
      pushed += 1
      continue
    }

    /*
     * Vergleich-und-Setze: die Bedingung `updated_at = expected` steht IN der
     * Abfrage. Eine Prüfung davor und ein Schreiben danach wären zwei
     * Vorgänge, und dazwischen passt genau der fremde Schreibvorgang, den es
     * zu verhindern gilt.
     */
    const { data, error } = await supabase
      .from('athlete_documents')
      .update(payload)
      .eq('owner_id', uid)
      .eq('athlete_id', athlete.id)
      .eq('updated_at', expected as string)
      .select('updated_at')
      .maybeSingle()

    if (error) return { ok: false, pushed, pulled, conflicts, reason: 'unknown' }
    if (!data) {
      conflicts.push(athlete.id)
      continue
    }
    seen[athlete.id] = data.updated_at
    pushed += 1
  }

  writeSyncState({ seen, lastSyncedAt: new Date().toISOString(), conflicts })
  return { ok: conflicts.length === 0, pushed, pulled, conflicts, reason: null }
}

/**
 * Einen Konflikt auflösen, indem der lokale Stand gewinnt.
 *
 * Der Serverstand wird dabei überschrieben — deshalb ist das eine
 * ausdrückliche Handlung des Nutzers und nichts, was von selbst passiert.
 * Der Weg in die andere Richtung ist der Export plus «alles löschen» plus
 * Abgleich; er steht im Profil und ist bewusst länger.
 */
export async function resolveWithLocal(athleteId: string): Promise<boolean> {
  const supabase = await getSupabase()
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return false

  const { data } = await supabase
    .from('athlete_documents')
    .select('updated_at')
    .eq('owner_id', uid)
    .eq('athlete_id', athleteId)
    .maybeSingle()
  if (!data?.updated_at) return false

  const state = readSyncState()
  writeSyncState({
    ...state,
    seen: { ...state.seen, [athleteId]: data.updated_at },
    conflicts: state.conflicts.filter((c) => c !== athleteId),
  })
  return true
}
