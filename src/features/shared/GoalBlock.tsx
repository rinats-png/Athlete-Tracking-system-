import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Target, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { useLocale } from './useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { goalLooksReversed, goalProgress } from '@/domain/testGoal'
import { formatNumber } from '@/lib/format'

/**
 * Das eigene Ziel für einen Test, mit dem Weg dorthin.
 *
 * Der Fortschritt zählt ab der ersten Messung, nicht ab null — sonst stünde
 * bei einer Sprintzeit immer über 90 % und der Balken sagte nichts.
 */
export function GoalBlock({ testSlug }: { testSlug: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, saveProfile } = useAppData()
  const test = getTest(testSlug)
  const goal = data.profile.testGoals[testSlug]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<number | null>(goal ?? null)

  if (!test) return null
  const progress = goalProgress(data.results, testSlug, goal)

  const save = () => {
    const next = { ...data.profile.testGoals }
    if (draft == null) delete next[testSlug]
    else next[testSlug] = draft
    saveProfile({ testGoals: next })
    setEditing(false)
  }

  const clear = () => {
    const next = { ...data.profile.testGoals }
    delete next[testSlug]
    saveProfile({ testGoals: next })
    setDraft(null)
    setEditing(false)
  }

  if (editing || goal == null) {
    return (
      <div className="border-t border-line px-4 py-3">
        <span className="label-tag">{t('goal.title')}</span>
        {editing ? (
          <div className="mt-2 space-y-2">
            <NumberField
              label={t('goal.field', { unit: test.primaryUnit })}
              unit={test.primaryUnit}
              value={draft}
              onChange={setDraft}
              step={0.1}
            />
            {draft != null && goalLooksReversed(data.results, testSlug, draft) && (
              <p className="text-[12px] text-warning">{t('goal.reversed')}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={draft == null}>
                {t('actions.save')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {t('actions.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-[13px] text-ink-secondary">{t('goal.none')}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditing(true)}>
              <Target size={14} aria-hidden />
              {t('goal.set')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label-tag">{t('goal.title')}</span>
        <Button variant="ghost" size="sm" onClick={clear} aria-label={t('goal.remove')}>
          <X size={14} aria-hidden />
        </Button>
      </div>
      <p className="mt-1 flex items-baseline gap-2 text-[13px]">
        <span className="readout text-[20px] tabular-nums">
          {formatNumber(goal, locale, 2)} {test.primaryUnit}
        </span>
        {progress && (
          <span className="text-ink-muted">
            {progress.reached
              ? t('goal.reached')
              : t('goal.remaining', {
                  amount: formatNumber(progress.remaining, locale, 2),
                  unit: test.primaryUnit,
                })}
          </span>
        )}
      </p>
      {progress?.percent != null && (
        <>
          <div className="mt-2 h-1.5 bg-surface-sunken" aria-hidden>
            <div
              className={progress.reached ? 'h-full bg-good' : 'h-full bg-accent'}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            {t('goal.fromStart', {
              percent: progress.percent,
              start: formatNumber(progress.start, locale, 2),
            })}
          </p>
        </>
      )}
      <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => setEditing(true)}>
        {t('goal.change')}
      </Button>
    </div>
  )
}
