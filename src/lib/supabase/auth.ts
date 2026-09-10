import { getSupabase, isSupabaseConfigured } from './client'
import { noteFailure, noteSuccess, remainingDelayMs } from './throttle'

/**
 * Anmeldung gegen das Projekt.
 *
 * WAS SICH DAMIT ÄNDERT: bis hierher war die Anmeldung ein gestaltetes Tor
 * ohne Prüfung — es gab keinen Server. Jetzt gibt es einen, und damit wird aus
 * dem Tor eine Anmeldung. Das ist kein kosmetischer Unterschied: ab jetzt
 * verlassen Daten das Gerät, sobald jemand die Synchronisierung einschaltet,
 * und die Datenschutzerklärung muss das beschreiben.
 *
 * WAS SICH NICHT ÄNDERT: die App bleibt offline-first. Ohne hinterlegtes
 * Projekt (`isSupabaseConfigured() === false`) läuft alles wie zuvor auf dem
 * Gerät — eine fehlende Verbindung ist kein Fehlerzustand, sondern der
 * Normalfall in einer Halle ohne Empfang.
 *
 * DAS PASSWORT wird an Supabase übergeben und dort als Hash abgelegt. Es
 * landet weder im lokalen Speicher noch im Bestand; die einzige Kopie in
 * dieser App ist das Eingabefeld, und das vergisst sie mit dem Absenden.
 */

export interface AuthUser {
  id: string
  email: string
}

export interface AuthOutcome {
  ok: boolean
  user: AuthUser | null
  /**
   * Warum es nicht ging — als Kennung, nicht als fertiger Satz: die
   * Formulierung gehört in die Sprachdatei, nicht in die Datenschicht.
   */
  reason:
    | null
    | 'not_configured'
    | 'offline'
    | 'invalid_credentials'
    | 'email_taken'
    | 'weak_password'
    | 'needs_confirmation'
    | 'too_many_attempts'
    | 'unknown'
  /** Nur bei `too_many_attempts`: wie lange noch. */
  retryInMs?: number
}

/** Mindestlänge des Passworts. Strenger als die Vorgabe des Dienstes (6). */
export const MIN_PASSWORD_LENGTH = 8

const asUser = (raw: { id: string; email?: string | null } | null | undefined): AuthUser | null =>
  raw ? { id: raw.id, email: raw.email ?? '' } : null

/**
 * Fehler des Dienstes auf die eigenen Kennungen abbilden.
 *
 * Bewusst über den Text und nicht nur über den Code: Supabase liefert für
 * mehrere Fälle 400, und die Unterscheidung steckt in der Meldung. Was hier
 * nicht erkannt wird, landet als `unknown` — ein falsch einsortierter Fehler
 * wäre schlimmer als ein unspezifischer.
 */
function classify(message: string, status?: number): AuthOutcome['reason'] {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return 'email_taken'
  if (m.includes('password') && (m.includes('short') || m.includes('least'))) return 'weak_password'
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'invalid_credentials'
  if (m.includes('email not confirmed')) return 'needs_confirmation'
  if (m.includes('failed to fetch') || m.includes('network')) return 'offline'
  if (status === 400 || status === 401) return 'invalid_credentials'
  return 'unknown'
}

export async function signUp(params: {
  email: string
  password: string
  displayName: string
  role: 'athlete' | 'coach'
  planId: string | null
}): Promise<AuthOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, user: null, reason: 'not_configured' }
  if (params.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, user: null, reason: 'weak_password' }
  }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, user: null, reason: 'offline' }

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      // Rolle, Name und Stufe gehen als Metadaten mit: der Auslöser in der
      // Datenbank legt daraus die Kontozeile an, ohne dass die App einen
      // zweiten Schreibvorgang braucht, der scheitern könnte.
      data: {
        display_name: params.displayName.slice(0, 120),
        role: params.role,
        plan_id: params.planId ?? '',
      },
    },
  })
  if (error) {
    const reason = classify(error.message, error.status)
    // ACCOUNT ENUMERATION, und was hier wirklich möglich ist:
    //
    // «Zu dieser E-Mail gibt es schon ein Konto» ist eine Auskunft über einen
    // fremden Menschen an jemanden, der sie nicht haben soll. Deshalb geht
    // sie hier nicht mehr an den Bildschirm, sondern läuft in dieselbe
    // Antwort wie ein erfolgreicher Versuch: «sieh in dein Postfach». Wer
    // das Konto wirklich hat, bekommt vom Dienst eine Mail und weiss dann
    // Bescheid; wer nur probiert, erfährt nichts.
    //
    // WAS DAS NICHT LEISTET, und das gehört dazu: Die Unterscheidung steckt
    // in der ANTWORT DES DIENSTES. Wer den Netzwerkverkehr mitliest — und
    // wer enumeriert, tut genau das — sieht sie weiterhin. Diese Zeile
    // nimmt die Auskunft aus der Oberfläche, nicht aus der Leitung. Die
    // wirksame Massnahme ist die Bestätigungspflicht per E-Mail beim Dienst
    // selbst; sie steht in `docs/sicherheit.md` als einzurichtender Punkt.
    if (reason === 'email_taken') {
      return { ok: false, user: null, reason: 'needs_confirmation' }
    }
    return { ok: false, user: null, reason }
  }

  // Ohne Sitzung ist die Bestätigungsmail unterwegs. Das ist kein Fehler,
  // sondern der normale Weg — und der Bildschirm muss es sagen, sonst wartet
  // jemand vor einem Formular, das schon alles getan hat.
  if (!data.session) return { ok: false, user: asUser(data.user), reason: 'needs_confirmation' }
  return { ok: true, user: asUser(data.user), reason: null }
}

