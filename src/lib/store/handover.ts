import { CURRENT_SCHEMA_VERSION, newId } from '@/lib/store/localStore'
import type { StoredAthlete, StoredData } from '@/lib/store/localStore'

/**
 * Übergabe eines einzelnen Athleten.
 *
 * DER GRUND, WARUM ES DAS GIBT: wechselt jemand den Verein oder den Trainer,
 * gehört seine Historie ihm und nicht dem Gerät, auf dem sie entstanden ist
 * (§32). Ohne diesen Weg beginnt er beim neuen Trainer bei null — und drei
 * Jahre Messungen sind verloren, obwohl die Datei danebenliegt.
 *
 * Bewusst ein EIGENES Format neben dem vollständigen Export: der
 * vollständige Export ersetzt beim Einlesen den gesamten Bestand. Genau das
 * darf eine Übergabe nicht tun — der neue Trainer hat schon Athleten, und
 * die dürfen dabei nicht verschwinden.
 */

export const HANDOVER_FORMAT = 'BASELINE_ATHLETE_HANDOVER'

export interface HandoverEnvelope {
  format: typeof HANDOVER_FORMAT
  schemaVersion: number
  createdAt: string
  athlete: StoredAthlete
}

export function exportAthlete(store: StoredData, athleteId: string): string | null {
  const athlete = store.athletes.find((a) => a.id === athleteId)
  if (!athlete) return null
  const envelope: HandoverEnvelope = {
    format: HANDOVER_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    // Die Marke des abgebenden Geräts bleibt draussen: sie gehört dem
    // Trainer, nicht dem Athleten.
    athlete,
  }
  return JSON.stringify(envelope, null, 2)
}

export type HandoverError =
  | 'invalid_json'
  | 'unknown_format'
  | 'newer_version'
  | 'no_athlete'
  | null

export interface HandoverOutcome {
  ok: boolean
  /** Der Bestand mit dem ergänzten Athleten. Null bei einem Fehler. */
  data: StoredData | null
  /** Kennung, unter der der Athlet aufgenommen wurde. */
  athleteId: string | null
  /** Wie viele Messwerte mitgekommen sind. */
  results: number
  error: HandoverError
}

/**
 * Nimmt einen übergebenen Athleten auf.
 *
 * Er wird ERGÄNZT, nie ersetzt: trüge die Datei zufällig dieselbe Kennung
 * wie ein vorhandener Athlet, überschriebe ein Ersetzen dessen gesamte
 * Historie. Deshalb bekommt der Aufgenommene in diesem Fall eine neue
 * Kennung — dieselbe Person zweimal zu führen ist ärgerlich, ihre Daten zu
 * verlieren ist nicht wiedergutzumachen (§89).
 */
export function importAthlete(json: string, store: StoredData): HandoverOutcome {
  const fail = (error: HandoverError): HandoverOutcome => ({
    ok: false,
    data: null,
    athleteId: null,
    results: 0,
    error,
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return fail('invalid_json')
  }

  const envelope = parsed as Partial<HandoverEnvelope>
  if (!envelope || envelope.format !== HANDOVER_FORMAT) return fail('unknown_format')
  if (typeof envelope.schemaVersion !== 'number') return fail('unknown_format')
  if (envelope.schemaVersion > CURRENT_SCHEMA_VERSION) return fail('newer_version')
  if (!envelope.athlete || typeof envelope.athlete !== 'object') return fail('no_athlete')

  const incoming = envelope.athlete
  const taken = new Set(store.athletes.map((a) => a.id))
  const athlete: StoredAthlete = {
    ...incoming,
    id: taken.has(incoming.id) ? newId() : incoming.id,
    // Ein übergebener Athlet ist nicht archiviert — sonst käme er an und
    // wäre unsichtbar.
    archived: false,
  }

  return {
    ok: true,
    data: { ...store, athletes: [...store.athletes, athlete] },
    athleteId: athlete.id,
    results: athlete.results?.length ?? 0,
    error: null,
  }
}
