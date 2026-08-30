import { useTranslation } from 'react-i18next'
import { RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EMPTY_QUERY, searchWorthwhile, type HistoryQuery } from '@/domain/historyQuery'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import type { StoredAssessment } from '@/lib/store/localStore'
import type { TestCategory } from '@/types/domain'

const CATEGORIES: TestCategory[] = [
  'endurance',
  'max_strength',
  'strength_endurance',
  'power',
  'speed',
  'agility',
  'conditioning',
]

/**
 * Filterleiste der Historie (§66, §67, §68).
 *
 * Alle Filter in einer Reihe über der Liste, wie es die Vorgabe verlangt.
 * Ein «Zurücksetzen» ist immer erreichbar: ein Filter, aus dem man nicht
 * mehr herausfindet, sieht aus wie verlorene Daten.
 */
export function HistoryFilters({
  query,
  onChange,
  assessments,
  resultCount,
}: {
  query: HistoryQuery
  onChange: (patch: Partial<HistoryQuery>) => void
  assessments: StoredAssessment[]
  resultCount: number
}) {
  const { t } = useTranslation()
  const dirty = JSON.stringify(query) !== JSON.stringify(EMPTY_QUERY)

  return (
    <div className="mb-4 border border-line bg-plane px-3 py-3">
      <div className="flex flex-wrap items-end gap-3">
        {searchWorthwhile() && (
          <label className="min-w-[180px] flex-1">
            <span className="label-tag flex items-center gap-1">
              <Search size={12} aria-hidden />
              {t('history.search')}
            </span>
            <input
              type="search"
              value={query.search}
              placeholder={t('history.searchPlaceholder')}
              onChange={(e) => onChange({ search: e.target.value })}
              className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[15px]"
            />
          </label>
        )}

        <label className="min-w-[150px]">
          <span className="label-tag">{t('history.category')}</span>
          <select
            value={query.category}
            onChange={(e) => onChange({ category: e.target.value as HistoryQuery['category'] })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
          >
            <option value="all">{t('tests.all')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[150px]">
          <span className="label-tag">{t('table.dimension')}</span>
          <select
            value={query.dimension}
            onChange={(e) => onChange({ dimension: e.target.value as HistoryQuery['dimension'] })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
          >
            <option value="all">{t('tests.all')}</option>
            {PERFORMANCE_DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {t(`dimensions.${d}`)}
              </option>
            ))}
          </select>
        </label>

        {assessments.length > 0 && (
          <label className="min-w-[170px]">
            <span className="label-tag">{t('nav.tests')}</span>
            <select
              value={query.assessmentId}
              onChange={(e) => onChange({ assessmentId: e.target.value })}
              className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
            >
              <option value="all">{t('tests.all')}</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title ?? a.performedOn}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="min-w-[140px]">
          <span className="label-tag">{t('history.from')}</span>
          <input
            type="date"
            value={query.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
          />
        </label>

        <label className="min-w-[140px]">
          <span className="label-tag">{t('history.to')}</span>
          <input
            type="date"
            value={query.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
          />
        </label>

        <label className="min-w-[150px]">
          <span className="label-tag">{t('history.sort')}</span>
          <select
            value={query.sort}
            onChange={(e) => onChange({ sort: e.target.value as HistoryQuery['sort'] })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2 text-[14px]"
          >
            {(['newest', 'oldest', 'best', 'worst'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`history.sortBy.${s}`)}
              </option>
            ))}
          </select>
        </label>

        {dirty && (
          <Button variant="ghost" size="md" onClick={() => onChange(EMPTY_QUERY)}>
            <RotateCcw size={14} aria-hidden />
            {t('history.reset')}
          </Button>
        )}
      </div>

      <p className="mt-2 text-[12px] text-ink-muted">
        {t('history.matching', { count: resultCount })}
        {(query.sort === 'best' || query.sort === 'worst') && ` · ${t('history.sortNote')}`}
      </p>
      <span className="sr-only" role="status">
        {t('history.matching', { count: resultCount })}
      </span>
    </div>
  )
}
