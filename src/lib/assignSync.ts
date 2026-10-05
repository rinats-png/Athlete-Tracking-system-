import { reportCompletion } from '@/lib/supabase/planAssign'
import type { StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Erledigte Einheiten eines zugewiesenen Blocks an den Server melden.
 *
 * Idempotent: der Server schreibt je (Zuweisung, Einheit, Tag) eine Zeile und
 * überschreibt bei Wiederholung; er schreibt nur, so weit der Athlet «erledigt»
 * freigegeben hat, und nullt Dauer, RPE und Puls ohne ihre eigene Freigabe.
 * Messen und Erledigen laufen also ohne Netz; was nicht ankam, geht beim
 * nächsten Öffnen nach.
 */
export async function syncAssignedCompletions(block: StoredTrainingBlock): Promise<void> {
  if (!block.assignmentId) return
  for (const c of block.completions) {
    await reportCompletion(block.assignmentId, { key: c.sessionId, day: c.day, durationMin: c.durationMin, rpe: c.rpe, avgHr: c.avgHr, maxHr: c.maxHr })
  }
}
