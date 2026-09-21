import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { StatTile } from '@/components/ui/StatTile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { exerciseByKey } from '@/data/exercises'
import {
  blockCompare,
  e1rmHistory,
  exerciseSummary,
  setsPerMuscle,
  workoutSetCount,
  workoutVolume,
} from '@/domain/training'
import { toDay } from '@/domain/diary'
import { newId } from '@/lib/store/localStore'
import type { StoredWorkout } from '@/lib/store/localStore'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { WorkoutEditor } from './WorkoutEditor'
import { MuscleBars } from './MuscleBars'
import { E1rmTrend } from './E1rmTrend'

function blank(day: string): StoredWorkout {
  const now = new Date().toISOString()
  return { id: newId(), day, title: '', exercises: [], durationMin: null, rpe: null, diarySessionId: null, note: '', createdAt: now, updatedAt: now }
}

/**
 * Das Trainingslog — Schicht S2 (docs/ausbau.md).
 *
 * Drei Flächen, keine Tabelle:
 *   Einheiten   eine Karte je Einheit, neueste zuerst — Titel, Tag, Sätze,
 *               Volumen. Antippen öffnet den Editor.
 *   Bestwerte   je Übung der beste e1RM mit seinem Verlauf und dem
 *               Blockvergleich: «letzte vier Wochen gegen die vier davor».
 *   Diese Woche Sätze je Muskelgruppe als Balken.
 *
 * Nichts hier empfiehlt. Der e1RM ist eine Schätzung und heisst so; der
 * Blockvergleich sagt «unverändert», nicht «Plateau brechen» (§81).
 */
export function TrainingScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { workouts, saveWorkout, deleteWorkout, role } = useAppData()
  const today = toDay(new Date())
  const [editing, setEditing] = useState<StoredWorkout | null>(null)

  const sorted = useMemo(() => [...workouts].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)), [workouts])
  const summary = useMemo(() => exerciseSummary(workouts), [workouts])
  const muscles = useMemo(() => setsPerMuscle(workouts, today, 7), [workouts, today])
  const weekSets = Object.values(muscles).reduce((a, b) => a + b, 0)
  const weekVolume = workouts
    .filter((w) => w.day > new Date(Date.parse(`${today}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10) && w.day <= today)
    .reduce((s, w) => s + workoutVolume(w), 0)

  const nameOf = (w: StoredWorkout) =>
    w.title ||
    w.exercises
      .slice(0, 2)
      .map((e) => {
        const d = exerciseByKey(e.exerciseKey)
        return d ? pick(d.name, locale) : e.customName
      })
      .filter(Boolean)
      .join(' · ') ||
    t('training.untitled')

  return (
    <>
      <ScreenHeader
        eyebrow={t('training.eyebrow')}
        title={t('training.title')}
        intro={role === 'coach' ? t('training.introCoach') : t('training.intro')}
        action={
          !editing && (
            <Button variant="primary" size="md" onClick={() => setEditing(blank(today))}>
              <Plus size={14} aria-hidden />
              {t('training.new')}
            </Button>
          )
        }
      />

      {editing && (
        <Panel ticked float className="mb-4 px-4 py-4">
          <WorkoutEditor
            initial={editing}
            onSave={(w) => {
              saveWorkout(w)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title={t('training.list.title')} subtitle={t('training.list.why')} />
            {sorted.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('training.list.empty')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {sorted.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(w)} aria-label={`${t('training.list.edit')}: ${nameOf(w)}`}>
                      <p className="truncate font-display text-[15px] font-bold uppercase tracking-[0.04em]">{nameOf(w)}</p>
                      <p className="text-[12px] text-ink-muted">
                        {formatDate(`${w.day}T12:00:00Z`, locale)} · {t('training.list.sets', { count: workoutSetCount(w) })} ·{' '}
                        <span className="readout">{formatNumber(workoutVolume(w), locale, 0)}</span> kg·Wdh
                        {w.durationMin && w.rpe ? ` · ${w.durationMin * w.rpe} AU` : ''}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" aria-label={`${t('training.list.edit')}: ${nameOf(w)}`} onClick={() => setEditing(w)}>
                        <Pencil size={14} aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`${t('training.list.delete')}: ${nameOf(w)}`} onClick={() => deleteWorkout(w.id)}>
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t('training.best.title')} subtitle={t('training.best.why')} />
            {summary.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('training.best.empty')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {summary.slice(0, 12).map((s) => {
                  const def = exerciseByKey(s.exerciseKey)
                  const name = def ? pick(def.name, locale) : s.customName
                  const history = def ? e1rmHistory(workouts, s.exerciseKey) : []
                  const block = def ? blockCompare(workouts, s.exerciseKey, today) : null
                  return (
                    <li key={`${s.exerciseKey}:${s.customName}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_10rem]">
                      <div className="min-w-0">
                        <p className="truncate text-[14px]">{name}</p>
                        <p className="text-[12px] text-ink-secondary">
                          <span className="readout">{formatNumber(s.best, locale, 1)}</span> kg e1RM · {t('training.best.sessions', { count: s.sessions })}
                        </p>
                        {block && block.verdict !== 'insufficient' && (
                          <p className="mt-0.5 text-[12px] text-ink-muted">
                            {t(`training.best.block.${block.verdict}`, { delta: formatNumber(Math.abs(block.deltaPercent ?? 0), locale, 1) })}
                          </p>
                        )}
                      </div>
                      {history.length > 0 && <E1rmTrend points={history} label={`${name}: ${t('training.best.trend')}`} />}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title={t('training.week.title')} subtitle={t('training.week.why')} />
            <div className="grid grid-cols-2 divide-x divide-line">
              <StatTile label={t('training.week.sets')} value={String(weekSets)} />
              <StatTile label={t('training.week.volume')} value={formatNumber(weekVolume, locale, 0)} unit="kg·Wdh" />
            </div>
            <MuscleBars sets={muscles} />
          </Panel>

          <Panel>
            <div className="px-4 py-3">
              <p className="text-[12px] leading-relaxed text-ink-secondary">{t('training.diaryLink.why')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/tagebuch">
                    {t('training.diaryLink.open')}
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/cockpit">
                    {t('cockpit.title')}
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
