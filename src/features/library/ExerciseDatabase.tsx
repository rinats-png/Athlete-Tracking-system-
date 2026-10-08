import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EMPTY_FILTER, filterExercises, type ExerciseFilter } from '@/domain/library'
import type { Complexity, LibraryExercise } from '@/domain/libraryTypes'
import { REGISTRY_TO_LEGACY } from '@/data/library/legacyExerciseMap'
import { exerciseImageUrl } from '@/data/exerciseImages'
import { cn } from '@/lib/utils'
import { ComplexityDot, CoachPill } from './bits'

const field = 'mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]'

/** Die wichtigsten Muster als Schnellfilter; alle übrigen über die Auswahl. */
const QUICK_PATTERNS = ['SQUAT_KNEE_DOMINANT', 'HINGE_HIP_EXTENSION', 'HORIZONTAL_PUSH', 'VERTICAL_PULL', 'JUMP_PLYOMETRIC', 'ANTI_EXTENSION_STABILITY', 'MOBILITY_ROM', 'CONDITIONING_CYCLIC_MIXED']

/**
 * Übungsdatenbank (128 kuratierte Übungen, v1.1): Suche und kontrollierte
 * Filter. Die Filter entsprechen den Feldern der Datenbank — keine freie
 * Taxonomie. Belastungshinweise stehen als «prüfen», nie als «verboten».
 */
export function ExerciseDatabase({ exercises }: { exercises: LibraryExercise[] }) {
  const { t } = useTranslation()
  const [f, setF] = useState<ExerciseFilter>(EMPTY_FILTER)
  const list = useMemo(() => filterExercises(exercises, f), [exercises, f])
  const set = (patch: Partial<ExerciseFilter>) => setF((x) => ({ ...x, ...patch }))
  const patterns = useMemo(() => [...new Set(exercises.flatMap((e) => e.patterns))].sort(), [exercises])
  const equipment = useMemo(() => [...new Set(exercises.flatMap((e) => e.equipment))].sort(), [exercises])
  const categories = useMemo(() => [...new Set(exercises.map((e) => e.category))], [exercises])

  const chip = (active: boolean) => cn('min-h-11 rounded-pill border px-4 text-[13px]', active ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')

  return (
    <div data-testid="exdb">
      <label className="mb-3 block text-[13px]"><span className="label-tag">{t('exlib.search')}</span><input value={f.query} onChange={(e) => set({ query: e.target.value })} data-testid="exdb-search" className={field} /></label>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t('lib.filter.pattern')}>
        <button type="button" aria-pressed={f.pattern == null} onClick={() => set({ pattern: null })} className={chip(f.pattern == null)} data-testid="exdb-pattern-all">{t('tpl.goal.all')}</button>
        {QUICK_PATTERNS.filter((p) => patterns.includes(p)).map((p) => (
          <button key={p} type="button" aria-pressed={f.pattern === p} onClick={() => set({ pattern: f.pattern === p ? null : p })} className={chip(f.pattern === p)} data-testid={`exdb-pattern-${p}`}>{t(`lib.pattern.${p}`)}</button>
        ))}
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px]"><span className="label-tag">{t('lib.filter.pattern')}</span>
          <select value={f.pattern ?? ''} onChange={(e) => set({ pattern: e.target.value || null })} className={field} data-testid="exdb-pattern">
            <option value="">{t('tpl.goal.all')}</option>
            {patterns.map((p) => <option key={p} value={p}>{t(`lib.pattern.${p}`)}</option>)}
          </select>
        </label>
        <label className="block text-[13px]"><span className="label-tag">{t('lib.filter.equipment')}</span>
          <select value={f.equipment ?? ''} onChange={(e) => set({ equipment: e.target.value || null })} className={field} data-testid="exdb-equipment">
            <option value="">{t('tpl.goal.all')}</option>
            {equipment.map((q) => <option key={q} value={q}>{t(`lib.eq.${q}`)}</option>)}
          </select>
        </label>
        <label className="block text-[13px]"><span className="label-tag">{t('lib.filter.category')}</span>
          <select value={f.category ?? ''} onChange={(e) => set({ category: e.target.value || null })} className={field} data-testid="exdb-category">
            <option value="">{t('tpl.goal.all')}</option>
            {categories.map((c) => <option key={c} value={c}>{t(`lib.cat.${c}`)}</option>)}
          </select>
        </label>
        <label className="block text-[13px]"><span className="label-tag">{t('lib.filter.complexity')}</span>
          <select value={f.complexity ?? ''} onChange={(e) => set({ complexity: (e.target.value || null) as Complexity | null })} className={field} data-testid="exdb-complexity">
            <option value="">{t('tpl.goal.all')}</option>
            {(['LOW', 'MODERATE', 'HIGH'] as const).map((c) => <option key={c} value={c}>{t(`lib.complexity.${c}`)}</option>)}
          </select>
        </label>
      </div>
      <label className="mb-4 flex min-h-11 items-center gap-3 text-[14px]">
        <input type="checkbox" checked={f.selfGuidedOnly} onChange={(e) => set({ selfGuidedOnly: e.target.checked })} data-testid="exdb-self" className="size-5" />
        {t('lib.filter.selfGuided')}
      </label>

      <Panel data-testid="exdb-list">
        <PanelHeader title={t('exlib.count', { n: list.length })} />
        {list.length === 0 ? (
          <p className="px-4 pb-4 text-[14px] text-ink-secondary">{t('exlib.none')}</p>
        ) : (
          <ul>
            {list.map((e) => {
              const legacy = REGISTRY_TO_LEGACY[e.id]
              const img = legacy ? exerciseImageUrl(legacy) : null
              return (
                <li key={e.id} className="border-t border-line first:border-t-0">
                  <Link to={`/plan/uebungen/${e.id}`} data-testid={`exdb-item-${e.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-sunken">
                    {img ? <img src={img} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-surface-sunken"><ComplexityDot level={e.complexity} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px]">{e.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-secondary">
                        <span>{t(`lib.cat.${e.category}`)}</span>
                        <span aria-hidden>·</span>
                        <span>{t(`lib.complexity.${e.complexity}`)}</span>
                        <CoachPill gate={e.coachGate} />
                        {e.caution.slice(0, 2).map((c) => <span key={c} className="rounded-pill bg-warning/15 px-2 py-0.5 text-warning">{t(`lib.cautionShort.${c}`)}</span>)}
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden className="text-ink-muted" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
