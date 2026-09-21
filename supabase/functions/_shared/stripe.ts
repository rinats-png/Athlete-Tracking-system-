/**
 * Das Wenige, das die Edge Functions von Stripe brauchen — ohne SDK.
 *
 * Kein SDK, weil die drei Aufrufe (Kasse anlegen, Portal anlegen, Signatur
 * prüfen) je ein HTTP-Aufruf oder ein HMAC sind. Ein SDK brächte Tausende
 * Zeilen für drei Zeilen Nutzen — und jede davon läuft mit dem geheimen
 * Schlüssel. Diese Datei hat keine Deno-Abhängigkeit, damit ihre reinen
 * Teile (Signatur, Zuordnung) aus den Prüffällen heraus geprüft werden können.
 */

export type Product = 'athlete_plus' | 'athlete_pro' | 'athlete_termin' | 'coach_start' | 'coach_team' | 'coach_pro'
export type Interval = 'yearly' | 'monthly' | 'once'

const PRODUCTS: Product[] = ['athlete_plus', 'athlete_pro', 'athlete_termin', 'coach_start', 'coach_team', 'coach_pro']

/** Plan-Kennung der App → Produkt. Termin ist ein Einmalkauf, alles andere ein Abo. */
export function productOf(plan: unknown, interval: unknown): { product: Product; interval: Interval } | null {
  const map: Record<string, Product> = { plus: 'athlete_plus', pro: 'athlete_pro', termin: 'athlete_termin', coach_start: 'coach_start', coach_team: 'coach_team', coach_pro: 'coach_pro' }
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
