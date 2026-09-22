import type { StoredAthlete, StoredCycleEntry, StoredLabEntry, StoredMedEntry, StoredPeakWeek, StoredPhotoEntry, StoredSelfImageEntry, StoredSymptomEntry } from '@/lib/store/localStore'

/**
 * Der verschlüsselte Abgleich der Gesundheitsschicht — die reine Logik.
 *
 * Diese Datei kennt weder Netz noch Schlüssel. Sie sagt, WAS ein Datensatz
 * ist, WELCHE seit dem letzten Abgleich zu schreiben sind und WIE fremde
 * Datensätze zurückfliessen. Ver- und Entschlüsselung macht crypto.ts,
 * das Hin und Her macht supabase/healthSync.ts.
 *
 * SIEBEN ARTEN, eine Kennung je Datensatz:
 *
 *   lab:<id>       Laborbefund        symptom:<id>   Symptomtag
 *   cycle:<id>     Zyklustag          self:<id>      Körperbild und Libido
 *   med:<id>       Supplement         peak:<id>      Peak Week
 *   photo:<id>     Vergleichsfoto
 *   meta           Einwilligungen und Einstellungen
 *
 * Die Art steht IM Datensatz und damit im Chiffrat — auf dem Server ist die
 * Kennung eine undurchsichtige Zeichenkette. Wer die Tabelle sieht, sieht
 * nicht, ob jemand Zyklusdaten führt. Das ist der Unterschied zu
 * `athlete_series`, wo `kind` in einer eigenen Spalte steht.
 */

export type HealthKind = 'lab' | 'symptom' | 'cycle' | 'self' | 'med' | 'peak' | 'photo' | 'meta'

export interface HealthRecord {
  /** `<art>:<id>`, bei meta nur `meta`. Nur lokal — und im Chiffrat. */
  entryId: string
  /**
   * Die stumme Kennung, die als entry_id auf den Server geht: der HMAC von
   * {@link entryId}. Sie wird erst gebildet, wenn ein Schlüssel da ist,
   * deshalb ist sie hier optional; ohne sie gilt {@link entryId}.
   */
  remoteId?: string
  kind: HealthKind
  /** Für die Auswahl beim Schreiben. Steht auch in `data`. */
  updatedAt: string | null
  data: unknown
}

const ID = (kind: HealthKind, id: string) => `${kind}:${id}`

/** Alles, was dieser Athlet an Gesundheitsdaten trägt — als Datensätze. */
export function healthRecords(athlete: StoredAthlete): HealthRecord[] {
  const h = athlete.health
  const out: HealthRecord[] = [
    {
      entryId: 'meta',
      kind: 'meta',
      updatedAt: h.updatedAt,
      data: { consents: h.consents, trainingKcalPerDay: h.trainingKcalPerDay },
    },
  ]
  const add = (kind: HealthKind, list: { id: string; updatedAt: string }[]) => {
    for (const entry of list) out.push({ entryId: ID(kind, entry.id), kind, updatedAt: entry.updatedAt, data: entry })
  }
  add('lab', h.labs)
  add('symptom', h.symptoms)
  add('cycle', h.cycle)
  add('self', h.selfImage)
  add('med', h.meds)
  add('photo', h.photos)
  add('peak', athlete.peakWeeks)
  return out
}

export interface RemoteHealthRow {
  athlete_id: string
  entry_id: string
  payload: string
  device_id?: string
  updated_at?: string
  deleted_at?: string | null
}

/**
 * Was zu schreiben ist.
 *
 *   upserts     Datensätze, die sich seit dem letzten Abgleich geändert
 *               haben — oder alle, wenn es noch keinen gab.
 *   tombstones  Kennungen, die der Server VOR dem letzten Abgleich hatte und
 *               die lokal fehlen. Was er NACH dem letzten Abgleich bekam und
 *               lokal fehlt, ist neu von einem anderen Gerät.
 *
 * Der Grabstein ist hier besonders wichtig: Ein Widerruf der Einwilligung
 * löscht die Kategorie lokal, und genau dieser Vergleich trägt die Löschung
 * zum Server und von dort auf jedes andere Gerät.
 */
export function planHealthPush(
  records: HealthRecord[],
  remote: RemoteHealthRow[],
  athleteId: string,
  lastSyncedAt: string | null,
): { upserts: HealthRecord[]; tombstones: string[] } {
  const localIds = new Set(records.map((r) => r.remoteId ?? r.entryId))
  const upserts = records.filter((r) => lastSyncedAt == null || r.updatedAt == null || r.updatedAt > lastSyncedAt)
  const tombstones = remote
    .filter((r) => r.athlete_id === athleteId && !r.deleted_at && !localIds.has(r.entry_id))
    .filter((r) => lastSyncedAt != null && typeof r.updated_at === 'string' && r.updated_at <= lastSyncedAt)
    .map((r) => r.entry_id)
  return { upserts, tombstones }
}

