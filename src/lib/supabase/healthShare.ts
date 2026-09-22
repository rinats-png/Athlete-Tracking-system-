import { getSupabase, isSupabaseConfigured } from './client'
import type { HealthKeys } from '@/lib/health/crypto'
import {
  generateEnvelopeKeys,
  importPublicKey,
  newShareKey,
  openPayload,
  openSealedKey,
  sealKey,
  sealPayload,
  unwrapPrivateKey,
  wrapPrivateKey,
} from '@/lib/health/envelope'
import { readSharePayload, sharePayload, type SharePayload } from '@/lib/health/share'
import type { HealthCategory } from '@/lib/store/schema'
import type { StoredHealth } from '@/lib/store/localStore'

/**
 * Die Trainerfreigabe über das Netz.
 *
 * DREI DINGE PASSIEREN HIER, und jedes hat eine Vorbedingung:
 *
 *   1. Das Schlüsselpaar des eigenen Kontos anlegen oder auspacken. Braucht
 *      die Phrase — der private Schlüssel liegt in ihr eingewickelt.
 *   2. Eine Kategorie freigeben. Braucht den öffentlichen Schlüssel des
 *      Trainers; der kommt über `envelope_public_of`, und die Funktion gibt
 *      ihn nur heraus, wenn die Verknüpfung aktiv ist.
 *   3. Freigaben lesen — die Trainerseite. Braucht den eigenen privaten
 *      Schlüssel, also ebenfalls die Phrase.
 *
 * WAS HIER NICHT PASSIERT: automatisches Auffrischen. Eine Freigabe ist eine
 * Abschrift mit Datum (share.ts). Sie altert sichtbar, und der Athlet
 * entscheidet, ob er sie erneuert.
 */

export type ShareOutcome =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'not_signed_in' | 'no_envelope' | 'no_coach_key' | 'failed' }

async function userId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Das Schlüsselpaar dieses Kontos — anlegen, wenn keines da ist, sonst
 * auspacken.
 *
 * Es wird NICHT beim Anmelden angelegt, sondern beim ersten Mal, wo es
 * gebraucht wird: beim Freigeben oder beim Lesen einer Freigabe. Ein
 * Schlüsselpaar auf Vorrat wäre ein Schlüsselpaar, das niemand
 * wiederherstellen kann, weil niemand je die Phrase eingegeben hat.
 */
export async function ensureEnvelope(keys: HealthKeys): Promise<{ privateKey: CryptoKey; publicKeyB64: string } | null> {
  const uid = await userId()
  if (!uid) return null
  const supabase = await getSupabase()
  if (!supabase) return null

  const { data } = await supabase.from('accounts').select('envelope_public, envelope_private').eq('id', uid).maybeSingle()
  const pub = typeof data?.envelope_public === 'string' ? data.envelope_public : null
  const wrapped = typeof data?.envelope_private === 'string' ? data.envelope_private : null

  if (pub && wrapped) {
    const privateKey = await unwrapPrivateKey(keys, wrapped)
    // Lässt es sich nicht auspacken, gehört das Paar zu einer ANDEREN
    // Phrase — nach «Neue Phrase» etwa. Dann wird neu erzeugt, und die alten
    // Freigaben sind tot; der Bildschirm sagt das.
    if (privateKey) return { privateKey, publicKeyB64: pub }
  }

  const fresh = await generateEnvelopeKeys()
  if (!fresh) return null
  const wrap = await wrapPrivateKey(keys, fresh.privateKey)
  if (!wrap) return null
  const { error } = await supabase.from('accounts').update({ envelope_public: fresh.publicKeyB64, envelope_private: wrap }).eq('id', uid)
  if (error) return null
  // Ein neues Paar macht jede vorhandene Freigabe unlesbar — sie ist für den
  // alten öffentlichen Schlüssel verschlossen. Also weg damit, statt sie als
  // Karteileiche liegen zu lassen.
  await supabase.from('health_shares').delete().eq('coach_id', uid)
  return { privateKey: fresh.privateKey, publicKeyB64: fresh.publicKeyB64 }
}

export interface CoachRow {
  coachId: string
  displayName: string
  /** Ohne Schlüsselpaar beim Trainer geht keine Freigabe — er muss sich erst einmal anmelden. */
  hasEnvelope: boolean
}

/** Die aktiv verknüpften Trainer dieses Athleten. */
export async function myCoaches(): Promise<CoachRow[]> {
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('my_coaches')
  if (error || !Array.isArray(data)) return []
  return data.map((r: { coach_id: string; display_name: string | null; has_envelope: boolean }) => ({
    coachId: r.coach_id,
    displayName: r.display_name ?? '',
    hasEnvelope: Boolean(r.has_envelope),
  }))
}

