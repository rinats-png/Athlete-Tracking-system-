import type { CheckIn } from '@/domain/checkin'

/**
 * Die Freigabe der Check-ins an den Trainer ist hinter einem Bau-Schalter,
 * bis der Datenschutztext dazu freigegeben ist (docs/checkin-datenschutz.md).
 * Der Check-in selbst läuft immer — nur das Teilen ist aus.
 */
export const checkinShareEnabled = (): boolean => import.meta.env?.VITE_CHECKIN_SHARE === 'on'

/** Wie weit zurück geteilt wird. Mehr braucht der Trainer für die 28-Tage-Baseline nicht. */
export const SHARE_DAYS = 35

export interface SharedRow {
  day: string
  energy: number | null
  soreness: number | null
  stress: number | null
}

/** Die Zeilen, die auf den Server gehen: nur die drei Werte und der Tag, nie ein Name oder eine Notiz. */
export function sharedRows(checkins: CheckIn[], today: Date = new Date()): SharedRow[] {
  const from = new Date(today.getTime() - SHARE_DAYS * 86_400_000).toISOString().slice(0, 10)
  return checkins
    .filter((c) => c.day >= from)
    .map((c) => ({ day: c.day, energy: c.energy, soreness: c.soreness, stress: c.stress }))
}
