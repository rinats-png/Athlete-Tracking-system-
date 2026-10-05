import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { planMode } from '@/domain/planMode'
import { MUSCLES, type Muscle } from '@/data/exercises'
import { exerciseImageUrl } from '@/data/exerciseImages'
import { addCustomExercise, removeCustomExercise, searchLibrary } from '@/domain/exerciseLibrary'
import { cn } from '@/lib/utils'

/** Übungsbibliothek (Trainingsbereich Etappe 15): Katalog mit Bildern, dazu eigene Übungen. */
const field = 'mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]'

export function ExerciseLibraryScreen() {
  const { t, i18n } = useTranslation()
  const { customExercises, saveCustomExercises } = useAppData()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [name, setName] = useState('')
  const [newMuscle, setNewMuscle] = useState<Muscle | ''>('')
  const [message, setMessage] = useState<string | null>(null)
  const lang = i18n.language.startsWith('de') ? 'de' : 'en'
  const entries = useMemo(() => searchLibrary(query, customExercises, muscle, lang), [query, customExercises, muscle, lang])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const add = () => {
    const r = addCustomExercise(customExercises, name, newMuscle || null, newId)
    if (!r.ok) return setMessage(t(`exlib.err.${r.error}`))
    saveCustomExercises(r.list)
    setName('')
    setMessage(null)
  }

  return (
    <div data-testid="exercise-library">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('exlib.title')} intro={t('exlib.intro')} />

      <Panel className="mb-4" data-testid="exlib-add">
        <PanelHeader title={t('exlib.addTitle')} />
        <div className="space-y-3 px-4 pb-4">
          <label className="block text-[13px]"><span className="label-tag">{t('exlib.name')}</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="exlib-name" className={field} /></label>
          <label className="block text-[13px]"><span className="label-tag">{t('exlib.muscle')}</span>
            <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as Muscle | '')} data-testid="exlib-muscle" className={field}>
              <option value="">{t('exlib.noMuscle')}</option>
              {MUSCLES.map((m) => <option key={m} value={m}>{t(`training.muscles.names.${m}`)}</option>)}
            </select>
          </label>
          <button type="button" data-testid="exlib-add-button" onClick={add} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('exlib.add')}</button>
          {message && <p role="alert" className="text-[13px] text-accent-text" data-testid="exlib-message">{message}</p>}
          <p className="text-[12px] text-ink-secondary">{t('exlib.note')}</p>
        </div>
      </Panel>

      <label className="mb-3 block text-[13px]"><span className="label-tag">{t('exlib.search')}</span><input value={query} onChange={(e) => setQuery(e.target.value)} data-testid="exlib-search" className={field} /></label>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('exlib.muscle')}>
        <button type="button" aria-pressed={muscle == null} onClick={() => setMuscle(null)} data-testid="exlib-muscle-all" className={cn('min-h-11 rounded-pill border px-4 text-[13px]', muscle == null ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>{t('tpl.goal.all')}</button>
        {MUSCLES.map((m) => (
          <button key={m} type="button" aria-pressed={muscle === m} onClick={() => setMuscle(m)} data-testid={`exlib-muscle-${m}`} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', muscle === m ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>{t(`training.muscles.names.${m}`)}</button>
        ))}
      </div>

      <Panel data-testid="exlib-list">
        <PanelHeader title={t('exlib.count', { n: entries.length })} />
        {entries.length === 0 ? (
          <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('exlib.none')}</p>
        ) : (
          <ul>
            {entries.map((e) => {
              const img = e.key ? exerciseImageUrl(e.key) : null
              return (
                <li key={e.key ?? e.customId} className="flex items-center gap-3 border-t border-line px-4 py-2 first:border-t-0" data-testid={e.customId ? `exlib-custom-${e.customId}` : `exlib-item-${e.key}`}>
                  {img ? <img src={img} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" /> : <span className="h-10 w-10 shrink-0 rounded bg-surface-sunken" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px]">{e.name}</span>
                    <span className="block text-[11px] text-ink-secondary">{e.muscle ? t(`training.muscles.names.${e.muscle}`) : t('exlib.noMuscle')}{e.customId ? ` · ${t('exlib.own')}` : ''}</span>
                  </span>
                  {e.customId && <button type="button" data-testid={`exlib-remove-${e.customId}`} onClick={() => saveCustomExercises(removeCustomExercise(customExercises, e.customId!))} className="min-h-11 px-3 text-[13px] text-accent-text underline underline-offset-2">{t('own.delete')}</button>}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
