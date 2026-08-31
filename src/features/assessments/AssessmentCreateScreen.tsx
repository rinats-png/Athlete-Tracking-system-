import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Clock, TriangleAlert } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TEST_BATTERIES, batteryDimensions, disciplineBattery } from '@/data/testBatteries'
import { provenanceOf, additionReason } from '@/data/documentCoverage'
import { TEST_CATALOG, getTest, type TestDefinition } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { defaultAssessmentTitle } from '@/domain/assessment'
import { cn } from '@/lib/utils'
import type { AppLocale, PerformanceDimension, TestCategory } from '@/types/domain'

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
 * Diagnostik anlegen.
 *
 * Der Bildschirm beantwortet vor dem Start die Frage, die nach dem Test
 * niemand mehr beantworten kann: welche Achsen deckt dieser Termin ab? Eine
 * fehlende Achse ist danach nicht nachtragbar, ohne den Vergleich zu
 * verzerren — deshalb steht die Lücke hier und nicht im Ergebnis.
 *
 * REIHENFOLGE ALS AUSSAGE: erst die Tests der eigenen Sportart mit ihrer
 * Begründung, dann die ergänzenden derselben Sportart, dann der übrige
 * Katalog, zuletzt die allgemeinen Batterien. Vorher standen die allgemeinen
 * Batterien und die Fähigkeitsgliederung ganz oben — damit sah der Bildschirm
 * aus wie eine Auswahl aus einem Fitnesskatalog, und der Zusammenhang zur
 * Sportart war nirgends sichtbar.
 *
 * Der allgemeine Weg bleibt vollwertig und ist erreichbar, ohne die
 * Sportartauswahl rückgängig zu machen.
 */
