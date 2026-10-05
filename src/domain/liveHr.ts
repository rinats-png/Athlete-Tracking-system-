/**
 * Live-Puls im Session Player (Trainingsbereich Etappe 9).
 *
 * Reine Funktionen: Messwert aus einem Bluetooth-Paket lesen, einen Wert auf
 * Plausibilität prüfen, gegen einen Zielbereich einordnen, Zusammenfassung.
 * Nichts davon urteilt über Gesundheit; ein Pulsgurt ist kein Medizinprodukt,
 * und die App sagt nur «im Zielbereich», «darunter» oder «darüber» gegen das,
 * was die Regel der Einheit selbst als Pulsziel nennt.
 */
export const HR_MIN_PLAUSIBLE = 30
export const HR_MAX_PLAUSIBLE = 230

export const plausibleHr = (bpm: number): boolean => Number.isFinite(bpm) && bpm >= HR_MIN_PLAUSIBLE && bpm <= HR_MAX_PLAUSIBLE

/**
 * Standardformat «Heart Rate Measurement» (Bluetooth SIG, Merkmal 0x2A37):
 * Bit 0 der Flags sagt, ob der Wert 8 oder 16 Bit breit ist.
 */
export function parseHeartRate(bytes: ArrayLike<number>): number | null {
  if (bytes.length < 2) return null
  const wide = (bytes[0] & 0x01) === 1
  if (wide && bytes.length < 3) return null
  const bpm = wide ? bytes[1] | (bytes[2] << 8) : bytes[1]
  return plausibleHr(bpm) ? bpm : null
}

export type ZoneStatus = 'below' | 'in' | 'above'

/** Ziel in Prozent der maximalen Herzfrequenz; ohne glaubwürdige HFmax keine Einordnung. */
export function zoneStatus(bpm: number, hrMax: number | null, target: { min: number; max: number } | null): ZoneStatus | null {
  if (!target || hrMax == null || !plausibleHr(hrMax) || !plausibleHr(bpm)) return null
  const pct = (bpm / hrMax) * 100
  return pct < target.min ? 'below' : pct > target.max ? 'above' : 'in'
}

export interface HrSummary {
  avg: number
  max: number
  samples: number
}

/** Mittel und Höchstwert; weniger als drei Werte ergeben keine Zusammenfassung. */
export function summarizeHr(samples: number[]): HrSummary | null {
  const ok = samples.filter(plausibleHr)
  if (ok.length < 3) return null
  return { avg: Math.round(ok.reduce((a, b) => a + b, 0) / ok.length), max: Math.max(...ok), samples: ok.length }
}
