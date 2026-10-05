import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { planMode } from '@/domain/planMode'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { INTENTS, type Phase } from '@/domain/trainingTypes'
import { addExercise, addOwnSession, copyWeek, createOwnBlock, deleteOwnSession, duplicateSession, removeExercise, type EditResult, type ExerciseResult } from '@/domain/trainingBlock'
import { blockText, sessionName, sessionSource } from '@/features/plan/planText'
import { searchExercises } from '@/data/exercises'
import { exerciseImageUrl } from '@/data/exerciseImages'
import { PlanExportButton, PlanImportButton } from '@/features/plan/PlanFileTools'
import { cn } from '@/lib/utils'

/**
 * Eigener Plan (Trainingsbereich Etappe 4): Name, Länge, Phase, dann Einheiten
 * von Hand. Eigene Einheiten sind die Entscheidung des Menschen: sie tragen
 * keine Evidenzangabe, keine Dosis aus dem Register und stehen als «Eigene
 * Einheit» da. Kopieren und Woche kopieren sparen Tipparbeit.
 */
const PHASES: Phase[] = ['GPP', 'BUILD', 'SPECIFIC', 'TAPER', 'TRANSITION']
const field = 'mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]'

/** Übungen einer eigenen Einheit: Suche im Katalog oder freier Name, Sätze, Wiederholungen, Last als Text. */
function Exercises({ block, session, onResult }: { block: import('@/lib/store/localStore').StoredTrainingBlock; session: import('@/lib/store/localStore').StoredPlannedSession; onResult: (r: ExerciseResult) => void }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<{ key: string | null; name: string } | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('')
  const [load, setLoad] = useState('')
  const de = i18n.language.startsWith('de')
  const hits = query.trim() ? searchExercises(query, 5) : []
  const now = () => new Date().toISOString()
  return (
    <div className="mt-2 border-t border-line pt-2" data-testid={`own-ex-${session.id}`}>
      {session.blocks.map((b, i) => (
        <p key={i} className="flex items-center justify-between gap-2 text-[14px]">
          <span>{blockText(b, t as never)}</span>
          {b.type === 'exercise' && <button type="button" data-testid={`own-ex-del-${session.id}-${i}`} onClick={() => onResult(removeExercise(block, session.id, i, now()))} className="min-h-11 px-2 text-[12px] text-accent-text underline underline-offset-2">{t('own.delete')}</button>}
        </p>
      ))}
      <label className="block text-[13px]">
        <span className="label-tag">{t('own.ex.search')}</span>
        <input value={picked ? picked.name : query} onChange={(e) => { setPicked(null); setQuery(e.target.value) }} data-testid={`own-ex-search-${session.id}`} className={field} />
      </label>
      {!picked && hits.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {hits.map((h) => {
            const img = exerciseImageUrl(h.key)
            return (
              <li key={h.key}>
                <button type="button" data-testid={`own-ex-hit-${h.key}`} onClick={() => setPicked({ key: h.key, name: de ? h.name.de : h.name.en })} className="flex min-h-11 items-center gap-2 rounded-pill border border-line px-3 text-[13px]">
                  {img && <img src={img} alt="" width={24} height={24} className="h-6 w-6 rounded object-cover" />}
                  {de ? h.name.de : h.name.en}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!picked && query.trim() && (
        <button type="button" data-testid={`own-ex-custom-${session.id}`} onClick={() => setPicked({ key: null, name: query.trim() })} className="mt-1.5 min-h-11 text-[13px] text-accent-text underline underline-offset-2">{t('own.ex.custom', { name: query.trim() })}</button>
      )}
      {picked && (
        <div className="mt-2 grid grid-cols-3 gap-3">
          <label className="block text-[13px]"><span className="label-tag">{t('own.ex.sets')}</span><input type="number" min={1} max={20} value={sets} onChange={(e) => setSets(e.target.value)} data-testid={`own-ex-sets-${session.id}`} className={field} /></label>
          <label className="block text-[13px]"><span className="label-tag">{t('own.ex.reps')}</span><input type="number" min={1} max={100} value={reps} onChange={(e) => setReps(e.target.value)} data-testid={`own-ex-reps-${session.id}`} className={field} /></label>
          <label className="block text-[13px]"><span className="label-tag">{t('own.ex.load')}</span><input value={load} maxLength={30} onChange={(e) => setLoad(e.target.value)} data-testid={`own-ex-load-${session.id}`} className={field} /></label>
          <button type="button" data-testid={`own-ex-add-${session.id}`} onClick={() => { onResult(addExercise(block, session.id, { exerciseKey: picked.key, name: picked.name, sets: Number(sets), reps: reps ? Number(reps) : null, load }, now())); setPicked(null); setQuery(''); setReps(''); setLoad('') }} className="col-span-3 min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('own.ex.add')}</button>
        </div>
      )}
    </div>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

export function OwnPlanScreen() {
  const { t } = useTranslation()
  const { data, trainingBlocks, saveTrainingBlock } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const [name, setName] = useState('')
  const [weeks, setWeeks] = useState(6)
  const [phase, setPhase] = useState<Phase>('BUILD')
  const [start, setStart] = useState(today())
  const [intent, setIntent] = useState<string>('MAX_STRENGTH')
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(1)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState<number | null>(null)
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [copyFrom, setCopyFrom] = useState(1)
  const [copyTo, setCopyTo] = useState(2)
  const [message, setMessage] = useState<string | null>(null)

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const apply = (r: EditResult | ExerciseResult) => {
    if (!r.ok) return setMessage(t(`own.err.${r.error}`))
    saveTrainingBlock(r.block)
    setMessage(null)
  }

  if (!block) {
    return (
      <div data-testid="own-create">
        <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('own.title')} intro={t('own.intro')} />
        <Panel>
          <div className="space-y-4 px-4 py-4">
            <label className="block text-[13px]"><span className="label-tag">{t('own.name')}</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="own-name" className={field} /></label>
            <label className="block text-[13px]"><span className="label-tag">{t('own.weeks')}</span><input type="number" min={1} max={26} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} data-testid="own-weeks" className={field} /></label>
            <label className="block text-[13px]"><span className="label-tag">{t('plan.phase.label')}</span>
              <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)} data-testid="own-phase" className={field}>{PHASES.map((p) => <option key={p} value={p}>{t(`plan.phase.${p}`)}</option>)}</select>
            </label>
            <label className="block text-[13px]"><span className="label-tag">{t('tpl.fit.start')}</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} data-testid="own-start" className={field} /></label>
            <button type="button" data-testid="own-create-button" disabled={!name.trim()} onClick={() => saveTrainingBlock(createOwnBlock({ id: newId(), name, family: familyOfDiscipline(data.profile.disciplineId), disciplineId: data.profile.disciplineId, phase, weeks, startDay: start, now: new Date().toISOString() }))} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
              {t('own.create')}
            </button>
          </div>
        </Panel>
        <Panel className="mt-4">
          <div className="px-4 py-4"><PlanImportButton /></div>
        </Panel>
      </div>
    )
  }

  const now = () => new Date().toISOString()
  const sorted = [...block.sessions].filter((s) => !s.removed).sort((a, b) => a.day - b.day || a.weekFrom - b.weekFrom)
  return (
    <div data-testid="own-plan">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={block.name || t('own.title')} intro={t('own.note')} />
      {message && <p role="alert" className="mb-3 rounded-md border border-line bg-accent-quiet px-3 py-2 text-[13px]" data-testid="own-message">{message}</p>}

      <Panel className="mb-4" data-testid="own-add">
        <PanelHeader title={t('own.addTitle')} />
        <div className="space-y-3 px-4 pb-4">
          <label className="block text-[13px]"><span className="label-tag">{t('own.intent')}</span>
            <select value={intent} onChange={(e) => setIntent(e.target.value)} data-testid="own-intent" className={field}>{INTENTS.map((i) => <option key={i} value={i}>{t(`plan.intent.${i}`)}</option>)}</select>
          </label>
          <label className="block text-[13px]"><span className="label-tag">{t('own.sessionTitle')}</span><input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} data-testid="own-title" className={field} /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-[13px]"><span className="label-tag">{t('own.day')}</span>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} data-testid="own-day" className={field}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{t(`plan.day.${n}`)}</option>)}</select>
            </label>
            <label className="block text-[13px]"><span className="label-tag">{t('own.fromWeek')}</span><input type="number" min={1} max={block.weeks} value={from} onChange={(e) => setFrom(Number(e.target.value))} data-testid="own-from" className={field} /></label>
            <label className="block text-[13px]"><span className="label-tag">{t('own.toWeek')}</span><input type="number" min={1} max={block.weeks} value={to ?? ''} placeholder={String(block.weeks)} onChange={(e) => setTo(e.target.value === '' ? null : Number(e.target.value))} data-testid="own-to" className={field} /></label>
          </div>
          <label className="block text-[13px]"><span className="label-tag">{t('own.minutes')}</span><input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} data-testid="own-minutes" className={field} /></label>
          <label className="block text-[13px]"><span className="label-tag">{t('own.noteLabel')}</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} data-testid="own-note" className={field} /></label>
          <button type="button" data-testid="own-add-button" onClick={() => apply(addOwnSession(block, { id: newId(), day, intent, title, note, minutes: minutes ? Number(minutes) : null, weekFrom: from, weekTo: to, highIntensity: false }, now()))} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
            {t('own.add')}
          </button>
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="own-list">
        <PanelHeader title={t('own.listTitle')} />
        {sorted.length === 0 ? (
          <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('own.none')}</p>
        ) : (
          <ul>
            {sorted.map((s) => (
              <li key={s.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`own-session-${s.id}`}>
                <p className="font-display text-[15px] font-bold">{t(`plan.day.${s.day}`)} · {sessionName(s, t)}</p>
                <p className="text-[12px] text-ink-secondary">
                  {sessionSource(s, t)}
                  {s.plannedDurationMin != null && ` · ${t('cal.minutes', { n: s.plannedDurationMin })}`}
                  {(s.weekFrom !== 1 || s.weekTo != null) && ` · ${s.weekFrom}–${s.weekTo ?? block.weeks}`}
                </p>
                {s.note && <p className="mt-1 text-[13px]">{s.note}</p>}
                {s.kind === 'own' && <Exercises block={block} session={s} onResult={apply} />}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-[12px]">
                    <span className="sr-only">{t('own.duplicateTo')}</span>
                    <select data-testid={`own-dup-${s.id}`} value="" onChange={(e) => e.target.value && apply(duplicateSession(block, s.id, Number(e.target.value), newId(), now()))} className="min-h-11 rounded-md border border-line bg-surface px-2 text-[14px]">
                      <option value="">{t('own.duplicateTo')}</option>
                      {[1, 2, 3, 4, 5, 6, 7].filter((n) => n !== s.day).map((n) => <option key={n} value={n}>{t(`plan.day.${n}`)}</option>)}
                    </select>
                  </label>
                  {s.kind === 'own' && <button type="button" data-testid={`own-del-${s.id}`} onClick={() => apply(deleteOwnSession(block, s.id, now()))} className="min-h-11 px-3 text-[13px] text-accent-text underline underline-offset-2">{t('own.delete')}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mb-4" data-testid="own-copyweek">
        <PanelHeader title={t('own.copyWeek')} />
        <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
          <label className="text-[13px]"><span className="label-tag">{t('own.copyFrom')}</span><input type="number" min={1} max={block.weeks} value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value))} data-testid="own-copy-from" className={cn(field, 'w-24')} /></label>
          <label className="text-[13px]"><span className="label-tag">{t('own.copyTo')}</span><input type="number" min={1} max={block.weeks} value={copyTo} onChange={(e) => setCopyTo(Number(e.target.value))} data-testid="own-copy-to" className={cn(field, 'w-24')} /></label>
          <button type="button" data-testid="own-copy-button" disabled={copyFrom === copyTo || copyFrom < 1 || copyTo < 1 || copyFrom > block.weeks || copyTo > block.weeks} onClick={() => { const r = copyWeek(block, copyFrom, copyTo, newId, now()); if (r.copied > 0) saveTrainingBlock(r.block); setMessage(t('own.copied', { copied: r.copied, skipped: r.skipped })) }} className="min-h-11 rounded-pill border border-accent px-5 text-[13px] font-semibold text-accent-text disabled:opacity-45">
            {t('own.copy')}
          </button>
        </div>
      </Panel>
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/plan/kalender" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('cal.link')}</Link>
        <PlanExportButton block={block} />
      </div>
    </div>
  )
}
