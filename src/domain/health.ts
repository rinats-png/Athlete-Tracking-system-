import { HEALTH_CATEGORIES, HEALTH_CONSENT_VERSION, HEALTH_MIN_AGE, PHOTO_POSES, type HealthCategory } from '@/lib/store/schema'
import { ageFromBirthDate } from '@/lib/format'
import type { StoredHealth, StoredLabEntry, StoredPeakWeek, StoredPhotoEntry, StoredSymptomEntry } from '@/lib/store/localStore'

/**
 * Die Gesundheitsschicht (S5) — die Rechnung dahinter.
 *
 * DREI DINGE TUT DIESE DATEI, UND NUR DIESE DREI: sie verwaltet die
 * Einwilligung je Kategorie, sie ordnet Einträge zu Verläufen, und sie
 * rechnet die Energieverfügbarkeit aus drei Zahlen.
 *
 * WAS SIE NICHT TUT, aus Gründen, die in docs/rechtspruefung-art9-mdr.md §5
 * stehen: Sie erkennt nichts, sie stuft nichts ein, sie warnt nicht und sie
 * sagt nichts voraus. Kein Grenzwert, keine Ampel, kein Screening, keine
 * Zyklusvorhersage. Ein Verlauf ist eine verlustfreie Darstellung; eine
 * Einstufung wäre die Zweckbestimmung eines Medizinprodukts.
 *
 * Die Prüffälle in tests/health.spec.ts halten diese Linie fest — auch mit
 * einem Fall, der den ganzen Bildschirm nach Wörtern wie «auffällig»,
 * «Risiko» oder «Mangel» durchsucht.
 */

export type ConsentState = 'missing' | 'granted' | 'withdrawn' | 'outdated'

export interface CategoryConsent {
  category: HealthCategory
  state: ConsentState
  grantedAt: string | null
  version: string
}

export function consentFor(health: StoredHealth, category: HealthCategory): CategoryConsent {
  const row = health.consents.find((c) => c.category === category)
  if (!row || row.grantedAt == null) return { category, state: 'missing', grantedAt: null, version: '' }
  if (row.withdrawnAt != null) return { category, state: 'withdrawn', grantedAt: row.grantedAt, version: row.version }
  if (row.version !== HEALTH_CONSENT_VERSION) return { category, state: 'outdated', grantedAt: row.grantedAt, version: row.version }
  return { category, state: 'granted', grantedAt: row.grantedAt, version: row.version }
}

/** Ob eine Kategorie benutzt werden darf. Alles andere als «granted» heisst nein. */
export function hasConsent(health: StoredHealth, category: HealthCategory): boolean {
  return consentFor(health, category).state === 'granted'
}

export function allConsents(health: StoredHealth): CategoryConsent[] {
  return HEALTH_CATEGORIES.map((c) => consentFor(health, c))
}

export function grantConsent(health: StoredHealth, category: HealthCategory, at: string): StoredHealth {
  const rest = health.consents.filter((c) => c.category !== category)
  return { ...health, consents: [...rest, { category, grantedAt: at, withdrawnAt: null, version: HEALTH_CONSENT_VERSION }] }
}

/** Welche Liste zu welcher Kategorie gehört. Eine Stelle, damit der Widerruf nichts übersieht. */
const LIST_OF: Record<HealthCategory, keyof StoredHealth> = {
  lab: 'labs',
  symptoms: 'symptoms',
  cycle: 'cycle',
  selfImage: 'selfImage',
  meds: 'meds',
  photos: 'photos',
}

/**
 * Widerruf: die Einwilligung wird als zurückgezogen vermerkt UND die Einträge
 * der Kategorie werden gelöscht — sofort, nicht später.
 *
 * Der Vermerk bleibt, die Daten nicht. Das ist der Unterschied zwischen
 * «wir wissen, dass du widerrufen hast» und «wir haben deine Blutwerte noch».
 */
export function withdrawConsent(health: StoredHealth, category: HealthCategory, at: string): StoredHealth {
  const rest = health.consents.filter((c) => c.category !== category)
  const previous = health.consents.find((c) => c.category === category)
  return {
    ...health,
    consents: [...rest, { category, grantedAt: previous?.grantedAt ?? null, withdrawnAt: at, version: previous?.version ?? '' }],
    [LIST_OF[category]]: [],
  }
}

/** Wie viele Einträge eine Kategorie trägt — für den Satz vor dem Widerruf. */
export function entryCount(health: StoredHealth, category: HealthCategory): number {
  const list = health[LIST_OF[category]]
  return Array.isArray(list) ? list.length : 0
}

/**
 * Altersgrenze. Die Gesundheitsschicht gilt ab achtzehn — das vermeidet die
 * Frage nach der Einwilligung Erziehungsberechtigter in Art.-9-Daten, statt
 * sie zu beantworten (docs/rechtspruefung-art9-mdr.md §4).
 *
 * Ohne Geburtsdatum gibt es keine Freischaltung: ein unbekanntes Alter ist
 * kein erreichtes Alter.
 */
export function ageAllows(birthDate: string | null, asOf: Date = new Date()): boolean {
  const age = ageFromBirthDate(birthDate, asOf)
  return age != null && age >= HEALTH_MIN_AGE
}

// =============================================================================
// Verläufe
// =============================================================================

export interface LabPoint {
  day: string
  value: number
  unit: string
  refLow: number | null
  refHigh: number | null
  lab: string
}

/** Ein Marker über die Zeit, älteste zuerst. Nur Darstellung, keine Wertung. */
export function labSeries(labs: StoredLabEntry[], marker: string): LabPoint[] {
  return labs
    .filter((l) => l.marker === marker)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((l) => ({ day: l.day, value: l.value, unit: l.unit, refLow: l.refLow, refHigh: l.refHigh, lab: l.lab }))
}

