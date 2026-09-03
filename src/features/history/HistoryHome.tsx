import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarDays, ChevronRight, ListOrdered } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TrendChart } from '@/components/charts/TrendChart'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { journey } from '@/domain/journey'
import { PerformanceJourney } from '@/components/signature/PerformanceJourney'
import { formatDate, formatMeasurement, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type Range = '1m' | '3m' | '6m' | '1y' | 'all'
const RANGES: Range[] = ['1m', '3m', '6m', '1y', 'all']
const RANGE_DAYS: Record<Range, number | null> = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, all: null }

/**
 * Der Verlauf (Konzept §21): jeder Test über die Zeit, mit Zeitraum.
 *
 * «Verbessert» heisst: der letzte Wert im Zeitraum ist in Richtung des Tests
 * besser als der erste. Die Richtung kommt aus dem Test — eine schnellere
 * Zeit ist eine Verbesserung, obwohl die Zahl kleiner wird. Unter zwei
 * Messungen im Zeitraum gibt es keine Entwicklung, sondern den Satz dazu.
 */
export function HistoryHome() {
  const { slug: routeSlug } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const [range, setRange] = useState<Range>('all')
  const [selected, setSelected] = useState<string | null>(routeSlug ?? null)
  const nodes = useMemo(
    () => journey(data.results, data.assessments),
    [data.results, data.assessments],
  )

  const measured = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of data.results) if (r.score != null) counts.set(r.testSlug, (counts.get(r.testSlug) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => getTest(slug))
      .filter((x): x is NonNullable<typeof x> => x != null)
  }, [data.results])

  const activeSlug = selected ?? measured[0]?.slug ?? null
  const test = activeSlug ? getTest(activeSlug) : null
  const points = useMemo(() => {
    if (!activeSlug) return []
    const days = RANGE_DAYS[range]
    const cutoff = days == null ? 0 : Date.now() - days * 86_400_000
    return data.results
      .filter((r) => r.testSlug === activeSlug && r.score != null && new Date(r.performedAt).getTime() >= cutoff)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
      .map((r) => ({ performedAt: r.performedAt, value: r.score as number }))
  }, [data.results, activeSlug, range])

  if (measured.length === 0) {
    return <EmptyState title={t('historyHome.emptyTitle')} body={t('historyHome.emptyBody')} />
  }

  const first = points[0] ?? null
  const last = points[points.length - 1] ?? null
  const delta = first && last && points.length >= 2 ? last.value - first.value : null
  const deltaPercent = delta != null && first && first.value !== 0 ? (delta / Math.abs(first.value)) * 100 : null
  const improved =
    delta == null || !test ? null : delta === 0 ? 'stable' : (test.direction === 'higher_is_better') === delta > 0 ? 'improved' : 'declined'
  const fmt = (v: number) => {
    if (!test) return String(v)
    const m = formatMeasurement(v, test.primaryUnit, locale, data.profile.unitSystem)
    return `${m.value}${m.unit ? ` ${m.unit}` : ''}`
  }

  return (
    <>
      <ScreenHeader eyebrow={t('historyHome.eyebrow')} title={t('historyHome.title')} intro={t('historyHome.intro')} />

      {/* Die Journey steht vor den Zahlen: sie beantwortet «was ist
          passiert», die Kurve darunter «wie genau». */}
      {nodes.length >= 2 && (
        <Panel float className="rise mb-4">
          <PanelHeader title={t('journey.title')} subtitle={t('journey.hint')} />
          <PerformanceJourney nodes={nodes} className="px-4 pt-4 pb-5" />
        </Panel>
      )}

      <Panel ticked>
        <PanelHeader
          title={test?.name[locale] ?? ''}
          subtitle={test?.primaryUnit}
          action={
            measured.length > 1 ? (
              <select
                aria-label={t('historyHome.chooseTest')}
                value={activeSlug ?? ''}
                onChange={(e) => setSelected(e.target.value)}
                className="h-11 max-w-[200px] border border-line bg-surface-sunken px-2 text-[16px]"
              >
                {measured.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name[locale]}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        <div className="overflow-x-auto border-b border-line px-4 py-2">
          <SegmentedControl<Range>
            label={t('historyHome.range.all')}
            value={range}
            onChange={setRange}
            options={RANGES.map((key) => ({ value: key, label: t(`historyHome.range.${key}`) }))}
          />
        </div>
        {points.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink-secondary">{t('historyHome.noneInRange')}</p>
        ) : (
          <>
            {test && (
              <div className="px-2 py-3">
                <TrendChart points={points} unit={test.primaryUnit} locale={locale} label={test.name[locale]} height={220} showFit />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[13px] sm:grid-cols-4">
              <div>
                <dt className="label-tag">{t('historyHome.first')}</dt>
                <dd className="readout mt-0.5">{first ? fmt(first.value) : '—'}</dd>
                <dd className="text-[11px] text-ink-muted">{first ? formatDate(first.performedAt, locale) : ''}</dd>
              </div>
              <div>
                <dt className="label-tag">{t('historyHome.latest')}</dt>
                <dd className="readout mt-0.5">{last ? fmt(last.value) : '—'}</dd>
                <dd className="text-[11px] text-ink-muted">{last ? formatDate(last.performedAt, locale) : ''}</dd>
              </div>
              <div>
                <dt className="label-tag">{t('historyHome.change')}</dt>
                <dd className="readout mt-0.5">
                  {delta == null ? '—' : `${delta > 0 ? '+' : ''}${fmt(delta)}`}
                  {deltaPercent != null && <span className="ml-1 text-ink-muted">({deltaPercent > 0 ? '+' : ''}{formatNumber(deltaPercent, locale, 1)} %)</span>}
                </dd>
              </div>
              <div>
                <dt className="label-tag">{t('historyHome.development')}</dt>
                <dd className={cn('mt-0.5 font-semibold', improved === 'improved' && 'text-delta-up', improved === 'declined' && 'text-delta-down')}>
                  {improved ? t(`historyHome.${improved}`) : t('historyHome.insufficient')}
                </dd>
              </div>
            </dl>
          </>
        )}
      </Panel>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { to: '/verlauf/werte', icon: ListOrdered, title: t('historyHome.values'), hint: t('historyHome.valuesHint') },
          { to: '/verlauf/kalender', icon: CalendarDays, title: t('historyHome.calendar'), hint: t('historyHome.calendarHint') },
          { to: '/verlauf/erinnerungen', icon: Bell, title: t('historyHome.reminders'), hint: t('historyHome.remindersHint') },
        ].map(({ to, icon: Icon, title, hint }) => (
          <li key={to}>
            <Link to={to} className="panel flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-accent-quiet">
              <Icon size={18} className="shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{title}</span>
                <span className="block text-[12px] text-ink-secondary">{hint}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
