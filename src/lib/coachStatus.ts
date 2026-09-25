import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { COACH_RANK, type CoachTierId } from '@/data/pricing'

/**
 * Was der Server über den Trainerbestand weiss: Stufe, Zählstand, Frist,
 * Team. Eine Quelle (`my_coach_status`), damit Zählung und Frist nicht auf
 * dem Gerät entstehen — das Gerät könnte sonst seine eigene Rechnung
 * vorlegen.
 *
 * Der letzte Stand liegt im Speicher, damit Hinweis und Frist auch in einer
 * Halle ohne Netz stimmen. Ein Funkloch hebt keine Frist auf und setzt keine.
 */

const KEY = 'kydon.coachStatus.v1'

export type TeamRole = 'owner' | 'coach'

export interface TeamMember {
  userId: string
  role: TeamRole
  name: string
  joinedAt: string
}

export interface TeamInfo {
  id: string
  name: string
  role: TeamRole
  members: TeamMember[]
  openInvites: number
}

export interface CoachStatus {
  /** In wessen Bestand dieses Konto arbeitet — der eigene oder der des Teaminhabers. */
  poolOwner: string
  isOwner: boolean
  tier: CoachTierId
  limit: number
  seats: number
  measured: number
  windowStart: string | null
  overLimitSince: string | null
  autoUpgrade: boolean
  interval: 'yearly' | 'monthly' | 'once' | null
  periodEnd: string | null
  scheduledTier: CoachTierId | null
  hasSubscription: boolean
  team: TeamInfo | null
  checkedAt: string
}

const tierOf = (product: unknown): CoachTierId => {
  const id = typeof product === 'string' ? product : ''
  return (COACH_RANK as readonly string[]).includes(id) && id !== 'coach_free' ? (id as CoachTierId) : 'coach_free'
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function parseCoachStatus(raw: unknown, checkedAt: string = new Date().toISOString()): CoachStatus | null {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object' || typeof r.pool_owner !== 'string') return null
  const t = r.team as Record<string, unknown> | null
  const team: TeamInfo | null =
    t && typeof t === 'object' && typeof t.id === 'string'
      ? {
          id: t.id,
          name: str(t.name) ?? '',
          role: t.role === 'owner' ? 'owner' : 'coach',
          members: Array.isArray(t.members)
            ? (t.members as Record<string, unknown>[])
                .filter((m) => m && typeof m.user_id === 'string')
                .map((m) => ({ userId: m.user_id as string, role: m.role === 'owner' ? 'owner' : 'coach', name: str(m.name) ?? '', joinedAt: str(m.joined_at) ?? '' }))
            : [],
          openInvites: num(t.open_invites, 0),
        }
      : null
  const interval = r.interval === 'yearly' || r.interval === 'monthly' || r.interval === 'once' ? r.interval : null
  return {
    poolOwner: r.pool_owner,
    isOwner: r.is_owner === true,
    tier: tierOf(r.product),
    limit: num(r.limit, 3),
    seats: num(r.seats, 1),
    measured: num(r.measured, 0),
    windowStart: str(r.window_start),
    overLimitSince: str(r.over_limit_since),
    autoUpgrade: r.auto_upgrade === true,
    interval,
    periodEnd: str(r.period_end),
    scheduledTier: r.scheduled_product ? tierOf(r.scheduled_product) : null,
    hasSubscription: r.has_subscription === true,
    team,
    checkedAt,
  }
}

export function readCoachStatus(): CoachStatus | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { raw?: unknown; checkedAt?: string }
    return parseCoachStatus(parsed.raw, parsed.checkedAt)
  } catch {
    return null
  }
}

export function clearCoachStatus(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nichts zu räumen */
  }
}

/** Frisch vom Server. null = nichts zu holen (kein Projekt, kein Netz, nicht angemeldet). */
export async function fetchCoachStatus(): Promise<CoachStatus | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.rpc('my_coach_status')
  if (error) return null
  const checkedAt = new Date().toISOString()
  const status = parseCoachStatus(data, checkedAt)
  if (status) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ raw: data, checkedAt }))
    } catch {
      /* Ohne Speicher gilt der Stand für diese Sitzung. */
    }
  }
  return status
}

// =============================================================================
// Stufenwechsel
// =============================================================================

export type PlanChangeError =
  | 'not_configured'
  | 'offline'
  | 'not_signed_in'
  | 'no_subscription'
  | 'too_many_members'
  | 'payment_failed'
  | 'unavailable'
  | 'failed'

export interface PlanChangePreview {
  direction: 'up' | 'down'
  /** null = Stripe hat keine Vorschau geliefert; das Gerät schätzt dann selbst. */
  amountEur: number | null
  effectiveAt: string | null
  interval: 'yearly' | 'monthly'
  periodStart: number | null
  periodEnd: number | null
}

