/**
 * Fakten in Fließtext umformulieren (docs/ask-kydon.md).
 *
 * WAS HIER PASSIERT: der Browser schickt Fakten (Schlüssel und Zahlen). Die
 * Funktion prüft, WER fragt (Token), OB das Konto die Stufe hat (Pro und
 * darüber, aus `entitlements`), OB noch Aufrufe im Monat übrig sind
 * (`ai_usage_bump`, 30), und reicht nur die bereinigten Fakten an den
 * Anbieter. Der Text geht zurück; ob er die Zahlen einhält, prüft der Client
 * mit dem Zahlenwächter — besteht er nicht, gilt die feste Vorlage.
 *
 * NIE im Protokoll und nie gespeichert: Fakten und Antworttext. Geheimnisse
 * (ANTHROPIC_API_KEY) liegen nur in der Umgebung der Funktion.
 *
 * Anbieter und Region: ANTHROPIC_BASE_URL (Standard: die EU-Adresse, die der
 * Inhaber des Kontos festlegt) und ANTHROPIC_MODEL.
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { allowedOrigins, corsFor } from '../_shared/stripe.ts'
import { buildPrompt, isKind, isLocale, MONTHLY_LIMIT, monthKey, PHRASE_PRODUCTS, sanitizeFacts } from '../_shared/phrase.ts'

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
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = env('ANTHROPIC_API_KEY')
  const baseUrl = env('ANTHROPIC_BASE_URL')
  const model = env('ANTHROPIC_MODEL')
  if (!url || !serviceKey || !apiKey || !baseUrl || !model) {
    console.error('phrase: Umgebung unvollständig')
    return json(req, { error: 'server_misconfigured' }, 500)
  }

  const asCaller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  const userId: string | undefined = userData?.user?.id
  if (userError || !userId) return json(req, { error: 'unauthorized' }, 401)

  let body: { kind?: unknown; locale?: unknown; facts?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'bad_request' }, 400)
  }
  const facts = sanitizeFacts(body.facts)
  if (!isKind(body.kind) || !isLocale(body.locale) || !facts) return json(req, { error: 'bad_request' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Stufe: Pro oder darüber, aktiv oder in der Testphase.
  const { data: rows, error: readError } = await admin.from('entitlements').select('product').eq('user_id', userId).in('status', ['active', 'trialing'])
  if (readError) return json(req, { error: 'read_failed' }, 500)
  if (!((rows ?? []) as { product: string }[]).some((r) => PHRASE_PRODUCTS.includes(r.product))) return json(req, { error: 'not_entitled' }, 403)

  // Monatsgrenze: erst zählen, dann fragen. Ein Fehler beim Anbieter kostet einen Aufruf, nie mehr.
  const { data: calls, error: bumpError } = await admin.rpc('ai_usage_bump', { p_user: userId, p_month: monthKey(new Date()), p_limit: MONTHLY_LIMIT })
  if (bumpError) return json(req, { error: 'read_failed' }, 500)
  if (calls == null) return json(req, { error: 'limit_reached', limit: MONTHLY_LIMIT }, 429)

  const { system, user } = buildPrompt(body.kind, body.locale, facts)
  let upstream: Response
  try {
    upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 300, system, messages: [{ role: 'user', content: user }] }),
    })
  } catch {
    return json(req, { error: 'upstream_unavailable' }, 502)
  }
  if (!upstream.ok) return json(req, { error: 'upstream_failed' }, 502)
  const result = (await upstream.json()) as { content?: { type?: string; text?: string }[] }
  const text = (result.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join(' ').trim()
  if (!text || text.length > 1200) return json(req, { error: 'upstream_failed' }, 502)
  return json(req, { text, used: calls, limit: MONTHLY_LIMIT }, 200)
})
