import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { StatTile } from '@/components/ui/StatTile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { MetricMeta } from '@/features/shared/MetricMeta'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { combatBreakdown, hyroxBreakdown, type HyroxBreakdown, type CombatBreakdown } from '@/domain/raceSim'
import { durabilityPoints, durabilitySeries } from '@/domain/durability'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Sportanalyse — HYROX-Simulation und Kampfsport-Runden (Master-Spezifikation D7).
 *
 * Zeigt die jüngste Simulation zerlegt: Läufe als Balken, Stationen mit
 * Anteil und Abweichung vom eigenen Median, Runden mit ihrem Abfall. Ein
 * Urteil («langsamer») nur jenseits der eigenen Streuung. Keine Normen,
 * keine Zielzeiten.
 */
export function SportAnalysisScreen() {
  const { t } = useTranslation()
  const { data } = useAppData()
  const hyrox = useMemo(() => hyroxBreakdown(data.results), [data.results])
  const combat = useMemo(() => combatBreakdown(data.results), [data.results])

  return (
    <>
      <ScreenHeader eyebrow={t('sportAnalysis.eyebrow')} title={t('sportAnalysis.title')} intro={t('sportAnalysis.intro')} />
      {hyrox ? <HyroxPanels b={hyrox} /> : <StartPanel slug="hyrox_simulation" title={t('sportAnalysis.hyrox.title')} body={t('sportAnalysis.hyrox.empty')} />}
      {combat ? <CombatPanel b={combat} /> : <StartPanel slug="combat_rounds" title={t('sportAnalysis.combat.title')} body={t('sportAnalysis.combat.empty')} />}
      <p className="mb-6 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('sportAnalysis.noNorms')}</p>
    </>
  )
}

function StartPanel({ slug, title, body }: { slug: string; title: string; body: string }) {
  const { t } = useTranslation()
  return (
    <Panel className="mb-4" data-testid={`start-${slug}`}>
      <PanelHeader title={title} />
      <div className="px-4 py-4 text-[13px] leading-relaxed text-ink-secondary">
        <p>{body}</p>
        <Link to={`/tests/${slug}`} className="mt-2 inline-block underline underline-offset-2">
          {t('sportAnalysis.start')}
        </Link>
      </div>
    </Panel>
  )
}

