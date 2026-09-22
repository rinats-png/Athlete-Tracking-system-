import type { StoredAthlete, StoredDecision, StoredDiaryEntry, StoredMeal, StoredWorkout } from '@/lib/store/localStore'

/**
 * Zeitreihen neben dem Dokument — die reine Logik, ohne Netz.
 *
 * Diese Datei kennt keinen Server. Sie sagt, WAS eine Zeile ist, WELCHE
 * Zeilen seit dem letzten Abgleich zu schreiben sind, und WIE fremde Zeilen
 * in einen Athleten zurueckfliessen. sync.ts traegt sie hin und her. So
 * laesst sich alles hier ohne Verbindung pruefen — und die Regeln stehen an
 * einer Stelle statt in zwei Abfragen.
 *
 * DIE VIER ARTEN und wo sie im Athleten liegen:
 *
 *   diary     athlete.diary      Tag = entry.day
 *   workout   athlete.workouts   Tag = workout.day
 *   decision  athlete.decisions  Tag = decidedOn
 *   meal      athlete.meals      Tag = meal.day
 *
 * JEDER EINTRAG TRAEGT SEIN EIGENES `updatedAt`. Das ist der Zeitstempel,
 * der zwischen zwei Geraeten entscheidet: der juengere Eintrag gewinnt. Das
 * ist bewusst einfacher als der Vergleich-und-Setze am Dokument — bei
 * Tagebuchtagen gibt es keinen sinnvollen «Konflikt», nur einen spaeteren
 * Stand. Wer am Abend auf dem Telefon Schlaf eintraegt und am Morgen am
 * Rechner das Gewicht, will beides sehen, nicht eine Rueckfrage.
 *
 * LOESCHEN: Ein Eintrag, der beim letzten Abgleich auf dem Server war und
 * jetzt lokal fehlt, wurde lokal geloescht — er bekommt einen Grabstein.
 * Dafuer braucht es keine lokale Loeschliste: der Vergleich mit dem
 * Serverstand seit dem letzten Abgleich sagt es.
 */

export type SeriesKind = 'diary' | 'workout' | 'decision' | 'meal'
export const SERIES_KINDS: SeriesKind[] = ['diary', 'workout', 'decision', 'meal']

export interface SeriesRow {
  athlete_id: string
  kind: SeriesKind
  entry_id: string
  day: string
  payload: Record<string, unknown>
  device_id?: string
  updated_at?: string
  deleted_at?: string | null
}

type SeriesEntry = StoredDiaryEntry | StoredWorkout | StoredDecision | StoredMeal

function dayOf(kind: SeriesKind, entry: SeriesEntry): string {
  return kind === 'decision' ? (entry as StoredDecision).decidedOn : (entry as StoredDiaryEntry).day
}

function listOf(athlete: StoredAthlete, kind: SeriesKind): SeriesEntry[] {
  switch (kind) {
    case 'diary':
      return athlete.diary
    case 'workout':
      return athlete.workouts
    case 'decision':
      return athlete.decisions
    case 'meal':
      return athlete.meals
  }
}

function withList(athlete: StoredAthlete, kind: SeriesKind, list: SeriesEntry[]): StoredAthlete {
  switch (kind) {
    case 'diary':
      return { ...athlete, diary: list as StoredDiaryEntry[] }
    case 'workout':
      return { ...athlete, workouts: list as StoredWorkout[] }
    case 'decision':
      return { ...athlete, decisions: list as StoredDecision[] }
    case 'meal':
      return { ...athlete, meals: list as StoredMeal[] }
  }
}

/**
 * Die Gesundheitsschicht (S5) aus einem Dokument entfernen.
 *
 * DIESE DATEN VERLASSEN DAS GERAET NICHT. Sie sind besondere Kategorien nach
 * Art. 9 DSGVO; eine Zweitschrift auf dem Server braucht Ende-zu-Ende-
 * Verschluesselung mit einem Schluessel, den der Nutzer haelt, und die ist
 * nicht gebaut (docs/rechtspruefung-art9-mdr.md §4). Bis dahin bleiben sie
 * lokal — und der Export bleibt die Sicherung, die dem Nutzer gehoert (§32).
 *
 * Das steht hier und nicht im Bildschirm, damit es KEINEN Weg gibt, sie
 * versehentlich mitzuschicken: jeder Schreibvorgang geht durch diese Stelle.
 */
export function stripHealth(athlete: StoredAthlete): StoredAthlete {
  return {
    ...athlete,
    health: { consents: [], labs: [], symptoms: [], cycle: [], selfImage: [], meds: [], trainingKcalPerDay: null },
    peakWeeks: [],
  }
}

/** Das Dokument OHNE Zeitreihen und OHNE Gesundheitsschicht — das, was in athlete_documents liegt. */
export function stripSeries(athlete: StoredAthlete): StoredAthlete {
  return stripHealth({ ...athlete, diary: [], workouts: [], decisions: [], meals: [] })
}

