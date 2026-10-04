import type { Fact } from '@/domain/askKydon'
import { dataConfidence, athleteToday } from '@/domain/performanceView'
import { weekReview } from '@/domain/weekReview'
import { daysTo, hasTarget, weeksAgainstTarget } from '@/domain/weeklyPlan'
import type { ReminderSettings } from '@/domain/reminders'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Der Montagsbrief (Produktdoktrin §19, §31): eine Seite aus festen Fakten —
 * Datenlage, der eine Befund, Belastung der Woche, nächster Schritt.
 *
 * «Nächster Schritt» heißt hier: welche MESSUNG als Nächstes sinnvoll ist
 * (überfällig, sonst fehlend). Kein Trainingsrat. Der Brief besteht aus
 * Fakten im Format von `askKydon`; ein Sprachmodell dürfte sie später nur
 * umformulieren (`answerGuard`), die feste Vorlage ist der Rückfall.
 */

export interface BriefInput {
  athlete: Pick<StoredAthlete, 'profile' | 'results' | 'workouts' | 'diary'>
  reminders: ReminderSettings
}

export interface MondayBrief {
  from: string
  to: string
  facts: Fact[]
}

const fact = (key: string, params: Fact['params'] = {}): Fact => ({ key, params })

export function mondayBrief(input: BriefInput, asOf: Date = new Date()): MondayBrief {
  const { athlete, reminders } = input
  const review = weekReview({ diary: athlete.diary, results: athlete.results, reminders }, asOf)
  const conf = dataConfidence(athlete.results, asOf)
  const facts: Fact[] = [fact('form', { level: conf.level, score: Math.round(conf.score) })]

  if (review.win) {
    facts.push(fact('finding', { slug: review.win.slug, percent: review.win.report.changePercent ?? 0, detectable: review.win.report.detectablePercent ?? 0 }))
  } else {
    facts.push(fact('noFinding', { results: review.results }))
  }

  facts.push(
    review.load.previousWeeklyMean != null
      ? fact('load', { week: Math.round(review.load.week), mean: review.load.previousWeeklyMean })
      : fact('loadNoBaseline', { week: Math.round(review.load.week) }),
  )
  facts.push(fact('checkins', { days: review.checkinDays }))

  const target = athlete.profile.weeklyTarget
  if (hasTarget(target)) {
    const w = weeksAgainstTarget(athlete.diary, target, asOf, 1)[0]
    facts.push(fact('plan', { sessions: w.sessions, sessionsTarget: target.sessions ?? -1, load: w.loadAU, loadTarget: target.loadAU ?? -1 }))
  }
  const comp = athlete.profile.competition
  if (comp && daysTo(comp.on, asOf) >= 0) facts.push(fact('countdown', { days: daysTo(comp.on, asOf), name: comp.name }))

  const today = athleteToday({ profile: athlete.profile, results: athlete.results, workouts: athlete.workouts }, asOf)
  if (review.overdue.length > 0) {
    const o = review.overdue[0]
    facts.push(fact('nextOverdue', { slug: o.slug, days: Math.max(0, o.overdueDays) }))
  } else if (today.coverage && today.coverage.missing.length > 0) {
    facts.push(fact('nextMissing', { slug: today.coverage.missing[0] }))
  } else {
    facts.push(fact('nextNone'))
  }
  return { from: review.from, to: review.to, facts }
}