async function invokeChange(body: Record<string, unknown>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: PlanChangeError }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, reason: 'not_signed_in' }
  try {
    const { data, error } = await supabase.functions.invoke('change-plan', { method: 'POST', body })
    if (error) {
      const ctx = (error as { context?: Response }).context
      const status = ctx?.status
      let code = ''
      try {
        code = ((await ctx?.json()) as { error?: string } | undefined)?.error ?? ''
      } catch {
        /* kein Körper */
      }
      if (status === 401) return { ok: false, reason: 'not_signed_in' }
      if (code === 'no_subscription' || code === 'too_many_members' || code === 'payment_failed' || code === 'unavailable') return { ok: false, reason: code }
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

export async function previewPlanChange(plan: CoachTierId): Promise<{ ok: true; preview: PlanChangePreview } | { ok: false; reason: PlanChangeError }> {
  const r = await invokeChange({ action: 'preview', plan })
  if (!r.ok) return r
  const d = r.data
  return {
    ok: true,
    preview: {
      direction: d.direction === 'down' ? 'down' : 'up',
      amountEur: typeof d.amountEur === 'number' ? d.amountEur : null,
      effectiveAt: str(d.effectiveAt),
      interval: d.interval === 'monthly' ? 'monthly' : 'yearly',
      periodStart: typeof d.periodStart === 'number' ? d.periodStart : null,
      periodEnd: typeof d.periodEnd === 'number' ? d.periodEnd : null,
    },
  }
}

export async function applyPlanChange(plan: CoachTierId): Promise<{ ok: true } | { ok: false; reason: PlanChangeError }> {
  const r = await invokeChange({ action: 'apply', plan })
  return r.ok ? { ok: true } : r
}

export async function cancelScheduledChange(): Promise<{ ok: true } | { ok: false; reason: PlanChangeError }> {
  const r = await invokeChange({ action: 'cancel' })
  return r.ok ? { ok: true } : r
}

// =============================================================================
// Team
// =============================================================================

export type TeamError =
  | 'offline'
  | 'not_signed_in'
  | 'already_in_team'
  | 'plan_without_team'
  | 'seats_full'
  | 'invite_invalid'
  | 'invite_other_email'
  | 'not_team_owner'
  | 'failed'

const TEAM_ERRORS: TeamError[] = ['already_in_team', 'plan_without_team', 'seats_full', 'invite_invalid', 'invite_other_email', 'not_team_owner']

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; reason: TeamError }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'offline' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, reason: 'not_signed_in' }
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const known = TEAM_ERRORS.find((code) => error.message?.includes(code))
    return { ok: false, reason: known ?? 'failed' }
  }
  return { ok: true, data: data as T }
}

export const createTeam = (name: string) => rpc<string>('create_team', { p_name: name })
export const renameTeam = (name: string) => rpc<null>('rename_team', { p_name: name })
export const createTeamInvite = (email: string | null) => rpc<string>('create_team_invite', { p_email: email })
export const revokeTeamInvite = (id: string) => rpc<null>('revoke_team_invite', { p_invite_id: id })
export const acceptTeamInvite = (token: string) => rpc<{ team_id: string; owner_id: string; name: string }>('accept_team_invite', { p_token: token.trim() })
export const removeTeamMember = (userId: string) => rpc<null>('remove_team_member', { p_user_id: userId })
export const leaveTeam = () => rpc<null>('leave_team')
export const dissolveTeam = () => rpc<null>('dissolve_team')
export const setAutoUpgrade = (on: boolean) => rpc<null>('set_auto_upgrade', { p_on: on })

export interface TeamInvite {
  id: string
  email: string | null
  expiresAt: string
}

/** Offene Einladungen — nur der Inhaber sieht sie (RLS). */
export async function listTeamInvites(): Promise<TeamInvite[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('team_invites')
    .select('id, email, expires_at')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as { id: string; email: string | null; expires_at: string }[]).map((r) => ({ id: r.id, email: r.email, expiresAt: r.expires_at }))
}

/**
 * Der Link, den der Inhaber weitergibt. Der Code steht im Fragment (#), nicht
 * in der Adresse: Fragmente gehen nicht an den Server, nicht in Zugriffslogs
 * und nicht in den Referer.
 */
export function inviteLink(origin: string, token: string): string {
  return `${origin}/team/beitreten#${token}`
}

/** Den Code aus einem eingefügten Link oder aus dem blanken Code lesen. */
export function tokenFromInput(input: string): string {
  const trimmed = input.trim()
  const hash = trimmed.indexOf('#')
  const token = hash >= 0 ? trimmed.slice(hash + 1) : trimmed
  return /^[0-9a-f]{64}$/i.test(token) ? token.toLowerCase() : ''
}

// =============================================================================
// Übernahme beim Beitritt
// =============================================================================

const CARRY_KEY = 'kydon.team.carry'

/**
 * Was mit dem bisherigen Bestand dieses Geräts beim Beitritt passiert:
 * 'carry' = er geht ins Team und zählt dort; 'keep' = er bleibt im eigenen
 * Konto auf dem Server und verlässt dieses Gerät, bis man das Team verlässt.
 */
export function writeCarryChoice(choice: 'carry' | 'keep'): void {
  try {
    localStorage.setItem(CARRY_KEY, choice)
  } catch {
    /* ohne Speicher: sicherer Weg, nichts mitnehmen */
  }
}

export function readCarryChoice(): 'carry' | 'keep' {
  try {
    return localStorage.getItem(CARRY_KEY) === 'carry' ? 'carry' : 'keep'
  } catch {
    return 'keep'
  }
}

export function clearCarryChoice(): void {
  try {
    localStorage.removeItem(CARRY_KEY)
  } catch {
    /* nichts zu räumen */
  }
}