/** Alle Zeilen eines Athleten, so wie sie lokal liegen. */
export function seriesRows(athlete: StoredAthlete, deviceId = ''): SeriesRow[] {
  const rows: SeriesRow[] = []
  for (const kind of SERIES_KINDS) {
    for (const entry of listOf(athlete, kind)) {
      rows.push({ athlete_id: athlete.id, kind, entry_id: entry.id, day: dayOf(kind, entry), payload: entry as unknown as Record<string, unknown>, device_id: deviceId })
    }
  }
  return rows
}

/**
 * Welche Zeilen zu schreiben sind.
 *
 *   upserts     lokale Eintraege mit updatedAt NACH dem letzten Abgleich
 *               (oder alle, wenn es noch keinen gab)
 *   tombstones  Zeilen, die der Server VOR dem letzten Abgleich hatte und
 *               die lokal fehlen — also lokal geloescht wurden. Zeilen, die
 *               der Server NACH dem letzten Abgleich bekam und die lokal
 *               fehlen, sind neu von einem anderen Geraet: die kommen beim
 *               Holen herein, nicht auf den Friedhof.
 */
export function planSeriesPush(
  athlete: StoredAthlete,
  remote: SeriesRow[],
  lastSyncedAt: string | null,
  deviceId = '',
): { upserts: SeriesRow[]; tombstones: { kind: SeriesKind; entry_id: string }[] } {
  const local = seriesRows(athlete, deviceId)
  const localIds = new Set(local.map((r) => `${r.kind}:${r.entry_id}`))
  const upserts = local.filter((r) => {
    const updatedAt = (r.payload as { updatedAt?: string }).updatedAt
    return lastSyncedAt == null || typeof updatedAt !== 'string' || updatedAt > lastSyncedAt
  })
  const tombstones = remote
    .filter((r) => r.athlete_id === athlete.id && !r.deleted_at && !localIds.has(`${r.kind}:${r.entry_id}`))
    .filter((r) => lastSyncedAt != null && typeof r.updated_at === 'string' && r.updated_at <= lastSyncedAt)
    .map((r) => ({ kind: r.kind, entry_id: r.entry_id }))
  return { upserts, tombstones }
}

/**
 * Fremde Zeilen in einen Athleten einarbeiten.
 *
 *   Grabstein            → der Eintrag verschwindet lokal
 *   unbekannter Eintrag  → kommt dazu
 *   bekannter Eintrag    → der juengere gewinnt (updatedAt der Nutzlast);
 *                          bei Gleichstand bleibt der lokale
 *
 * Gibt den Athleten unveraendert (dieselbe Referenz) zurueck, wenn nichts
 * zu tun war — damit kein Schreibvorgang ohne Aenderung entsteht.
 */
export function mergeSeries(athlete: StoredAthlete, rows: SeriesRow[]): { athlete: StoredAthlete; changed: number } {
  let next = athlete
  let changed = 0
  for (const kind of SERIES_KINDS) {
    const incoming = rows.filter((r) => r.athlete_id === athlete.id && r.kind === kind)
    if (incoming.length === 0) continue
    let list = listOf(next, kind)
    let touched = false
    for (const row of incoming) {
      const index = list.findIndex((e) => e.id === row.entry_id)
      if (row.deleted_at) {
        if (index >= 0) {
          list = list.filter((e) => e.id !== row.entry_id)
          touched = true
          changed += 1
        }
        continue
      }
      const entry = row.payload as unknown as SeriesEntry
      if (!entry || typeof entry !== 'object' || (entry as { id?: string }).id !== row.entry_id) continue
      if (index < 0) {
        list = [...list, entry]
        touched = true
        changed += 1
        continue
      }
      const mine = (list[index] as { updatedAt?: string }).updatedAt ?? ''
      const theirs = (entry as { updatedAt?: string }).updatedAt ?? ''
      if (theirs > mine) {
        list = list.map((e, i) => (i === index ? entry : e))
        touched = true
        changed += 1
      }
    }
    if (touched) next = withList(next, kind, list)
  }
  return { athlete: next, changed }
}

/** Ob ein Dokument vom Server noch Zeitreihen traegt — aus der Zeit vor dieser Trennung. */
export function carriesSeries(document: unknown): boolean {
  const d = document as Partial<StoredAthlete> | null
  if (!d || typeof d !== 'object') return false
  return SERIES_KINDS.some((kind) => {
    const key = kind === 'diary' ? 'diary' : kind === 'workout' ? 'workouts' : kind === 'decision' ? 'decisions' : 'meals'
    const list = (d as Record<string, unknown>)[key]
    return Array.isArray(list) && list.length > 0
  })
}
