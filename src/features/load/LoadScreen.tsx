import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { StatTile } from '@/components/ui/StatTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { MetricMeta } from '@/features/shared/MetricMeta'
import { useLocale } from '@/features/shared/useLocale'
import { Gate } from '@/features/billing/Gate'
import { useAppData } from '@/lib/store/AppDataProvider'
import { toDay } from '@/domain/diary'
import { LOAD_SPIKE_PCT, loadSpike, loadSummary, type LoadSummary } from '@/domain/load'
import type { DerivedMetric } from '@/domain/metricContract'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DurabilityPanel } from './DurabilityPanel'

/**
 * Belastung — Trainingslast und Ermüdungsresistenz (Master-Spezifikation D4, D6).
 *
 * Oben die Last aus dem Tagebuch (Session-RPE nach Foster): Summen über 7,
 * 28 und 90 Tage, zwölf Wochen als Balken, die Veränderung zur Vorwoche,
 * Monotonie und Strain. Darunter die Ermüdungsresistenz aus Tests.
 *
 * Alles beschreibend. Keine Ampel, kein «Sweet Spot», kein Verletzungsrisiko:
 * eine Wochenlast ist nur mit den eigenen Wochen vergleichbar, und der
 * Hinweis auf eine hohe Woche ist ein Anlass hinzuschauen (§19 Regel 7).
 */
export function LoadScreen() {
  const { t } = useTranslation()
  const { diary } = useAppData()
  const today = toDay(new Date())
  const summary = useMemo(() => loadSummary(diary, today), [diary, today])
  const hasLoad = summary.weeks.some((w) => w.daysWithEntry > 0)

  return (
    <>
      <ScreenHeader eyebrow={t('load.eyebrow')} title={t('load.title')} intro={t('load.intro')} />

      {!hasLoad ? (
        <EmptyState
          title={t('load.emptyTitle')}
          body={t('load.emptyBody')}
          action={
            <Link to="/tagebuch" className="underline underline-offset-2">
              {t('load.toDiary')}
            </Link>
          }
        />
      ) : (
        <LoadPanels summary={summary} />
      )}

      <Gate feature="durability">
        <DurabilityPanel className="mb-4" />
      </Gate>

      <p className="mb-6 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('load.noAdvice')}</p>
    </>
  )
}

function LoadPanels({ summary }: { summary: LoadSummary }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const spike = loadSpike(summary)
  const n = (m: DerivedMetric<number>, digits = 0) => (m.value == null ? '—' : formatNumber(m.value, locale, digits))
  const max = Math.max(1, ...summary.weeks.map((w) => w.load))

  return (
    <>
      <Panel className="mb-4" data-testid="load-sums">
        <PanelHeader title={t('load.sums.title')} subtitle={t('load.sums.why')} />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {([
            ['7', summary.load7],
            ['28', summary.load28],
            ['90', summary.load90],
          ] as const).map(([days, metric]) => (
            <StatTile
              key={days}
              label={t('load.sums.days', { days })}
              value={n(metric)}
              unit="AU"
              meta={<MetricMeta metric={metric} />}
            />
          ))}
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="load-weeks">
        <PanelHeader
          title={t('load.weeks.title')}
          subtitle={
            summary.typicalWeek == null
              ? t('load.weeks.noTypical')
              : t('load.weeks.typical', { value: formatNumber(summary.typicalWeek, locale, 0) })
          }
        />
        <div className="px-4 pb-2 pt-4">
          <div className="flex h-32 items-end gap-1" role="img" aria-label={t('load.weeks.aria')}>
            {summary.weeks.map((w, i) => (
              <div key={w.end} className="flex h-full flex-1 flex-col justify-end" title={`${formatDate(w.end, locale)} · ${formatNumber(w.load, locale, 0)} AU`}>
                <div
                  data-week={w.end}
                  className={cn(
                    'w-full rounded-t-[3px]',
                    w.daysWithEntry === 0 ? 'h-px bg-line' : i === summary.weeks.length - 1 ? 'bg-accent' : 'bg-ink-muted/50',
                    w.daysWithEntry > 0 && w.daysWithEntry < 3 && 'opacity-50',
                  )}
                  style={w.daysWithEntry === 0 ? undefined : { height: `${Math.max(2, (w.load / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>{formatDate(summary.weeks[0].end, locale)}</span>
            <span>{t('load.weeks.thisWeek')}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{t('load.weeks.legend')}</p>
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="load-week-detail">
        <PanelHeader title={t('load.detail.title')} subtitle={t('load.detail.why')} />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatTile
            label={t('load.detail.change')}
            value={summary.weeklyChangePct.value == null ? '—' : `${summary.weeklyChangePct.value > 0 ? '+' : ''}${formatNumber(summary.weeklyChangePct.value, locale, 0)}`}
            unit="%"
            meta={<MetricMeta metric={summary.weeklyChangePct} />}
          />
          <StatTile label={t('load.detail.monotony')} value={n(summary.monotony, 2)} meta={<MetricMeta metric={summary.monotony} />} />
          <StatTile label={t('load.detail.strain')} value={n(summary.strain)} unit="AU" meta={<MetricMeta metric={summary.strain} />} />
        </div>
        <div className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
          {spike.spike ? (
            <p data-testid="load-spike">{t('load.detail.spike', { pct: spike.pct, threshold: LOAD_SPIKE_PCT })}</p>
          ) : spike.pct != null ? (
            <p>{t('load.detail.vsTypical', { pct: `${spike.pct > 0 ? '+' : ''}${spike.pct}` })}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-ink-muted">{t('load.detail.method')}</p>
        </div>
      </Panel>
    </>
  )
}
