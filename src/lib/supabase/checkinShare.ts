import { getSupabase, isSupabaseConfigured } from './client'
import { sharedRows } from '@/lib/checkinShare'
import type { CheckIn } from '@/domain/checkin'

/**
 * Check-ins über das Netz: der Athlet zeigt sie, der Trainer liest sie.
 *
 * Aufgerufen wird nur, wenn der Athlet den Schalter eingeschaltet hat und der
 * Bau-Schalter an ist. Fehlt das Konto oder das Netz, passiert nichts — der
 * Check-in bleibt auf dem Gerät, und die Funktion sagt nur «nicht geklappt».
 */

export type ShareResult = 'ok' | 'not_signed_in' | 'unavailable' | 'failed'

async function client() {
  if (!isSupabaseConfigured()) return null
  return getSupabase()
}

/** Eigene Check-ins der letzten Wochen für den Trainer bereitstellen. */
export async function publishCheckins(checkins: CheckIn[]): Promise<ShareResult> {
  const supabase = await client()
  if (!supabase) return 'unavailable'
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return 'not_signed_in'
  const rows = sharedRows(checkins).map((r) => ({ owner_id: uid, ...r, updated_at: new Date().toISOString() }))
  if (rows.length === 0) return 'ok'
  const { error } = await supabase.from('shared_checkins').upsert(rows, { onConflict: 'owner_id,day' })
  return error ? 'failed' : 'ok'
}

/** Die Freigabe zurücknehmen: alle geteilten Zeilen des Kontos löschen. */
export async function withdrawCheckins(): Promise<ShareResult> {
  const supabase = await client()
  if (!supabase) return 'unavailable'
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return 'not_signed_in'
  const { error } = await supabase.from('shared_checkins').delete().eq('owner_id', uid)
  return error ? 'failed' : 'ok'
}

export interface LinkedCheckins {
  id: string
  name: string
  checkins: CheckIn[]
}

/** Trainerseite: die geteilten Check-ins aller aktiv verbundenen Athleten. */
export async function fetchLinkedCheckins(sinceDay: string): Promise<LinkedCheckins[] | null> {
  const supabase = await client()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('coach_shared_checkins', { p_since: sinceDay })
  if (error || !Array.isArray(data)) return null
  const byId = new Map<string, LinkedCheckins>()
  for (const r of data as { athlete_id: string; display_name: string | null; day: string; energy: number | null; soreness: number | null; stress: number | null }[]) {
    const cur = byId.get(r.athlete_id) ?? { id: r.athlete_id, name: r.display_name ?? '', checkins: [] }
    cur.checkins.push({ day: r.day, energy: r.energy, soreness: r.soreness, stress: r.stress })
    byId.set(r.athlete_id, cur)
  }
  return [...byId.values()].map((p) => ({ ...p, checkins: p.checkins.sort((a, b) => a.day.localeCompare(b.day)) }))
}
