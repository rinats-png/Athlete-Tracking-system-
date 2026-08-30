import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, TrendingUp } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '@/components/charts/TrendChart'
import { RecentTests } from '@/features/dashboard/RecentTests'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppData } from '@/lib/store/AppDataProvider'
import { toSummaries } from '@/lib/resultView'
import { HistoryFilters } from './HistoryFilters'
import { PersonalBests } from './PersonalBests'
import { EMPTY_QUERY, queryHistory, type HistoryQuery } from '@/domain/historyQuery'
import { getTest } from '@/data/testCatalog'
import { formatDate } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

export function HistoryScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data, deleteResult } = useAppData()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [query, setQuery] = useState<HistoryQuery>(EMPTY_QUERY)

  /** Gefilterte Auswahl. Dieselbe Funktion nutzt auch der Bericht. */
  const filtered = useMemo(() => queryHistory(data, query, locale), [data, query, locale])

  const summaries = useMemo(() => toSummaries(filtered, locale), [filtered, locale])

  /** Nur Tests mit mindestens zwei Messungen ergeben einen Verlauf. */
  const trendable = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of data.results) counts.set(r.testSlug, (counts.get(r.testSlug) ?? 0) + 1)
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .map(([slug]) => getTest(slug))
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [data.results])

  const activeSlug = selectedSlug ?? trendable[0]?.slug ?? null
  const activeTest = activeSlug ? getTest(activeSlug) : null

  const points = useMemo(() => {
    if (!activeSlug) return []
    return data.results
      .filter((r) => r.testSlug === activeSlug && r.score != null)
      .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime())
      .map((r) => ({ performedAt: r.performedAt, value: r.score as number }))
  }, [data.results, activeSlug])

  if (data.results.length === 0) {
    return <EmptyState title={t('history.emptyTitle')} body={t('history.emptyBody')} />
  }

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label-tag">{t('nav.history')}</span>
          <h1 className="mt-1 font-display text-[30px] leading-none font-bold sm:text-[38px]">
            {t('history.title')}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-secondary">
            {t('history.count', { count: data.results.length })}
          </p>
        </div>
        {/* Der Verlauf zeigt einzelne Messungen, die Analyse ihre
            Entwicklung — zwei Fragen, zwei Bildschirme. */}
        <Button asChild variant="outline" size="md">
          <Link to="/analyse">
            <TrendingUp size={15} aria-hidden />
            {t('analysis.title')}
          </Link>
        </Button>
      </header>

      <HistoryFilters
        query={query}
        onChange={(patch) => setQuery((q) => ({ ...q, ...patch }))}
        assessments={data.assessments}
        resultCount={filtered.length}
      />

      <PersonalBests results={data.results} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-5">
        {activeTest && points.length >= 2 && (
          <Panel className="lg:col-span-5">
            <PanelHeader
              title={t('dashboard.trend')}
              subtitle={`${activeTest.name[locale]} · ${activeTest.primaryUnit}`}
              action={
                trendable.length > 1 ? (
                  <select
                    aria-label={t('history.chooseTest')}
                    value={activeSlug ?? ''}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="h-11 max-w-[190px] border border-line bg-surface-sunken px-2 text-[13px]"
                  >
                    {trendable.map((test) => (
                      <option key={test.slug} value={test.slug}>
                        {test.name[locale]}
                      </option>
                    ))}
                  </select>
                ) : undefined
              }
            />
            <div className="px-2 py-3">
              <TrendChart
            showFit
                points={points}
                unit={activeTest.primaryUnit}
                locale={locale}
                label={activeTest.name[locale]}
                height={220}
              />
            </div>
          </Panel>
        )}

        <Panel className="lg:col-span-5">
          <PanelHeader title={t('history.allResults')} />
          <RecentTests tests={summaries} locale={locale} />
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader title={t('history.manage')} subtitle={t('history.manageHint')} />
          <ul className="divide-y divide-line">
            {data.results.slice(0, 30).map((result) => {
              const test = getTest(result.testSlug)
              return (
                <li key={result.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{test?.name[locale] ?? result.testSlug}</p>
                    <p className="text-[11px] text-ink-muted">
                      {formatDate(result.performedAt, locale)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('history.deleteResult', {
                      test: test?.name[locale] ?? result.testSlug,
                    })}
                    onClick={() => deleteResult(result.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </Button>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
