import type { Fact } from '@/domain/askKydon'
import { mondayBrief, type BriefInput, type MondayBrief } from '@/domain/mondayBrief'

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
  association: ['checkins', 'load', 'loadNoBaseline', 'plan', 'countdown'],
}

export interface WeeklyReport extends MondayBrief {
  recipient: Recipient
}

export function weeklyReport(input: BriefInput, recipient: Recipient, asOf: Date = new Date()): WeeklyReport {
  const brief = mondayBrief(input, asOf)
  const facts: Fact[] = brief.facts.filter((f) => !HIDDEN[recipient].includes(f.key))
  return { ...brief, facts, recipient }
}
