import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TEST_CATALOG, getTest, type TestDefinition } from '@/data/testCatalog'
import { disciplineById, coreSlugs, optionalSlugs } from '@/data/sportProfiles'
import { provenanceOf } from '@/data/documentCoverage'
import { useAppData } from '@/lib/store/AppDataProvider'
import { formatDate } from '@/lib/format'
import { SportSelector } from './SportSelector'
import type { AppLocale, TestCategory } from '@/types/domain'

type Filter = TestCategory | 'all'

const FILTERS: Filter[] = [
  'all',
  'endurance',
  'max_strength',
  'strength_endurance',
  'power',
  'speed',
  'agility',
  'conditioning',
]

/**
 * Testbereich, sportartgeführt.
 *
 * Die Reihenfolge ist die Aussage: erst die Sportart, dann ihre Kerntests,
 * dann die ergänzenden, und erst danach der vollständige Katalog nach
 * Fähigkeiten. Vorher stand die Fähigkeitsgliederung ganz oben — damit sah
 * der Bereich aus wie ein allgemeiner Fitnesskatalog, und die Verbindung
 * zwischen Sportart und Test war nirgends sichtbar.
 *
 * Der vollständige Katalog bleibt erreichbar. Wer einen Test sucht, den seine
 * Disziplin nicht führt, soll ihn finden; er steht nur nicht mehr an erster
 * Stelle.
 */
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

  const discipline = data.profile.disciplineId
    ? disciplineById(data.profile.disciplineId)
    : undefined

  /** Letzte Durchführung je Test — zeigt sofort, was noch aussteht. */
  const lastByTest = useMemo(() => {
    const map = new Map<string, string>()
    for (const result of data.results) {
      const seen = map.get(result.testSlug)
      if (!seen || result.performedAt > seen) map.set(result.testSlug, result.performedAt)
    }
    return map
  }, [data.results])

  const core = useMemo(
    () => (discipline ? coreSlugs(discipline) : []).map(getTest).filter((x): x is TestDefinition => x != null),
    [discipline],
  )
  const optional = useMemo(
    () =>
      (discipline ? optionalSlugs(discipline) : []).map(getTest).filter((x): x is TestDefinition => x != null),
    [discipline],
  )
  const disciplineSlugs = useMemo(
    () => new Set([...core, ...optional].map((test) => test.slug)),
    [core, optional],
  )

  const rest = useMemo(
    () =>
      TEST_CATALOG.filter((test) => filter === 'all' || test.category === filter)
        .filter((test) => !disciplineSlugs.has(test.slug))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [filter, disciplineSlugs],
  )

  const row = (test: TestDefinition) => {
    const last = lastByTest.get(test.slug)
    const origin = discipline ? provenanceOf(discipline.id, test.slug) : 'unknown'
    return (
      <li key={test.slug}>
        <Link
          to={`/tests/${test.slug}${assessmentQuery}`}
          // min-h-16 hält die Zeile über der 44-px-Grenze, auch wenn der Name
          // nur einzeilig ist.
          className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-quiet"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{test.name[locale]}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {t(`dimensions.${test.dimension}`)}
              {origin === 'document' && ` · ${t('assessments.fromDocument')}`}
              {origin === 'addition' && ` · ${t('assessments.addedForDiscipline')}`}
              {test.setting === 'lab' && ` · ${t('tests.labSetting')}`}
              {last && ` · ${t('tests.lastRun', { date: formatDate(last, locale) })}`}
              {!last && ` · ${t('tests.neverRun')}`}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
        </Link>
        {/* Der Weg zur Detailseite liegt neben dem Weg zur Messung und nicht
            dahinter: wer wissen will, wie ein Test geht, will ihn nicht schon
            starten. */}
        <div className="-mt-1 px-4 pb-2">
          <Link
            to={`/tests/${test.slug}/details`}
            className="inline-flex min-h-11 items-center text-[12px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {t('testDetail.open')}
          </Link>
        </div>
      </li>
    )
  }

  return (
    <>
      <header className="mb-4">
        <span className="label-tag">{t('nav.tests')}</span>
        <h1 className="mt-1 font-display text-[30px] leading-none font-bold sm:text-[38px]">
          {t('tests.title')}
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[13px] text-ink-secondary">{t('tests.intro')}</p>
      </header>

      <div className="mb-4">
        <SportSelector />
      </div>

      {discipline && (
        <>
          <Panel className="mb-4">
            <PanelHeader
              title={t('tests.coreFor', { sport: discipline.name[locale] })}
              subtitle={discipline.rationale[locale]}
            />
            <ul className="divide-y divide-line">{core.map(row)}</ul>
          </Panel>

          {optional.length > 0 && (
            <Panel className="mb-4">
              <PanelHeader
                title={t('tests.optionalFor', { sport: discipline.name[locale] })}
                subtitle={t('tests.optionalHint')}
              />
              <ul className="divide-y divide-line">{optional.map(row)}</ul>
            </Panel>
          )}
        </>
      )}

      <Panel>
        <PanelHeader
          title={discipline ? t('tests.otherTests') : t('tests.catalog')}
          subtitle={t('tests.count', { count: rest.length })}
        />
        <div className="-mx-px overflow-x-auto border-b border-line px-4 py-3">
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
        <ul className="divide-y divide-line">{rest.map(row)}</ul>
      </Panel>
    </>
  )
}
