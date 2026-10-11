import { CURRENT_SCHEMA_VERSION, type QuarantineEntry } from './schema'

/** Abgewiesene Rohdaten (siehe `keepInQuarantine`). */
const QUARANTINE_KEY = 'kydon.quarantine.v1'
/** Mehr als das hält die Quarantäne nicht — sie darf den Bestand nicht verdrängen. */
const QUARANTINE_MAX_CHARS = 1_500_000

export interface StoredQuarantineEntry extends QuarantineEntry {
  /** Wann der Eintrag abgewiesen wurde. */
  savedAt: string
  /** Die Schemafassung, an der er gescheitert ist. */
  schemaVersion: number
}

/**
 * Abgewiesene Rohdaten auf dem Gerät aufheben.
 *
 * Ohne das wäre ein abgewiesener Eintrag beim nächsten Speichern endgültig
 * weg — und abgewiesen wird nicht nur Kaputtes, sondern auch, was an einem
 * Fehler im Schema scheitert. Die Quarantäne hält es fest, bis es nach einer
 * Korrektur wieder eingelesen oder vom Nutzer als Datei gesichert wird.
 *
 * Doppelte (gleiche Art, Kennung und Rohwert) werden nicht erneut abgelegt:
 * solange nichts gespeichert wurde, scheitert derselbe Eintrag bei jedem
 * Start. Passt die Quarantäne nicht mehr in den Speicher, bleibt sie, wie sie
 * war — lieber die älteren Einträge behalten als alle verlieren.
 */
export function keepInQuarantine(entries: QuarantineEntry[], now = new Date()): number {
  const existing = readQuarantine()
  const seen = new Set(existing.map((e) => `${e.kind}|${e.id}|${JSON.stringify(e.raw)}`))
  const added: StoredQuarantineEntry[] = []
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.id}|${JSON.stringify(entry.raw)}`
    if (seen.has(key)) continue
    seen.add(key)
    added.push({ ...entry, savedAt: now.toISOString(), schemaVersion: CURRENT_SCHEMA_VERSION })
  }
  if (added.length === 0) return 0
  const text = JSON.stringify([...existing, ...added])
  if (text.length > QUARANTINE_MAX_CHARS) return 0
  try {
    localStorage.setItem(QUARANTINE_KEY, text)
    return added.length
  } catch {
    return 0
  }
}

export function readQuarantine(): StoredQuarantineEntry[] {
  try {
    const raw = localStorage.getItem(QUARANTINE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as StoredQuarantineEntry[]) : []
  } catch {
    return []
  }
}

export function clearQuarantine(): void {
  try {
    localStorage.removeItem(QUARANTINE_KEY)
  } catch {
    /* Der Speicher war ohnehin nicht verfügbar. */
  }
}

/** Die Quarantäne als Datei, lesbar ohne die App. */
export function exportQuarantine(appVersion = __APP_VERSION__): string {
  return JSON.stringify(
    {
      format: 'KYDON_QUARANTINE',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appVersion,
      createdAt: new Date().toISOString(),
      entries: readQuarantine(),
    },
    null,
    2,
  )
}
