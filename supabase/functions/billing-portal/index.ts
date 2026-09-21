/**
 * Das Kundenportal von Stripe öffnen — kündigen, Rechnungen, Zahlungsmittel.
 *
 * Die Kundenkennung kommt aus der EIGENEN Freischaltungszeile (RLS), nie
 * aus dem Aufruf. Wer keine hat, hat nichts zu verwalten: 404.
 */

// @ts-expect-error — Deno-Modulauflösung.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { allowedOrigins, corsFor, stripePost } from '../_shared/stripe.ts'

// @ts-expect-error — Deno-Laufzeit.
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
    console.error('billing-portal: Umgebung unvollständig')
    return json(req, { error: 'server_misconfigured' }, 500)
  }

  const asCaller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  if (userError || !userData?.user?.id) return json(req, { error: 'unauthorized' }, 401)

  // Mit den Rechten des Aufrufers: RLS lässt nur die eigenen Zeilen durch.
  const { data: rows } = await asCaller.from('entitlements').select('stripe_customer_id').not('stripe_customer_id', 'is', null).limit(1)
  const customer: string | undefined = rows?.[0]?.stripe_customer_id
  if (!customer) return json(req, { error: 'no_customer' }, 404)

  const origin = req.headers.get('Origin') ?? ''
  const back = ORIGINS.has(origin) ? origin : 'https://kydon.app'
  const res = await stripePost('billing_portal/sessions', secretKey, { customer, return_url: `${back}/profil` })
  if (!res.ok || typeof res.body.url !== 'string') {
    console.error('billing-portal: Stripe', res.status)
    return json(req, { error: 'portal_failed' }, 502)
  }
  return json(req, { url: res.body.url }, 200)
})
