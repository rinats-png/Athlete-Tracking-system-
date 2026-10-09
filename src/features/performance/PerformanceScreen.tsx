import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { RadarProfile } from '@/components/charts/RadarProfile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { confidenceTone } from '@/features/today/AthleteToday'
import { useAppData } from '@/lib/store/AppDataProvider'
import { athleteToday } from '@/domain/performanceView'
import { radarProfile } from '@/lib/scoring'
import { axisLabel } from '@/data/profileAxes'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

/**
 * Performance — das Leistungsprofil des Athleten (Produktdoktrin §8–§10, §14).
 *
 * Kein Gesamtwert: er würde fehlende Dimensionen verdecken. Stattdessen steht
 * zuerst die Datenbasis (Data Confidence, Abdeckung der Kerntests als Anzahl,
 * Alter), dann jede Dimension mit Perzentil, Referenz, Alter der Messung und
 * — wo es keine gibt — dem Hinweis «keine Referenz» oder «keine Daten».
 */
export function PerformanceScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, workouts } = useAppData()
  const { profile, results } = data
  const today = useMemo(() => athleteToday({ profile, results, workouts }), [profile, results, workouts])
  const axes = useMemo(() => radarProfile(results.filter((r) => r.score != null), 'population', new Date(), profile.disciplineId), [results, profile.disciplineId])
  const discipline = disciplineById(profile.disciplineId)
  const covered = today.dimensions.filter((d) => d.status === 'referenced').length
  const oldest = today.dimensions.reduce<number | null>((acc, d) => (d.ageDays != null && (acc == null || d.ageDays > acc) ? d.ageDays : acc), null)
  const names = (slugs: string[]) => slugs.map((s) => pick(getTest(s)?.name, locale) ?? s).join(', ')
  const best = today.strongest
  const change = today.changes.find((c) => c.report.verdict === 'better' || c.report.verdict === 'worse') ?? null
  const nextTest = today.nextTest ? getTest(today.nextTest.slug) : null

  return (
    <div data-testid="performance-screen">
      <ScreenHeader eyebrow={pick(discipline?.name, locale) ?? t('performance.eyebrow')} title={t('performance.title')} intro={t('performance.intro')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel float data-testid="perf-basis">
          <PanelHeader
            title={t('performance.basis.title')}
            action={
              <span className={cn('inline-flex items-center gap-1.5 rounded-pill bg-accent-quiet px-3 py-1 text-[12px] font-medium', confidenceTone(today.confidence.level))} data-testid="perf-confidence">
                <ShieldCheck size={14} aria-hidden />
                {t('performance.confidence', { level: t(`performance.level.${today.confidence.level}`) })}
              </span>
            }
          />
          <dl className="px-4 pb-3 text-[14px]">
            {today.coverage && (
              <Row label={t('performance.basis.coverage')} value={t('athleteToday.coverage', { measured: today.coverage.measured, total: today.coverage.total })} testId="perf-coverage" />
            )}
            <Row label={t('performance.basis.oldest')} value={oldest == null ? '–' : t('performance.basis.days', { count: oldest })} />
            <Row label={t('performance.basis.references')} value={t('performance.basis.referencesValue', { covered, total: today.dimensions.length })} />
          </dl>
          {today.coverage && today.coverage.missing.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-[12px] leading-relaxed text-ink-secondary" data-testid="perf-missing">
              {t('performance.basis.missing', { names: names(today.coverage.missing) })}
            </p>
          )}
          {today.coverage && today.coverage.stale.length > 0 && (
            <p className="px-4 pb-2 text-[12px] text-ink-secondary">{t('performance.basis.stale', { count: today.coverage.stale.length })}</p>
          )}
          <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('performance.basis.noTotal')}</p>
        </Panel>

        <Panel>
          <PanelHeader title={t('performance.radar.title')} />
          <div className="px-2 pb-2">
            <RadarProfile axes={axes} mode="population" locale={locale} />
          </div>
          <p className="px-4 pb-3 text-center text-[12px] text-ink-muted">{t('performance.radar.note')}</p>
        </Panel>

        <Panel className="lg:col-span-2" data-testid="perf-dimensions">
          <PanelHeader title={t('performance.dimensions.title')} note={t('performance.dimensions.sub')} />
          <ul className="px-4 pb-3">
            {today.dimensions.map((d) => (
              <li key={d.axisId} className="border-t border-line py-3 first:border-t-0" data-testid={`dim-${d.axisId}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium">{axisLabel(d.axisId, t, locale)}</span>
                  {d.status === 'referenced' ? (
                    <span className="readout text-[18px]">P{Math.round(d.score ?? 0)}</span>
                  ) : (
                    <span className="rounded-pill border border-line px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-ink-secondary uppercase">
                      {t(`performance.status.${d.status}`)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-sunken" aria-hidden>
                  {d.status === 'referenced' ? (
                    <i className="block h-full rounded-pill bg-accent" style={{ width: `${Math.max(2, Math.min(100, d.score ?? 0))}%` }} />
                  ) : (
                    <i className="block h-full w-full" style={{ background: 'repeating-linear-gradient(135deg, var(--line) 0 2px, transparent 2px 6px)' }} />
                  )}
                </div>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {d.status === 'unmeasured'
                    ? t('performance.dimensions.unmeasured')
                    : [
                        d.status === 'noReference' ? t('performance.dimensions.noReference') : t('performance.dimensions.reference'),
                        d.ageDays != null ? t('performance.dimensions.age', { count: d.ageDays }) : null,
                        d.open ? t('performance.dimensions.open') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Card title={t('performance.cards.strongest')} testId="perf-strongest">
            {best ? (
              <>
                <p className="font-display text-[22px] leading-tight font-bold">{axisLabel(best.axisId, t, locale)}</p>
                <p className="text-[12px] text-ink-secondary">P{Math.round(best.score ?? 0)}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-secondary">{t('performance.cards.none')}</p>
            )}
          </Card>
          <Card title={t('performance.cards.gap')} testId="perf-gap">
            {today.gap ? (
              <>
                <p className="font-display text-[22px] leading-tight font-bold">{axisLabel(today.gap.axisId, t, locale)}</p>
                <p className="text-[12px] text-ink-secondary">{t('performance.cards.gapNote', { score: Math.round(today.gap.score ?? 0) })}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-secondary">{t('performance.cards.gapNone')}</p>
            )}
          </Card>
          <Card title={t('performance.cards.change')} testId="perf-change">
            {change ? (
              <>
                <p className="font-display text-[22px] leading-tight font-bold">{pick(getTest(change.slug)?.name, locale) ?? change.slug}</p>
                <p className="text-[12px] text-ink-secondary">{t(`athleteToday.changes.verdict.${change.report.verdict}`)}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-secondary">{t('performance.cards.changeNone')}</p>
            )}
          </Card>
          <Card title={t('performance.cards.next')} testId="perf-next">
            {nextTest && today.nextTest ? (
              <>
                <p className="font-display text-[22px] leading-tight font-bold">{pick(nextTest.name, locale)}</p>
                <p className="text-[12px] text-ink-secondary">{t(`overview.reasons.${today.nextTest.reasons[0] ?? 'core'}`)}</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-secondary">{t('performance.cards.none')}</p>
            )}
          </Card>
        </div>

        <Panel className="lg:col-span-2">
          <ul className="grid gap-px bg-line sm:grid-cols-4">
            {(
              [
                ['/verlauf', 'history'],
                ['/analyse', 'analysis'],
                ['/bericht', 'report'],
                ['/uebersicht', 'overview'],
              ] as const
            ).map(([to, key]) => (
              <li key={key} className="bg-surface">
                <Link to={to} className="flex min-h-12 items-center px-4 text-[14px] text-accent-text underline-offset-2 hover:underline">
                  {t(`performance.links.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line py-2 first:border-t-0" data-testid={testId}>
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="readout text-right">{value}</dd>
    </div>
  )
}

function Card({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <Panel className="px-4 py-4" data-testid={testId}>
      <p className="label-tag mb-1">{title}</p>
      {children}
    </Panel>
  )
}
