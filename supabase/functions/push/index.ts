/**
 * Versand von Push-Benachrichtigungen (Web Push mit VAPID, Bibliothek
 * web-push).
 *
 * VIER AKTIONEN
 *   due        — stündlich aus pg_cron, nur mit dem Cron-Geheimnis. Meldet
 *                allen, deren nächstes Fälligkeitsdatum erreicht ist.
 *   test       — eine Probenachricht an die eigenen Geräte.
 *   broadcast  — Nachricht an alle Abonnenten. Nur der Admin
 *                (is_analytics_admin in der Datenbank).
 *   coach      — Nachricht eines Trainers an aktiv verbundene Athleten.
 *
 * Wer anfragt, bestimmt ein geprüftes Token — nie ein Feld im Körper.
 * Abgelaufene Abonnements (404/410 vom Push-Dienst) werden gelöscht.
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-expect-error — Deno-Modulauflösung.
import webpush from 'npm:web-push@3.6.7'
import {
  LIMITS,
  MAX_BODY,
  MAX_COACH_BODY,
  MAX_TITLE,
  broadcastPayload,
  cleanText,
  coachPayload,
  duePayload,
  testPayload,
  type PushKind,
  type PushPayload,
} from '../_shared/push.ts'

// @ts-expect-error — Deno steht nur zur Laufzeit der Edge Function bereit.
const env = (key: string): string => Deno.env.get(key) ?? ''

const ALLOWED_ORIGINS = new Set(
  ['https://kydon.app', 'https://www.kydon.app', 'https://baseline-diagnostics.netlify.app', env('APP_ORIGIN')].filter(Boolean),
)

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

const reply = (req: Request, status: number, body: unknown = { ok: status < 300 }) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json' } })

interface Subscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  locale: string
}

// deno-lint-ignore no-explicit-any
type Db = any

async function sendAll(db: Db, subs: Subscription[], payloadFor: (s: Subscription) => PushPayload) {
  let sent = 0
  let gone = 0
  let failed = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payloadFor(sub)),
        { TTL: 60 * 60 * 24, urgency: 'normal' },
      )
      sent++
      await db.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', sub.id)
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        gone++
        await db.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        failed++
      }
    }
  }
  return { sent, gone, failed }
}

async function log(db: Db, kind: PushKind, sender: string | null, recipients: (string | null)[]) {
  if (recipients.length === 0) return
  await db.from('push_log').insert(recipients.map((recipient) => ({ kind, sender, recipient })))
}

async function countSince(db: Db, sender: string, kind: PushKind, hours: number, recipient?: string) {
  let q = db
    .from('push_log')
    .select('id', { count: 'exact', head: true })
    .eq('sender', sender)
    .eq('kind', kind)
    .gte('created_at', new Date(Date.now() - hours * 3600_000).toISOString())
  if (recipient) q = q.eq('recipient', recipient)
  const { count } = await q
  return count ?? 0
}

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (req.method !== 'POST') return reply(req, 405)
  const origin = req.headers.get('Origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, 403)

  const text = await req.text()
  if (text.length > 4096) return reply(req, 413)
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return reply(req, 400, { ok: false, reason: 'json' })
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  const { data: config, error: configError } = await db.rpc('push_config')
  if (configError || !config?.vapid_private) return reply(req, 503, { ok: false, reason: 'not_configured' })
  webpush.setVapidDetails('mailto:info@kydon.app', config.vapid_public, config.vapid_private)

  // --- Zeitgesteuert --------------------------------------------------------
  if (body.action === 'due') {
    const secret = req.headers.get('x-cron-secret') ?? ''
    if (!config.cron_secret || secret !== config.cron_secret) return reply(req, 401)
    const now = new Date().toISOString()
    const { data: due } = await db.from('push_due').select('user_id, due_at, sent_for').lte('due_at', now).limit(500)
    const pending = (due ?? []).filter((d: { due_at: string; sent_for: string | null }) => d.sent_for !== d.due_at)
    if (pending.length === 0) return reply(req, 200, { ok: true, users: 0 })
    const ids = pending.map((d: { user_id: string }) => d.user_id)
    const { data: subs } = await db.from('push_subscriptions').select('*').in('user_id', ids)
    const result = await sendAll(db, subs ?? [], (s) => duePayload(s.locale))
    for (const d of pending) {
      await db.from('push_due').update({ sent_for: d.due_at }).eq('user_id', d.user_id)
    }
    await log(db, 'due', null, ids)
    return reply(req, 200, { ok: true, users: ids.length, ...result })
  }

  // --- Alles Übrige braucht eine Anmeldung ----------------------------------
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return reply(req, 401)
  const { data: auth } = await db.auth.getUser(token)
  const user = auth?.user
  if (!user) return reply(req, 401)

  if (body.action === 'test') {
    if ((await countSince(db, user.id, 'test', 1)) >= LIMITS.testPerHour) return reply(req, 429)
    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', user.id)
    const result = await sendAll(db, subs ?? [], (s) => testPayload(s.locale))
    await log(db, 'test', user.id, [user.id])
    return reply(req, 200, { ok: true, ...result })
  }

  if (body.action === 'broadcast') {
    // Die Frage stellt die Datenbank, mit dem Token der anfragenden Person.
    const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: isAdmin } = await asUser.rpc('is_analytics_admin')
    if (isAdmin !== true) return reply(req, 403)
    const title = cleanText(body.title, MAX_TITLE)
    const message = cleanText(body.body, MAX_BODY)
    if (!title || !message) return reply(req, 400, { ok: false, reason: 'text' })
    if ((await countSince(db, user.id, 'broadcast', 24)) >= LIMITS.broadcastPerDay) return reply(req, 429)
    const { data: subs } = await db.from('push_subscriptions').select('*').limit(10000)
    const result = await sendAll(db, subs ?? [], () => broadcastPayload(title, message))
    await log(db, 'broadcast', user.id, [null])
    return reply(req, 200, { ok: true, ...result })
  }

  if (body.action === 'coach') {
    const message = cleanText(body.body, MAX_COACH_BODY)
    const athleteIds = Array.isArray(body.athleteIds)
      ? body.athleteIds.filter((id): id is string => typeof id === 'string').slice(0, 100)
      : []
    if (!message || athleteIds.length === 0) return reply(req, 400, { ok: false, reason: 'input' })

    // Nur aktiv verbundene Athleten mit eigenem Konto.
    const { data: links } = await db
      .from('coach_athlete_links')
      .select('athlete_id, athletes!inner(user_id)')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .in('athlete_id', athleteIds)
    const recipients: string[] = [
      ...new Set<string>(
        (links ?? [])
          .map((l: { athletes: { user_id: string | null } }) => l.athletes?.user_id)
          .filter((id: string | null): id is string => !!id),
      ),
    ]
    const allowed: string[] = []
    for (const r of recipients) {
      if ((await countSince(db, user.id, 'coach', 24, r)) < LIMITS.coachPerRecipientPerDay) allowed.push(r)
    }
    if (allowed.length === 0) return reply(req, recipients.length ? 429 : 403)
    const { data: subs } = await db.from('push_subscriptions').select('*').in('user_id', allowed)
    const result = await sendAll(db, subs ?? [], (s) => coachPayload(s.locale, message))
    await log(db, 'coach', user.id, allowed)
    return reply(req, 200, { ok: true, recipients: allowed.length, ...result })
  }

  return reply(req, 400, { ok: false, reason: 'action' })
})
