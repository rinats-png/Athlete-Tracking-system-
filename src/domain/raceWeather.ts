/**
 * Rennwetter: reine Auswertung der Antworten eines Wetterdienstes.
 *
 * Hier steht kein Netz und keine Rechnung mit Normwerten. Der Wetterbericht
 * wird gezeigt, wie er kommt: Temperatur, Wind, Niederschlag. Wie stark Hitze
 * oder Wind das Tempo verschieben, hängt von Person, Distanz und Gewöhnung
 * ab; wir haben dafür keine Quelle, die wir hier einsetzen könnten — also
 * rechnet KYDON die Prognose nicht um (Regel 6).
 */

/** Weiter als so viele Tage im Voraus gibt der Dienst keine Vorhersage. */
export const FORECAST_DAYS = 16

export type ForecastWindow = 'ok' | 'past' | 'too_far' | 'invalid'

const DAY = /^\d{4}-\d{2}-\d{2}$/

const dayNumber = (day: string): number => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86_400_000

/** Liegt der Renntag im Bereich, für den es eine Vorhersage gibt? `today` ist der heutige Tag des Geräts. */
export function forecastWindow(raceDay: string, today: string): ForecastWindow {
  if (!DAY.test(raceDay) || !DAY.test(today)) return 'invalid'
  const d = dayNumber(raceDay) - dayNumber(today)
  if (Number.isNaN(d)) return 'invalid'
  if (d < 0) return 'past'
  if (d > FORECAST_DAYS - 1) return 'too_far'
  return 'ok'
}

export interface Place {
  name: string
  region: string | null
  country: string | null
  lat: number
  lon: number
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Orts-Treffer lesen. Treffer ohne gültige Koordinaten fallen weg. */
export function parsePlaces(body: unknown): Place[] {
  const results = (body as { results?: unknown })?.results
  if (!Array.isArray(results)) return []
  const out: Place[] = []
  for (const r of results.slice(0, 5)) {
    const o = r as Record<string, unknown>
    const lat = num(o.latitude)
    const lon = num(o.longitude)
    const name = text(o.name)
    if (lat == null || lon == null || !name || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    out.push({ name, region: text(o.admin1), country: text(o.country), lat, lon })
  }
  return out
}

export interface RaceWeather {
  day: string
  tempMin: number | null
  tempMax: number | null
  windMax: number | null
  precipMm: number | null
  precipChance: number | null
}

/** Den Tageswert für `day` lesen. Fehlendes bleibt `null`, nie 0. */
export function parseForecast(body: unknown, day: string): RaceWeather | null {
  const daily = (body as { daily?: Record<string, unknown> })?.daily
  const days = daily?.time
  if (!daily || !Array.isArray(days)) return null
  const i = days.indexOf(day)
  if (i < 0) return null
  const at = (k: string): number | null => {
    const a = daily[k]
    return Array.isArray(a) ? num(a[i]) : null
  }
  const w: RaceWeather = {
    day,
    tempMin: at('temperature_2m_min'),
    tempMax: at('temperature_2m_max'),
    windMax: at('wind_speed_10m_max'),
    precipMm: at('precipitation_sum'),
    precipChance: at('precipitation_probability_max'),
  }
  return Object.values(w).slice(1).every((v) => v == null) ? null : w
}

/** Wind von Metern je Sekunde in Kilometer je Stunde — für die Anzeige. */
export const msToKmh = (ms: number): number => ms * 3.6
