import type { CoachToday, PriorityAthlete } from '@/domain/coachToday'

/**
 * Coach Copilot (Produktdoktrin §31): eine Zusammenfassung der Woche und je
 * markiertem Athleten ein Nachrichtenentwurf. Deterministisch, kein Netz.
 *
 * Die Entwürfe sprechen nur über die DATENLAGE (wann zuletzt gemessen, was
 * fehlt) — kein Training, keine Ursache, kein Urteil über die Person. KYDON
 * sendet nichts: der Trainer bearbeitet und verschickt selbst.
 */

export interface SummaryFact {
  key: 'status' | 'priority' | 'testDay'
  params: Record<string, string | number>
}

export interface DraftSpec {
  athleteId: string
  /** Name des Athleten; leer, wenn keiner eingetragen ist. */
  name: string
  /** Schlüssel der Vorlage, passend zum Grund der Markierung. */
  template: PriorityAthlete['reason']
  params: Record<string, string | number>
}

export interface CoachCopilot {
  summary: SummaryFact[]
  drafts: DraftSpec[]
}

export function coachCopilot(today: CoachToday): CoachCopilot {
  const summary: SummaryFact[] = [
    { key: 'status', params: { current: today.status.current, review: today.status.review, overdue: today.status.overdue, total: today.status.total } },
    { key: 'priority', params: { count: today.priority.length } },
  ]
  if (today.testDay) summary.push({ key: 'testDay', params: { title: today.testDay.title, on: today.testDay.plannedOn, athletes: today.testDay.athletes } })
  const drafts = today.priority.map<DraftSpec>((p) => ({
    athleteId: p.id,
    name: p.name,
    template: p.reason,
    params: { name: p.name, days: p.daysOverdue ?? 0 },
  }))
  return { summary, drafts }
}
