/**
 * Regeln für die Sprachmodell-Schicht (docs/ask-kydon.md, Produktdoktrin §28).
 *
 * Das Modell FORMULIERT Fakten um; es erzeugt keine Ergebnisse. Deshalb geht
 * nur das an den Anbieter, was diese Datei durchlässt: Schlüssel und Zahlen
 * der Fakten, dazu wenige Zeichenketten fester Art (Testkennung, Datum,
 * Stufe). Nie ein Name, nie eine Mail, nie Freitext. Die Datei hat keine
 * Deno-Abhängigkeit, damit sie im Prüflauf getestet werden kann.
 */

export const PHRASE_KINDS = ['brief', 'answer', 'draft'] as const
export type PhraseKind = (typeof PHRASE_KINDS)[number]

export const PHRASE_LOCALES = ['de', 'en', 'fr', 'es', 'nl', 'sv', 'nb', 'da'] as const
export type PhraseLocale = (typeof PHRASE_LOCALES)[number]

/** Aufrufe je Konto und Monat. Danach gilt die feste Vorlage. */
export const MONTHLY_LIMIT = 30

/** Produkte, die die Sprachmodell-Texte bekommen (Pro-Stufe und darüber). */
export const PHRASE_PRODUCTS = ['athlete_pro', 'athlete_elite', 'coach_pro', 'coach_club']

export interface PhraseFact {
  key: string
  params: Record<string, string | number>
}

/** Zeichenketten sind nur unter diesen Parameternamen erlaubt — Namen gehören nicht dazu. */
const STRING_PARAMS = new Set(['slug', 'day', 'firstDay', 'lastDay', 'last', 'level', 'verdict', 'unit', 'template'])
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/
const SLUG = /^[a-z0-9_]{1,48}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const WORD = /^[A-Za-z_%/]{1,24}$/
const MAX_FACTS = 24
const MAX_PARAMS = 10

function stringAllowed(param: string, value: string): boolean {
  if (param === 'slug') return SLUG.test(value)
  if (param === 'day' || param === 'firstDay' || param === 'lastDay' || param === 'last') return DAY.test(value)
  return WORD.test(value)
}

/** Prüft die Fakten aus dem Netz. null = abweisen, sonst die bereinigte Kopie. */
export function sanitizeFacts(raw: unknown): PhraseFact[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_FACTS) return null
  const out: PhraseFact[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const { key, params } = item as { key?: unknown; params?: unknown }
    if (typeof key !== 'string' || !KEY.test(key)) return null
    if (!params || typeof params !== 'object' || Array.isArray(params)) return null
    const entries = Object.entries(params as Record<string, unknown>)
    if (entries.length > MAX_PARAMS) return null
    const clean: Record<string, string | number> = {}
    for (const [name, value] of entries) {
      if (!KEY.test(name)) return null
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || Math.abs(value) > 1e7) return null
        clean[name] = value
      } else if (typeof value === 'string') {
        if (!STRING_PARAMS.has(name) || !stringAllowed(name, value)) return null
        clean[name] = value
      } else return null
    }
    out.push({ key, params: clean })
  }
  return out
}

export const isKind = (v: unknown): v is PhraseKind => typeof v === 'string' && (PHRASE_KINDS as readonly string[]).includes(v)
export const isLocale = (v: unknown): v is PhraseLocale => typeof v === 'string' && (PHRASE_LOCALES as readonly string[]).includes(v)

/** `YYYY-MM` in UTC — der Zähler läuft je Kalendermonat. */
export const monthKey = (d: Date): string => d.toISOString().slice(0, 7)

export const LANGUAGE_NAME: Record<PhraseLocale, string> = {
  de: 'German',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  nl: 'Dutch',
  sv: 'Swedish',
  nb: 'Norwegian Bokmål',
  da: 'Danish',
}

/** Platzhalter für den Namen im Entwurf; der Name selbst kommt erst in der App dazu. */
export const NAME_TOKEN = '{name}'

export function buildPrompt(kind: PhraseKind, locale: PhraseLocale, facts: PhraseFact[]): { system: string; user: string } {
  const rules = [
    `Write in ${LANGUAGE_NAME[locale]}.`,
    'You rephrase the given facts into short, plain prose. You do not add facts.',
    'Use only numbers that appear in the facts. Do not invent, compute, round differently or compare numbers.',
    'Give no training advice, no nutrition advice, no diagnosis and no judgement about the person.',
    'Do not name causes. Do not say that something is good or bad; say what the data shows.',
    'Better or worse may only be stated when a fact says so; otherwise say the change is within measurement error.',
    'Use no lists, no headings, no emojis. At most 90 words.',
  ]
  if (kind === 'draft') rules.push(`Write a short, friendly message from a coach to an athlete about the data situation only. Address the athlete with the exact token ${NAME_TOKEN} and no other name.`)
  if (kind === 'brief') rules.push('Write a short weekly brief addressed to the athlete with "you".')
  if (kind === 'answer') rules.push('Answer the question the facts belong to in two to four sentences.')
  return { system: rules.join('\n'), user: JSON.stringify({ facts }) }
}
