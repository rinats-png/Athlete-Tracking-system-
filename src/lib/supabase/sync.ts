import { getSupabase } from './client'
import { CURRENT_SCHEMA_VERSION, parseAthlete } from '@/lib/store/schema'
import type { StoredAthlete, StoredData } from '@/lib/store/localStore'
import { carriesSeries, mergeSeries, planSeriesPush, stripSeries, type SeriesRow } from './series'
import { clearCarryChoice, readCarryChoice } from '@/lib/coachStatus'
import { isBlankPlaceholder } from '@/lib/store/placeholder'

/**
 * Synchronisierung: der Bestand als Zweitschrift auf dem Server.
 *
 * DIE EINE REGEL, DIE ALLES ANDERE BESTIMMT: es wird nie ein Stand
 * überschrieben, den dieses Gerät nicht kennt (§89 — keine Datenverluste).
 *
 * ZWEI EBENEN, SEIT DER TABELLENTRENNUNG (docs/ausbau.md §6):
 *
 *   1. DAS DOKUMENT — Profil, Messwerte, Notizen, Schwerpunkte. Ein Stand je
 *      Athlet in `athlete_documents`, geschrieben mit Vergleich-und-Setze:
 *      der Server muss noch den Zeitstempel tragen, den dieses Gerät zuletzt
 *      sah, sonst wird der Schreibvorgang ABGELEHNT und als Konflikt
 *      gemeldet. Der Nutzer entscheidet; beide Stände bleiben unversehrt.
 *
 *   2. DIE ZEITREIHEN — Tagebuch, Einheiten, Entscheidungen, Mahlzeiten. Eine
 *      Zeile je Eintrag in `athlete_series`, geschrieben nur, wenn sich der
 *      Eintrag seit dem letzten Abgleich geändert hat. Zwischen Geräten
 *      gewinnt der jüngere Eintrag (sein eigenes `updatedAt`); ein Löschen
 *      ist ein Grabstein, den das andere Gerät beim nächsten Holen sieht.
 *      Hier gibt es keinen Konflikt zur Rückfrage — ein Tagebuchtag, der auf
 *      zwei Geräten ergänzt wurde, ist kein Streitfall, sondern zwei
 *      Ergänzungen.
 *
 * WAS ÜBERTRAGEN WIRD: der geprüfte Bestand je Athlet, so wie er lokal liegt.
 * Also personenbezogene Daten. Die Datenschutzerklärung beschreibt genau das;
 * ohne Anmeldung passiert es nicht.
 *
 * DER BESTAND IST NICHT IMMER DER EIGENE. Wer als Trainer in einem Team
 * arbeitet, gleicht gegen den Bestand des Teaminhabers ab (`my_pool_owner`,
 * supabase/migrations/20260925110000_teams.sql). Wechselt der Bestand —
 * Beitritt, Austritt, Entfernung, Ende der Teamstufe —, gilt:
 *
 *   - AUS EINEM TEAM HERAUS wird nie etwas mitgenommen. Die Athleten des
 *     Teams verlassen dieses Gerät, bevor irgendetwas geschrieben wird; sonst
 *     trüge ein ausscheidender Trainer den Teambestand in sein eigenes Konto.
 *   - IN EIN TEAM HINEIN geht der bisherige Bestand nur, wenn der Trainer das
 *     beim Beitritt ausdrücklich gewählt hat (`carry`). Dann zählt er im
 *     Team. Sonst verlässt er dieses Gerät und bleibt im eigenen Konto auf
 *     dem Server, bis der Trainer das Team wieder verlässt.
 *
 * ÜBERGANG: Dokumente von vor der Trennung tragen die Zeitreihen noch im
 * Dokument. Beim ersten Holen werden sie als Einträge übernommen; beim
 * nächsten Schreiben geht das Dokument ohne sie hoch und die Zeilen einzeln.
 * Kein Eintrag geht dabei verloren — der Prüffall dazu steht in
 * tests/sync-series.spec.ts.
 */

const STATE_KEY = 'kydon.sync.v1'

export interface SyncState {
  /** Zeitstempel des Servers je Athlet (Dokument), wie zuletzt gesehen. */
  seen: Record<string, string>
  lastSyncedAt: string | null
  /** Bis wann Zeitreihen-Zeilen zuletzt geholt UND geschrieben wurden (Serverzeit). */
  seriesSyncedAt: string | null
  /** Athleten, deren Serverstand fremd ist. Solange gesetzt: Dokument nicht schreiben. */
  conflicts: string[]
  /** Gegen welchen Bestand zuletzt abgeglichen wurde (owner_id). null = noch nie. */
  pool: string | null
}

const EMPTY: SyncState = { seen: {}, lastSyncedAt: null, seriesSyncedAt: null, conflicts: [], pool: null }