export function AssessmentCreateScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const navigate = useNavigate()
  const { data, saveAssessment } = useAppData()

  // Die Batterie zur gewählten Disziplin steht vorn und ist vorausgewählt.
  // Wer keine Disziplin angegeben hat, bekommt wie bisher die allgemeine —
  // die Liste wird nicht kürzer, nur anders sortiert.
  const suggested = useMemo(
    () => disciplineBattery(data.profile.disciplineId),
    [data.profile.disciplineId],
  )
  const batteries = useMemo(
    () => (suggested ? [suggested, ...TEST_BATTERIES] : TEST_BATTERIES),
    [suggested],
  )
  const initialSlug = suggested?.slug ?? 'general_fitness'

  // Herkunft eines Tests bezogen auf die gewählte Disziplin. Ohne Disziplin
  // gibt es keine Herkunft — dann steht bei keinem Test etwas.
  const disciplineId = data.profile.disciplineId
  const origin = (slug: string) =>
    disciplineId ? provenanceOf(disciplineId, slug) : 'unknown'

  const [batterySlug, setBatterySlug] = useState<string | null>(initialSlug)
  const [selected, setSelected] = useState<string[]>(
    () =>
      (suggested ?? TEST_BATTERIES.find((b) => b.slug === 'general_fitness'))?.testSlugs ?? [],
  )
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  const coreTests = useMemo(
    () => (discipline?.coreTests ?? []).map(getTest).filter((x): x is TestDefinition => x != null),
    [discipline],
  )
  const optionalTests = useMemo(
    () =>
      (discipline?.optionalTests ?? []).map(getTest).filter((x): x is TestDefinition => x != null),
    [discipline],
  )
  const disciplineSlugs = useMemo(
    () => new Set([...coreTests, ...optionalTests].map((test) => test.slug)),
    [coreTests, optionalTests],
  )
  const otherTests = useMemo(
    () =>
      TEST_CATALOG.filter((test) => !disciplineSlugs.has(test.slug)).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [disciplineSlugs],
  )
  // Aufgeklappt nur, wenn jemand danach fragt: der übrige Katalog ist lang,
  // und er ist hier nicht die Hauptsache.
  const [showOther, setShowOther] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const [performedOn, setPerformedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState('')

  const chooseBattery = (slug: string) => {
    const battery = batteries.find((b) => b.slug === slug)
    if (!battery) return
    setBatterySlug(slug)
    setSelected(battery.testSlugs)
  }

  const toggleTest = (slug: string) => {
    setSelected((current) => {
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug]
      // Sobald von der Vorlage abgewichen wird, ist es keine Batterie mehr.
      const battery = batterySlug ? batteries.find((b) => b.slug === batterySlug) : null
      const matches =
        battery &&
        battery.testSlugs.length === next.length &&
        battery.testSlugs.every((s) => next.includes(s))
      if (!matches) setBatterySlug(null)
      return next
    })
  }

  const covered = useMemo(() => {
    const set = new Set<PerformanceDimension>()
    for (const slug of selected) {
      const test = getTest(slug)
      if (!test) continue
      for (const d of Object.keys(test.dimensionMetrics)) set.add(d as PerformanceDimension)
    }
    return set
  }, [selected])

  const missing = PERFORMANCE_DIMENSIONS.filter((d) => !covered.has(d))

  const estimatedMinutes = useMemo(
    () =>
      batterySlug
        ? (batteries.find((b) => b.slug === batterySlug)?.durationMinutes ?? 0)
        : // Ohne Vorlage grob geschätzt: 20 Minuten je Test inklusive Pause.
          selected.length * 20,
    [batterySlug, batteries, selected.length],
  )

  /**
   * Eine Testzeile mit Kästchen, Begründung und Herkunft.
   *
   * Die Begründung steht direkt an der Zeile und nicht in einem Tooltip: wer
   * entscheiden soll, ob er einen Test mitmacht, muss lesen können, wozu er
   * dient — auf dem Telefon gibt es kein Überfahren mit der Maus.
   */
  const testRow = (test: TestDefinition, isCore: boolean) => {
    const checked = selected.includes(test.slug)
    const why = disciplineId ? additionReason(disciplineId, test.slug) : null
    return (
      <li key={test.slug} className="border-t border-line first:border-t-0">
        <label className="flex cursor-pointer gap-3 px-4 py-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleTest(test.slug)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">{test.name[locale]}</span>
            <span className="mt-0.5 block text-[11px] tracking-wide text-ink-muted uppercase">
              {t(`dimensions.${test.dimension}`)}
              {isCore && ` · ${t('assessments.core')}`}
              {origin(test.slug) === 'document' && ` · ${t('assessments.fromDocument')}`}
              {origin(test.slug) === 'addition' && ` · ${t('assessments.addedForDiscipline')}`}
              {test.setting === 'lab' && ` · ${t('tests.labSetting')}`}
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-ink-secondary">
              {why ?? test.summary[locale]}
            </span>
          </span>
        </label>
      </li>
    )
  }

  const start = () => {
    if (selected.length === 0) return
    const id = newId()
    const now = new Date().toISOString()
    saveAssessment({
      id,
      title: title.trim() || defaultAssessmentTitle(batterySlug, performedOn, locale),
      batterySlug,
      performedOn,
      status: 'in_progress',
      plannedTestSlugs: selected,
      readiness: null,
      nextAssessmentOn: null,
      createdAt: now,
      completedAt: null,
    })
    navigate(`/diagnostik/${id}`)
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/diagnostik">
          <ArrowLeft size={14} aria-hidden />
          {t('assessments.back')}
        </Link>
      </Button>

      <header className="mb-4">
        <h1 className="font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {t('assessments.newTitle')}
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
          {t('assessments.newIntro')}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 md:col-span-2 lg:col-span-3">
          {discipline ? (
            <>
              <Panel>
                <PanelHeader
                  title={t('assessments.forSport', { sport: discipline.name[locale] })}
                  subtitle={discipline.rationale[locale]}
                />
                <ul>{coreTests.map((test) => testRow(test, true))}</ul>
              </Panel>

              {optionalTests.length > 0 && (
                <Panel>
                  <PanelHeader
                    title={t('assessments.moreForSport', { sport: discipline.name[locale] })}
                    subtitle={t('assessments.moreForSportHint')}
                  />
                  <ul>{optionalTests.map((test) => testRow(test, false))}</ul>
                </Panel>
              )}
            </>
          ) : (
            <Panel>
              <PanelHeader
                title={t('assessments.noSportTitle')}
                subtitle={t('assessments.noSportHint')}
              />
              <div className="px-4 py-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/tests">{t('tests.chooseSport')}</Link>
                </Button>
              </div>
            </Panel>
          )}

          {/* Der übrige Katalog: erreichbar, aber nicht die Hauptsache. Erst
              hier taucht die Gliederung nach Fähigkeiten wieder auf. */}
          <Panel>
            <PanelHeader
              title={t('assessments.otherTests')}
              subtitle={t('assessments.otherTestsHint')}
              action={
                <Button variant="ghost" size="sm" onClick={() => setShowOther((v) => !v)}>
                  {showOther ? t('actions.close') : t('assessments.showOther')}
                </Button>
              }
            />
            {showOther && (
              <>
                <div className="overflow-x-auto border-b border-line px-4 py-3">
                  <SegmentedControl<Filter>
                    label={t('tests.filter')}
                    value={filter}
                    onChange={setFilter}
                    options={FILTERS.map((key) => ({
                      value: key,
                      label: key === 'all' ? t('tests.all') : t(`categoriesShort.${key}`),
                    }))}
                  />
                </div>
                <ul className="max-h-[420px] overflow-y-auto">
                  {otherTests
                    .filter((test) => filter === 'all' || test.category === filter)
                    .map((test) => testRow(test, false))}
                </ul>
              </>
            )}
          </Panel>

          {/* Die allgemeinen Batterien bleiben vollwertig — für alle, die
              ihren Zustand über alle Achsen messen wollen statt für eine
              Disziplin. */}
          <Panel>
            <PanelHeader
              title={t('assessments.generalBatteries')}
              subtitle={t('assessments.generalBatteriesHint')}
            />
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {batteries.map((battery) => (
                <li key={battery.slug}>
                  <button
                    type="button"
                    onClick={() => chooseBattery(battery.slug)}
                    aria-pressed={batterySlug === battery.slug}
                    className={cn(
                      'flex h-full w-full flex-col items-start gap-1 p-4 text-left transition-colors',
                      batterySlug === battery.slug
                        ? 'bg-accent/12 ring-1 ring-inset ring-accent'
                        : 'bg-plane hover:bg-surface-sunken',
                    )}
                  >
                    <span className="text-[14px] font-semibold">
                      {battery.name[locale]}
                      {battery.slug === suggested?.slug ? (
                        <span className="ml-2 align-middle text-[10px] font-medium tracking-wide text-accent uppercase">
                          {t('assessments.suggested')}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[12px] leading-snug text-ink-secondary">
                      {battery.description[locale]}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                      <Clock size={12} aria-hidden />
                      {t('assessments.minutes', { count: battery.durationMinutes })} ·{' '}
                      {t('assessments.testCount', { count: battery.testSlugs.length })} ·{' '}
                      {t('assessments.axisCount', { count: batteryDimensions(battery).length })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/* Umfang des Termins. Der Satz darunter sagt, was zusätzliche Tests
              bewirken — und was sie nicht bewirken: eine breitere Grundlage
              macht die EINORDNUNG belastbarer, nicht die einzelne Messung
              genauer. Der Unterschied ist wichtig, sonst verspricht die App
              Präzision, die kein Test liefert. */}
          <Panel ticked>
            <PanelHeader title={t('assessments.scope')} />
            <div className="flex items-baseline gap-4 px-4 pt-3">
              <span>
                <span className="readout font-display text-[30px] leading-none font-bold">
                  {selected.length}
                </span>
                <span className="ml-1.5 text-[12px] text-ink-muted">
                  {t('assessments.testsWord')}
                </span>
              </span>
              <span>
                <span className="readout font-display text-[30px] leading-none font-bold">
                  {covered.size}
                  <span className="text-[16px] text-ink-muted">/{PERFORMANCE_DIMENSIONS.length}</span>
                </span>
                <span className="ml-1.5 text-[12px] text-ink-muted">
                  {t('assessments.axesWord')}
                </span>
              </span>
            </div>
            <p className="px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
              {t('assessments.scopeHint')}
            </p>
          </Panel>

          <Panel>
            <PanelHeader title={t('assessments.coverage')} />
            <ul className="space-y-1.5 px-4 py-4">
              {PERFORMANCE_DIMENSIONS.map((dimension) => (
                <li key={dimension} className="flex items-center gap-2 text-[13px]">
                  <span
                    aria-hidden
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-full',
                      covered.has(dimension) ? 'bg-accent' : 'bg-line',
                    )}
                  />
                  <span className={covered.has(dimension) ? '' : 'text-ink-muted'}>
                    {t(`dimensions.${dimension}`)}
                  </span>
                </li>
              ))}
            </ul>
            {missing.length > 0 && (
              <p className="flex gap-2 border-t border-line bg-warning/10 px-4 py-3 text-[12px] leading-snug text-ink-secondary">
                <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden />
                <span>{t('assessments.missingAxes', { count: missing.length })}</span>
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t('assessments.details')} />
            <div className="space-y-4 px-4 py-4">
              <label className="block">
                <span className="label-tag">{t('assessments.date')}</span>
                <input
                  type="date"
                  value={performedOn}
                  onChange={(e) => setPerformedOn(e.target.value)}
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
                />
              </label>
              <label className="block">
                <span className="label-tag">{t('assessments.titleField')}</span>
                <input
                  type="text"
                  value={title}
                  maxLength={120}
                  placeholder={defaultAssessmentTitle(batterySlug, performedOn, locale)}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
                />
              </label>
              <p className="text-[12px] text-ink-muted">
                {t('assessments.estimate', { count: estimatedMinutes })}
              </p>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                disabled={selected.length === 0}
                onClick={start}
              >
                <Check size={15} strokeWidth={2.5} aria-hidden />
                {t('assessments.start')}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
