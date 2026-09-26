import { buildMetric, type DerivedMetric } from '@/domain/metricContract'

/**
 * HRV-Messung mit dem Brustgurt — reine Rechnung, ohne Bluetooth.
 *
 * WAS DER GURT SCHICKT: das Bluetooth-Merkmal «Heart Rate Measurement»
 * (0x2A37, Bluetooth SIG). Ein Paket enthält den Puls und — bei Brustgurten
 * mit EKG-Elektroden wie dem Polar H10 — die Abstände zwischen den
 * Herzschlägen (RR-Intervalle) in 1/1024 Sekunden. Nur aus diesen Abständen
 * lässt sich eine HRV rechnen; der gemittelte Puls allein reicht nicht.
 *
 * WAS GERECHNET WIRD: der RMSSD — die Wurzel aus dem Mittel der quadrierten
 * Differenzen aufeinanderfolgender RR-Intervalle (Task Force of the ESC and
 * NASPE 1996). Er ist das in der Trainingssteuerung übliche Kurzzeitmass
 * (Plews et al. 2013) und lässt sich schon aus einer Minute verlässlich
 * bestimmen (Esco & Flatt 2014).
 *
 * WIE GEMESSEN WIRD (Protokoll, auf dem Bildschirm erklärt): morgens nach
 * dem Aufwachen, liegend, ruhig atmen. Die ersten 30 Sekunden gelten als
 * Einschwingen und gehen nicht in die Rechnung ein.
 *
 * ARTEFAKTE: Ein Intervall ausserhalb 300–2000 ms oder eines, das mehr als
 * 20 % vom vorigen gültigen abweicht, gilt als Fehler (verrutschter Gurt,
 * Extraschlag) und wird verworfen. Differenzen werden nur zwischen zwei
 * unmittelbar benachbarten gültigen Schlägen gebildet — eine Lücke wird
 * nicht überbrückt. Liegt der Anteil verworfener Schläge über 5 %, gilt die
 * Messung als nicht auswertbar. Beide Grenzen sind in der HRV-Praxis übliche
 * Festlegungen, keine Normen; sie stehen im Formelregister als vorläufig.
 *
 * KEINE DEUTUNG. Der RMSSD wird wie jeder Beobachtungswert nur gegen die
 * eigene Bandbreite gelesen (domain/readinessContext.ts) — nie gegen eine
 * Norm, nie als Aussage über Gesundheit (§82).
 */

export const HRV_ALGORITHM = 'rmssd_rr_filtered'
export const HRV_VERSION = '1.0.0'

/** Einschwingen, das nicht ausgewertet wird. */
export const HRV_SETTLE_S = 30
/** Mindestdauer des ausgewerteten Teils. */
export const HRV_MIN_ANALYSIS_S = 60
/** Wählbare Gesamtdauern der Messung in Sekunden. */
export const HRV_DURATIONS_S = [120, 180, 300] as const
export const HRV_DEFAULT_DURATION_S = 120
/** Gültiger Bereich eines RR-Intervalls. */
export const RR_MIN_MS = 300
export const RR_MAX_MS = 2000
/** Grösste erlaubte Abweichung vom vorigen gültigen Intervall. */
export const RR_MAX_JUMP = 0.2
/** Höchster Anteil verworfener Schläge, bei dem die Messung noch zählt. */
export const HRV_MAX_ARTIFACT_PCT = 5

export interface HeartRateMeasurement {
  /** Puls in Schlägen je Minute, wie ihn der Gurt meldet. */
  hr: number
  /** RR-Intervalle in Millisekunden (kann leer sein). */
  rr: number[]
  /** Hautkontakt: true/false, oder null, wenn der Gurt es nicht meldet. */
  contact: boolean | null
}

/**
 * Ein Paket des Merkmals 0x2A37 lesen.
 *
 * Flags (Byte 0): Bit 0 Pulsformat (0 = 8 Bit, 1 = 16 Bit), Bit 1–2
 * Hautkontakt (Bit 2 = wird gemeldet, Bit 1 = liegt an), Bit 3 Energie-
 * verbrauch vorhanden (2 Byte, übersprungen), Bit 4 RR-Intervalle vorhanden
 * (je 2 Byte, Einheit 1/1024 s). Alles little-endian.
 */
