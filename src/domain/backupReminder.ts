import type { StoredData } from '@/lib/store/localStore'

/**
 * Wann an eine Sicherung erinnert wird.
 *
 * Die Daten liegen auf einem Gerät. Ein Gerät geht verloren, ein Browser räumt
 * auf, jemand wechselt das Telefon — und eine Messreihe über Jahre ist weg.
 * Der Export ist die Sicherung, die dem Nutzer selbst gehört und nie hinter
 * einer Bezahlschranke steht (§32). Damit er stattfindet, muss die App daran
 * erinnern, aber nicht drängeln.
 *
 * Die Regel ist deshalb an das gebunden, was verloren gehen KANN, nicht an den
 * Kalender: erinnert wird, wenn seit dem letzten Export genug neue Messungen
 * dazugekommen sind oder genug Zeit vergangen ist. Wer nichts gemessen hat,
 * bekommt keine Erinnerung — es gäbe nichts zu sichern.
 */

/** Ab so vielen Ergebnissen ohne Sicherung lohnt der Hinweis. */
export const RESULTS_UNTIL_REMINDER = 10
/** Und spätestens nach so vielen Tagen, sofern überhaupt etwas gemessen wurde. */
export const DAYS_UNTIL_REMINDER = 90

export type BackupReason = 'never_exported' | 'many_new_results' | 'long_ago'

export interface BackupReminder {
  due: boolean
  reason: BackupReason | null
  /** Ergebnisse, die nach dem letzten Export entstanden sind. */
  unsavedResults: number
  /** Tage seit dem letzten Export, `null` wenn noch nie exportiert wurde. */
  daysSinceExport: number | null
}

const DAY = 24 * 60 * 60 * 1000

export function backupReminder(store: StoredData, now = new Date()): BackupReminder {
  const results = store.athletes.flatMap((a) => a.results)
  const lastExport = store.lastExportAt ? new Date(store.lastExportAt) : null
  const validExport = lastExport && !Number.isNaN(lastExport.getTime()) ? lastExport : null

  const unsaved = validExport
    ? results.filter((r) => new Date(r.performedAt).getTime() > validExport.getTime()).length
    : results.length
  const days = validExport ? Math.floor((now.getTime() - validExport.getTime()) / DAY) : null

  const empty = { due: false, reason: null, unsavedResults: unsaved, daysSinceExport: days } as const
  // Ohne Messungen gibt es nichts zu sichern.
  if (results.length === 0) return { ...empty }

  if (validExport == null) {
    return unsaved >= RESULTS_UNTIL_REMINDER
      ? { due: true, reason: 'never_exported', unsavedResults: unsaved, daysSinceExport: null }
      : { ...empty }
  }
  if (unsaved >= RESULTS_UNTIL_REMINDER) {
    return { due: true, reason: 'many_new_results', unsavedResults: unsaved, daysSinceExport: days }
  }
  if ((days ?? 0) >= DAYS_UNTIL_REMINDER && unsaved > 0) {
    return { due: true, reason: 'long_ago', unsavedResults: unsaved, daysSinceExport: days }
  }
  return { ...empty }
}
