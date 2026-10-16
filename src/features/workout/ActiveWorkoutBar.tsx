import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ActiveWorkout } from '@/domain/activeWorkout'
import { workoutElapsedS } from '@/domain/activeWorkout'
import { formatClock } from '@/domain/workoutClock'
import { useTicker } from './useTicker'

/**
 * «Training läuft» (Mockup Variante C): solange eine Einheit läuft, steht sie
 * über der Leiste auf jedem Bildschirm — mit Laufzeit und, beim Kraft-
 * training, der Satzpause. Ein Tipp führt zurück an die Stelle.
 * Nachgeladen von der App-Hülle, nur wenn eine Einheit läuft.
 */
export default function ActiveWorkoutBar({ workout }: { workout: ActiveWorkout }) {
  const { t } = useTranslation()
  const now = useTicker(true, 1000)
  const elapsed = workoutElapsedS(workout, now)
  const rest = workout.restEnd != null && workout.restEnd > now ? Math.ceil((workout.restEnd - now) / 1000) : null
  const restFromLogger = (() => {
    const d = workout.data as { logger?: { restEnd?: number | null } } | null
    const end = d?.logger?.restEnd
    return end != null && end > now ? Math.ceil((end - now) / 1000) : null
  })()
  const restLeft = rest ?? restFromLogger
  return (
    <>
      {/* Rechts bleibt Platz für den Aktionsknopf (ActionOrb). */}
      <div className="h-16" aria-hidden />
      <div className="fixed right-20 left-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.5rem)] z-30 mx-auto max-w-xl lg:bottom-4" data-testid="active-workout-bar">
        <div className="flex min-h-15 items-center gap-3 rounded-2xl bg-[#101A18] py-2 pr-2 pl-4 text-[#E9EFEB] shadow-[0_12px_30px_rgba(16,26,24,.35)]">
          <span className="size-2.5 shrink-0 rounded-full bg-[#7FE5B5] shadow-[0_0_0_4px_rgba(127,229,181,.25)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{workout.pausedAt != null ? t('workout.bar.paused', { time: formatClock(elapsed) }) : t('workout.bar.running', { time: formatClock(elapsed) })}</p>
            <p className="truncate text-[12px] text-[#A9B7B0]">{workout.title}{restLeft != null ? ` · ${t('workout.bar.rest', { time: formatClock(restLeft) })}` : ''}</p>
          </div>
          <Link to={workout.path} data-testid="active-workout-back" className="inline-flex min-h-11 items-center rounded-pill bg-[#7FE5B5] px-4 text-[14px] font-semibold text-[#08231A]">{t('workout.bar.back')}</Link>
        </div>
      </div>
    </>
  )
}
