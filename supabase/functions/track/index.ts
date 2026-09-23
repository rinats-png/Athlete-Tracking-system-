/**
 * Empfang von Nutzungsereignissen.
 *
 * ANTWORTET SOFORT, SCHREIBT DANACH. Die Prüfung des Körpers kostet keine
 * Netzrunde und passiert vorher — ein kaputtes Ereignis bekommt ehrlich ein
 * 400. Alles, was Zeit kostet (Token prüfen, einfügen), läuft nach der
 * Antwort über `EdgeRuntime.waitUntil`. Der Preis, bewusst angenommen: Wird
 * die Funktion vorher beendet, geht ein Ereignis verloren. Für eine
 * Nutzungsstatistik ist das vertretbar; für einen Messwert wäre es das nie.
 *
 * WAS NICHT GESPEICHERT WIRD, OBWOHL ES DA WÄRE: die IP-Adresse und der
 * User-Agent. Sie stehen in jeder Anfrage; diese Funktion liest sie nicht,
 * und die Tabelle hat keine Spalte dafür.
 *
 * DIE KONTOKENNUNG kommt nur aus einem geprüften Token, nie aus dem Körper
 * (siehe _shared/analytics.ts).
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sanitizeEvent } from '../_shared/analytics.ts'

// @ts-expect-error — Deno steht nur zur Laufzeit der Edge Function bereit.
const env = (key: string): string => Deno.env.get(key) ?? ''

const ALLOWED_ORIGINS = new Set(
  ['https://kydon.app', 'https://www.kydon.app', 'https://baseline-diagnostics.netlify.app', env('APP_ORIGIN')].filter(Boolean),
)

/** Ein Ereignis ist klein. Wer mehr schickt, schickt etwas anderes. */
const MAX_BODY_BYTES = 8 * 1024

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

const reply = (req: Request, status: number, body: unknown = { ok: status < 300 }) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json' } })

/** Hintergrundarbeit, die die Antwort überlebt — oder, wo es das nicht gibt, abgewartet wird. */
function inBackground(work: Promise<unknown>): Promise<unknown> | void {
  // EdgeRuntime gibt es nur in der Supabase-Laufzeit; über globalThis
  // gelesen, damit die Datei auch ohne diese Deklaration übersetzt.
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime ?? null
  if (runtime?.waitUntil) {
    runtime.waitUntil(work)
    return
  }
  return work
}

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (req.method !== 'POST') return reply(req, 405)

  // Nur Anfragen von der eigenen App. Ein Beacon schickt den Origin mit.
  const origin = req.headers.get('Origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, 403)

  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return reply(req, 413)

  const outcome = sanitizeEvent(text)
  if (!outcome.ok) {
    // Ein Ereignis aus der Gesundheitsschicht ist kein Fehler des Clients,
    // sondern eine Regel. Es bekommt 200 wie jedes andere — nur ohne Wirkung.
    return outcome.reason === 'blocked_path' ? reply(req, 200) : reply(req, 400, { ok: false, reason: outcome.reason })
  }

  const url = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('track: Umgebung unvollständig')
    return reply(req, 500)
  }

  const { event } = outcome
  const write = (async () => {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    let userId: string | null = null
    if (event.access_token) {
      const { data } = await admin.auth.getUser(event.access_token)
      userId = data?.user?.id ?? null
    }

    const { error } = await admin.from('analytics_events').insert({
      event_name: event.event_name,
      session_id: event.session_id,
      user_id: userId,
      properties: event.properties,
    })
    if (error) console.error('track: insert', error.message)
  })()

  await inBackground(write)
  return reply(req, 200)
})
