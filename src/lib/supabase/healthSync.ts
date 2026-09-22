import { getSupabase, isSupabaseConfigured } from './client'
import { getHealthKey, putHealthKey } from '@/lib/store/backup'
import { checkVerifier, decryptJson, deriveKey, encryptJson, makeVerifier, newSalt } from '@/lib/health/crypto'
import { healthRecords, mergeHealth, planHealthPush, type IncomingHealth, type RemoteHealthRow } from '@/lib/health/sync'
import type { StoredData } from '@/lib/store/localStore'

/**
 * Die Gesundheitsschicht über das Netz — verschlüsselt.
 *
 * DER ABLAUF IST DERSELBE wie bei den Zeitreihen: holen, einarbeiten,
 * schreiben, Grabsteine setzen. Der Unterschied steckt in zwei Zeilen: vor
 * dem Schreiben wird verschlüsselt, nach dem Holen entschlüsselt. Was der
 * Server sieht, ist eine Kennung, ein Zeitstempel und ein Block Chiffrat.
 *
 * OHNE SCHLÜSSEL PASSIERT NICHTS. Kein Teilabgleich, kein «wir schieben schon
 * mal die Metadaten hoch». Wer die Phrase nicht eingegeben hat, gleicht
 * diese Schicht nicht ab — und der Bildschirm sagt das.
 */

const STATE_KEY = 'kydon.health.sync.v1'

export type KeyState =
  | { state: 'unavailable' }
  | { state: 'not_signed_in' }
  /** Noch kein Schlüssel angelegt. */
  | { state: 'none' }
  /** Auf dem Server liegt ein Salz, auf diesem Gerät kein Schlüssel. */
  | { state: 'locked'; salt: string }
  | { state: 'unlocked'; key: CryptoKey; userId: string }

interface Account {
  id: string
  salt: string | null
  verifier: string | null
}

async function account(): Promise<Account | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase.from('accounts').select('health_salt, health_verifier').eq('id', auth.user.id).maybeSingle()
  return {
    id: auth.user.id,
    salt: typeof data?.health_salt === 'string' ? data.health_salt : null,
    verifier: typeof data?.health_verifier === 'string' ? data.health_verifier : null,
  }
}

/** Wo steht der Schlüssel gerade? Fragt Server und Gerät, in dieser Reihenfolge. */
export async function keyState(): Promise<KeyState> {
  if (!isSupabaseConfigured()) return { state: 'unavailable' }
  const acc = await account()
  if (!acc) return { state: 'not_signed_in' }
  if (!acc.salt || !acc.verifier) return { state: 'none' }
  const key = await getHealthKey(acc.id)
  if (key && (await checkVerifier(key, acc.verifier))) return { state: 'unlocked', key, userId: acc.id }
  return { state: 'locked', salt: acc.salt }
}

export type KeyOutcome = { ok: true; key: CryptoKey } | { ok: false; reason: 'unavailable' | 'not_signed_in' | 'wrong_phrase' | 'exists' | 'failed' }

/**
 * Einen Schlüssel anlegen: Salz erzeugen, ableiten, Probe schreiben.
 *
 * Bricht ab, wenn schon ein Salz am Konto steht — ein zweites überschriebe
 * den Schlüssel, mit dem die vorhandenen Zeilen verschlüsselt sind, und die
 * wären damit unlesbar. Wer neu anfangen will, nimmt `resetHealthKey`, und
 * das verschlüsselt alles neu.
 */
export async function createHealthKey(phrase: string): Promise<KeyOutcome> {
  const acc = await account()
  if (!acc) return { ok: false, reason: isSupabaseConfigured() ? 'not_signed_in' : 'unavailable' }
  if (acc.salt && acc.verifier) return { ok: false, reason: 'exists' }

  const salt = newSalt()
  const key = await deriveKey(phrase, salt)
  if (!key) return { ok: false, reason: 'failed' }
  const verifier = await makeVerifier(key)
  if (!verifier) return { ok: false, reason: 'failed' }

  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable' }
  const { error } = await supabase.from('accounts').update({ health_salt: salt, health_verifier: verifier }).eq('id', acc.id)
  if (error) return { ok: false, reason: 'failed' }
  await putHealthKey(acc.id, key)
  return { ok: true, key }
}

