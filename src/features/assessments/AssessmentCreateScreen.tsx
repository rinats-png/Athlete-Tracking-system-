import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Clock, TriangleAlert } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TEST_BATTERIES, batteryDimensions } from '@/data/testBatteries'
import { TEST_CATALOG, getTest } from '@/data/testCatalog'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { defaultAssessmentTitle } from '@/domain/assessment'
import { cn } from '@/lib/utils'
import type { AppLocale, PerformanceDimension } from '@/types/domain'

/**
 * Diagnostik anlegen.
 *
 * Der Bildschirm beantwortet vor dem Start die Frage, die nach dem Test
 * niemand mehr beantworten kann: welche Achsen deckt dieser Termin ab? Eine
 * fehlende Achse ist danach nicht nachtragbar, ohne den Vergleich zu
 * verzerren — deshalb steht die Lücke hier und nicht im Ergebnis.
 */
export function AssessmentCreateScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const navigate = useNavigate()
  const { saveAssessment } = useAppData()

  const [batterySlug, setBatterySlug] = useState<string | null>('general_fitness')
  const [selected, setSelected] = useState<string[]>(
    () => TEST_BATTERIES.find((b) => b.slug === 'general_fitness')?.testSlugs ?? [],
  )
  const [performedOn, setPerformedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState('')

  const chooseBattery = (slug: string) => {
    const battery = TEST_BATTERIES.find((b) => b.slug === slug)
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
      const battery = batterySlug ? TEST_BATTERIES.find((b) => b.slug === batterySlug) : null
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
        ? (TEST_BATTERIES.find((b) => b.slug === batterySlug)?.durationMinutes ?? 0)
        : // Ohne Vorlage grob geschätzt: 20 Minuten je Test inklusive Pause.
          selected.length * 20,
    [batterySlug, selected.length],
  )

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

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader title={t('assessments.battery')} subtitle={t('assessments.batteryHint')} />
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {TEST_BATTERIES.map((battery) => (
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
                    <span className="text-[14px] font-semibold">{battery.name[locale]}</span>
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

          <Panel>
            <PanelHeader
              title={t('assessments.tests')}
              subtitle={t('assessments.testsHint', { count: selected.length })}
            />
            <ul className="max-h-[420px] overflow-y-auto">
              {TEST_CATALOG.map((test) => (
                <li key={test.slug} className="border-t border-line first:border-t-0">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(test.slug)}
                      onChange={() => toggleTest(test.slug)}
                      className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{test.name[locale]}</span>
                      <span className="block text-[11px] text-ink-muted">
                        {t(`dimensions.${test.dimension}`)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
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
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[15px]"
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
                  className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[15px]"
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