/** Ein entschlüsselter Datensatz vom Server, mitsamt seiner Zeile. */
export interface IncomingHealth {
  entryId: string
  deleted: boolean
  data: unknown
}

function parts(entryId: string): { kind: HealthKind; id: string } | null {
  if (entryId === 'meta') return { kind: 'meta', id: '' }
  const i = entryId.indexOf(':')
  if (i <= 0) return null
  const kind = entryId.slice(0, i) as HealthKind
  if (!['lab', 'symptom', 'cycle', 'self', 'med', 'peak', 'photo'].includes(kind)) return null
  return { kind, id: entryId.slice(i + 1) }
}

type ListKey = 'labs' | 'symptoms' | 'cycle' | 'selfImage' | 'meds' | 'photos'
const LIST_OF: Record<Exclude<HealthKind, 'meta' | 'peak'>, ListKey> = {
  lab: 'labs',
  symptom: 'symptoms',
  cycle: 'cycle',
  self: 'selfImage',
  med: 'meds',
  photo: 'photos',
}

type AnyEntry = StoredLabEntry | StoredSymptomEntry | StoredCycleEntry | StoredSelfImageEntry | StoredMedEntry | StoredPhotoEntry

/**
 * Fremde Datensätze in einen Athleten einarbeiten.
 *
 *   Grabstein            → der Eintrag verschwindet lokal
 *   unbekannter Eintrag  → kommt dazu
 *   bekannter Eintrag    → der jüngere gewinnt; bei Gleichstand der lokale
 *
 * Gibt denselben Athleten zurück, wenn nichts zu tun war.
 */
export function mergeHealth(athlete: StoredAthlete, incoming: IncomingHealth[]): { athlete: StoredAthlete; changed: number } {
  let health = athlete.health
  let peaks = athlete.peakWeeks
  let changed = 0

  for (const row of incoming) {
    const p = parts(row.entryId)
    if (!p) continue

    if (p.kind === 'meta') {
      if (row.deleted) continue
      const meta = row.data as { consents?: unknown; trainingKcalPerDay?: unknown; updatedAt?: unknown } | null
      if (!meta || typeof meta !== 'object' || !Array.isArray(meta.consents)) continue
      // Der Zeitstempel des fremden Standes steckt im Datensatz selbst nicht
      // — er kommt aus der Zeile. Deshalb gewinnt hier schlicht das, was der
      // Server seit dem letzten Abgleich neu hat: aeltere Staende werden gar
      // nicht erst geholt.
      health = {
        ...health,
        consents: meta.consents as typeof health.consents,
        trainingKcalPerDay: typeof meta.trainingKcalPerDay === 'number' ? meta.trainingKcalPerDay : null,
      }
      changed += 1
      continue
    }

    if (p.kind === 'peak') {
      const index = peaks.findIndex((w) => w.id === p.id)
      if (row.deleted) {
        if (index >= 0) {
          peaks = peaks.filter((w) => w.id !== p.id)
          changed += 1
        }
        continue
      }
      const week = row.data as StoredPeakWeek
      if (!week || typeof week !== 'object' || week.id !== p.id) continue
      if (index < 0) {
        peaks = [...peaks, week]
        changed += 1
      } else if ((week.updatedAt ?? '') > (peaks[index].updatedAt ?? '')) {
        peaks = peaks.map((w, i) => (i === index ? week : w))
        changed += 1
      }
      continue
    }

    const listKey = LIST_OF[p.kind]
    const list = health[listKey] as AnyEntry[]
    const index = list.findIndex((e) => e.id === p.id)
    if (row.deleted) {
      if (index >= 0) {
        health = { ...health, [listKey]: list.filter((e) => e.id !== p.id) }
        changed += 1
      }
      continue
    }
    const entry = row.data as AnyEntry
    if (!entry || typeof entry !== 'object' || entry.id !== p.id) continue
    if (index < 0) {
      health = { ...health, [listKey]: [...list, entry] }
      changed += 1
    } else if ((entry.updatedAt ?? '') > (list[index].updatedAt ?? '')) {
      health = { ...health, [listKey]: list.map((e, i) => (i === index ? entry : e)) }
      changed += 1
    }
  }

  if (changed === 0) return { athlete, changed }
  return { athlete: { ...athlete, health, peakWeeks: peaks }, changed }
}

/** Ob dieser Athlet überhaupt etwas zu verschlüsseln hat. */
export function hasHealthData(athlete: StoredAthlete): boolean {
  const h = athlete.health
  return h.labs.length + h.symptoms.length + h.cycle.length + h.selfImage.length + h.meds.length + athlete.peakWeeks.length > 0
}
