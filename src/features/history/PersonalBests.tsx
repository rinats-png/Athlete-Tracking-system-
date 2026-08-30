import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { personalBests } from '@/domain/historyQuery'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import { formatResultValue } from '@/lib/resultView'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Bestleistungen je Test (§69).
 *
 * Das Datum steht immer dabei. Eine Bestleistung von vor zwei Jahren sagt
 * etwas anderes aus als eine von letzter Woche, und ohne das Datum sieht
 * beides gleich aus.
 *
 * Eingeklappt bei vielen Tests: eine Liste mit dreissig Zeilen über der
 * eigentlichen Historie wäre keine Übersicht mehr.
 */
export function PersonalBests({
  results,
  locale,
}: {
  results: StoredResult[]
  locale: AppLocale
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const [expanded, setExpanded] = useState(false)

  const bests = useMemo(() => personalBests(results), [results])
  if (bests.length === 0) return null

  const shown = expanded ? bests : bests.slice(0, 6)

  return (
    <Panel className="mb-4">
      <PanelHeader
        title={t('history.personalBests')}
        subtitle={t('history.personalBestsCount', { count: bests.length })}
      />
      <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((best) => {
          const test = getTest(best.testSlug)
          const stale = isStale(best.result.performedAt)
          return (
            <li key={best.testSlug} className="bg-plane">
              <Link
                to={`/tests/${best.testSlug}/details`}
                className="flex min-h-16 flex-col justify-center gap-0.5 px-4 py-3 transition-colors hover:bg-surface-sunken"
              >
                <span className="truncate text-[13px]">{test?.name[locale] ?? best.testSlug}</span>
                <span className="readout font-display text-[19px] leading-tight font-bold tabular-nums">
                  {formatResultValue(best.result, locale, data.profile.unitSystem)}
                </span>
                <span className={cn('text-[11px]', stale ? 'text-warning' : 'text-ink-muted')}>
                  {formatDate(best.result.performedAt, locale)}
                  {stale && ` · ${t('history.staleBest')}`}
                  {` · ${t('history.attempts', { count: best.attempts })}`}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {bests.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-line text-[13px] text-ink-secondary transition-colors hover:bg-surface-sunken"
        >
          {expanded ? t('history.showFewer') : t('history.showAll', { count: bests.length })}
          <ChevronDown
            size={14}
            aria-hidden
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
        </button>
      )}
    </Panel>
  )
}

/** Älter als ein Jahr: die Bestleistung beschreibt nicht mehr den Ist-Stand. */
function isStale(performedAt: string): boolean {
  return Date.now() - new Date(performedAt).getTime() > 365 * 86_400_000
}