export function readSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<SyncState>
    return {
      seen: typeof parsed.seen === 'object' && parsed.seen ? (parsed.seen as Record<string, string>) : {},
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      seriesSyncedAt: typeof parsed.seriesSyncedAt === 'string' ? parsed.seriesSyncedAt : null,
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts.filter((c) => typeof c === 'string') : [],
      pool: typeof parsed.pool === 'string' ? parsed.pool : null,
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
  /** Zeitreihen-Zeilen: geschrieben und geholt. */
  seriesPushed: number
  seriesPulled: number
  /** Athleten, bei denen der Serverstand des Dokuments fremd ist. */
  conflicts: string[]
  reason: null | 'offline' | 'not_signed_in' | 'unknown'
  /** Der Bestand hat gewechselt (Team beigetreten oder verlassen). */
  poolSwitched?: boolean
}

interface RemoteRow {
  athlete_id: string
  schema_version: number
  document: unknown
  updated_at: string
  device_id: string
}

const fail = (reason: SyncReport['reason']): SyncReport => ({ ok: false, pushed: 0, pulled: 0, seriesPushed: 0, seriesPulled: 0, conflicts: [], reason })

/**
 * Einmal abgleichen.
 *
 * Reihenfolge mit Absicht: erst HOLEN, dann SCHREIBEN. Wer auf einem zweiten
 * Gerät etwas eingetragen hat, soll es sehen, bevor sein eigener Stand
 * hochgeht — sonst entstünde bei jedem zweiten Abgleich ein Konflikt, den
 * niemand verursacht hat.
 */
