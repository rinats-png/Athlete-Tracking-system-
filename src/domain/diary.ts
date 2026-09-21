import type { StoredDiaryEntry, StoredDiarySession } from '@/lib/store/localStore'

/**
 * Das Tagebuch rechnen — Schicht S1 aus docs/ausbau.md.
 *
 * Alles hier ist BESCHREIBUNG, nichts ist Bewertung. Es gibt keine Ampel,
 * keine Schwelle, keine Empfehlung (§81). Die Zahlen sagen, was war; was
 * daraus folgt, sagt ein Mensch.
 *
 * Die Formeln stammen aus dem Coaching-System v4.0.0 und sind gegen dessen
 * Testbericht geprüft (Soll-Werte in tests/diary.spec.ts):
 *
 *   Session-Last   Dauer (min) × Session-RPE      Foster et al. 2001 (sRPE)
 *   Tageslast      Summe der Session-Lasten
 *   Wochenlast     Summe über sieben Tage
 *   Belastungs-    7-Tage-Mittel / 28-Tage-Mittel  «acute:chronic», hier NUR
 *   verhältnis                                      als beschreibender Quotient
 *
 * Die Einheit der Last ist dimensionslos («AU»). Sie ist nur innerhalb
 * EINER Person vergleichbar — ein RPE von 7 heisst bei zwei Menschen nicht
 * dasselbe. Deshalb gibt es hier keinen Vergleich zwischen Athleten.
 */

/** Session-Last nach Foster: Dauer in Minuten mal Session-RPE (1–10). */
export function sessionLoad(session: Pick<StoredDiarySession, 'durationMin' | 'rpe'>): number {
  return session.durationMin * session.rpe
}

/** Last eines Tages: Summe aller Einheiten. Ohne Einheit: 0 — das ist eine echte Null. */
export function dayLoad(entry: Pick<StoredDiaryEntry, 'sessions'>): number {
  return entry.sessions.reduce((sum, s) => sum + sessionLoad(s), 0)
}

/** YYYY-MM-DD eines Zeitpunkts, in UTC — dieselbe Regel wie in availability.ts. */
export function toDay(at: Date): string {
  return at.toISOString().slice(0, 10)
}

function shiftDay(day: string, deltaDays: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + deltaDays * 86_400_000))
}

/** Eintrag eines Tages, oder null. */
export function entryOn(entries: StoredDiaryEntry[], day: string): StoredDiaryEntry | null {
  return entries.find((e) => e.day === day) ?? null
}

/**
 * Die Einträge eines Fensters, als Liste je Tag — MIT Lücken als null.
 *
 * Die Lücke steht in der Liste, weil sie im Diagramm stehen muss. Eine
 * Liste nur der vorhandenen Tage machte aus einer Woche ohne Eintrag eine
 * ruhige Kurve (§89: leer ist nicht null).
 */
export function window(
  entries: StoredDiaryEntry[],
  endDay: string,
  days: number,
): { day: string; entry: StoredDiaryEntry | null }[] {
  const byDay = new Map(entries.map((e) => [e.day, e]))
  const out: { day: string; entry: StoredDiaryEntry | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = shiftDay(endDay, -i)
    out.push({ day, entry: byDay.get(day) ?? null })
  }
  return out
}

type NumericField = 'weightKg' | 'sleepHours' | 'energy' | 'stress' | 'soreness' | 'steps' | 'sleepQuality' | 'adherence'

/**
 * Mittelwert eines Feldes über die letzten `days` Tage — NUR über Tage, an
 * denen es erfasst wurde. Ein fehlender Tag zieht den Mittelwert nicht nach
 * unten; er fehlt. `n` sagt, auf wie vielen Tagen der Wert steht.
 */
