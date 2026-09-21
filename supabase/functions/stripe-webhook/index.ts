/**
 * Der einzige Ort, an dem Freischaltungen entstehen.
 *
 * Stripe ruft hier an, wenn eine Kasse bezahlt wurde oder ein Abo sich
 * ändert. Die Funktion prüft die SIGNATUR des Aufrufs (Webhook-Geheimnis,
 * HMAC, fünf Minuten Toleranz) und schreibt dann mit dem Dienstschlüssel in
 * `entitlements`. Ohne gültige Signatur passiert nichts — 400, kein Eintrag.
 *
 * Diese Funktion wird OHNE JWT-Prüfung ausgerollt (Stripe hat keins); die
 * Signatur ist ihre Anmeldung. Deshalb steht sie in einer eigenen Datei
 * und teilt keinen Codepfad mit den Funktionen, die ein Token verlangen.
 *
 * Wer kauft, steht in den Metadaten der Kasse (user_id, product) — gesetzt
 * von create-checkout, nicht vom Browser. Eine Kasse, die jemand ausserhalb
 * dieses Wegs anlegt, trägt sie nicht und wird hier ignoriert.
 */

// @ts-expect-error — Deno-Modulauflösung.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isProduct, statusOf, verifyStripeSignature } from '../_shared/stripe.ts'

// @ts-expect-error — Deno-Laufzeit.
const env = (key: string): string => Deno.env.get(key) ?? ''

const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface StripeEvent {
  type: string
  data: { object: Record<string, unknown> }
}

const iso = (seconds: unknown): string | null => (typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null)

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)

  const url = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const secret = env('STRIPE_WEBHOOK_SECRET')
  if (!url || !serviceKey || !secret) {
    console.error('stripe-webhook: Umgebung unvollständig')
    return reply({ error: 'server_misconfigured' }, 500)
  }

  const raw = await req.text()
  if (!(await verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), secret))) return reply({ error: 'bad_signature' }, 400)

  let event: StripeEvent
  try {
    event = JSON.parse(raw) as StripeEvent
  } catch {
    return reply({ error: 'bad_request' }, 400)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const obj = event.data?.object ?? {}
  const meta = (obj.metadata ?? {}) as Record<string, unknown>

  if (event.type === 'checkout.session.completed') {
    if (obj.payment_status !== 'paid' && obj.mode !== 'subscription') return reply({ ok: true, ignored: 'unpaid' }, 200)
    const userId = typeof meta.user_id === 'string' ? meta.user_id : null
    const product = meta.product
    if (!userId || !isProduct(product)) return reply({ ok: true, ignored: 'no_metadata' }, 200)
    const row = {
      user_id: userId,
      product,
      status: 'active',
      source: 'stripe',
      stripe_customer_id: typeof obj.customer === 'string' ? obj.customer : null,
      stripe_subscription_id: typeof obj.subscription === 'string' ? obj.subscription : null,
      // Der Einmalkauf ist unbefristet; beim Abo setzt das Abo-Ereignis das Ende.
      current_period_end: null,
    }
    const { error } = await admin.from('entitlements').upsert(row, { onConflict: 'user_id,product' })
    if (error) {
      console.error('stripe-webhook: upsert', error.message)
      return reply({ error: 'write_failed' }, 500)
    }
    return reply({ ok: true }, 200)
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscriptionId = typeof obj.id === 'string' ? obj.id : null
    if (!subscriptionId) return reply({ ok: true, ignored: 'no_id' }, 200)
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : statusOf(obj.status)
    const patch: Record<string, unknown> = { status, current_period_end: iso(obj.current_period_end), stripe_price_id: priceOf(obj) }
    // Zuerst über die Abo-Kennung; ein Abo, das der Webhook vor der Kasse
    // sieht (Reihenfolge ist bei Stripe nicht garantiert), über die Metadaten.
    const { data: updated, error } = await admin.from('entitlements').update(patch).eq('stripe_subscription_id', subscriptionId).select('id')
    if (error) {
      console.error('stripe-webhook: update', error.message)
      return reply({ error: 'write_failed' }, 500)
    }
    if ((updated?.length ?? 0) === 0) {
      const userId = typeof meta.user_id === 'string' ? meta.user_id : null
      const product = meta.product
      if (userId && isProduct(product)) {
        const { error: upsertError } = await admin.from('entitlements').upsert(
          { user_id: userId, product, source: 'stripe', stripe_subscription_id: subscriptionId, stripe_customer_id: typeof obj.customer === 'string' ? obj.customer : null, ...patch },
          { onConflict: 'user_id,product' },
        )
        if (upsertError) {
          console.error('stripe-webhook: upsert', upsertError.message)
          return reply({ error: 'write_failed' }, 500)
        }
      }
    }
    return reply({ ok: true }, 200)
  }

  // Alles andere wird bestätigt und nicht verarbeitet — Stripe soll es
  // nicht wiederholen.
  return reply({ ok: true, ignored: event.type }, 200)
})

function priceOf(subscription: Record<string, unknown>): string | null {
  const items = (subscription.items as { data?: { price?: { id?: unknown } }[] } | undefined)?.data
  const id = items?.[0]?.price?.id
  return typeof id === 'string' ? id : null
}
