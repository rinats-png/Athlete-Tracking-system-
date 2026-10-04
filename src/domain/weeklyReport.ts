import type { Fact } from '@/domain/askKydon'
import { mondayBrief, type BriefInput, type MondayBrief } from '@/domain/mondayBrief'
import { blockWeek, weekChecks, shownBlock } from '@/domain/trainingBlock'
import type { StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Wochenbericht des Trainers (Baustein B2): dieselben Fakten wie der
 * Montagsbrief, für Athlet, Eltern oder Verband. KYDON sendet nichts; der
 * Trainer prüft, ergänzt einen Satz und gibt den Bericht selbst weiter.
 *
 * DATENSPARSAMKEIT je Empfänger: Check-ins sind Selbsteinschätzungen zu
 * Muskelkater und Stress und gehen nur an den Athleten selbst. Belastung und
 * Wochenziel kommen aus dem Tagebuch und gehen nicht an den Verband. Der
 * Verband sieht Datenlage, Befund und nächste Messung.
 */

export type Recipient = 'athlete' | 'parents' | 'association'
export const RECIPIENTS: Recipient[] = ['athlete', 'parents', 'association']

const HIDDEN: Record<Recipient, string[]> = {
  athlete: [],
  parents: ['checkins'],
  // Training und Last gehen nicht an den Verband; der Block auch nicht.
  association: ['checkins', 'load', 'loadNoBaseline', 'plan', 'countdown', 'block'],
}

export interface WeeklyReport extends MondayBrief {
  recipient: Recipient
}

export function weeklyReport(input: BriefInput & { trainingBlocks?: StoredTrainingBlock[] }, recipient: Recipient, asOf: Date = new Date()): WeeklyReport {
  const brief = mondayBrief(input, asOf)
  const facts: Fact[] = [...brief.facts]
  // Laufender Trainingsblock: Woche und Zählung der abgeschlossenen Einheiten, ohne Wertung.
  const block = shownBlock(input.trainingBlocks ?? [])
  const today = asOf.toISOString().slice(0, 10)
  if (block && block.status === 'active') {
    const week = blockWeek(block, today)
    if (typeof week === 'number') {
      const current = weekChecks(block, today).find((c) => c.week === week)
      if (current) {
        const at = facts.findIndex((f) => f.key.startsWith('next'))
        facts.splice(at < 0 ? facts.length : at, 0, { key: 'block', params: { week, weeks: block.weeks, done: current.done, planned: current.planned } })
      }
    }
  }
  return { ...brief, facts: facts.filter((f) => !HIDDEN[recipient].includes(f.key)), recipient }
}
