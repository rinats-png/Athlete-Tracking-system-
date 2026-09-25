/**
 * Das Wenige, das die Edge Functions von Stripe brauchen — ohne SDK.
 *
 * Kein SDK, weil die drei Aufrufe (Kasse anlegen, Portal anlegen, Signatur
 * prüfen) je ein HTTP-Aufruf oder ein HMAC sind. Ein SDK brächte Tausende
 * Zeilen für drei Zeilen Nutzen — und jede davon läuft mit dem geheimen
 * Schlüssel. Diese Datei hat keine Deno-Abhängigkeit, damit ihre reinen
 * Teile (Signatur, Zuordnung) aus den Prüffällen heraus geprüft werden können.
 */

export type Product = 'athlete_plus' | 'athlete_pro' | 'athlete_elite' | 'athlete_termin' | 'coach_start' | 'coach_team' | 'coach_pro' | 'coach_club'
export type Interval = 'yearly' | 'monthly' | 'once'

const PRODUCTS: Product[] = ['athlete_plus', 'athlete_pro', 'athlete_elite', 'athlete_termin', 'coach_start', 'coach_team', 'coach_pro', 'coach_club']

/** Plan-Kennung der App → Produkt. Termin ist ein Einmalkauf, alles andere ein Abo. */
export function productOf(plan: unknown, interval: unknown): { product: Product; interval: Interval } | null {
  const map: Record<string, Product> = { plus: 'athlete_plus', pro: 'athlete_pro', elite: 'athlete_elite', termin: 'athlete_termin', coach_start: 'coach_start', coach_team: 'coach_team', coach_pro: 'coach_pro', coach_club: 'coach_club' }
  if (typeof plan !== 'string' || !(plan in map)) return null
  const product = map[plan]
  if (product === 'athlete_termin') return interval === 'once' ? { product, interval: 'once' } : null
  if (interval !== 'yearly' && interval !== 'monthly') return null
  return { product, interval }
}

/** Name der Umgebungsvariablen mit der Stripe-Preis-Kennung. */
export function priceEnvName(product: Product, interval: Interval): string {
  return `STRIPE_PRICE_${product.toUpperCase()}_${interval.toUpperCase()}`
}

export function isProduct(value: unknown): value is Product {
  return typeof value === 'string' && PRODUCTS.includes(value as Product)
}

/** Stripe-Abo-Status → unsere Kennung. Was wir nicht kennen, gilt als abgelaufen. */
export function statusOf(stripeStatus: unknown): 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    default:
      return 'expired'
  }
}

const enc = new TextEncoder()

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Die Signatur eines Webhook-Aufrufs prüfen.
 *
 * Stripe schickt `t=<zeit>,v1=<hmac>`; der HMAC-SHA256 läuft über
 * `<zeit>.<rohen Körper>` mit dem Webhook-Geheimnis. Der Vergleich ist in
 * konstanter Zeit, und ein Zeitstempel älter als fünf Minuten wird
 * abgelehnt — sonst könnte ein einmal mitgelesener Aufruf beliebig oft
 * wiederholt werden.
 */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, now: number = Date.now(), toleranceSeconds = 300): Promise<boolean> {
  if (!header || !secret) return false
  let t = ''
  const v1: string[] = []
  for (const part of header.split(',')) {
    const [k, v] = part.trim().split('=')
    if (k === 't') t = v ?? ''
    if (k === 'v1' && v) v1.push(v)
  }
  if (!/^\d+$/.test(t) || v1.length === 0) return false
  if (Math.abs(now / 1000 - Number(t)) > toleranceSeconds) return false
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`)))
  return v1.some((sig) => timingSafeEqual(sig, expected))
}

/** Zum Erzeugen einer Signatur in Prüffällen — dieselbe Rechnung, andere Richtung. */
export async function signForTest(rawBody: string, secret: string, t: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return `t=${t},v1=${hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`)))}`
}

/** Ein Aufruf gegen die Stripe-API, form-kodiert wie Stripe es will. */
export async function stripePost(path: string, secretKey: string, fields: Record<string, string>): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const body = new URLSearchParams(fields)
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, status: res.status, body: json }
}