/** Eine eingetippte Phrase gegen die Probe prüfen und den Schlüssel ablegen. */
export async function unlockHealthKey(phrase: string): Promise<KeyOutcome> {
  const acc = await account()
  if (!acc) return { ok: false, reason: isSupabaseConfigured() ? 'not_signed_in' : 'unavailable' }
  if (!acc.salt || !acc.verifier) return { ok: false, reason: 'failed' }
  const key = await deriveKey(phrase, acc.salt)
  if (!key) return { ok: false, reason: 'failed' }
  if (!(await checkVerifier(key, acc.verifier))) return { ok: false, reason: 'wrong_phrase' }
  await putHealthKey(acc.id, key)
  return { ok: true, key }
}

/**
 * Eine neue Phrase, wenn die alte verloren ist.
 *
 * DER WEG AUS DER SACKGASSE: Solange die Daten auf dem Gerät liegen, ist
 * nichts verloren — es wird ein neues Salz erzeugt, alles neu verschlüsselt
 * und der alte Serverstand vollständig ersetzt. Nur wer Phrase UND Gerät
 * verliert, verliert die Daten; dafür gibt es den Export (§32).
 */
export async function resetHealthKey(phrase: string): Promise<KeyOutcome> {
  const acc = await account()
  if (!acc) return { ok: false, reason: isSupabaseConfigured() ? 'not_signed_in' : 'unavailable' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable' }

  const salt = newSalt()
  const key = await deriveKey(phrase, salt)
  if (!key) return { ok: false, reason: 'failed' }
  const verifier = await makeVerifier(key)
  if (!verifier) return { ok: false, reason: 'failed' }

  // Erst die alten Zeilen weg — sie sind mit dem alten Schlüssel
  // verschlüsselt und nach dem Wechsel für niemanden mehr lesbar.
  const { error: wipeError } = await supabase.from('health_entries').delete().eq('owner_id', acc.id)
  if (wipeError) return { ok: false, reason: 'failed' }
  const { error } = await supabase.from('accounts').update({ health_salt: salt, health_verifier: verifier }).eq('id', acc.id)
  if (error) return { ok: false, reason: 'failed' }
  await putHealthKey(acc.id, key)
  // Der nächste Abgleich schreibt alles neu: ohne Stand gilt «alles ist neu».
  writeHealthSyncedAt(null)
  return { ok: true, key }
}

/** Alle verschlüsselten Zeilen auf dem Server löschen — ohne Phrase möglich. */
export async function dropHealthOnServer(): Promise<boolean> {
  const acc = await account()
  if (!acc) return false
  const supabase = await getSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('health_entries').delete().eq('owner_id', acc.id)
  if (error) return false
  await supabase.from('accounts').update({ health_salt: null, health_verifier: null }).eq('id', acc.id)
  writeHealthSyncedAt(null)
  return true
}

function readHealthSyncedAt(): string | null {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    return raw ? (JSON.parse(raw) as { at?: string }).at ?? null : null
  } catch {
    return null
  }
}

function writeHealthSyncedAt(at: string | null): void {
  try {
    if (at == null) localStorage.removeItem(STATE_KEY)
    else localStorage.setItem(STATE_KEY, JSON.stringify({ at }))
  } catch {
    /* Ohne Speicher gilt der Stand für diese Sitzung. */
  }
}

export interface HealthSyncReport {
  ok: boolean
  pushed: number
  pulled: number
  /** Zeilen, die sich nicht entschlüsseln liessen — fremder Schlüssel oder beschädigt. */
  unreadable: number
  reason: null | 'unavailable' | 'not_signed_in' | 'locked' | 'failed'
}

const fail = (reason: HealthSyncReport['reason']): HealthSyncReport => ({ ok: false, pushed: 0, pulled: 0, unreadable: 0, reason })

function deviceId(): string {
  try {
    return localStorage.getItem('kydon.device') ?? ''
  } catch {
    return ''
  }
}