/**
 * Anmelden.
 *
 * Vor dem Versuch steht die Bremse: nach drei Fehlversuchen wächst die
 * Wartezeit. Sie wirkt gegen das Durchprobieren VON HAND an einem fremden
 * Gerät — nicht gegen ein Skript, das diese Seite nie lädt. Die Begrenzung,
 * die auch gegen ein Skript wirkt, gehört zum Dienst und ist dort
 * einzustellen; `docs/sicherheit.md` sagt das an derselben Stelle noch
 * einmal, damit diese Bremse nicht für mehr gehalten wird, als sie ist.
 */
export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, user: null, reason: 'not_configured' }
  const wait = remainingDelayMs()
  if (wait > 0) return { ok: false, user: null, reason: 'too_many_attempts', retryInMs: wait }

  const supabase = await getSupabase()
  if (!supabase) return { ok: false, user: null, reason: 'offline' }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const reason = classify(error.message, error.status)
    // Nur ein abgelehntes Passwort zählt. Ein Funkloch ist kein Fehlversuch,
    // und wer im Zug die Verbindung verliert, soll sich danach nicht erst
    // eine Minute lang gedulden müssen.
    if (reason === 'invalid_credentials') noteFailure()
    return { ok: false, user: null, reason }
  }
  noteSuccess()
  return { ok: true, user: asUser(data.user), reason: null }
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase()
  await supabase?.auth.signOut()
}

/** Die laufende Sitzung, oder `null`. Wirft nie. */
export async function currentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabase()
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return asUser(data.user)
  } catch {
    return null
  }
}

/** Passwort zurücksetzen — der Dienst schickt die Mail, die App nicht. */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const supabase = await getSupabase()
  if (!supabase) return false
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window === 'undefined' ? undefined : `${window.location.origin}/profil`,
  })
  return !error
}

/**
 * Das Konto endgültig löschen.
 *
 * Läuft über eine Edge Function, weil der Auth-Eintrag nur mit dem
 * Dienstschlüssel fällt und der nie ins Frontend gehört (§41). Der Browser
 * schickt seine Sitzung mit und sonst NICHTS: welche Kennung gelöscht wird,
 * bestimmt der Server aus dem geprüften Token. Eine Kennung im Anfragekörper
 * gäbe es hier nicht zu setzen, und die Funktion läse sie auch nicht.
 *
 * WICHTIG ZUR REIHENFOLGE AUF DIESER SEITE: Erst wenn der Server bestätigt
 * hat, wird lokal geräumt. Andersherum stünde jemand ohne seine Daten da,
 * dessen Konto noch existiert — und ohne den Export, den er vielleicht noch
 * gebraucht hätte.
 */
export type DeleteAccountOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'offline' | 'unauthorized' | 'failed' }

export async function deleteAccount(): Promise<DeleteAccountOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      // Ein 401 heisst: die Sitzung trägt nicht mehr. Das ist etwas anderes
      // als ein Fehler auf dem Server, und der Bildschirm sagt etwas anderes
      // dazu — anmelden statt es später versuchen.
      const status = (error as { context?: { status?: number } }).context?.status
      return { ok: false, reason: status === 401 ? 'unauthorized' : 'failed' }
    }
    return (data as { ok?: boolean } | null)?.ok === true
      ? { ok: true }
      : { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}