/** Ein lesender Aufruf gegen die Stripe-API. */
export async function stripeGet(path: string, secretKey: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${secretKey}` } })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, status: res.status, body: json }
}

// =============================================================================
// Stufenwechsel der Trainer (change-plan)
// =============================================================================

/** Die Trainerstufen in ihrer Rangfolge — dieselbe wie COACH_RANK in pricing.ts. */
export const COACH_PRODUCTS: Product[] = ['coach_start', 'coach_team', 'coach_pro', 'coach_club']

export function isCoachProduct(value: unknown): value is Product {
  return typeof value === 'string' && (COACH_PRODUCTS as string[]).includes(value)
}

/** Rang einer Trainerstufe; −1 für alles andere. */
export function coachRank(product: unknown): number {
  return COACH_PRODUCTS.indexOf(product as Product)
}

/** Plätze je Stufe — dieselben wie coach_seats() in der Datenbank. */
export function coachSeats(product: Product | null): number {
  return product === 'coach_club' ? 5 : product === 'coach_pro' ? 3 : product === 'coach_team' ? 2 : 1
}

/**
 * Die Felder einer HOCHSTUFUNG: Preis tauschen, sofort anteilig abrechnen und
 * nur wechseln, wenn die Zahlung durchgeht. `always_invoice` stellt die
 * Differenz für den Rest des Zeitraums sofort in Rechnung;
 * `error_if_incomplete` lässt den ganzen Wechsel scheitern, wenn die Karte
 * ablehnt — eine höhere Stufe ohne Zahlung gibt es nicht.
 */
export function upgradeFields(itemId: string, price: string, product: Product): Record<string, string> {
  return {
    'items[0][id]': itemId,
    'items[0][price]': price,
    proration_behavior: 'always_invoice',
    payment_behavior: 'error_if_incomplete',
    'metadata[product]': product,
  }
}

/** Die Vorschau derselben Hochstufung — ohne sie auszuführen. */
export function previewFields(customer: string, subscription: string, itemId: string, price: string, at: number): Record<string, string> {
  return {
    customer,
    subscription,
    'subscription_details[items][0][id]': itemId,
    'subscription_details[items][0][price]': price,
    'subscription_details[proration_behavior]': 'always_invoice',
    'subscription_details[proration_date]': String(at),
  }
}

/**
 * Die Felder einer HERABSTUFUNG als Abo-Plan: Phase 1 läuft mit dem alten
 * Preis bis zum Ende des bezahlten Zeitraums, Phase 2 beginnt mit dem neuen.
 * Keine Anteilsrechnung (`none`) — Herabstufen erstattet nichts. Danach gibt
 * der Plan das Abo wieder frei (`release`); es läuft normal weiter.
 */
export function downgradePhaseFields(
  currentPrice: string,
  phaseStart: number,
  phaseEnd: number,
  newPrice: string,
  newProduct: Product,
  userId: string,
): Record<string, string> {
  return {
    end_behavior: 'release',
    proration_behavior: 'none',
    'phases[0][items][0][price]': currentPrice,
    'phases[0][items][0][quantity]': '1',
    'phases[0][start_date]': String(phaseStart),
    'phases[0][end_date]': String(phaseEnd),
    'phases[1][items][0][price]': newPrice,
    'phases[1][items][0][quantity]': '1',
    'phases[1][metadata][product]': newProduct,
    'phases[1][metadata][user_id]': userId,
  }
}

/** Stripe-Intervall → unsere Kennung. */
export function intervalOf(stripeInterval: unknown): 'yearly' | 'monthly' | null {
  return stripeInterval === 'year' ? 'yearly' : stripeInterval === 'month' ? 'monthly' : null
}

/**
 * Laufzeit eines Abos lesen. Seit der Stripe-API vom März 2025 steht der
 * Zeitraum am Abo-Posten, nicht mehr am Abo — beides wird gelesen, damit ein
 * Versionswechsel im Stripe-Konto die Freischaltung nicht still ausser Kraft
 * setzt.
 */
export function periodOf(subscription: Record<string, unknown>): { start: number | null; end: number | null } {
  const item = (subscription.items as { data?: Record<string, unknown>[] } | undefined)?.data?.[0] ?? {}
  const num = (v: unknown) => (typeof v === 'number' ? v : null)
  return {
    start: num(subscription.current_period_start) ?? num(item.current_period_start),
    end: num(subscription.current_period_end) ?? num(item.current_period_end),
  }
}

/**
 * Erlaubte Herkünfte für Aufrufe aus dem Browser — dieselbe Liste wie bei
 * der Kontolöschung, aus demselben Grund: keine Wildcard.
 */
export function allowedOrigins(extra: string): Set<string> {
  return new Set(['https://kydon.app', 'https://www.kydon.app', 'https://baseline-diagnostics.netlify.app', extra].filter(Boolean))
}

export function corsFor(req: Request, origins: Set<string>): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}
