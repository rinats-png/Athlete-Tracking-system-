/**
 * Die Trainerstufe wechseln — hoch mit anteiliger Zahlung, runter zur
 * Verlängerung.
 *
 * DREI HANDLUNGEN, alle nur für den Inhaber eines bestehenden Trainer-Abos:
 *
 *   preview   Was kostet der Wechsel jetzt? Hoch: Stripe rechnet die
 *             Differenz für den Rest des Zeitraums vor (Rechnungsvorschau),
 *             ohne etwas auszuführen. Runter: 0 €, gilt ab Periodenende.
 *   apply     Den Wechsel ausführen. Hoch: Preis tauschen, sofort anteilig
 *             abrechnen — und nur, wenn die Zahlung durchgeht
 *             (payment_behavior=error_if_incomplete). Runter: ein Abo-Plan,
 *             dessen zweite Phase mit der Verlängerung beginnt.
 *   cancel    Eine vorgemerkte Herabstufung zurücknehmen.
 *
 * WER, kommt aus dem geprüften Token. WAS, aus dem Körper — aber nur als
 * Stufenkennung; die Preis-Kennungen liegen in der Umgebung, wie bei
 * create-checkout. Welches Abo gemeint ist, sucht die Funktion selbst aus den
 * Freischaltungen des Aufrufers: ein Browser, der eine Abo-Kennung schicken
 * dürfte, dürfte auch eine fremde schicken.
 *
 * Wer noch kein Abo hat (Coach Free), bekommt 409 no_subscription — der Weg
 * ist dann die Kasse, nicht ein Wechsel.
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  allowedOrigins,
  coachRank,
  coachSeats,
  corsFor,
  downgradePhaseFields,
  intervalOf,
  isCoachProduct,
  periodOf,
  previewFields,
  priceEnvName,
  productOf,
  stripeGet,
  stripePost,
  upgradeFields,
  type Product,
} from '../_shared/stripe.ts'

// @ts-expect-error — Deno steht nur zur Laufzeit der Edge Function bereit.
const env = (key: string): string => Deno.env.get(key) ?? ''

const ORIGINS = allowedOrigins(env('APP_ORIGIN'))
const json = (req: Request, body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req, ORIGINS), 'Content-Type': 'application/json' } })

interface EntitlementRow {
  id: string
  product: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_interval: string | null
  current_period_end: string | null
}

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req, ORIGINS) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json(req, { error: 'unauthorized' }, 401)

  const url = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const secretKey = env('STRIPE_SECRET_KEY')
  if (!url || !serviceKey || !secretKey) {
    console.error('change-plan: Umgebung unvollständig')
    return json(req, { error: 'server_misconfigured' }, 500)
  }

  const asCaller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  const userId: string | undefined = userData?.user?.id
  if (userError || !userId) return json(req, { error: 'unauthorized' }, 401)

  let body: { action?: unknown; plan?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'bad_request' }, 400)
  }
  const action = body.action
  if (action !== 'preview' && action !== 'apply' && action !== 'cancel') return json(req, { error: 'bad_request' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Das laufende Trainer-Abo des Aufrufers — das höchste, falls mehrere.
  const { data: rows, error: readError } = await admin
    .from('entitlements')
    .select('id, product, status, stripe_customer_id, stripe_subscription_id, billing_interval, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
  if (readError) return json(req, { error: 'read_failed' }, 500)
  const current = ((rows ?? []) as EntitlementRow[])
    .filter((r) => isCoachProduct(r.product) && r.stripe_subscription_id)
    .sort((a, b) => coachRank(b.product) - coachRank(a.product))[0]
  if (!current || !current.stripe_subscription_id) return json(req, { error: 'no_subscription' }, 409)
  const subscriptionId = current.stripe_subscription_id

  const sub = await stripeGet(`subscriptions/${subscriptionId}`, secretKey)
  if (!sub.ok) return json(req, { error: 'stripe_unavailable' }, 502)
  const item = (sub.body.items as { data?: { id?: string; price?: { id?: string; recurring?: { interval?: string } } }[] } | undefined)?.data?.[0]
  const itemId = item?.id
  const currentPrice = item?.price?.id
  const interval = intervalOf(item?.price?.recurring?.interval) ?? (current.billing_interval === 'monthly' ? 'monthly' : 'yearly')
  if (!itemId || !currentPrice) return json(req, { error: 'stripe_unavailable' }, 502)
  const period = periodOf(sub.body)
  const scheduleId = typeof sub.body.schedule === 'string' ? sub.body.schedule : null

  // --- Vorgemerkte Herabstufung zurücknehmen -----------------------------------
  if (action === 'cancel') {
    if (scheduleId) {
      const released = await stripePost(`subscription_schedules/${scheduleId}/release`, secretKey, {})
      if (!released.ok) return json(req, { error: 'stripe_failed' }, 502)
    }
    await admin.from('entitlements').update({ scheduled_product: null, scheduled_at: null }).eq('id', current.id)
    return json(req, { ok: true }, 200)
  }

  const choice = productOf(body.plan, interval)
  if (!choice || !isCoachProduct(choice.product)) return json(req, { error: 'bad_request' }, 400)
  const target: Product = choice.product
  const direction = coachRank(target) > coachRank(current.product) ? 'up' : coachRank(target) < coachRank(current.product) ? 'down' : 'same'
  if (direction === 'same') return json(req, { error: 'same_plan' }, 400)

  const newPrice = env(priceEnvName(target, interval))
  if (!newPrice) return json(req, { error: 'unavailable' }, 404)

  // --- Herabstufen ---------------------------------------------------------------
  if (direction === 'down') {
    // Mehr Trainer im Team, als die kleinere Stufe Plätze hat: erst
    // entfernen, dann herabstufen. Sonst verlöre jemand still den Zugriff.
    const { data: team } = await admin.from('teams').select('id').eq('owner_id', userId).maybeSingle()
    if (team) {
      const { count } = await admin.from('team_members').select('user_id', { count: 'exact', head: true }).eq('team_id', team.id)
      if ((count ?? 0) > coachSeats(target)) return json(req, { error: 'too_many_members', seats: coachSeats(target) }, 409)
    }
    const effectiveAt = period.end ? new Date(period.end * 1000).toISOString() : current.current_period_end
    if (action === 'preview') return json(req, { direction, amountEur: 0, effectiveAt, interval }, 200)

    let schedule = scheduleId
    if (!schedule) {
      const created = await stripePost('subscription_schedules', secretKey, { from_subscription: subscriptionId })
      if (!created.ok || typeof created.body.id !== 'string') return json(req, { error: 'stripe_failed' }, 502)
      schedule = created.body.id
    }
    if (!period.start || !period.end) return json(req, { error: 'stripe_unavailable' }, 502)
    const updated = await stripePost(
      `subscription_schedules/${schedule}`,
      secretKey,
      downgradePhaseFields(currentPrice, period.start, period.end, newPrice, target, userId),
    )
    if (!updated.ok) {
      console.error('change-plan: Plan', updated.status, (updated.body as { error?: { message?: string } }).error?.message ?? '')
      return json(req, { error: 'stripe_failed' }, 502)
    }
    await admin.from('entitlements').update({ scheduled_product: target, scheduled_at: effectiveAt }).eq('id', current.id)
    return json(req, { ok: true, direction, effectiveAt }, 200)
  }

  // --- Hochstufen ------------------------------------------------------------------
  const customer = typeof sub.body.customer === 'string' ? sub.body.customer : current.stripe_customer_id
  if (action === 'preview') {
    let amountEur: number | null = null
    if (customer) {
      const preview = await stripePost('invoices/create_preview', secretKey, previewFields(customer, subscriptionId, itemId, newPrice, Math.floor(Date.now() / 1000)))
      const due = preview.body.amount_due
      if (preview.ok && typeof due === 'number') amountEur = due / 100
    }
    // amountEur null heisst: Stripe hat keine Vorschau geliefert. Das Gerät
    // zeigt dann seine eigene Rechnung und sagt, dass sie eine Schätzung ist.
    return json(req, { direction, amountEur, interval, periodStart: period.start, periodEnd: period.end }, 200)
  }

  // Eine vorgemerkte Herabstufung verfällt mit der Hochstufung — ein Plan am
  // Abo würde den Preiswechsel sonst verweigern.
  if (scheduleId) {
    const released = await stripePost(`subscription_schedules/${scheduleId}/release`, secretKey, {})
    if (!released.ok) return json(req, { error: 'stripe_failed' }, 502)
  }
  const result = await stripePost(`subscriptions/${subscriptionId}`, secretKey, upgradeFields(itemId, newPrice, target))
  if (!result.ok) {
    const code = (result.body as { error?: { code?: string; message?: string } }).error
    console.error('change-plan: Hochstufung', result.status, code?.message ?? '')
    // Karte abgelehnt: kein Wechsel. Der Nutzer erfährt es, nichts ist halb.
    return json(req, { error: code?.code === 'card_declined' || result.status === 402 ? 'payment_failed' : 'stripe_failed' }, 502)
  }

  // Sofort eintragen, nicht erst auf den Webhook warten: der Trainer steht
  // womöglich gerade in der Halle. Der Webhook schreibt denselben Stand noch
  // einmal — das ist harmlos. Eine alte, beendete Zeile mit derselben Stufe
  // (frühere Kündigung) räumt vorher den Platz, weil (user_id, product)
  // eindeutig ist.
  await admin.from('entitlements').delete().eq('user_id', userId).eq('product', target).neq('id', current.id)
  const { error: writeError } = await admin
    .from('entitlements')
    .update({ product: target, stripe_price_id: newPrice, scheduled_product: null, scheduled_at: null })
    .eq('id', current.id)
  if (writeError) console.error('change-plan: Eintrag', writeError.message)
  await admin.from('coach_usage').update({ over_limit_since: null }).eq('owner_id', userId)
  return json(req, { ok: true, direction, product: target }, 200)
})