export async function syncOnce(
  initialStore: StoredData,
  onPull: (athletes: StoredAthlete[]) => void,
  onSeries: (rows: SeriesRow[]) => number = () => 0,
  onPoolSwitch: () => StoredData = () => initialStore,
): Promise<SyncReport> {
  const supabase = await getSupabase()
  if (!supabase) return fail('offline')

  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return fail('not_signed_in')

  // In welchem Bestand arbeite ich? Ohne Antwort (alte Datenbank, Fehler):
  // im eigenen — das ist der Stand vor den Teams und nie ein fremder.
  const { data: poolData, error: poolError } = await supabase.rpc('my_pool_owner')
  const uid: string = !poolError && typeof poolData === 'string' ? poolData : me

  let state = readSyncState()
  let store = initialStore
  let poolSwitched = false
  const previous = state.pool ?? me
  if (previous !== uid) {
    // Aus einem fremden Bestand heraus (previous ≠ ich): nie mitnehmen.
    // In einen fremden hinein: nur, wenn beim Beitritt so gewählt.
    const carry = previous === me && readCarryChoice() === 'carry'
    if (!carry) store = onPoolSwitch()
    clearCarryChoice()
    state = { ...EMPTY }
    poolSwitched = true
  }
  const seen = { ...state.seen }
  const conflicts: string[] = []
  const device = deviceId()
  let pushed = 0
  let pulled = 0
  let seriesPushed = 0
  let seriesPulled = 0

  // --- 1. Dokumente holen -----------------------------------------------------
  const { data: rows, error: readError } = await supabase
    .from('athlete_documents')
    .select('athlete_id, schema_version, document, updated_at, device_id')
    .eq('owner_id', uid)
  if (readError) return fail('unknown')

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
    // Geprüft, nicht geglaubt: fehlende Felder bekommen ihre Vorgaben.
    const athlete = parseAthlete(row.document)
    if (!athlete) continue
    incoming.push(athlete)
    seen[id] = row.updated_at
    pulled += 1
  }
  if (incoming.length > 0) onPull(incoming)
  // Der Bestand, den die Zeitreihen gleich treffen: lokal plus eben Geholtes.
  const athletesNow: StoredAthlete[] = [...store.athletes, ...incoming].filter((a) => !isBlankPlaceholder(a))

  // --- 2. Zeitreihen holen ----------------------------------------------------
  //
  // Alles seit dem letzten Mal — über alle Athleten in einer Abfrage. Ohne
  // Stand (erster Abgleich, neues Gerät) kommt alles; das ist beabsichtigt.
  let seriesQuery = supabase
    .from('athlete_series')
    .select('athlete_id, kind, entry_id, day, payload, device_id, updated_at, deleted_at')
    .eq('owner_id', uid)
  if (state.seriesSyncedAt) seriesQuery = seriesQuery.gt('updated_at', state.seriesSyncedAt)
  const { data: seriesRowsRemote, error: seriesError } = await seriesQuery
  if (seriesError) return { ok: false, pushed, pulled, seriesPushed, seriesPulled, conflicts, reason: 'unknown' }
  const remoteSeries = (seriesRowsRemote ?? []) as SeriesRow[]

  // Der Serverstand, gegen den die Grabsteine gerechnet werden: was der
  // Server jetzt hat (mindestens das eben Geholte). Bei einem bestehenden
  // Stand reicht «seitdem»; Zeilen davor sind lokal bekannt oder schon
  // Grabstein.
  let newestServerTime = state.seriesSyncedAt
  for (const r of remoteSeries) if (r.updated_at && (!newestServerTime || r.updated_at > newestServerTime)) newestServerTime = r.updated_at

  // Zeilen, die NICHT von diesem Gerät stammen, in den Bestand einarbeiten.
  // Eigene Zeilen kämen unverändert zurück — nur Arbeit, keine Information.
  const foreign = remoteSeries.filter((r) => r.device_id !== device)
  if (foreign.length > 0) seriesPulled = onSeries(foreign)

  // --- 3. Dokumente schreiben -------------------------------------------------
  for (const athlete of athletesNow) {
    const row = remote.get(athlete.id)
    const expected = seen[athlete.id] ?? null

    if (row && row.updated_at !== expected) {
      // Fremder Stand: nicht schreiben, sondern melden.
      conflicts.push(athlete.id)
      continue
    }

    // Übergang: trug das Serverdokument noch Zeitreihen, gehen sie jetzt
    // als Zeilen hoch — der Bestand lokal hat sie ja (siehe planSeriesPush
    // unten, das ohne Stand alles schreibt).
    const payload = {
      owner_id: uid,
      athlete_id: athlete.id,
      schema_version: CURRENT_SCHEMA_VERSION,
      document: stripSeries(athlete),
      device_id: device,
    }

    if (!row) {
      const { data, error } = await supabase.from('athlete_documents').insert(payload).select('updated_at').maybeSingle()
      // Ein Doppelschlüssel heisst: ein anderes Gerät war schneller.
      if (error) {
        conflicts.push(athlete.id)
        continue
      }
      if (data?.updated_at) seen[athlete.id] = data.updated_at
      pushed += 1
      continue
    }

    // Unverändertes Dokument nicht neu schreiben: ein Schreibvorgang ohne
    // Änderung wäre nur ein neuer Zeitstempel, der auf dem zweiten Gerät als
    // Konflikt erscheint.
    if (!carriesSeries(row.document) && JSON.stringify(row.document) === JSON.stringify(payload.document)) continue

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

    if (error) return { ok: false, pushed, pulled, seriesPushed, seriesPulled, conflicts, reason: 'unknown' }
    if (!data) {
      conflicts.push(athlete.id)
      continue
    }
    seen[athlete.id] = data.updated_at
    pushed += 1
  }

  // --- 4. Zeitreihen schreiben ------------------------------------------------
  //
  // Nur Geänderte, in Paketen; Grabsteine als Update auf deleted_at. Auch
  // für Athleten mit Dokumentkonflikt: eine Tagebuchzeile hat keinen
  // Streitfall, und sie zurückzuhalten hiesse, sie zu verlieren, wenn der
  // Konflikt zugunsten des Servers aufgelöst wird.
  for (const athlete of athletesNow) {
    // Der Bestand nach dem Einarbeiten der fremden Zeilen — sonst würden
    // eben geholte Einträge gleich wieder hochgeschrieben.
    const merged = mergeSeries(athlete, foreign).athlete
    const plan = planSeriesPush(merged, remoteSeries, state.seriesSyncedAt, device)
    for (let i = 0; i < plan.upserts.length; i += 200) {
      const batch = plan.upserts.slice(i, i + 200).map((r) => ({ owner_id: uid, ...r, deleted_at: null }))
      const { error } = await supabase.from('athlete_series').upsert(batch, { onConflict: 'owner_id,athlete_id,kind,entry_id' })
      if (error) return { ok: false, pushed, pulled, seriesPushed, seriesPulled, conflicts, reason: 'unknown' }
      seriesPushed += batch.length
    }
    for (const t of plan.tombstones) {
      const { error } = await supabase
        .from('athlete_series')
        .update({ deleted_at: new Date().toISOString(), device_id: device })
        .eq('owner_id', uid)
        .eq('athlete_id', athlete.id)
        .eq('kind', t.kind)
        .eq('entry_id', t.entry_id)
      if (error) return { ok: false, pushed, pulled, seriesPushed, seriesPulled, conflicts, reason: 'unknown' }
      seriesPushed += 1
    }
  }

  // Der Stand für das nächste Mal: die jüngste Serverzeit, die dieses
  // Gerät gesehen hat — plus die eigenen Schreibvorgänge, deren Zeit der
  // Server setzt. Damit die eigenen Zeilen nicht beim nächsten Mal als
  // «fremd» zurückkommen, filtert das Holen nach device_id (oben).
  const { data: newest } = await supabase
    .from('athlete_series')
    .select('updated_at')
    .eq('owner_id', uid)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const seriesSyncedAt = newest?.updated_at ?? newestServerTime ?? state.seriesSyncedAt

  writeSyncState({ seen, lastSyncedAt: new Date().toISOString(), seriesSyncedAt, conflicts, pool: uid })
  return { ok: conflicts.length === 0, pushed, pulled, seriesPushed, seriesPulled, conflicts, reason: null, poolSwitched }
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
  if (!auth.user?.id) return false
  const uid = readSyncState().pool ?? auth.user.id

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
