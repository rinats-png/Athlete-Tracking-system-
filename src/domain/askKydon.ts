import { confidenceScore } from '@/domain/analytics'
import { changeReport, DETECTION_FACTOR, typicalErrorPercent, type ChangeVerdict } from '@/domain/change'
import { overdueTests, type ReminderSettings } from '@/domain/reminders'
import { athleteToday, dataConfidence, recentChanges, type ConfidenceLevel } from '@/domain/performanceView'
import { getTest } from '@/data/testCatalog'
import type { StoredAthlete, StoredResult } from '@/lib/store/localStore'

/**
 * Fragen an KYDON (Produktdoktrin §30, §31): feste Fragen, deterministische
 * Antworten aus den Rechenstellen der App. Kein Sprachmodell, kein Netz.
 *
 * Jede Antwort ist eine Liste von FAKTEN (Schlüssel plus Zahlen), die die
 * Oberfläche in der Sprache des Nutzers ausschreibt. Ein Sprachmodell dürfte
 * später dieselben Fakten nur umformulieren — nie neue Zahlen erzeugen (siehe
 * `answerGuard.ts`). Es wird nichts erklärt, was die Daten nicht hergeben:
 * keine Ursache, kein Rat, kein Urteil über die Person.
 */

export type QuestionKey = 'development' | 'changed' | 'overdue' | 'whyUnchanged' | 'missing' | 'methods' | 'confidence'

export interface QuestionDef {
  key: QuestionKey
  /** Braucht die Frage einen Test, auf den sie sich bezieht? */
  needsTest: boolean
}

/** Die Fragen aus der Doktrin, in dieser Reihenfolge. */
export const QUESTIONS: QuestionDef[] = [
  { key: 'development', needsTest: true },
  { key: 'changed', needsTest: false },
  { key: 'overdue', needsTest: false },
  { key: 'whyUnchanged', needsTest: true },
  { key: 'missing', needsTest: false },
  { key: 'methods', needsTest: false },
  { key: 'confidence', needsTest: false },
]

export type FactValue = string | number
export interface Fact {
  key: string
  params: Record<string, FactValue>
}

export interface Answer {
  question: QuestionKey
  /** Auf welchem Test die Antwort beruht, falls einer gewählt war. */
  testSlug: string | null
  facts: Fact[]
  /** Ob es überhaupt etwas zu sagen gab. Leere Antworten sagen, was fehlt. */
  empty: boolean
  /** Wohin man für die Details kommt. */
  link: string | null
}

export interface AskInput {
  athlete: Pick<StoredAthlete, 'profile' | 'results' | 'workouts'>
  reminders: ReminderSettings
  testSlug?: string | null
}

const fact = (key: string, params: Record<string, FactValue> = {}): Fact => ({ key, params })
const day = (iso: string) => iso.slice(0, 10)
const r1 = (n: number) => Math.round(n * 10) / 10

/** Tests, zu denen es mindestens eine bewertete Messung gibt — die Auswahl für Fragen mit Test. */
export function askableTests(results: StoredResult[]): string[] {
  return [...new Set(results.filter((r) => r.score != null && getTest(r.testSlug)).map((r) => r.testSlug))]
}

function series(results: StoredResult[], slug: string): StoredResult[] {
  return results.filter((r) => r.testSlug === slug && r.score != null).sort((a, b) => a.performedAt.localeCompare(b.performedAt))
}