/**
 * Eine Kategorie freigeben oder die Freigabe auffrischen.
 *
 * Bei jedem Aufruf ein NEUER Freigabeschlüssel. Zwei Gründe: Ein Schlüssel,
 * der über mehrere Abschriften hinweg gilt, macht den Entzug von einer
 * früheren Abschrift abhängig; und ein frischer Schlüssel kostet nichts.
 */
export async function shareCategory(
  athleteId: string,
  category: HealthCategory,
  health: StoredHealth,
  coachId: string,
): Promise<ShareOutcome> {
  const uid = await userId()
  if (!uid) return { ok: false, reason: isSupabaseConfigured() ? 'not_signed_in' : 'unavailable' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable' }

  const { data: coachKey } = await supabase.rpc('envelope_public_of', { p_coach_id: coachId })
  if (typeof coachKey !== 'string' || !coachKey) return { ok: false, reason: 'no_coach_key' }
  const recipient = await importPublicKey(coachKey)
  if (!recipient) return { ok: false, reason: 'no_coach_key' }

  const shareKey = await newShareKey()
  if (!shareKey) return { ok: false, reason: 'failed' }
  const envelope = await sealKey(recipient, shareKey)
  const payload = await sealPayload(shareKey, sharePayload(health, category, new Date().toISOString()))
  if (!envelope || !payload) return { ok: false, reason: 'failed' }

  const { error } = await supabase
    .from('health_shares')
    .upsert({ owner_id: uid, coach_id: coachId, athlete_id: athleteId, category, envelope, payload }, { onConflict: 'owner_id,coach_id,athlete_id,category' })
  return error ? { ok: false, reason: 'failed' } : { ok: true }
}

/**
 * Entzug. Die Zeile verschwindet, und mit ihr das Chiffrat.
 *
 * Was der Trainer vorher gelesen hat, holt keine App zurück — das sagt der
 * Bildschirm, statt einen Entzug zu versprechen, der mehr könnte als er kann.
 */
export async function revokeShare(athleteId: string, category: HealthCategory, coachId: string): Promise<boolean> {
  const uid = await userId()
  if (!uid) return false
  const supabase = await getSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('health_shares')
    .delete()
    .eq('owner_id', uid)
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .eq('category', category)
  return !error
}

export interface OwnShare {
  coachId: string
  athleteId: string
  category: HealthCategory
  updatedAt: string
}

/** Was dieses Konto gerade freigegeben hat — ohne es zu entschlüsseln. */
export async function ownShares(): Promise<OwnShare[]> {
  const uid = await userId()
  if (!uid) return []
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.from('health_shares').select('coach_id, athlete_id, category, updated_at').eq('owner_id', uid)
  if (error || !Array.isArray(data)) return []
  return data.map((r: { coach_id: string; athlete_id: string; category: string; updated_at: string }) => ({
    coachId: r.coach_id,
    athleteId: r.athlete_id,
    category: r.category as HealthCategory,
    updatedAt: r.updated_at,
  }))
}

export interface ReceivedShare {
  ownerId: string
  athleteId: string
  category: HealthCategory
  updatedAt: string
  /** Null heisst: der Umschlag liess sich nicht öffnen. */
  payload: SharePayload | null
}

/**
 * Die Trainerseite: alle Freigaben lesen, die an dieses Konto gehen.
 *
 * Eine nicht zu öffnende Freigabe ist kein Fehler, der alles abbricht — sie
 * kommt mit `payload: null` durch, und der Bildschirm sagt, dass sie zu
 * einem alten Schlüsselpaar gehört.
 */
export async function receivedShares(privateKey: CryptoKey): Promise<ReceivedShare[]> {
  const uid = await userId()
  if (!uid) return []
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.from('health_shares').select('owner_id, athlete_id, category, envelope, payload, updated_at').eq('coach_id', uid)
  if (error || !Array.isArray(data)) return []

  const out: ReceivedShare[] = []
  for (const row of data as { owner_id: string; athlete_id: string; category: string; envelope: string; payload: string; updated_at: string }[]) {
    const shareKey = await openSealedKey(privateKey, row.envelope)
    const plain = shareKey ? await openPayload(shareKey, row.payload) : null
    out.push({
      ownerId: row.owner_id,
      athleteId: row.athlete_id,
      category: row.category as HealthCategory,
      updatedAt: row.updated_at,
      payload: plain ? readSharePayload(plain) : null,
    })
  }
  return out
}