export function rollingMean(
  entries: StoredDiaryEntry[],
  field: NumericField,
  endDay: string,
  days = 7,
): { mean: number | null; n: number } {
  const values = window(entries, endDay, days)
    .map(({ entry }) => entry?.[field] ?? null)
    .filter((v): v is number => v != null)
  if (values.length === 0) return { mean: null, n: 0 }
  return { mean: values.reduce((a, b) => a + b, 0) / values.length, n: values.length }
}

/** Summe der Tageslasten über die letzten `days` Tage. */
export function loadSum(entries: StoredDiaryEntry[], endDay: string, days = 7): number {
  return window(entries, endDay, days).reduce((sum, { entry }) => sum + (entry ? dayLoad(entry) : 0), 0)
}

/**
 * Belastungsverhältnis: 7-Tage-Mittel zu 28-Tage-Mittel der Tageslast.
 *
 * Bewusst nur als Zahl, ohne «Korridor». Die Literatur zum acute:chronic
 * workload ratio ist umstritten; als Vorhersage von Verletzungen taugt er
 * nicht. Als Beschreibung — «diese Woche war das 1,4-fache deiner letzten
 * vier» — ist er ehrlich und nützlich. Null, solange keine vier Wochen da
 * sind: ein Quotient aus drei Tagen wäre Zahlenzauber.
 */
export const CHRONIC_DAYS = 28
export const ACUTE_DAYS = 7
export function acuteChronic(entries: StoredDiaryEntry[], endDay: string): number | null {
  const chronicEntries = window(entries, endDay, CHRONIC_DAYS).filter((w) => w.entry != null)
  if (chronicEntries.length < CHRONIC_DAYS * 0.5) return null
  const chronic = loadSum(entries, endDay, CHRONIC_DAYS) / CHRONIC_DAYS
  if (chronic <= 0) return null
  const acute = loadSum(entries, endDay, ACUTE_DAYS) / ACUTE_DAYS
  return acute / chronic
}

/**
 * Gewichtstrend: Mittel der letzten sieben Tage gegen das Mittel der sieben
 * davor, in kg. Tagesgewichte schwanken um ein bis zwei Kilo durch Wasser
 * und Glykogen — deshalb Mittel gegen Mittel, nie Tag gegen Tag. Null,
 * solange nicht in beiden Fenstern mindestens drei Wägungen liegen.
 */
export const TREND_MIN_POINTS = 3
export function weightTrend(entries: StoredDiaryEntry[], endDay: string): number | null {
  const recent = rollingMean(entries, 'weightKg', endDay, 7)
  const before = rollingMean(entries, 'weightKg', shiftDay(endDay, -7), 7)
  if (recent.n < TREND_MIN_POINTS || before.n < TREND_MIN_POINTS) return null
  if (recent.mean == null || before.mean == null) return null
  return recent.mean - before.mean
}

/**
 * Vollständigkeit: Anteil der Tage im Fenster mit einem Eintrag, der den
 * Kern trägt (Gewicht ODER Schlaf ODER eine Einheit). Ein Tag mit nur einer
 * Notiz zählt nicht als erfasst — sonst wäre die Zahl leicht zu schönen.
 */
export function completeness(entries: StoredDiaryEntry[], endDay: string, days = 14): number {
  const list = window(entries, endDay, days)
  const filled = list.filter(({ entry }) => entry != null && hasCore(entry)).length
  return filled / days
}

export function hasCore(entry: StoredDiaryEntry): boolean {
  return entry.weightKg != null || entry.sleepHours != null || entry.energy != null || entry.sessions.length > 0
}

/** Ob ein Eintrag überhaupt etwas trägt — leere Einträge werden nicht gespeichert. */
export function isEmptyEntry(entry: StoredDiaryEntry): boolean {
  return (
    entry.weightKg == null &&
    entry.sleepHours == null &&
    entry.sleepQuality == null &&
    entry.energy == null &&
    entry.stress == null &&
    entry.soreness == null &&
    entry.steps == null &&
    entry.adherence == null &&
    entry.sessions.length === 0 &&
    entry.note.trim() === ''
  )
}
