/**
 * Eine Kasse bei Stripe anlegen.
 *
 * WER KAUFT, kommt AUSSCHLIESSLICH aus dem geprüften Token — nie aus dem
 * Anfragekörper. Der Körper sagt nur, WAS: `{ plan, interval }`. Die
 * Preis-Kennung dazu liegt in der Umgebung (STRIPE_PRICE_...), nicht im
 * Aufruf: ein Browser, der beliebige Preis-Kennungen schicken dürfte, dürfte
 * auch die falsche schicken.
 *
 * Kartendaten sieht diese Funktion nie. Sie bekommt von Stripe eine Adresse
 * und gibt sie an den Browser weiter; eingegeben wird auf Stripes Seite.
 *
 * Die Freischaltung schreibt NICHT diese Funktion, sondern der Webhook —
 * erst, wenn Stripe die Zahlung bestätigt hat. Eine Kasse anzulegen ist
 * noch kein Kauf.
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { allowedOrigins, corsFor, priceEnvName, productOf, stripePost } from '../_shared/stripe.ts'

// @ts-expect-error — Deno steht nur zur Laufzeit der Edge Function bereit.
const env = (key: string): string => Deno.env.get(key) ?? ''

const ORIGINS = allowedOrigins(env('APP_ORIGIN'))
const json = (req: Request, body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req, ORIGINS), 'Content-Type': 'application/json' } })

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req, ORIGINS) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json(req, { error: 'unauthorized' }, 401)

  const url = env('SUPABASE_URL')
  const secretKey = env('STRIPE_SECRET_KEY')
  if (!url || !secretKey) {
    console.error('create-checkout: Umgebung unvollständig')
    return json(req, { error: 'server_misconfigured' }, 500)
  }

  const asCaller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  const userId: string | undefined = userData?.user?.id
  const email: string | undefined = userData?.user?.email
  if (userError || !userId) return json(req, { error: 'unauthorized' }, 401)

  let body: { plan?: unknown; interval?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'bad_request' }, 400)
  }
  const choice = productOf(body.plan, body.interval)
  if (!choice) return json(req, { error: 'bad_request' }, 400)

  const price = env(priceEnvName(choice.product, choice.interval))
  // Ein Produkt ohne hinterlegten Preis ist nicht kaufbar — 404, nicht 500:
  // der Server ist nicht kaputt, das Angebot gibt es (noch) nicht.
  if (!price) return json(req, { error: 'unavailable' }, 404)

  // Die Rücksprungadresse ist die Herkunft des Aufrufs, wenn sie erlaubt ist
  // — sonst die Hauptadresse. Nie eine Adresse aus dem Anfragekörper.
  const origin = req.headers.get('Origin') ?? ''
  const back = ORIGINS.has(origin) ? origin : 'https://kydon.app'

  const fields: Record<string, string> = {
    mode: choice.interval === 'once' ? 'payment' : 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    success_url: `${back}/preise?checkout=success`,
    cancel_url: `${back}/preise?checkout=cancel`,
    'metadata[user_id]': userId,
    'metadata[product]': choice.product,
    // Rechnungen brauchen eine Adresse; Stripe fragt sie an der Kasse ab.
    billing_address_collection: 'required',
    'automatic_tax[enabled]': env('STRIPE_AUTOMATIC_TAX') === 'on' ? 'true' : 'false',
    locale: 'auto',
  }
  if (email) fields.customer_email = email
  if (choice.interval !== 'once') {
    fields['subscription_data[metadata][user_id]'] = userId
    fields['subscription_data[metadata][product]'] = choice.product
  }

  const res = await stripePost('checkout/sessions', secretKey, fields)
  if (!res.ok || typeof res.body.url !== 'string') {
    console.error('create-checkout: Stripe', res.status, (res.body as { error?: { message?: string } }).error?.message ?? '')
    return json(req, { error: 'checkout_failed' }, 502)
  }
  return json(req, { url: res.body.url }, 200)
})
