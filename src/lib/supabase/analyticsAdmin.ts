import { getSupabase, isSupabaseConfigured } from './client'

/**
 * Die Auswertung für den Admin — dünne Aufrufe der Datenbankfunktionen.
 *
 * DER SCHUTZ LIEGT NICHT HIER. Jede dieser Funktionen prüft in der Datenbank
 * selbst, ob der Aufrufer info@kydon.app mit bestätigter Adresse ist, und
 * antwortet sonst mit 403. Diese Datei kann also niemandem etwas zeigen, der
 * es nicht sehen darf — auch nicht, wenn jemand sie im Browser umschreibt.
 */

export type AdminCheck = 'admin' | 'forbidden' | 'signed_out' | 'unavailable'

export async function checkAdmin(): Promise<AdminCheck> {
  if (!isSupabaseConfigured()) return 'unavailable'
  const supabase = await getSupabase()
  if (!supabase) return 'unavailable'
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return 'signed_out'
  const { data, error } = await supabase.rpc('is_analytics_admin')
  if (error) return 'unavailable'
  return data === true ? 'admin' : 'forbidden'
}

export interface Range {
  from: Date
  to: Date
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('offline')
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.code === '42501' ? 'forbidden' : error.message)
  return data as T
}

const span = (r: Range) => ({ p_from: r.from.toISOString(), p_to: r.to.toISOString() })

export interface Summary {
  total_events: number
  unique_people: number
  signed_in_people: number
  sessions: number
}
export const fetchSummary = (r: Range) => rpc<Summary>('analytics_summary', span(r))

export interface TopEvent {
  event_name: string
  total: number
  people: number
}
export const fetchTopEvents = (r: Range, limit = 5) => rpc<TopEvent[]>('analytics_top_events', { ...span(r), p_limit: limit })

export interface LogRow {
  id: string
  created_at: string
  event_name: string
  user_id: string | null
  session_id: string | null
  properties: Record<string, unknown>
}
export const fetchLog = (r: Range, before: string | null, limit = 50) =>
  rpc<LogRow[]>('analytics_event_log', { ...span(r), p_before: before, p_limit: limit })

export interface PageRow {
  path: string
  views: number
  avg_seconds: number | null
  median_seconds: number | null
  exits: number
}
export const fetchPages = (r: Range) => rpc<PageRow[]>('analytics_pages', span(r))

export interface Retention {
  cohort: number
  returned_1d: number
  returned_7d: number
  returned_30d: number
  eligible_1d: number
  eligible_7d: number
  eligible_30d: number
}
export const fetchRetention = (r: Range) => rpc<Retention>('analytics_retention', span(r))

export interface FunnelStep {
  step: number
  event_name: string
  people: number
}
export const fetchFunnel = (steps: string[], r: Range) => rpc<FunnelStep[]>('analytics_funnel', { p_steps: steps, ...span(r) })

export const fetchEventNames = (r: Range) => rpc<{ event_name: string; total: number }[]>('analytics_event_names', span(r))

/**
 * Funnel-Rechnung für die Anzeige: Anteil am ersten Schritt und Abfall zum
 * vorigen. Rein, ohne Netz — damit prüfbar.
 */
export function funnelView(steps: FunnelStep[]): { event_name: string; people: number; ofStart: number; fromPrevious: number | null }[] {
  const start = steps[0]?.people ?? 0
  return steps.map((s, i) => ({
    event_name: s.event_name,
    people: s.people,
    ofStart: start > 0 ? s.people / start : 0,
    fromPrevious: i === 0 ? null : steps[i - 1].people > 0 ? s.people / steps[i - 1].people : 0,
  }))
}
