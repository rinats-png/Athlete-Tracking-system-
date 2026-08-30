import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TEST_CATALOG } from '@/data/testCatalog'
import { useAppData } from '@/lib/store/AppDataProvider'
import { formatDate } from '@/lib/format'
import type { AppLocale, TestCategory } from '@/types/domain'

type Filter = TestCategory | 'all'

const FILTERS: Filter[] = ['all', 'endurance', 'max_strength', 'strength_endurance', 'power', 'agility']

export function TestCatalogScreen() {
  const [searchParams] = useSearchParams()
  // Aus einer laufenden Diagnostik heraus geöffnet: der Termin wird an den
  // Test weitergereicht, sonst landet das Ergebnis ausserhalb des Termins.
  const assessmentId = searchParams.get('diagnostik')
  const assessmentQuery = assessmentId ? `?diagnostik=${assessmentId}` : ''

  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const [filter, setFilter] = useState<Filter>('all')
  const { data } = useAppData()

  /** Letzte Durchführung je Test — zeigt sofort, was noch aussteht. */
  const lastByTest = useMemo(() => {
    const map = new Map<string, string>()
    for (const result of data.results) {
      const seen = map.get(result.testSlug)
      if (!seen || result.performedAt > seen) map.set(result.testSlug, result.performedAt)
    }
    return map
  }, [data.results])

  const tests = useMemo(
    () =>
      TEST_CATALOG.filter((test) => filter === 'all' || test.category === filter).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [filter],
  )

  return (
    <>
      <header className="mb-4">
        <span className="label-tag">{t('nav.tests')}</span>
        <h1 className="mt-1 font-display text-[30px] leading-none font-bold sm:text-[38px]">
          {t('tests.title')}
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[13px] text-ink-secondary">{t('tests.intro')}</p>
      </header>

      <div className="mb-4 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <SegmentedControl<Filter>
          label={t('tests.filter')}
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((key) => ({
            value: key,
            // Kurzform: die volle Kategoriebezeichnung bricht im Chip um.
            label: key === 'all' ? t('tests.all') : t(`categoriesShort.${key}`),
          }))}
        />
      </div>

      <Panel>
        <PanelHeader title={t('tests.catalog')} subtitle={t('tests.count', { count: tests.length })} />
        <ul className="divide-y divide-line">
          {tests.map((test) => {
            const last = lastByTest.get(test.slug)
            return (
              <li key={test.slug}>
                <Link
                  to={`/tests/${test.slug}${assessmentQuery}`}
                  // min-h-16 hält die Zeile über der 44-px-Grenze, auch wenn
                  // der Name nur einzeilig ist.
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-quiet"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{test.name[locale]}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {t(`dimensions.${test.dimension}`)}
                      {last && ` · ${t('tests.lastRun', { date: formatDate(last, locale) })}`}
                      {!last && ` · ${t('tests.neverRun')}`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </Panel>
    </>
  )
}
