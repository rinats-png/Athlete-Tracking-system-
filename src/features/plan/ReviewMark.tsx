import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { TRAINING_RULES } from '@/data/trainingRules'
import { planReviewed } from '@/domain/library'
import { blockReviewState, sessionReviewState, type ReviewState } from '@/domain/planReview'
import { useLibrary } from '@/features/library/useLibrary'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

/**
 * Prüfstand von Block oder Einheit, mit dem Bibliotheksindex, sobald er
 * geladen ist. Bis dahin — und ohne Bibliotheksplan — gilt die sichere
 * Vorgabe aus `planReview.ts`: ungeprüft.
 */
export function useReviewState(
  block: Pick<StoredTrainingBlock, 'sessions' | 'libraryPlanId'> | null,
  session?: Pick<StoredPlannedSession, 'kind' | 'ruleId'> | null,
): ReviewState | null {
  const { index } = useLibrary(block?.libraryPlanId != null)
  return useMemo(() => {
    if (!block) return null
    const libraryReviewed = (planId: string) => {
      const plan = index?.plans.find((p) => p.plan_id === planId)
      return plan && index ? planReviewed(plan, index.methodRules) : false
    }
    return session
      ? sessionReviewState(session, TRAINING_RULES, block.libraryPlanId, libraryReviewed)
      : blockReviewState(block, TRAINING_RULES, libraryReviewed)
  }, [block, session, index])
}

/**
 * «Fachlich noch nicht geprüft» — überall, wo ein Plan benutzt wird, nicht
 * nur in der Bibliothek (Regel 11). Auf Fotokarten und dunklem Grund in der
 * hellen Fassung (`onImage`).
 */
export function ReviewMark({ state, onImage = false, testId = 'review-mark' }: { state: ReviewState | null; onImage?: boolean; testId?: string }) {
  const { t } = useTranslation()
  if (state !== 'unreviewed') return null
  return (
    <span
      data-testid={testId}
      title={t('lib.unreviewed')}
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-medium',
        onImage ? 'border-[#F2C46D]/70 bg-black/35 text-[#F7D99A]' : 'border-warning text-warning',
      )}
    >
      <AlertTriangle size={12} aria-hidden className="shrink-0" />
      {t('plan.review.unreviewed')}
    </span>
  )
}