export function answer(question: QuestionKey, input: AskInput, asOf: Date = new Date()): Answer {
  const { athlete, reminders } = input
  const slug = input.testSlug ?? null
  const results = athlete.results
  const base = (facts: Fact[], link: string | null = null, empty = false): Answer => ({ question, testSlug: slug, facts, empty, link })

  switch (question) {
    case 'development': {
      const s = slug ? series(results, slug) : []
      if (!slug || s.length === 0) return base([fact('noMeasurements')], '/tests', true)
      const test = getTest(slug)
      const unit = test?.primaryUnit ?? ''
      const first = s[0]
      const last = s[s.length - 1]
      const facts = [fact('count', { n: s.length, unit })]
      if (s.length === 1) return base([...facts, fact('single', { value: last.score as number, unit, day: day(last.performedAt) })], `/verlauf/test/${slug}`)
      const rep = changeReport(results, last)
      facts.push(fact('firstLast', { first: first.score as number, last: last.score as number, unit, firstDay: day(first.performedAt), lastDay: day(last.performedAt) }))
      facts.push(...verdictFacts(rep.verdict, rep.changePercent, rep.detectablePercent))
      return base(facts, `/verlauf/test/${slug}`)
    }
    case 'changed': {
      const proven = recentChanges(results, 10).filter((c) => c.report.verdict === 'better' || c.report.verdict === 'worse')
      if (proven.length === 0) return base([fact('noneProven')], '/verlauf', true)
      return base(
        proven.map((c) => fact('changed', { slug: c.slug, percent: c.report.changePercent ?? 0, verdict: c.report.verdict, detectable: c.report.detectablePercent ?? 0 })),
        '/verlauf',
      )
    }
    case 'overdue': {
      if (!reminders.remindersEnabled) return base([fact('remindersOff')], '/profil', true)
      const due = overdueTests(results, reminders, asOf)
      if (due.length === 0) return base([fact('noneOverdue')], '/verlauf/erinnerungen', true)
      return base(due.slice(0, 8).map((d) => fact('overdue', { slug: d.slug, days: d.overdueDays, last: day(d.lastPerformedAt) })), '/verlauf/erinnerungen')
    }
    case 'whyUnchanged': {
      const s = slug ? series(results, slug) : []
      if (!slug || s.length === 0) return base([fact('noMeasurements')], '/tests', true)
      const last = s[s.length - 1]
      const rep = changeReport(results, last)
      const typical = typicalErrorPercent(results, slug)
      if (rep.verdict === 'first') return base([fact('first')], `/verlauf/test/${slug}`)
      if (rep.verdict === 'unknown_error') return base([fact('errorUnknown', { points: rep.points }), fact('change', { percent: rep.changePercent ?? 0 })], `/verlauf/test/${slug}`)
      if (rep.verdict === 'within_noise') {
        return base(
          [
            fact('withinNoise', { percent: Math.abs(rep.changePercent ?? 0), detectable: rep.detectablePercent ?? 0, error: typical ?? 0, points: rep.points, factor: r1(DETECTION_FACTOR) }),
          ],
          `/verlauf/test/${slug}`,
        )
      }
      return base([fact('notUnchanged', { percent: rep.changePercent ?? 0, verdict: rep.verdict })], `/verlauf/test/${slug}`)
    }
    case 'missing': {
      const today = athleteToday({ profile: athlete.profile, results, workouts: athlete.workouts }, asOf)
      const facts: Fact[] = []
      if (today.coverage) {
        facts.push(fact('coverage', { measured: today.coverage.measured, total: today.coverage.total }))
        for (const m of today.coverage.missing) facts.push(fact('missingTest', { slug: m }))
        if (today.coverage.stale.length > 0) facts.push(fact('stale', { count: today.coverage.stale.length }))
      } else facts.push(fact('noDiscipline'))
      const unmeasured = today.dimensions.filter((d) => d.status === 'unmeasured').length
      const noRef = today.dimensions.filter((d) => d.status === 'noReference').length
      if (unmeasured > 0) facts.push(fact('dimsUnmeasured', { count: unmeasured }))
      if (noRef > 0) facts.push(fact('dimsNoReference', { count: noRef }))
      const nothing = facts.length === 1 && facts[0].key === 'coverage' && today.coverage?.missing.length === 0
      return base(nothing ? [facts[0], fact('nothingMissing')] : facts, '/performance', false)
    }
    case 'methods': {
      const differing: Fact[] = []
      let checked = 0
      for (const slugOf of askableTests(results)) {
        const s = series(results, slugOf)
        if (s.length < 2) continue
        checked++
        const combos = new Set(s.map((r) => [r.protocol.method ?? '', r.context.surface, r.context.equipment].join('|')))
        const known = [...combos].filter((c) => c.replace(/\|/g, '') !== '')
        if (known.length > 1) differing.push(fact('methodsDiffer', { slug: slugOf, n: known.length }))
      }
      if (checked === 0) return base([fact('noRepeats')], '/verlauf', true)
      if (differing.length === 0) return base([fact('allComparable', { count: checked })], '/verlauf')
      return base(differing, '/verlauf')
    }
    case 'confidence': {
      const conf = dataConfidence(results, asOf)
      const facts: Fact[] = [fact('level', { level: conf.level as ConfidenceLevel, score: Math.round(conf.score) })]
      if (conf.level !== 'INSUFFICIENT') for (const c of confidenceScore(results, asOf).components) facts.push(fact('component', { name: c.key, value: Math.round(c.value * 100) }))
      return base(facts, '/performance', conf.level === 'INSUFFICIENT')
    }
  }
}

function verdictFacts(verdict: ChangeVerdict, percent: number | null, detectable: number | null): Fact[] {
  if (verdict === 'better' || verdict === 'worse') return [fact('verdict', { verdict, percent: percent ?? 0, detectable: detectable ?? 0 })]
  if (verdict === 'within_noise') return [fact('verdictNoise', { percent: Math.abs(percent ?? 0), detectable: detectable ?? 0 })]
  if (verdict === 'unknown_error') return [fact('verdictUnknown', { percent: percent ?? 0 })]
  return []
}
