import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Die negativen Autorisierungstests am LEBENDEN System.
 *
 * Das war die wichtigste offene Position des ersten Durchgangs, und sie war
 * offen aus einem Grund, der sich nicht wegprogrammieren lässt: Ob
 * `can_view_athlete()` in jedem Zustand das Richtige tut, beantwortet keine
 * statische Prüfung. Dafür braucht es zwei echte Konten und eine echte
 * Datenbank.
 *
 * DESHALB LÄUFT DIESE DATEI NUR MIT ZUGANGSDATEN — und wenn sie fehlen,
 * ÜBERSPRINGT sie sich mit einer sichtbaren Begründung, statt grün zu
 * melden. Ein Autorisierungstest, der ohne Datenbank «bestanden» sagt, ist
 * schlimmer als keiner: er beweist nichts und behauptet das Gegenteil.
 *
 * SO WIRD SIE SCHARF GESCHALTET (gegen eine TESTINSTANZ, niemals gegen die
 * Produktionsdatenbank — siehe `docs/sicherheit.md`, Restrisiko 2):
 *
 *   E2E_SUPABASE_URL=https://<projekt>.supabase.co \
 *   E2E_SUPABASE_KEY=<publishable key> \
 *   E2E_USER_A=a@example.test  E2E_PASS_A=... \
 *   E2E_USER_B=b@example.test  E2E_PASS_B=... \
 *   npx playwright test tests/authz-live.spec.ts --project=desktop
 *
 * Beide Konten müssen existieren und je mindestens einen eigenen Athleten
 * haben — den legt die Registrierung automatisch an.
 *
 * WAS GEPRÜFT WIRD: nicht, ob A seine Daten sieht (das prüft die App an
 * hundert Stellen), sondern ob A die Daten von B NICHT sieht. Über die API,
 * an der Oberfläche vorbei, mit selbst gebauten Anfragen — so, wie es ein
 * Angreifer täte.
 */

const URL = process.env.E2E_SUPABASE_URL ?? ''
const KEY = process.env.E2E_SUPABASE_KEY ?? ''
const A = { email: process.env.E2E_USER_A ?? '', password: process.env.E2E_PASS_A ?? '' }
const B = { email: process.env.E2E_USER_B ?? '', password: process.env.E2E_PASS_B ?? '' }

const configured = Boolean(URL && KEY && A.email && A.password && B.email && B.password)