export interface MarkerSummary {
  marker: string
  count: number
  latest: LabPoint
}

/** Alle Marker, die je eingetragen wurden — neueste Messung zuerst. */
export function labMarkers(labs: StoredLabEntry[]): MarkerSummary[] {
  const out = new Map<string, MarkerSummary>()
  for (const l of [...labs].sort((a, b) => a.day.localeCompare(b.day))) {
    const point: LabPoint = { day: l.day, value: l.value, unit: l.unit, refLow: l.refLow, refHigh: l.refHigh, lab: l.lab }
    const current = out.get(l.marker)
    out.set(l.marker, { marker: l.marker, count: (current?.count ?? 0) + 1, latest: point })
  }
  return [...out.values()].sort((a, b) => b.latest.day.localeCompare(a.latest.day))
}

/**
 * Die Stärke eines Symptoms über die letzten Tage. Fehlt ein Tag, fehlt er —
 * er wird nicht als Null gezählt (§89: nicht erfasst ist nicht beschwerdefrei).
 */
export function symptomSeries(entries: StoredSymptomEntry[], key: string, days: string[]): (number | null)[] {
  const byDay = new Map(entries.map((e) => [e.day, e]))
  return days.map((d) => {
    const entry = byDay.get(d)
    if (!entry) return null
    return entry.items.find((i) => i.key === key)?.severity ?? null
  })
}

/** Welche Symptome überhaupt vorkommen — damit der Bildschirm nur zeigt, was benutzt wird. */
export function symptomsUsed(entries: StoredSymptomEntry[]): string[] {
  const seen = new Set<string>()
  for (const e of entries) for (const i of e.items) seen.add(i.key)
  return [...seen]
}

// =============================================================================
// Energieverfügbarkeit
// =============================================================================

/**
 * Energieverfügbarkeit in kcal je kg fettfreier Masse.
 *
 * EA = (Energieaufnahme − Trainingsumsatz) / fettfreie Masse
 *
 * OHNE SCHWELLE, mit Absicht. Der bekannte Grenzwert von 30 kcal/kg FFM ist
 * ein klinischer Cutoff für ein Krankheitsrisiko; ihn anzuzeigen wäre eine
 * Einstufung und damit die Zweckbestimmung eines Medizinprodukts
 * (docs/rechtspruefung-art9-mdr.md §5). Die App zeigt die Zahl, die Formel
 * und ihre Quelle — was daraus folgt, sagt ein Mensch.
 *
 * Der Trainingsumsatz ist eine SELBSTAUSKUNFT: die App misst ihn nicht, und
 * ihn zu schätzen hiesse, den grössten Fehler der Rechnung zu erfinden.
 * Ohne ihn gibt es keine Zahl.
 */
export const EA_SOURCE = 'Loucks, Kiens, Wright 2011'
export const EA_FORMULA = '(Zufuhr − Trainingsumsatz) ÷ fettfreie Masse'

export function energyAvailability(input: { intakeKcal: number | null; trainingKcal: number | null; fatFreeMassKg: number | null }): number | null {
  const { intakeKcal, trainingKcal, fatFreeMassKg } = input
  if (intakeKcal == null || trainingKcal == null || fatFreeMassKg == null) return null
  if (!Number.isFinite(intakeKcal) || !Number.isFinite(trainingKcal) || !Number.isFinite(fatFreeMassKg)) return null
  if (fatFreeMassKg <= 0) return null
  return (intakeKcal - trainingKcal) / fatFreeMassKg
}

// =============================================================================
// Peak Week
// =============================================================================

export interface PeakSummary {
  days: number
  /** Tage mit Gewicht — die Reihe, aus der die Spanne kommt. */
  weighed: number
  weightFrom: number | null
  weightTo: number | null
  /** Differenz zwischen erstem und letztem gewogenen Tag. Beschreibung, kein Urteil. */
  weightDelta: number | null
  daysToEvent: number | null
}

export function peakSummary(week: StoredPeakWeek, today = new Date().toISOString().slice(0, 10)): PeakSummary {
  const sorted = [...week.days].sort((a, b) => a.day.localeCompare(b.day))
  const weighed = sorted.filter((d) => d.weightKg != null)
  const from = weighed[0]?.weightKg ?? null
  const to = weighed[weighed.length - 1]?.weightKg ?? null
  return {
    days: sorted.length,
    weighed: weighed.length,
    weightFrom: from,
    weightTo: to,
    weightDelta: from != null && to != null && weighed.length >= 2 ? to - from : null,
    daysToEvent: week.eventDate ? Math.round((Date.parse(`${week.eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null,
  }
}

/** Die Tage eines Abschnitts, älteste zuerst. */
export function daysOfStage(week: StoredPeakWeek, stage: string) {
  return week.days.filter((d) => d.stage === stage).sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Die Fotos eines Tages, in der Reihenfolge der Posen.
 *
 * Sortiert wird beim LESEN, nie beim Schreiben — und nach der Pose, damit
 * zwei Tage nebeneinander dieselbe Reihenfolge zeigen. Sonst verglichen man
 * Vorderansicht mit Rückenansicht und hielte das für eine Veränderung.
 */
export function photosOfDay(photos: StoredPhotoEntry[], day: string): StoredPhotoEntry[] {
  return photos.filter((p) => p.day === day).sort((a, b) => PHOTO_POSES.indexOf(a.pose) - PHOTO_POSES.indexOf(b.pose))
}

/** Die Tage mit Fotos, jüngster zuerst. */
export function photoDays(photos: StoredPhotoEntry[]): string[] {
  return [...new Set(photos.map((p) => p.day))].sort((a, b) => b.localeCompare(a))
}
