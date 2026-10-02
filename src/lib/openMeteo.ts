/**
 * Open-Meteo — Wetter für den Renntag, nur auf ausdrücklichen Tipp.
 *
 * WAS GEHT RAUS: beim Ortssuchen der getippte Ortsname; beim Wetterabruf die
 * Koordinaten des gewählten Orts und der Renntag. Nichts sonst: keine
 * Läufe, keine Pulswerte, kein Name, kein Gerätestandort. Aufgerufen wird
 * nur auf einen Tipp des Nutzers, der vorher liest, was gesendet wird.
 *
 * LOKAL ZUERST: ohne Netz sagt die Funktion das, und die Auswertung bleibt
 * benutzbar. Kein Schlüssel, kein Geheimnis im Client (Regel 1).
 *
 * QUELLE UND LIZENZ: Wetterdaten von Open-Meteo.com, CC BY 4.0, für
 * nichtkommerzielle Nutzung frei. Für kommerziellen Betrieb ist ein Tarif
 * des Dienstes nötig — vor der Freigabe zu klären (docs/laeufe.md).
 */

import { parseForecast, parsePlaces, type Place, type RaceWeather } from '@/domain/raceWeather'

export const GEOCODING_ORIGIN = 'https://geocoding-api.open-meteo.com'
export const FORECAST_ORIGIN = 'https://api.open-meteo.com'
export const METEO_ATTRIBUTION = 'Open-Meteo.com · CC BY 4.0'

/** Die Funktion ist hinter einem Bau-Schalter, bis der Datenschutztext freigegeben ist. */
export const raceWeatherEnabled = (): boolean => import.meta.env?.VITE_RACE_WEATHER === 'on'

export type MeteoOutcome<T> = { ok: true; value: T } | { ok: false; reason: 'offline' | 'error' | 'nothing' }

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export async function findPlaces(query: string, language: string, signal?: AbortSignal): Promise<MeteoOutcome<Place[]>> {
  const q = query.trim().slice(0, 80)
  if (q.length < 2) return { ok: false, reason: 'nothing' }
  if (offline()) return { ok: false, reason: 'offline' }
  try {
    const res = await fetch(`${GEOCODING_ORIGIN}/v1/search?name=${encodeURIComponent(q)}&count=5&format=json&language=${encodeURIComponent(language)}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, reason: 'error' }
    const places = parsePlaces(await res.json())
    return places.length ? { ok: true, value: places } : { ok: false, reason: 'nothing' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function raceDayWeather(place: Place, day: string, signal?: AbortSignal): Promise<MeteoOutcome<RaceWeather>> {
  if (offline()) return { ok: false, reason: 'offline' }
  try {
    const q = `latitude=${place.lat.toFixed(3)}&longitude=${place.lon.toFixed(3)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=ms&timezone=auto&start_date=${day}&end_date=${day}`
    const res = await fetch(`${FORECAST_ORIGIN}/v1/forecast?${q}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, reason: 'error' }
    const w = parseForecast(await res.json(), day)
    return w ? { ok: true, value: w } : { ok: false, reason: 'nothing' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