test.describe('Negative Autorisierung (echte Konten)', () => {
  test.skip(
    !configured,
    'Ohne E2E_SUPABASE_URL/KEY und zwei Testkonten nicht durchführbar — siehe Kopf der Datei. ' +
      'Übersprungen und NICHT bestanden.',
  )

  /** Meldet sich an und gibt das Zugriffstoken zurück. */
  async function signIn(request: APIRequestContext, user: { email: string; password: string }) {
    const res = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      data: { email: user.email, password: user.password },
    })
    expect(res.ok(), `Anmeldung für ${user.email} fehlgeschlagen`).toBeTruthy()
    const body = await res.json()
    return body.access_token as string
  }

  const rest = (token: string) => ({
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  })

  test('A sieht die Athleten von B nicht', async ({ request }) => {
    const tokenA = await signIn(request, A)
    const tokenB = await signIn(request, B)

    const ownB = await request.get(`${URL}/rest/v1/athletes?select=id`, { headers: rest(tokenB) })
    const athletesB = (await ownB.json()) as { id: string }[]
    expect(athletesB.length, 'Konto B braucht mindestens einen Athleten').toBeGreaterThan(0)

    const ownA = await request.get(`${URL}/rest/v1/athletes?select=id`, { headers: rest(tokenA) })
    const athletesA = (await ownA.json()) as { id: string }[]
    const idsA = new Set(athletesA.map((a) => a.id))

    for (const athlete of athletesB) {
      expect(idsA.has(athlete.id), `A sieht den Athleten ${athlete.id} von B`).toBe(false)
    }
  })

  test('A kann einen Athleten von B nicht gezielt abrufen (IDOR)', async ({ request }) => {
    const tokenA = await signIn(request, A)
    const tokenB = await signIn(request, B)
    const ownB = await request.get(`${URL}/rest/v1/athletes?select=id`, { headers: rest(tokenB) })
    const target = ((await ownB.json()) as { id: string }[])[0]

    // Die Kennung zu kennen ist kein Zugriffsrecht. Genau das war der
    // kritische Befund vom 07.09.: dort WAR sie eines.
    const res = await request.get(`${URL}/rest/v1/athletes?id=eq.${target.id}&select=*`, {
      headers: rest(tokenA),
    })
    expect(res.status()).toBe(200)
    expect(await res.json(), 'A bekommt Daten zu einem fremden Athleten').toEqual([])
  })

  test('A kann sich keinen Zugriff auf B verschaffen (Rechteausweitung)', async ({ request }) => {
    const tokenA = await signIn(request, A)
    const tokenB = await signIn(request, B)
    const ownB = await request.get(`${URL}/rest/v1/athletes?select=id`, { headers: rest(tokenB) })
    const target = ((await ownB.json()) as { id: string }[])[0]

    // Schritt 1: sich zum Trainer erklären. Das darf man.
    await request.patch(`${URL}/rest/v1/profiles?id=eq.${await userId(request, tokenA)}`, {
      headers: { ...rest(tokenA), Prefer: 'return=minimal' },
      data: { is_coach: true },
    })

    // Schritt 2: die Verknüpfung auf einen fremden Athleten legen. Das war
    // der Weg, der offen stand — jetzt muss er zu sein.
    const res = await request.post(`${URL}/rest/v1/coach_athlete_links`, {
      headers: { ...rest(tokenA), Prefer: 'return=representation' },
      data: { coach_id: await userId(request, tokenA), athlete_id: target.id, status: 'active' },
    })
    expect(
      res.status(),
      `Die Verknüpfung auf einen fremden Athleten wurde angenommen (${res.status()}): ${await res.text()}`,
    ).toBeGreaterThanOrEqual(400)

    // Und die Daten bleiben unerreichbar, auch nach dem Versuch.
    const check = await request.get(`${URL}/rest/v1/athletes?id=eq.${target.id}&select=id`, {
      headers: rest(tokenA),
    })
    expect(await check.json(), 'nach dem Versuch ist der fremde Athlet sichtbar').toEqual([])
  })

  test('A kann die Messwerte von B weder lesen noch ändern', async ({ request }) => {
    const tokenA = await signIn(request, A)
    const tokenB = await signIn(request, B)
    const ownB = await request.get(`${URL}/rest/v1/athletes?select=id`, { headers: rest(tokenB) })
    const target = ((await ownB.json()) as { id: string }[])[0]

    for (const table of ['test_results', 'biometric_entries', 'assessments']) {
      const res = await request.get(
        `${URL}/rest/v1/${table}?athlete_id=eq.${target.id}&select=id`,
        { headers: rest(tokenA) },
      )
      expect(await res.json(), `A liest ${table} eines fremden Athleten`).toEqual([])
    }

    // Schreiben muss ebenso abprallen — ein Angreifer, der nichts lesen kann,
    // könnte immer noch etwas hineinschreiben, und eine verfälschte Messreihe
    // ist bei einer Diagnostik-App der teurere Schaden.
    const write = await request.post(`${URL}/rest/v1/biometric_entries`, {
      headers: { ...rest(tokenA), Prefer: 'return=minimal' },
      data: { athlete_id: target.id, body_weight_kg: 70 },
    })
    expect(write.status(), 'A schreibt in die Biometrie eines Fremden').toBeGreaterThanOrEqual(400)
  })

  test('der synchronisierte Bestand von B ist für A unsichtbar', async ({ request }) => {
    const tokenA = await signIn(request, A)
    const res = await request.get(`${URL}/rest/v1/athlete_documents?select=owner_id`, {
      headers: rest(tokenA),
    })
    const rows = (await res.json()) as { owner_id: string }[]
    const me = await userId(request, tokenA)
    for (const row of rows) {
      expect(row.owner_id, 'A sieht einen fremden Bestand').toBe(me)
    }
  })

  test('ohne Anmeldung ist gar nichts lesbar', async ({ request }) => {
    for (const table of ['athletes', 'test_results', 'athlete_documents', 'security_events']) {
      const res = await request.get(`${URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
      })
      const body = res.ok() ? await res.json() : []
      expect(body, `${table} ist ohne Anmeldung lesbar`).toEqual([])
    }
  })

  /** Die eigene Kennung aus dem Token — über den Dienst, nicht aus dem Token geraten. */
  async function userId(request: APIRequestContext, token: string): Promise<string> {
    const res = await request.get(`${URL}/auth/v1/user`, { headers: rest(token) })
    return (await res.json()).id as string
  }
})
