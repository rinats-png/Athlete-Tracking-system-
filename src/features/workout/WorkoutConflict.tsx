import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ActiveWorkout } from '@/domain/activeWorkout'

/** Es läuft schon eine andere Einheit: dort weitermachen oder verwerfen und hier starten. */
export function WorkoutConflict({ other, onReplace }: { other: ActiveWorkout; onReplace: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" data-testid="workout-conflict" className="mb-4 rounded-2xl border border-warning/60 bg-surface px-4 py-3">
      <p className="text-[14px] font-semibold">{t('workout.conflict.title', { title: other.title })}</p>
      <p className="mt-1 text-[13px] text-ink-secondary">{t('workout.conflict.body')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={other.path} className="inline-flex min-h-11 items-center rounded-pill bg-accent px-4 text-[13px] font-semibold text-accent-ink">{t('workout.conflict.continue')}</Link>
        <button type="button" onClick={onReplace} data-testid="workout-conflict-replace" className="min-h-11 rounded-pill border border-line px-4 text-[13px]">{t('workout.conflict.replace')}</button>
      </div>
    </div>
  )
}
