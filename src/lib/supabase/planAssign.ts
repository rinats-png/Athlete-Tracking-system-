import { getSupabase, isSupabaseConfigured } from './client'

/**
 * Zugewiesene Pläne über das Netz (Migration 20261005100000_plan_assignments).
 *
 * Alles Schreibende läuft über Funktionen des Servers, die Verknüpfung, Rolle
 * und Zustand prüfen. Fehlt das Konto oder das Netz, passiert nichts und der
 * Aufrufer bekommt «nicht geklappt»; der Plan auf dem Gerät bleibt unberührt.
 */
export type AssignResult<T = void> = { ok: true; value: T } | { ok: false; reason: 'unavailable' | 'not_signed_in' | 'failed' }

export type AssignmentStatus = 'offered' | 'accepted' | 'declined' | 'withdrawn'
export interface Assignment {
  id: string
  athleteId: string
  name: string
  status: AssignmentStatus
  shareDone: boolean
  shareResults: boolean
  shareHr: boolean
  createdAt: string
  /** Nur beim Athleten gelesen; der Trainer braucht ihn nicht zurück. */
  payload?: unknown
}
export interface Shares {
  done: boolean
  results: boolean
  hr: boolean
}
export interface LinkedAthlete {
  athleteId: string
  name: string
}
export interface ProgressRow {
  key: string
  day: string
  durationMin: number | null
  rpe: number | null
  avgHr: number | null
  maxHr: number | null
}

type Client = NonNullable<Awaited<ReturnType<typeof getSupabase>>>
type Ready = { supabase: Client; error?: undefined } | { supabase: null; error: 'unavailable' | 'not_signed_in' }

async function ready(): Promise<Ready> {
  if (!isSupabaseConfigured()) return { supabase: null, error: 'unavailable' }
  const supabase = await getSupabase()
  if (!supabase) return { supabase: null, error: 'unavailable' }
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { supabase: null, error: 'not_signed_in' }
  return { supabase }
}

const fail = (reason: 'unavailable' | 'not_signed_in' | 'failed'): { ok: false; reason: typeof reason } => ({ ok: false, reason })

type Row = { id: string; athlete_id: string; name: string; status: AssignmentStatus; share_done: boolean; share_results: boolean; share_hr: boolean; created_at: string; payload?: unknown }
const toAssignment = (r: Row, withPayload: boolean): Assignment => ({ id: r.id, athleteId: r.athlete_id, name: r.name, status: r.status, shareDone: r.share_done, shareResults: r.share_results, shareHr: r.share_hr, createdAt: r.created_at, ...(withPayload ? { payload: r.payload } : {}) })

/** Athlet: Zuweisungen an mich (Angebote und angenommene). */
export async function fetchMyAssignments(): Promise<AssignResult<Assignment[]>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.from('plan_assignments').select('id, athlete_id, name, status, share_done, share_results, share_hr, created_at, payload').in('status', ['offered', 'accepted']).order('created_at', { ascending: false }).limit(20)
  return error || !Array.isArray(data) ? fail('failed') : { ok: true, value: (data as Row[]).map((x) => toAssignment(x, true)) }
}

export async function respondAssignment(id: string, accept: boolean, shares: Shares): Promise<AssignResult<boolean>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('respond_plan_assignment', { p_id: id, p_accept: accept, p_share_done: shares.done, p_share_results: shares.results, p_share_hr: shares.hr })
  return error ? fail('failed') : { ok: true, value: data === true }
}

export async function setShares(id: string, shares: Shares): Promise<AssignResult<boolean>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('set_plan_assignment_share', { p_id: id, p_done: shares.done, p_results: shares.results, p_hr: shares.hr })
  return error ? fail('failed') : { ok: true, value: data === true }
}

export async function reportCompletion(id: string, c: { key: string; day: string; durationMin: number; rpe: number; avgHr: number | null; maxHr: number | null }): Promise<AssignResult<boolean>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('report_plan_completion', { p_id: id, p_key: c.key, p_day: c.day, p_duration: c.durationMin, p_rpe: c.rpe, p_avg: c.avgHr, p_max: c.maxHr })
  return error ? fail('failed') : { ok: true, value: data === true }
}

/** Trainer: die mit mir aktiv verbundenen Athleten, die ein Konto haben. */
export async function fetchLinkedAthletes(): Promise<AssignResult<LinkedAthlete[]>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.from('coach_athlete_links').select('athlete_id, athletes(first_name, last_name, user_id)').eq('status', 'active')
  if (error || !Array.isArray(data)) return fail('failed')
  const list: LinkedAthlete[] = []
  for (const row of data as unknown as { athlete_id: string; athletes: { first_name: string | null; last_name: string | null; user_id: string | null } | { first_name: string | null; last_name: string | null; user_id: string | null }[] | null }[]) {
    const a = Array.isArray(row.athletes) ? row.athletes[0] : row.athletes
    if (!a?.user_id) continue
    list.push({ athleteId: row.athlete_id, name: [a.first_name, a.last_name].filter(Boolean).join(' ') })
  }
  return { ok: true, value: list }
}

export async function fetchCoachAssignments(): Promise<AssignResult<Assignment[]>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.from('plan_assignments').select('id, athlete_id, name, status, share_done, share_results, share_hr, created_at').order('created_at', { ascending: false }).limit(50)
  return error || !Array.isArray(data) ? fail('failed') : { ok: true, value: (data as Row[]).map((x) => toAssignment(x, false)) }
}

/** `consentAttested`: der Trainer bestätigt, dass der Athlet volljährig ist oder die Einwilligung der Eltern vorliegt. */
export async function offerAssignment(athleteId: string, name: string, payload: unknown, consentAttested: boolean): Promise<AssignResult<string>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('offer_plan_assignment', { p_athlete_id: athleteId, p_name: name, p_payload: payload, p_consent_attested: consentAttested })
  return error || typeof data !== 'string' ? fail('failed') : { ok: true, value: data }
}

export async function withdrawAssignment(id: string): Promise<AssignResult<boolean>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('withdraw_plan_assignment', { p_id: id })
  return error ? fail('failed') : { ok: true, value: data === true }
}

export async function fetchProgress(id: string): Promise<AssignResult<ProgressRow[]>> {
  const r = await ready()
  if (!r.supabase) return fail(r.error)
  const { data, error } = await r.supabase.rpc('coach_plan_progress', { p_id: id })
  if (error || !Array.isArray(data)) return fail('failed')
  return { ok: true, value: (data as { session_key: string; day: string; duration_min: number | null; rpe: number | null; avg_hr: number | null; max_hr: number | null }[]).map((x) => ({ key: x.session_key, day: x.day, durationMin: x.duration_min, rpe: x.rpe, avgHr: x.avg_hr, maxHr: x.max_hr })) }
}
