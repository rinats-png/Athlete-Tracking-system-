/**
 * Abgleichsstand auf dem Gerät (`kydon.sync.v1`). Ohne Netz und ohne
 * Supabase-Client, damit der Bestand ihn im Startpaket nutzen kann.
 */

const STATE_KEY = 'kydon.sync.v1'

export interface SyncState {
  /** Zeitstempel des Servers je Athlet (Dokument), wie zuletzt gesehen. */
  seen: Record<string, string>
  lastSyncedAt: string | null
  /** Bis wann Zeitreihen-Zeilen zuletzt geholt UND geschrieben wurden (Serverzeit). */
  seriesSyncedAt: string | null
  /** Athleten, deren Serverstand fremd ist. Solange gesetzt: Dokument nicht schreiben. */
  conflicts: string[]
  /** Gegen welchen Bestand zuletzt abgeglichen wurde (owner_id). null = noch nie. */
  pool: string | null
  /**
   * Lokal gelöschte Athleten, deren Grabstein noch nicht auf dem Server steht
   * (Kennung → Zeitpunkt). Bis dahin darf der Abgleich sie nicht zurückholen.
   */
  deleted: Record<string, string>
}

export const EMPTY: SyncState = { seen: {}, lastSyncedAt: null, seriesSyncedAt: null, conflicts: [], pool: null, deleted: {} }

export function readSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<SyncState>
    return {
      seen: typeof parsed.seen === 'object' && parsed.seen ? (parsed.seen as Record<string, string>) : {},
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      seriesSyncedAt: typeof parsed.seriesSyncedAt === 'string' ? parsed.seriesSyncedAt : null,
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts.filter((c) => typeof c === 'string') : [],
      pool: typeof parsed.pool === 'string' ? parsed.pool : null,
      deleted:
        typeof parsed.deleted === 'object' && parsed.deleted
          ? Object.fromEntries(Object.entries(parsed.deleted).filter(([, v]) => typeof v === 'string'))
          : {},
    }
  } catch {
    return EMPTY
  }
}

export function writeSyncState(state: SyncState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    /* Ohne Speicher gilt der Stand für diese Sitzung. */
  }
}

/**
 * Einen lokal gelöschten Athleten für den nächsten Abgleich vormerken. Ohne
 * diese Marke hielte der Abgleich das Serverdokument für «auf diesem Gerät
 * noch nicht vorhanden» und holte den Athleten zurück.
 */
export function markAthleteDeleted(athleteId: string, at = new Date().toISOString()): void {
  const state = readSyncState()
  if (state.pool == null && Object.keys(state.seen).length === 0) return // nie abgeglichen: nichts auf dem Server
  writeSyncState({ ...state, deleted: { ...state.deleted, [athleteId]: at } })
}

export function clearSyncState(): void {
  try {
    localStorage.removeItem(STATE_KEY)
  } catch {
    /* Nichts zu räumen. */
  }
}
