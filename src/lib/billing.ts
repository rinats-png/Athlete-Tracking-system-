import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Entitlement } from '@/domain/entitlement'
import type { AthletePlanId, CoachTierId, EntitlementProduct } from '@/data/pricing'
import { trackEvent } from '@/lib/analytics'

/**
 * Der Bezahlweg aus Sicht des Geräts.
 *
 * DREI DINGE, UND NUR DIESE DREI:
 *
 *   1. Freischaltungen HOLEN — aus `entitlements`, nur die eigene Zeile
 *      (RLS). Das Ergebnis liegt im Speicher des Geräts, damit die Schranken
 *      auch ohne Netz richtig stehen: eine Halle ohne Empfang darf nicht
 *      zum Verlust von Plus führen.
 *   2. Einen KAUF BEGINNEN — die Edge Function `create-checkout` legt bei
 *      Stripe eine Kasse an und gibt ihre Adresse zurück; das Gerät geht
 *      dorthin. Kartendaten sieht diese App nie; sie werden bei Stripe
 *      eingegeben, auf einer Seite, die Stripe ausliefert.
 *   3. Das ABO VERWALTEN — `billing-portal` gibt die Adresse des Stripe-
 *      Kundenportals (kündigen, Rechnung, Zahlungsmittel).
 *
 * Es gibt keinen Pfad, auf dem das Gerät eine Freischaltung SCHREIBT. Wer
 * die Zeile im lokalen Speicher ändert, ändert nur, was sein Gerät anzeigt;
 * beim nächsten Holen steht wieder der Serverstand. Serverseitige Schranken
 * (Reports, Branding) prüfen ohnehin die Tabelle, nicht das Gerät.
 *
 * OB DER BEZAHLWEG ÜBERHAUPT AN IST, entscheidet `billingEnabled()`:
 * `VITE_BILLING=on` beim Bau — gesetzt, sobald Stripe eingerichtet ist —
 * oder `kydon.billing.mode=on` im Speicher, für Prüffälle und zum Ansehen
 * der Schranken vor dem Start. Aus heisst: keine Schranke, wie bisher.
 */

const KEY = 'kydon.billing.v1'
const MODE_KEY = 'kydon.billing.mode'

export interface BillingState {
  entitlements: Entitlement[]
  /** Ob ein zahlender Trainer diesen Athleten betreut (Plus über ihn). */
  coachGrant: boolean
  /** Wann zuletzt vom Server gelesen. null = nie. */
  checkedAt: string | null
}

const EMPTY: BillingState = { entitlements: [], coachGrant: false, checkedAt: null }

export function billingEnabled(): boolean {
  try {
    const stored = localStorage.getItem(MODE_KEY)
    if (stored === 'on') return true
    if (stored === 'off') return false
  } catch {
    /* ohne Speicher gilt der Bau */
  }
  return import.meta.env?.VITE_BILLING === 'on'
}

const PRODUCTS: EntitlementProduct[] = ['athlete_plus', 'athlete_pro', 'athlete_elite', 'athlete_termin', 'coach_start', 'coach_team', 'coach_pro', 'coach_club']
const STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'] as const

function parseEntitlement(raw: unknown): Entitlement | null {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return null
  const product = r.product
  const status = r.status
  if (typeof product !== 'string' || !PRODUCTS.includes(product as EntitlementProduct)) return null
  if (typeof status !== 'string' || !(STATUSES as readonly string[]).includes(status)) return null
  const end = r.currentPeriodEnd ?? r.current_period_end
  return { product: product as EntitlementProduct, status: status as Entitlement['status'], currentPeriodEnd: typeof end === 'string' ? end : null }
}

export function readBillingState(): BillingState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<BillingState>
    return {
      entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements.map(parseEntitlement).filter((e): e is Entitlement => e != null) : [],
      coachGrant: parsed.coachGrant === true,
      checkedAt: typeof parsed.checkedAt === 'string' ? parsed.checkedAt : null,
    }
  } catch {
    return EMPTY
  }
}

export function writeBillingState(state: BillingState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* Ohne Speicher gilt der Stand für diese Sitzung. */
  }
}

export function clearBillingState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nichts zu räumen */
  }
}

/**
 * Freischaltungen vom Server holen. Gibt den neuen Stand zurück — oder null,
 * wenn nichts zu holen war (kein Projekt, keine Verbindung, nicht
 * angemeldet). Dann bleibt der letzte Stand, absichtlich: ein Funkloch
 * ist keine Kündigung.
 */
export async function refreshBillingState(): Promise<BillingState | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.from('entitlements').select('product, status, current_period_end')
  if (error) return null
  const { data: grant } = await supabase.rpc('my_coach_plan_grant')
  const state: BillingState = {
    entitlements: (data ?? []).map(parseEntitlement).filter((e): e is Entitlement => e != null),
    coachGrant: grant === true,
    checkedAt: new Date().toISOString(),
  }
  writeBillingState(state)
  return state
}

export type CheckoutInterval = 'yearly' | 'monthly' | 'once'

export type CheckoutOutcome = { ok: true; url: string } | { ok: false; reason: 'not_configured' | 'offline' | 'not_signed_in' | 'unavailable' | 'failed' }

/** Eine Kasse anlegen und ihre Adresse holen. Das Weiterleiten macht der Bildschirm. */
export async function startCheckout(plan: AthletePlanId | CoachTierId, interval: CheckoutInterval): Promise<CheckoutOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, reason: 'not_signed_in' }
  trackEvent('checkout_started', { plan, interval })
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { method: 'POST', body: { plan, interval } })
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      return { ok: false, reason: status === 401 ? 'not_signed_in' : status === 404 || status === 400 ? 'unavailable' : 'failed' }
    }
    const url = (data as { url?: unknown } | null)?.url
    return typeof url === 'string' && url.startsWith('https://') ? { ok: true, url } : { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

/** Die Adresse des Kundenportals (kündigen, Rechnungen, Zahlungsmittel). */
export async function openBillingPortal(): Promise<CheckoutOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, reason: 'not_signed_in' }
  try {
    const { data, error } = await supabase.functions.invoke('billing-portal', { method: 'POST' })
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      return { ok: false, reason: status === 401 ? 'not_signed_in' : status === 404 ? 'unavailable' : 'failed' }
    }
    const url = (data as { url?: unknown } | null)?.url
    return typeof url === 'string' && url.startsWith('https://') ? { ok: true, url } : { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}
