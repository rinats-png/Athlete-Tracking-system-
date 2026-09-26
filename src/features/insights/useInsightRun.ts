import { useCallback, useMemo } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useBilling } from '@/features/billing/BillingProvider'
import { applyInsightAction, ruleById, runInsights, type Insight, type InsightAction } from '@/domain/insightEngine'
import { toDay } from '@/domain/diary'
import { radarProfile } from '@/lib/scoring'
import type { PlanFeature } from '@/data/pricing'
import '@/features/insights/registerRules'

/**
 * Die Hinweise des aktiven Athleten — gerechnet aus dem Bestand, abgeglichen
 * mit dem, was der Mensch schon damit getan hat.
 *
 * Die Rechnung liegt vollständig in domain/insightEngine.ts; dieser Hook
 * sammelt nur die Eingaben ein und schreibt Handlungen zurück in den Store.
 */
export function useInsightRun() {
  const { data, diary, workouts, decisions, observations, meals, nutrition, insightState, updateInsightState } = useAppData()
  const billing = useBilling()
  const today = toDay(new Date())

  const axes = useMemo(
    () => radarProfile(data.results, 'population', new Date(), data.profile.disciplineId),
    [data.results, data.profile.disciplineId],
  )

  const run = useMemo(
    () =>
      runInsights(
        {
          today,
          axes,
          results: data.results,
          assessments: data.assessments,
          profile: { sex: data.profile.sex, birthDate: data.profile.birthDate },
          diary,
          workouts,
          decisions,
          observations,
          meals,
          nutrition,
          can: (feature) => billing.can(feature as PlanFeature),
        },
        insightState,
      ),
    [today, axes, data.results, data.assessments, data.profile.sex, data.profile.birthDate, diary, workouts, decisions, observations, meals, nutrition, billing, insightState],
  )

  const act = useCallback(
    (insight: Insight, action: InsightAction) => {
      const cooldown = ruleById(insight.ruleId)?.cooldownDays ?? 7
      updateInsightState((state) => applyInsightAction(state, insight, action, cooldown))
      // Welche Regeln Menschen für nützlich halten — nur Regel und Handlung, kein Inhalt.
      if (action !== 'seen') trackEvent('insight_action', { rule: insight.ruleId, action })
    },
    [updateInsightState],
  )

  return { run, act }
}
