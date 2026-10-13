/**
 * Schläge am Sack oder an der Pratze zählen — aus dem Pegel des Mikrofons
 * (Vorschau, nur hinter dem Vorschauschalter).
 *
 * EIN SCHLAG = ein Pegelsprung über die Schwelle nach einer Ruhezeit. Die
 * Schwelle kommt aus einer Probe von zehn eigenen Schlägen (`calibrate`),
 * nicht aus einer festen Zahl: Halle, Sack und Abstand sind überall anders.
 *
 * GENAUIGKEIT UNGEPRÜFT: es gibt keine Validierung gegen eine Videozählung.
 * Die Oberfläche nennt die Zahl deshalb «Schätzung» und zeigt sie nur in der
 * Vorschau; in Bericht, Profil oder Urteil «besser/schlechter» geht sie nicht.
 *
 * Rein: kein Mikrofon, keine Uhr — Zeit und Pegel (0..1, RMS) werden übergeben.
 */

/** Mindestabstand zweier Schläge in Sekunden (schneller schlägt niemand). */
export const REFRACTORY_S = 0.12

export interface OnsetState {
  threshold: number
  count: number
  lastHit: number | null
  armed: boolean
}

export const startOnsets = (threshold: number): OnsetState => ({ threshold, count: 0, lastHit: null, armed: true })

export function stepOnsets(s: OnsetState, t: number, level: number): OnsetState {
  if (!Number.isFinite(level)) return s
  // Wieder scharf, sobald der Pegel unter die halbe Schwelle fällt.
  if (!s.armed) return level < s.threshold / 2 ? { ...s, armed: true } : s
  if (level >= s.threshold && (s.lastHit == null || t - s.lastHit >= REFRACTORY_S)) return { ...s, count: s.count + 1, lastHit: t, armed: false }
  return s
}

/**
 * Schwelle aus den Spitzen einer Probe: 60 % des Medians der Spitzen,
 * mindestens das Dreifache des Grundrauschens. Null bei zu wenig Spitzen.
 */
export function calibrate(peaks: number[], noise: number): number | null {
  const p = peaks.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  if (p.length < 5) return null
  const median = p[Math.floor(p.length / 2)]
  return Math.max(median * 0.6, noise * 3, 0.02)
}
