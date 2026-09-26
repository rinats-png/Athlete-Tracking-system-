import type { ValidatedReadiness } from '@/lib/store/schema'

/**
 * Selbsteinschätzung vor einem Testtermin (§28).
 *
 * Drei Festlegungen, die den Unterschied zwischen einer nützlichen und einer
 * irreführenden Zahl ausmachen:
 *
 * 1. AUSDRÜCKLICH SUBJEKTIV. Das ist keine Messung von Erholung, sondern die
 *    Selbstauskunft eines Menschen an einem Morgen. Die App nennt sie
 *    entsprechend und leitet daraus keine Trainingsfreigabe ab (§82).
 *
 * 2. NUR AUS DEM, WAS DA IST. Fehlt eine Angabe, wird sie nicht durch einen
 *    Mittelwert ersetzt — der Wert entsteht aus den beantworteten Fragen, und
 *    wie viele das waren, wird mitgeliefert.
 *
 * 3. KEINE GEWICHTUNG. Alle beantworteten Fragen zählen gleich. Eine
 *    Gewichtung liesse sich ohne Studienlage nicht begründen, und eine
 *    erfundene Gewichtung wäre schlechter als gar keine.
 */

export interface ReadinessScore {
  /** 0–100, oder null wenn keine einzige Frage beantwortet wurde. */
  score: number | null
  /** Wie viele der sechs Fragen beantwortet wurden. */
  answered: number
  total: number
}

/** Schlafdauer, ab der die Bewertung nicht weiter steigt. */
export const SLEEP_TARGET_MINUTES = 8 * 60

/**
 * Skalen, bei denen ein HOHER Wert schlecht ist. Sie werden gedreht, damit
 * am Ende überall «mehr ist besser» gilt.
 */
const INVERTED: (keyof ValidatedReadiness)[] = ['fatigue', 'stress', 'soreness']
const SCALES = ['sleepQuality', 'fatigue', 'stress', 'soreness', 'motivation'] as const satisfies readonly (keyof ValidatedReadiness)[]

export function readinessScore(readiness: ValidatedReadiness | null): ReadinessScore {
  const total = SCALES.length + 1 // die fünf Skalen plus die Schlafdauer
  if (!readiness) return { score: null, answered: 0, total }

  const parts: number[] = []

  for (const key of SCALES) {
    const value = readiness[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    // 1–10 auf 0–1 abbilden; invertierte Skalen umdrehen.
    const normalised = (value - 1) / 9
    parts.push(INVERTED.includes(key) ? 1 - normalised : normalised)
  }

  if (readiness.sleepMinutes != null && Number.isFinite(readiness.sleepMinutes)) {
    // Mehr als das Ziel verbessert die Bewertung nicht weiter — bei zwölf
    // Stunden Schlaf ist niemand anderthalbmal so erholt wie bei acht.
    parts.push(Math.min(1, readiness.sleepMinutes / SLEEP_TARGET_MINUTES))
  }

  if (parts.length === 0) return { score: null, answered: 0, total }

  return {
    score: Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100),
    answered: parts.length,
    total,
  }
}

/**
 * Schlafdauer als Minuten aus «7:42» oder «7,7» bzw. «7.7».
 *
 * Nur der Doppelpunkt trennt Stunden und Minuten. Punkt und Komma sind
 * Dezimaltrennzeichen — sonst wäre «7.5» zweideutig: als Uhrzeit gelesen
 * ergäbe es 7 h 5 min statt der gemeinten siebeneinhalb Stunden, ein
 * Unterschied von 25 Minuten, den niemand bemerkt.
 */
export function parseSleepDuration(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  const clock = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed)
  if (clock) {
    const hours = Number(clock[1])
    const minutes = Number(clock[2])
    if (minutes > 59) return null
    return hours * 60 + minutes
  }

  const decimal = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(decimal) || decimal < 0) return null
  return Math.round(decimal * 60)
}

export function formatSleepDuration(minutes: number | null): string {
  if (minutes == null) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/**
 * Die Selbsteinschätzung als einzelne Angaben (Master-Spezifikation D5).
 *
 * Vorne stehen die Komponenten, jede mit ihrem Rohwert und ob sie für sich
 * günstig, mittel oder ungünstig liegt. Die Zusammenfassung aus
 * `readinessScore` steht darunter — sie verdeckt, WELCHE Angabe den Wert
 * drückt, und eine schlechte Nacht bei sonst gutem Befinden ist etwas
 * anderes als durchweg mittlere Werte.
 *
 * Die Einteilung in Drittel ist eine Lesehilfe auf der Skala der Frage, kein
 * Grenzwert: unter einem Drittel des Wegs zum günstigen Ende «ungünstig»,
 * über zwei Dritteln «günstig».
 */
export type ReadinessPartKey = 'sleepMinutes' | (typeof SCALES)[number]
export type ReadinessLean = 'favourable' | 'middle' | 'unfavourable'

export interface ReadinessPart {
  key: ReadinessPartKey
  /** Rohwert: Minuten bei der Schlafdauer, sonst 1–10. */
  value: number
  /** 0–1, 1 = günstiges Ende. */
  normalised: number
  lean: ReadinessLean
}

export function readinessParts(readiness: ValidatedReadiness | null): ReadinessPart[] {
  if (!readiness) return []
  const parts: ReadinessPart[] = []
  const lean = (n: number): ReadinessLean => (n >= 2 / 3 ? 'favourable' : n < 1 / 3 ? 'unfavourable' : 'middle')
  if (readiness.sleepMinutes != null && Number.isFinite(readiness.sleepMinutes)) {
    const n = Math.min(1, readiness.sleepMinutes / SLEEP_TARGET_MINUTES)
    // Schlaf: die Drittel wären 2:40 und 5:20 — zu grob. Unter sechs Stunden
    // gilt als kurz (75 % des Ziels), ab sieben Stunden als ausreichend.
    const sleepLean: ReadinessLean = n >= 7 / 8 ? 'favourable' : n < 6 / 8 ? 'unfavourable' : 'middle'
    parts.push({ key: 'sleepMinutes', value: readiness.sleepMinutes, normalised: n, lean: sleepLean })
  }
  for (const key of SCALES) {
    const value = readiness[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const raw = (value - 1) / 9
    const n = INVERTED.includes(key) ? 1 - raw : raw
    parts.push({ key, value, normalised: n, lean: lean(n) })
  }
  return parts
}