export function parseHeartRateMeasurement(view: DataView): HeartRateMeasurement {
  const flags = view.getUint8(0)
  let offset = 1
  let hr: number
  if (flags & 0x01) {
    hr = view.getUint16(offset, true)
    offset += 2
  } else {
    hr = view.getUint8(offset)
    offset += 1
  }
  const contact = flags & 0x04 ? Boolean(flags & 0x02) : null
  if (flags & 0x08) offset += 2
  const rr: number[] = []
  if (flags & 0x10) {
    while (offset + 1 < view.byteLength) {
      rr.push(Math.round((view.getUint16(offset, true) / 1024) * 1000))
      offset += 2
    }
  }
  return { hr, rr, contact }
}

/** Ein empfangener Schlag mit Zeitpunkt (ms seit Beginn der Messung). */
export interface Beat {
  at: number
  rr: number
}

export interface HrvResult {
  /** Schläge im ausgewerteten Teil (nach dem Einschwingen). */
  beats: number
  valid: number
  artifactPct: number
  /** Dauer des ausgewerteten Teils in Sekunden, aus den RR-Intervallen. */
  analysisSeconds: number
  rmssd: DerivedMetric<number>
  /** Mittlerer Puls aus den gültigen RR-Intervallen. */
  meanHr: number | null
  /** Warum die Messung nicht zählt — oder null, wenn sie zählt. */
  rejected: 'too_short' | 'too_many_artifacts' | null
}

/** Welche Intervalle gültig sind. */
export function validBeats(rr: number[]): boolean[] {
  const ok: boolean[] = []
  let last: number | null = null
  for (const x of rr) {
    const inRange = x >= RR_MIN_MS && x <= RR_MAX_MS
    const jump = last != null && Math.abs(x - last) / last > RR_MAX_JUMP
    const good = inRange && !jump
    ok.push(good)
    if (good) last = x
  }
  return ok
}

/** RMSSD aus einer Reihe mit Gültigkeitsmaske — nur benachbarte gültige Paare. */
export function rmssd(rr: number[], ok: boolean[] = rr.map(() => true)): number | null {
  const diffs: number[] = []
  for (let i = 1; i < rr.length; i++) if (ok[i] && ok[i - 1]) diffs.push(rr[i] - rr[i - 1])
  if (diffs.length === 0) return null
  return Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / diffs.length)
}

/** Auswertung einer Messung. `beats` in der Reihenfolge des Empfangs. */
export function analyzeHrv(beats: Beat[]): HrvResult {
  const used = beats.filter((b) => b.at >= HRV_SETTLE_S * 1000)
  const rr = used.map((b) => b.rr)
  const ok = validBeats(rr)
  const validRr = rr.filter((_, i) => ok[i])
  const artifactPct = rr.length === 0 ? 0 : Math.round(((rr.length - validRr.length) / rr.length) * 1000) / 10
  const analysisSeconds = Math.round(validRr.reduce((s, x) => s + x, 0) / 1000)
  const value = rmssd(rr, ok)
  const rejected = analysisSeconds < HRV_MIN_ANALYSIS_S ? 'too_short' : artifactPct > HRV_MAX_ARTIFACT_PCT ? 'too_many_artifacts' : null
  const metric = buildMetric(
    { key: 'hrv_rmssd_ms', algorithm: HRV_ALGORITHM, algorithmVersion: HRV_VERSION, unit: 'ms', minSample: 30, targetSample: 90 },
    {
      value: rejected || value == null ? null : Math.round(value * 10) / 10,
      sampleSize: validRr.length,
      period: { from: '', to: '' },
      completeness: rr.length === 0 ? 0 : validRr.length / rr.length,
    },
  )
  const meanRr = validRr.length ? validRr.reduce((s, x) => s + x, 0) / validRr.length : null
  return {
    beats: rr.length,
    valid: validRr.length,
    artifactPct,
    analysisSeconds,
    rmssd: metric,
    meanHr: meanRr ? Math.round(60000 / meanRr) : null,
    rejected,
  }
}
