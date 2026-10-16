import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import type { EvidenceRule } from '@/domain/trainingTypes'
import { blockReviewState, sessionReviewState, type ReviewState } from '@/domain/planReview'
import type { ProgramIndex } from '@/domain/libraryTypes'
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
  // Regelregister, Bibliotheksindex und -prüfung werden nachgeladen: «Heute»
  // liegt im Startpaket, sie nicht (Grenze 1100 KB, tests/loading.spec.ts).
  const [deps, setDeps] = useState<{ rules: readonly EvidenceRule[]; planReviewed: typeof import('@/domain/library').planReviewed; index: ProgramIndex | null } | null>(null)
  const needsIndex = block?.libraryPlanId != null
  useEffect(() => {
    if (!block) return
    let live = true
    void Promise.all([
      import('@/data/trainingRules'),
      import('@/domain/library'),
      needsIndex ? import('@/data/library').then((m) => m.loadProgramIndex()) : Promise.resolve(null),
    ]).then(([r, l, index]) => {
      if (live) setDeps({ rules: r.TRAINING_RULES, planReviewed: l.planReviewed, index })
    })
    return () => {
      live = false
    }
  }, [block, needsIndex])
  if (!block || !deps) return null
  const index = deps.index
  const libraryReviewed = (planId: string) => {
    const plan = index?.plans.find((p) => p.plan_id === planId)
    return plan && index ? deps.planReviewed(plan, index.methodRules) : false
  }
  return session
    ? sessionReviewState(session, deps.rules, block.libraryPlanId, libraryReviewed)
    : blockReviewState(block, deps.rules, libraryReviewed)
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

/** Hook und Kennzeichen in einem — für Bildschirme im Startpaket, die es nachladen (Heute). */
export function ReviewChip({
  block,
  session,
  onImage,
  testId,
}: {
  block: Pick<StoredTrainingBlock, 'sessions' | 'libraryPlanId'> | null
  session?: Pick<StoredPlannedSession, 'kind' | 'ruleId'> | null
  onImage?: boolean
  testId?: string
}) {
  return <ReviewMark state={useReviewState(block, session)} onImage={onImage} testId={testId} />
}
