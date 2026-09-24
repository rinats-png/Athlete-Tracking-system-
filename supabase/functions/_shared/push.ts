/**
 * Reine Hilfen für den Push-Versand — ohne Deno, damit die Prüfläufe sie
 * direkt laden können.
 *
 * DER TEXT EINER FÄLLIGKEIT IST ABSICHTLICH ARM: kein Testname, kein Wert.
 * Eine Push-Nachricht läuft über den Dienst des Browserherstellers und
 * steht auf dem Sperrbildschirm. Was dort steht, sieht jeder, der das
 * Telefon in der Hand hat.
 */

export type PushKind = 'due' | 'broadcast' | 'coach' | 'test'

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

const DUE: Record<string, { title: string; body: string }> = {
  de: { title: 'Nachmessung fällig', body: 'Eine Nachmessung ist fällig. Öffne KYDON, um zu sehen, welche.' },
  en: { title: 'Retest due', body: 'A retest is due. Open KYDON to see which one.' },
  fr: { title: 'Nouvelle mesure à faire', body: 'Une nouvelle mesure est à faire. Ouvre KYDON pour voir laquelle.' },
  es: { title: 'Nueva medición pendiente', body: 'Tienes una nueva medición pendiente. Abre KYDON para ver cuál.' },
  nl: { title: 'Hermeting gepland', body: 'Er staat een hermeting gepland. Open KYDON om te zien welke.' },
  sv: { title: 'Dags för ny mätning', body: 'Det är dags för en ny mätning. Öppna KYDON för att se vilken.' },
  da: { title: 'Tid til ny måling', body: 'Det er tid til en ny måling. Åbn KYDON for at se hvilken.' },
  nb: { title: 'Tid for ny måling', body: 'Det er tid for en ny måling. Åpne KYDON for å se hvilken.' },
}

const COACH_TITLE: Record<string, string> = {
  de: 'Nachricht von deinem Trainer',
  en: 'Message from your coach',
  fr: 'Message de ton entraîneur',
  es: 'Mensaje de tu entrenador',
  nl: 'Bericht van je trainer',
  sv: 'Meddelande från din tränare',
  da: 'Besked fra din træner',
  nb: 'Melding fra treneren din',
}

const TEST: Record<string, { title: string; body: string }> = {
  de: { title: 'KYDON', body: 'Push-Benachrichtigungen sind eingeschaltet.' },
  en: { title: 'KYDON', body: 'Push notifications are on.' },
}

export const MAX_TITLE = 60
export const MAX_BODY = 200
export const MAX_COACH_BODY = 140

const lang = (locale: string) => (locale in DUE ? locale : 'en')

export function duePayload(locale: string): PushPayload {
  const t = DUE[lang(locale)]
  return { title: t.title, body: t.body, url: '/verlauf/erinnerungen', tag: 'kydon-due' }
}

export function coachPayload(locale: string, body: string): PushPayload {
  return { title: COACH_TITLE[lang(locale)], body, url: '/', tag: 'kydon-coach' }
}

export function testPayload(locale: string): PushPayload {
  const t = TEST[locale] ?? TEST.en
  return { ...t, url: '/', tag: 'kydon-test' }
}

export function broadcastPayload(title: string, body: string): PushPayload {
  return { title, body, url: '/', tag: 'kydon-news' }
}

/** Freitext säubern: Steuerzeichen raus, Leerraum zusammen, Länge begrenzen. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length === 0 || text.length > max) return null
  return text
}

/**
 * Wie viele Nachrichten ein Absender in einem Zeitraum schicken darf.
 * Ein Trainer an einen Athleten: 3 je 24 h. Der Admin an alle: 3 je 24 h.
 */
export const LIMITS = {
  coachPerRecipientPerDay: 3,
  broadcastPerDay: 3,
  testPerHour: 5,
} as const
