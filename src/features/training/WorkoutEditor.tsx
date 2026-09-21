import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TapScale } from '@/components/ui/TapScale'
import { RangeField } from '@/components/ui/RangeField'
import { useLocale } from '@/features/shared/useLocale'
import { CUSTOM_EXERCISE, exerciseByKey, searchExercises } from '@/data/exercises'
import { e1rm, E1RM_RELIABLE_MAX_REPS, setVolume } from '@/domain/training'
import { newId } from '@/lib/store/localStore'
import type { StoredWorkout, StoredWorkoutExercise, StoredWorkoutSet } from '@/lib/store/localStore'
import { formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Eine Einheit erfassen — ohne Tabelle.
 *
 * DAS ZIEL: eintippen zwischen zwei Sätzen, mit Kreide an den Fingern. Jeder
 * Satz ist eine Zeile aus drei Bedienelementen: Gewicht (Ziffernblock),
 * Wiederholungen (Plus/Minus, weil man selten mehr als ±2 ändert) und RIR
 * als Tipp-Skala 0–5. Daneben steht der e1RM, sofort — er ist das, worauf
 * man beim Training schaut.
 *
 * «Satz wiederholen» kopiert den letzten: der zweite und dritte Satz sind
 * fast immer wie der erste. Das spart die Hälfte der Eingaben.
 *
 * Was hier NICHT steht: Vorgaben. Kein «3 × 8», kein «nächste Woche +2,5
 * kg». Der Editor hält fest, was war (§81).
 */
export function WorkoutEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: StoredWorkout
  onSave: (workout: StoredWorkout) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [workout, setWorkout] = useState<StoredWorkout>(initial)
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const hits = useMemo(() => searchExercises(query), [query])

  const update = (patch: Partial<StoredWorkout>) => setWorkout((w) => ({ ...w, ...patch }))
  const updateExercise = (id: string, fn: (ex: StoredWorkoutExercise) => StoredWorkoutExercise) =>
    update({ exercises: workout.exercises.map((ex) => (ex.id === id ? fn(ex) : ex)) })

  const addExercise = (exerciseKey: string, name = '') => {
    const first: StoredWorkoutSet = { id: newId(), weightKg: 0, reps: 8, rir: null }
    update({
      exercises: [...workout.exercises, { id: newId(), exerciseKey, customName: name, sets: [first] }],
    })
    setQuery('')
    setCustomName('')
  }

  const addSet = (ex: StoredWorkoutExercise, copyLast: boolean) => {
    const last = ex.sets[ex.sets.length - 1]
    const next: StoredWorkoutSet = copyLast && last ? { ...last, id: newId() } : { id: newId(), weightKg: 0, reps: 8, rir: null }
    updateExercise(ex.id, (e) => ({ ...e, sets: [...e.sets, next] }))
  }
  const patchSet = (exId: string, setId: string, p: Partial<StoredWorkoutSet>) =>
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...p } : s)) }))
  const removeSet = (exId: string, setId: string) =>
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))

  const canSave = workout.exercises.some((e) => e.sets.some((s) => s.weightKg > 0 || s.reps > 0))

  return (
    <div className="space-y-4" data-testid="workout-editor">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px]">
          <span className="label-tag">{t('training.editor.title')}</span>
          <input
            type="text"
            maxLength={60}
            aria-label={t('training.editor.title')}
            placeholder={t('training.editor.titlePlaceholder')}
            value={workout.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>
        <label className="text-[13px]">
          <span className="label-tag">{t('training.editor.day')}</span>
          <input
            type="date"
            aria-label={t('training.editor.day')}
            value={workout.day}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && update({ day: e.target.value })}
            className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>
      </div>

      {/* --- Übungen --------------------------------------------------- */}
      {workout.exercises.map((ex, index) => {
        const def = exerciseByKey(ex.exerciseKey)
        const name = def ? pick(def.name, locale) : ex.customName || t('training.editor.custom')
        return (
          <section key={ex.id} className="border border-line bg-surface-sunken" aria-label={name}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold uppercase tracking-[0.04em]">
                  {index + 1}. {name}
                </p>
                {def && <p className="text-[11px] text-ink-muted">{t(`training.muscles.names.${def.muscle}`)}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t('training.editor.removeExercise')}: ${name}`}
                onClick={() => update({ exercises: workout.exercises.filter((e) => e.id !== ex.id) })}
              >
                <Trash2 size={14} aria-hidden />
              </Button>
            </div>

            <ol className="divide-y divide-line">
              {ex.sets.map((set, i) => {
                const est = e1rm(set)
                return (
                  <li key={set.id} className="grid gap-2 px-3 py-2 sm:grid-cols-[2rem_6.5rem_7.5rem_1fr_auto] sm:items-end">
                    <span className="readout pt-1 text-[12px] text-ink-muted">{i + 1}</span>
                    <label className="text-[12px]">
                      <span className="label-tag">kg</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.5}
                        min={0}
                        max={1000}
                        aria-label={`${t('training.editor.set')} ${i + 1}: ${t('training.editor.weight')}`}
                        value={set.weightKg || ''}
                        onChange={(e) => patchSet(ex.id, set.id, { weightKg: Math.max(0, Number(e.target.value) || 0) })}
                        className="readout mt-1 min-h-11 w-full border border-line bg-surface px-2 text-[16px]"
                      />
                    </label>
                    <div className="text-[12px]">
                      <span className="label-tag">{t('training.editor.reps')}</span>
                      <div className="mt-1 flex items-stretch border border-line bg-surface">
                        <button
                          type="button"
                          aria-label={`${t('training.editor.set')} ${i + 1}: ${t('training.editor.fewerReps')}`}
                          onClick={() => patchSet(ex.id, set.id, { reps: Math.max(1, set.reps - 1) })}
                          className="min-h-11 w-10 text-ink-secondary hover:bg-accent-quiet"
                        >
                          <Minus size={14} aria-hidden className="mx-auto" />
                        </button>
                        <span className="readout flex flex-1 items-center justify-center text-[16px]" aria-live="polite">
                          {set.reps}
                        </span>
                        <button
                          type="button"
                          aria-label={`${t('training.editor.set')} ${i + 1}: ${t('training.editor.moreReps')}`}
                          onClick={() => patchSet(ex.id, set.id, { reps: Math.min(100, set.reps + 1) })}
                          className="min-h-11 w-10 text-ink-secondary hover:bg-accent-quiet"
                        >
                          <Plus size={14} aria-hidden className="mx-auto" />
                        </button>
                      </div>
                    </div>
                    <TapScale
                      label={`${t('training.editor.set')} ${i + 1}: RIR`}
                      value={set.rir}
                      onChange={(v) => patchSet(ex.id, set.id, { rir: v })}
                      min={0}
                      max={5}
                    />
                    <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
                      <p className="readout text-[12px] text-ink-secondary" data-testid="set-e1rm">
                        {set.weightKg > 0 ? (
                          <>
                            e1RM {formatNumber(est, locale, 1)} kg
                            {set.reps > E1RM_RELIABLE_MAX_REPS && <span className="ml-1 text-ink-muted">{t('training.editor.e1rmUnsure')}</span>}
                            <span className="ml-2 text-ink-muted">{formatNumber(setVolume(set), locale, 0)} kg·Wdh</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label={`${t('training.editor.removeSet')} ${i + 1}`}
                        onClick={() => removeSet(ex.id, set.id)}
                      >
                        <Trash2 size={13} aria-hidden />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2">
              <Button variant="outline" size="sm" onClick={() => addSet(ex, true)} disabled={ex.sets.length >= 20}>
                <Copy size={13} aria-hidden />
                {t('training.editor.repeatSet')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addSet(ex, false)} disabled={ex.sets.length >= 20}>
                <Plus size={13} aria-hidden />
                {t('training.editor.newSet')}
              </Button>
            </div>
          </section>
        )
      })}

      {/* --- Übung suchen ---------------------------------------------- */}
      {workout.exercises.length < 20 && (
        <div className="border border-dashed border-line-strong p-3">
          <label className="text-[13px]">
            <span className="label-tag">{t('training.editor.addExercise')}</span>
            <input
              type="search"
              aria-label={t('training.editor.addExercise')}
              placeholder={t('training.editor.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2" role="listbox" aria-label={t('training.editor.results')}>
            {hits.map((e) => (
              <button
                key={e.key}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => addExercise(e.key)}
                className={cn(
                  'min-h-11 rounded-pill border border-line px-3 text-[12px] hover:border-accent hover:bg-accent-quiet',
                )}
              >
                {pick(e.name, locale)}
                <span className="ml-1.5 text-[10px] tracking-wide text-ink-muted uppercase">{t(`training.muscles.names.${e.muscle}`)}</span>
              </button>
            ))}
          </div>
          {query.trim().length >= 3 && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-[12px]">
                <span className="label-tag">{t('training.editor.customName')}</span>
                <input
                  type="text"
                  maxLength={80}
                  aria-label={t('training.editor.customName')}
                  value={customName || query}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
                />
              </label>
              <Button variant="outline" size="sm" onClick={() => addExercise(CUSTOM_EXERCISE, (customName || query).trim())}>
                {t('training.editor.addCustom')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* --- Dauer und Anstrengung → Tagebuch --------------------------- */}
      <div className="grid gap-4 border border-line bg-surface-sunken p-3 sm:grid-cols-2">
        <RangeField
          label={t('training.editor.duration')}
          value={workout.durationMin ?? 0}
          onChange={(v) => update({ durationMin: v === 0 ? null : v })}
          min={0}
          max={240}
          step={5}
          unit="min"
          format={(v) => (v === 0 ? '—' : String(v))}
        />
        <TapScale label={t('training.editor.rpe')} value={workout.rpe} onChange={(v) => update({ rpe: v })} max={10} lowLabel={t('diary.scale.easy')} highLabel={t('diary.scale.maximal')} />
        <p className="text-[12px] text-ink-secondary sm:col-span-2">
          {workout.durationMin && workout.rpe
            ? t('training.editor.toDiary', { load: workout.durationMin * workout.rpe })
            : t('training.editor.toDiaryHint')}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="md" disabled={!canSave} onClick={() => onSave({ ...workout, updatedAt: new Date().toISOString() })}>
          {t('training.editor.save')}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
    </div>
  )
}
