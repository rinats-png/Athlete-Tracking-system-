import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { InfoNote } from '@/components/ui/InfoNote'
import type { SessionSummary, ExerciseSummary } from '@/domain/workoutSummary'
import type { Split } from '@/domain/runTrack'
import { formatPace, paceSPerKm } from '@/domain/runTrack'
import { formatClock } from '@/domain/workoutClock'
import { useLocale } from '@/features/shared/useLocale'
import { formatNumber } from '@/lib/format'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cn } from '@/lib/utils'

/**
 * Nach dem Speichern (Mockup «Was hat sich wirklich verändert?»).
 *
 * Kein «Gut gemacht!», sondern was gemessen wurde: Dauer, Sätze, Puls,
 * Strecke oder Runden — und je Übung der Vergleich mit dem letzten Mal,
 * geprüft gegen den eigenen Messfehler (`domain/workoutSummary.ts`). Ohne
 * vier Einheiten derselben Übung steht dort die Differenz und der Satz, dass
 * der Messfehler noch unbekannt ist. Der Zustand kommt über die Navigation;
 * gespeichert ist zu diesem Zeitpunkt schon alles.
 */
export interface SummaryState {
  title: string
  kind: 'strength' | 'run' | 'clock'
  durationMin: number
  rpe: number
  hr: { avg: number; max: number } | null
  summary: SessionSummary | null
  distanceM: number | null
  rounds: number | null
  splits?: Split[]
  back: string
}