/**
 * Einmal abgleichen — holen, einarbeiten, schreiben.
 *
 * Reihenfolge wie beim Dokument: erst holen. Wer auf einem zweiten Gerät
 * einen Befund eingetragen hat, soll ihn sehen, bevor sein eigener Stand
 * hochgeht.
 */
export async function syncHealthOnce(store: StoredData, key: CryptoKey, onMerge: (athleteId: string, incoming: IncomingHealth[]) => number): Promise<HealthSyncReport> {
  if (!isSupabaseConfigured()) return fail('unavailable')
  const supabase = await getSupabase()
  if (!supabase) return fail('unavailable')
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return fail('not_signed_in')

  const since = readHealthSyncedAt()
  const device = deviceId()
  let pushed = 0
  let pulled = 0
  let unreadable = 0

  // --- 1. Holen -------------------------------------------------------------
  let query = supabase.from('health_entries').select('athlete_id, entry_id, payload, device_id, updated_at, deleted_at').eq('owner_id', uid)
  if (since) query = query.gt('updated_at', since)
  const { data: rows, error } = await query
  if (error) return fail('failed')
  const remote = (rows ?? []) as RemoteHealthRow[]

  // --- 2. Entschlüsseln und einarbeiten ------------------------------------
  const byAthlete = new Map<string, IncomingHealth[]>()
  for (const row of remote.filter((r) => r.device_id !== device)) {
    if (row.deleted_at) {
      const list = byAthlete.get(row.athlete_id) ?? []
      list.push({ entryId: row.entry_id, deleted: true, data: null })
      byAthlete.set(row.athlete_id, list)
      continue
    }
    const plain = await decryptJson(key, row.payload)
    if (plain == null) {
      // Ein fremder Schlüssel oder ein beschädigter Block. Nicht abbrechen:
      // die übrigen Zeilen sind davon unberührt, und der Bildschirm nennt
      // die Zahl, statt sie zu verschweigen.
      unreadable += 1
      continue
    }
    const list = byAthlete.get(row.athlete_id) ?? []
    list.push({ entryId: row.entry_id, deleted: false, data: plain })
    byAthlete.set(row.athlete_id, list)
  }
  for (const [athleteId, incoming] of byAthlete) pulled += onMerge(athleteId, incoming)

  // --- 3. Schreiben ---------------------------------------------------------
  for (const athlete of store.athletes) {
    const merged = mergeHealth(athlete, byAthlete.get(athlete.id) ?? []).athlete
    const plan = planHealthPush(healthRecords(merged), remote, athlete.id, since)

    const batch: { owner_id: string; athlete_id: string; entry_id: string; payload: string; device_id: string; deleted_at: null }[] = []
    for (const record of plan.upserts) {
      const payload = await encryptJson(key, record.data)
      if (!payload) return { ok: false, pushed, pulled, unreadable, reason: 'failed' }
      batch.push({ owner_id: uid, athlete_id: athlete.id, entry_id: record.entryId, payload, device_id: device, deleted_at: null })
    }
    for (let i = 0; i < batch.length; i += 100) {
      const { error: upsertError } = await supabase.from('health_entries').upsert(batch.slice(i, i + 100), { onConflict: 'owner_id,athlete_id,entry_id' })
      if (upsertError) return { ok: false, pushed, pulled, unreadable, reason: 'failed' }
      pushed += Math.min(100, batch.length - i)
    }
    for (const entryId of plan.tombstones) {
      const { error: tombError } = await supabase
        .from('health_entries')
        // Auch der Grabstein braucht eine Nutzlast, die der Form genügt —
        // der Inhalt ist bedeutungslos, die Zeile ist die Nachricht.
        .update({ deleted_at: new Date().toISOString(), device_id: device })
        .eq('owner_id', uid)
        .eq('athlete_id', athlete.id)
        .eq('entry_id', entryId)
      if (tombError) return { ok: false, pushed, pulled, unreadable, reason: 'failed' }
      pushed += 1
    }
  }

  const { data: newest } = await supabase
    .from('health_entries')
    .select('updated_at')
    .eq('owner_id', uid)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  writeHealthSyncedAt(newest?.updated_at ?? since)

  return { ok: true, pushed, pulled, unreadable, reason: null }
}
