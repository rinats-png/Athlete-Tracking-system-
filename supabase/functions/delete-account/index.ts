/**
 * Kontolöschung — der einzige Ort im Projekt, an dem der Dienstschlüssel läuft.
 *
 * WARUM ES DAS ÜBERHAUPT BRAUCHT: Einen Auth-Eintrag zu löschen kann nur der
 * `service_role`-Schlüssel. Der darf nie ins Frontend (§41) — er geht an
 * sämtlichen Zugriffsregeln vorbei, und ein Angreifer mit diesem Schlüssel
 * hätte die ganze Datenbank. Also läuft der Vorgang hier, auf dem Server, und
 * der Browser bekommt nur das Ergebnis.
 *
 * DIE EINE REGEL, DIE DIESE FUNKTION SICHER MACHT: Die zu löschende Kennung
 * kommt AUSSCHLIESSLICH aus dem geprüften Token, nie aus dem Anfragekörper.
 * Ein `{ "user_id": "..." }` im Aufruf wird nicht gelesen — es gibt keinen
 * Codepfad dafür. Andernfalls wäre diese Funktion genau das Gegenteil ihres
 * Zwecks: ein Endpunkt, mit dem jeder Angemeldete jedes fremde Konto löscht.
 *
 * Der Ablauf ist bewusst zweistufig und in dieser Reihenfolge:
 *   1. `delete_account_data()` räumt die Fachdaten in einer Transaktion.
 *   2. Erst danach fällt der Auth-Eintrag.
 * Andersherum wäre bei einem Abbruch zwischen den Schritten der Mensch
 * ausgesperrt und seine Daten lägen weiter da — der Zustand, den diese
 * Funktion gerade verhindern soll. So herum ist ein Abbruch harmlos: die
 * Daten sind weg, der Vorgang lässt sich wiederholen.
 */

// @ts-expect-error — Deno-Modulauflösung; diese Datei läuft nicht im Browser-Bau.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-expect-error — Deno steht nur zur Laufzeit der Edge Function bereit.
const env = (key: string): string => Deno.env.get(key) ?? ''

/**
 * Erlaubte Herkünfte. Eine Liste und keine Wildcard: Eine Wildcard stünde
 * hier billig da und würde jeder fremden Seite erlauben, den Aufruf im Namen
 * eines angemeldeten Nutzers zu versuchen.
 *
 * Drei Einträge, jeder mit Grund: die eigene Domain, ihre www-Form (falls
 * jemand sie so aufruft, bevor die Umleitung greift) und die Netlify-Adresse,
 * über die die App bis zur Umstellung des DNS erreichbar bleibt. `APP_ORIGIN`
 * ergänzt eine weitere — etwa eine Vorschau-Umgebung — ohne die Datei
 * anzufassen.
 */
const ALLOWED_ORIGINS = new Set(
  [
    'https://kydon.app',
    'https://www.kydon.app',
    'https://baseline-diagnostics.netlify.app',
    env('APP_ORIGIN'),
  ].filter(Boolean),
)

/**
 * Antwortkopf je Anfrage. Der Origin wird nur dann zurückgegeben, wenn er
 * auf der Liste steht — sonst bekommt der Browser keinen und verweigert die
 * Antwort seinerseits. `Vary: Origin` sagt jedem Zwischenspeicher, dass die
 * Antwort von der Herkunft abhängt.
 */
function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

const json = (req: Request, body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), 'Content-Type': 'application/json' },
  })

// @ts-expect-error — Deno-Laufzeit.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json(req, { error: 'unauthorized' }, 401)

  const url = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    // Nie sagen, WELCHE Einstellung fehlt: das ist eine Auskunft über den
    // Server an jemanden, der sie nicht braucht.
    console.error('delete-account: Umgebung unvollständig')
    return json(req, { error: 'server_misconfigured' }, 500)
  }

  // Zwei Clients mit klar getrennten Aufgaben. Der erste hat nur die Rechte
  // des Aufrufers und beantwortet genau eine Frage: wer bist du? Der zweite
  // handelt — mit einer Kennung, die der erste festgestellt hat.
  const asCaller = createClient(url, env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  const userId: string | undefined = userData?.user?.id
  if (userError || !userId) return json(req, { error: 'unauthorized' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: removed, error: dataError } = await admin.rpc('delete_account_data', {
    p_user_id: userId,
  })
  if (dataError) {
    console.error('delete-account: Fachdaten', dataError.message)
    return json(req, { error: 'delete_failed' }, 500)
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    // Die Daten sind bereits weg. Das ist der sichere Halbzustand, aber der
    // Mensch kann sich noch anmelden — er muss erfahren, dass ein zweiter
    // Anlauf nötig ist, statt ein «erledigt» zu lesen.
    console.error('delete-account: Auth-Eintrag', authError.message)
    return json(req, { error: 'auth_delete_failed', removed }, 500)
  }

  return json(req, { ok: true, removed }, 200)
})