export function WorkoutSummaryScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const location = useLocation()
  const { trainingBlocks } = useAppData()
  const s = (location.state as SummaryState | null) ?? null
  if (!s) return <EmptyState title={t('workout.summary.title')} body={t('workout.summary.lost')} action={<Link to="/plan" className="inline-flex min-h-11 items-center text-accent-text underline">{t('workout.summary.toTraining')}</Link>} />

  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const today = new Date().toISOString().slice(0, 10)
  const retestDay = block ? new Date(Date.parse(`${block.startDay}T00:00:00Z`) + block.weeks * 7 * 86_400_000).toISOString().slice(0, 10) : null
  const retestIn = retestDay ? Math.round((Date.parse(`${retestDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null
  const tiles: { label: string; value: string; testId: string }[] = [
    { label: t('workout.summary.duration'), value: formatClock(s.durationMin * 60), testId: 'summary-duration' },
    ...(s.summary && s.summary.sets > 0 ? [{ label: t('workout.summary.sets'), value: String(s.summary.sets), testId: 'summary-sets' }] : []),
    ...(s.distanceM != null ? [{ label: t('workout.summary.distance'), value: `${formatNumber(s.distanceM / 1000, locale, 2)} km`, testId: 'summary-distance' }] : []),
    ...(s.distanceM != null ? [{ label: t('workout.summary.pace'), value: `${formatPace(paceSPerKm(s.distanceM, s.durationMin * 60))} /km`, testId: 'summary-pace' }] : []),
    ...(s.rounds != null ? [{ label: t('workout.summary.rounds'), value: String(s.rounds), testId: 'summary-rounds' }] : []),
    ...(s.hr ? [{ label: t('workout.summary.hr'), value: `${s.hr.avg}/${s.hr.max}`, testId: 'summary-hr' }] : []),
  ]

  return (
    <div data-testid="workout-summary" className="pb-24">
      <p className="label-tag !text-accent-text">{t('workout.summary.saved', { date: new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) })}</p>
      <h1 className="mt-1 font-display text-[34px] leading-none font-bold">{s.title}</h1>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tiles.slice(0, 6).map((x) => (
          <div key={x.testId} className="rounded-xl bg-surface px-3 py-2.5" data-testid={x.testId}>
            <p className="label-tag !text-[10px]">{x.label}</p>
            <p className="readout mt-1 font-display text-[26px] leading-none font-bold">{x.value}</p>
          </div>
        ))}
      </div>

      {s.summary && s.summary.exercises.length > 0 && (
        <Panel className="mt-4" data-testid="summary-compare">
          <PanelHeader title={t('workout.summary.compare')} />
          <ul className="px-4 pb-3">
            {s.summary.exercises.map((e) => <CompareRow key={e.key} e={e} />)}
          </ul>
          <div className="px-4 pb-4"><InfoNote text={t('workout.summary.note')} /></div>
        </Panel>
      )}

      {s.splits && s.splits.length > 0 && (
        <Panel className="mt-4" data-testid="summary-splits">
          <PanelHeader title={t('workout.summary.splits')} />
          <ul className="px-4 pb-3 text-[14px]">
            {s.splits.map((x, i) => (
              <li key={i} className="flex justify-between border-t border-line py-2 first:border-t-0">
                <span>{x.index} · {Math.round(x.distanceM)} m</span>
                <span className="readout text-ink-secondary">{formatClock(x.seconds)} · {formatPace(paceSPerKm(x.distanceM, x.seconds))} /km</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {retestIn != null && retestIn >= 0 && (
        <Panel className="mt-4">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
            <span><b>{t('workout.summary.retest')}</b> {t('workout.summary.retestIn', { count: retestIn })}</span>
            <Link to="/plan/block" className="inline-flex min-h-11 items-center font-semibold text-accent-text">{t('workout.summary.view')}</Link>
          </div>
        </Panel>
      )}

      <div className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom)+0.75rem)] z-[55] mx-auto max-w-xl">
        <Link to={s.back} data-testid="summary-done" className="flex min-h-15 items-center justify-center rounded-pill bg-ink text-[17px] font-semibold text-plane">{t('workout.summary.done')}</Link>
      </div>
    </div>
  )
}

/** Eine Übung: Wert, Änderung und Rauschband (schraffiert = Messfehler). */
function CompareRow({ e }: { e: ExerciseSummary }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const unit = e.metric === 'e1rm' ? ' kg' : ''
  const label = e.metric === 'e1rm' ? t('workout.summary.e1rm', { name: e.name, value: formatNumber(e.value, locale, 1) }) : t('workout.summary.reps', { name: e.name, value: e.value })
  const verdict = e.verdict
  const band = e.detectablePercent
  // Punkt auf der Skala: ±(2 × Schwelle) bzw. ±20 % ohne Schwelle, Mitte = gleich.
  const span = band != null ? Math.max(band * 2, 1) : 20
  const x = e.changePercent != null ? 50 + Math.max(-48, Math.min(48, (e.changePercent / span) * 50)) : 50
  return (
    <li className="border-t border-line py-3 first:border-t-0" data-testid="summary-row" data-verdict={verdict ?? 'first'}>
      <div className="flex items-baseline justify-between gap-2 text-[14px] font-semibold">
        <span className="min-w-0">{label}</span>
        {e.changePercent != null && (
          <span className={cn('readout shrink-0 font-normal', verdict === 'better' ? 'text-accent-text' : verdict === 'worse' ? 'text-warning' : 'text-ink-secondary')}>
            {e.changePercent > 0 ? '+' : ''}{formatNumber(e.changePercent, locale, 1)} %
          </span>
        )}
      </div>
      {e.previous && (
        <div className="relative mt-2 h-4" aria-hidden>
          <span className="absolute inset-x-0 top-[7px] h-0.5 bg-line" />
          {band != null && <span className="absolute top-px h-3.5 border-x border-ink-muted" style={{ left: `${50 - (band / span) * 50}%`, width: `${(band / span) * 100}%`, background: 'repeating-linear-gradient(135deg, color-mix(in oklab, var(--ink-secondary) 35%, transparent) 0 2px, transparent 2px 5px)' }} />}
          <span className={cn('absolute top-0.5 size-3 rounded-full border-2', verdict === 'better' ? 'border-accent bg-accent' : verdict === 'worse' ? 'border-warning bg-warning' : 'border-ink-secondary bg-surface', verdict === 'unknown_error' && 'border-dashed')} style={{ left: `calc(${x}% - 6px)` }} />
        </div>
      )}
      <p className="mt-1 text-[12px] text-ink-secondary">
        {!e.previous
          ? t('workout.summary.first')
          : verdict === 'unknown_error'
            ? t('workout.summary.unknown', { previous: `${formatNumber(e.previous.value, locale, 1)}${unit}`, count: Math.max(0, 4 - e.points) })
            : t(`workout.summary.v.${verdict}`, { detectable: formatNumber(e.detectablePercent ?? 0, locale, 1) })}
        {e.metric === 'e1rm' && ` ${t('workout.summary.estimate')}`}
      </p>
    </li>
  )
}

export default WorkoutSummaryScreen