function Bars({ values, label, format, highlight }: { values: number[]; label: string; format: (v: number) => string; highlight?: (i: number) => boolean }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  // Die Balken beginnen nicht bei null: sonst sähen acht Läufe zwischen 4:40
  // und 5:20 gleich aus. Der Nullpunkt liegt knapp unter dem schnellsten Wert.
  const floor = Math.max(0, min - (max - min) * 0.6 - 1)
  return (
    <div className="flex h-28 items-end gap-1.5" role="img" aria-label={label}>
      {values.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="readout text-[10px] tabular-nums text-ink-muted">{format(v)}</span>
          <div
            className={cn('w-full rounded-t-[3px]', highlight?.(i) ? 'bg-accent' : 'bg-ink-muted/50')}
            style={{ height: `${Math.max(4, ((v - floor) / Math.max(1, max - floor)) * 100)}%` }}
          />
          <span className="text-[10px] text-ink-muted">{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

function HyroxPanels({ b }: { b: HyroxBreakdown }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const series = useMemo(() => durabilitySeries(durabilityPoints(data.results), 'hyrox_simulation'), [data.results])
  const mmss = (s: number) => formatDuration(Math.round(s))

  return (
    <>
      <Panel className="mb-4" data-testid="hyrox-summary">
        <PanelHeader title={t('sportAnalysis.hyrox.title')} subtitle={t('sportAnalysis.hyrox.of', { date: formatDate(b.day, locale), count: b.priorSims })} />
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <StatTile label={t('sportAnalysis.hyrox.total')} value={mmss(b.total)} emphasis />
          <StatTile label={t('sportAnalysis.hyrox.runs')} value={mmss(b.runTotal)} meta={`${formatNumber((b.runTotal / b.total) * 100, locale, 0)} %`} />
          <StatTile label={t('sportAnalysis.hyrox.stations')} value={mmss(b.stationTotal)} meta={`${formatNumber((b.stationTotal / b.total) * 100, locale, 0)} %`} />
          <StatTile label={t('sportAnalysis.hyrox.roxzone')} value={b.roxzone == null ? '—' : mmss(b.roxzone)} />
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="hyrox-runs">
        <PanelHeader
          title={t('sportAnalysis.hyrox.runDecayTitle')}
          subtitle={t('sportAnalysis.hyrox.runDecay', { pct: `${b.runDecayPct > 0 ? '+' : ''}${formatNumber(b.runDecayPct, locale, 1)}` })}
        />
        <div className="px-4 pb-3 pt-4">
          <Bars values={b.runs} label={t('sportAnalysis.hyrox.runsAria')} format={mmss} highlight={(i) => i >= 6} />
          <p className="mt-2 text-[12px] text-ink-secondary">
            {series.verdict === 'unknown'
              ? t('durability.verdict.unknown', { count: series.points.length })
              : t(`durability.verdict.${series.verdict}`, {
                  baseline: formatNumber(series.baselineMedian, locale, 1),
                  detectable: formatNumber(series.detectablePp, locale, 1),
                })}
          </p>
          <MetricMeta metric={series.latest} className="mt-0.5" />
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="hyrox-stations">
        <PanelHeader
          title={t('sportAnalysis.hyrox.stationsTitle')}
          subtitle={
            b.ownLimiter
              ? t('sportAnalysis.hyrox.ownLimiter', { station: t(`sportAnalysis.station.${b.ownLimiter}`) })
              : t('sportAnalysis.hyrox.largestShare', { station: t(`sportAnalysis.station.${b.largestShare}`) })
          }
        />
        <ul className="divide-y divide-line">
          {b.stations.map((row) => (
            <li key={row.station} className="px-4 py-2.5 text-[13px]" data-station={row.station} data-verdict={row.verdict}>
              <div className="flex items-baseline justify-between gap-2">
                <span>{t(`sportAnalysis.station.${row.station}`)}</span>
                <span className="readout tabular-nums">{mmss(row.seconds)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-pill bg-surface-sunken">
                <div className={cn('h-full rounded-pill', row.verdict === 'slower' ? 'bg-warning' : 'bg-accent/70')} style={{ width: `${Math.min(100, row.sharePct * 3)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                {t('sportAnalysis.hyrox.share', { pct: formatNumber(row.sharePct, locale, 1) })}
                {row.ownMedian != null &&
                  ` · ${t('sportAnalysis.hyrox.vsMedian', {
                    median: mmss(row.ownMedian),
                    delta: `${(row.deltaPct ?? 0) > 0 ? '+' : ''}${formatNumber(row.deltaPct, locale, 1)}`,
                  })}`}
                {' · '}
                {t(`sportAnalysis.verdict.${row.verdict}`, { detectable: formatNumber(row.detectablePct, locale, 1) })}
              </p>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('sportAnalysis.hyrox.method')}</p>
      </Panel>
    </>
  )
}

function CombatPanel({ b }: { b: CombatBreakdown }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const series = useMemo(() => durabilitySeries(durabilityPoints(data.results), 'combat_rounds'), [data.results])
  return (
    <Panel className="mb-4" data-testid="combat-rounds">
      <PanelHeader
        title={t('sportAnalysis.combat.title')}
        subtitle={
          b.decayPct == null
            ? formatDate(b.day, locale)
            : t('sportAnalysis.combat.decay', { pct: formatNumber(b.decayPct, locale, 1), date: formatDate(b.day, locale) })
        }
      />
      <div className="px-4 pb-3 pt-4">
        <Bars values={b.rounds} label={t('sportAnalysis.combat.aria')} format={(v) => formatNumber(v, locale, 0)} highlight={(i) => i === b.rounds.length - 1} />
        <p className="mt-2 text-[12px] text-ink-secondary">
          {series.verdict === 'unknown'
            ? t('durability.verdict.unknown', { count: series.points.length })
            : t(`durability.verdict.${series.verdict}`, {
                baseline: formatNumber(series.baselineMedian, locale, 1),
                detectable: formatNumber(series.detectablePp, locale, 1),
              })}
        </p>
        <MetricMeta metric={series.latest} className="mt-0.5" />
      </div>
    </Panel>
  )
}
