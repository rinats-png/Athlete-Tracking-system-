/**
 * Reine Hilfen für den Push-Versand — ohne Deno, damit die Prüfläufe sie
 * direkt laden können.
 *
 * DER TEXT EINER FÄLLIGKEIT IST ABSICHTLICH ARM: kein Testname, kein Wert.
 * Eine Push-Nachricht läuft über den Dienst des Browserherstellers und
 * steht auf dem Sperrbildschirm. Was dort steht, sieht jeder, der das
 * Telefon in der Hand hat.
 */

export type PushKind = 'due' | 'broadcast' | 'coach' | 'test' | 'agenda' | 'release' | 'activity'

/** Themen, die jedes Gerät einzeln ein- und ausschalten kann. */
export const PUSH_TOPICS = ['due', 'agenda', 'release', 'activity'] as const
export type PushTopic = (typeof PUSH_TOPICS)[number]
export const DEFAULT_TOPICS: readonly PushTopic[] = PUSH_TOPICS

/** Hat dieses Gerät das Thema eingeschaltet? Ohne Angabe gelten alle Themen. */
export const wantsTopic = (topics: readonly string[] | null | undefined, topic: PushTopic): boolean => (topics ?? DEFAULT_TOPICS).includes(topic)

/** Kennung einer App-Fassung: Datum, bei mehreren am Tag mit Zähler. */
export const isReleaseId = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(\.\d{1,3})?$/.test(value)

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


// --- Termine, App-Aktualisierung, Aktivität ---------------------------------------
// Alle Texte bleiben absichtlich arm: kein Name, kein Test, kein Wert.

const AGENDA_COMPETITION: Record<string, { title: string; body: string }> = {
  de: { title: 'Wettkampf morgen', body: 'Morgen steht dein Wettkampf an. Öffne KYDON für den Plan.' },
  en: { title: 'Competition tomorrow', body: 'Your competition is tomorrow. Open KYDON for the plan.' },
  fr: { title: 'Compétition demain', body: 'Ta compétition a lieu demain. Ouvre KYDON pour le plan.' },
  es: { title: 'Competición mañana', body: 'Tu competición es mañana. Abre KYDON para ver el plan.' },
  nl: { title: 'Wedstrijd morgen', body: 'Morgen staat je wedstrijd op de planning. Open KYDON voor het plan.' },
  sv: { title: 'Tävling i morgon', body: 'Din tävling är i morgon. Öppna KYDON för planen.' },
  da: { title: 'Konkurrence i morgen', body: 'Din konkurrence er i morgen. Åbn KYDON for planen.' },
  nb: { title: 'Konkurranse i morgen', body: 'Konkurransen din er i morgen. Åpne KYDON for planen.' },
}
const AGENDA_ASSESSMENT: Record<string, { title: string; body: string }> = {
  de: { title: 'Testtermin heute', body: 'Heute steht ein Testtermin an. Öffne KYDON für die Details.' },
  en: { title: 'Test session today', body: 'A test session is planned for today. Open KYDON for the details.' },
  fr: { title: "Séance de tests aujourd'hui", body: "Une séance de tests est prévue aujourd'hui. Ouvre KYDON pour les détails." },
  es: { title: 'Sesión de pruebas hoy', body: 'Hoy hay una sesión de pruebas. Abre KYDON para ver los detalles.' },
  nl: { title: 'Testmoment vandaag', body: 'Vandaag staat een testmoment gepland. Open KYDON voor de details.' },
  sv: { title: 'Testtillfälle i dag', body: 'I dag är ett testtillfälle planerat. Öppna KYDON för detaljer.' },
  da: { title: 'Testtidspunkt i dag', body: 'I dag er der planlagt en testsession. Åbn KYDON for detaljerne.' },
  nb: { title: 'Testtidspunkt i dag', body: 'I dag er det planlagt en testøkt. Åpne KYDON for detaljer.' },
}
const RELEASE: Record<string, { title: string; body: string }> = {
  de: { title: 'KYDON wurde aktualisiert', body: 'Es gibt Neuerungen. Öffne KYDON, um zu sehen, was neu ist.' },
  en: { title: 'KYDON was updated', body: "There is something new. Open KYDON to see what's new." },
  fr: { title: 'KYDON a été mis à jour', body: 'Il y a des nouveautés. Ouvre KYDON pour les découvrir.' },
  es: { title: 'KYDON se ha actualizado', body: 'Hay novedades. Abre KYDON para verlas.' },
  nl: { title: 'KYDON is bijgewerkt', body: 'Er is iets nieuws. Open KYDON om te zien wat er nieuw is.' },
  sv: { title: 'KYDON har uppdaterats', body: 'Det finns nyheter. Öppna KYDON för att se vad som är nytt.' },
  da: { title: 'KYDON er opdateret', body: 'Der er nyheder. Åbn KYDON for at se, hvad der er nyt.' },
  nb: { title: 'KYDON er oppdatert', body: 'Det er noe nytt. Åpne KYDON for å se hva som er nytt.' },
}
const ACTIVITY: Record<string, { title: string; one: string; many: string }> = {
  de: { title: 'Neues von deinen Athleten', one: 'Ein Athlet hat etwas eingetragen.', many: '{n} Athleten haben etwas eingetragen.' },
  en: { title: 'News from your athletes', one: 'An athlete has logged something.', many: '{n} athletes have logged something.' },
  fr: { title: 'Du nouveau chez tes athlètes', one: 'Un athlète a saisi quelque chose.', many: '{n} athlètes ont saisi quelque chose.' },
  es: { title: 'Novedades de tus atletas', one: 'Un atleta ha registrado algo.', many: '{n} atletas han registrado algo.' },
  nl: { title: 'Nieuws van je atleten', one: 'Een atleet heeft iets vastgelegd.', many: '{n} atleten hebben iets vastgelegd.' },
  sv: { title: 'Nytt från dina atleter', one: 'En atlet har registrerat något.', many: '{n} atleter har registrerat något.' },
  da: { title: 'Nyt fra dine atleter', one: 'En atlet har registreret noget.', many: '{n} atleter har registreret noget.' },
  nb: { title: 'Nytt fra utøverne dine', one: 'En utøver har registrert noe.', many: '{n} utøvere har registrert noe.' },
}

export type AgendaKind = 'competition' | 'assessment'

export function agendaPayload(kind: AgendaKind, locale: string): PushPayload {
  const t = (kind === 'competition' ? AGENDA_COMPETITION : AGENDA_ASSESSMENT)[lang(locale)]
  return { title: t.title, body: t.body, url: kind === 'competition' ? '/' : '/diagnostik/termine', tag: `kydon-agenda-${kind}` }
}

export function releasePayload(locale: string): PushPayload {
  const t = RELEASE[lang(locale)]
  return { title: t.title, body: t.body, url: '/', tag: 'kydon-release' }
}

/** Anzahl der Athleten mit neuer Aktivität — ohne Namen, ohne Inhalt. */
export function activityPayload(locale: string, athletes: number): PushPayload {
  const t = ACTIVITY[lang(locale)]
  return { title: t.title, body: athletes === 1 ? t.one : t.many.replace('{n}', String(athletes)), url: '/trainer', tag: 'kydon-activity' }
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
  /** Aktivitätsmeldungen an einen Trainer: höchstens eine je Stunde. */
  activityPerCoachPerHour: 1,
  /** Rundmeldung zu einer App-Fassung: einmal je Fassung. */
  releasePerDay: 3,
} as const
