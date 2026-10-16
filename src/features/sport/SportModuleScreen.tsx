import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate, formatNumber } from '@/lib/format'
import { useAppData } from '@/lib/store/AppDataProvider'
import { CRITICAL_SPEED_FORMULA, CRITICAL_SPEED_SOURCE, criticalSpeed, moduleReadout, type MetricReadout } from '@/domain/sportModule'
import type { SportCategoryId } from '@/data/sportProfiles'
import { eurReadout, speedReserveReadout } from '@/domain/combinedMetrics'
import { csIntensityDomains } from '@/domain/fieldPhysiology'
import { formulaFor } from '@/domain/formulaRegistry'

/**
 * Das Sportmodul: die Kennzahlen der eigenen Sportart an einer Stelle.
 *
 * WAS DIESER BILDSCHIRM HINZUFÜGT, ist nicht Rechnung, sondern Ordnung. Die
 * Zahlen stehen schon in den Testkarten; hier stehen genau die, an denen
 * diese Sportart hängt, in der Reihenfolge, in der man sie ansieht.
 *
 * DREI DINGE SAGT ER NICHT:
 *
 *   - ob eine Zahl gut ist (§81),
 *   - ob eine Veränderung über dem Messfehler liegt — das beantwortet der
 *     Testverlauf mit seinen 2,77 Standardfehlern, und der Weg dorthin steht
 *     unten,
 *   - dass eine fehlende Messung eine Schwäche ist (§89). Sie steht als
 *     «noch nicht gemessen» da, mit dem Weg zum Test.
 */
export function SportModuleScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()

  const category = (data.profile.sportCategoryId ?? null) as SportCategoryId | null
  const readout = useMemo(() => moduleReadout(data.results, category), [data.results, category])
  const cs = useMemo(
    () => (category === 'running' || category === 'triathlon' ? criticalSpeed(data.results) : null),
    [data.results, category],
  )
  const reserve = useMemo(() => speedReserveReadout(data.results), [data.results])
  const eur = useMemo(() => eurReadout(data.results), [data.results])
  const domains = cs ? csIntensityDomains(cs.speed) : null

  if (!readout) {
    return (
      <>
        <ScreenHeader eyebrow={t('sportModule.eyebrow')} title={t('sportModule.title')} intro={t('sportModule.intro')} />
        <EmptyState
          title={t('sportModule.noCategory')}
          body={t('sportModule.noCategoryBody')}
          action={
            <Button asChild variant="primary" size="sm">
              <Link to="/profil">{t('nav.profile')}</Link>
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <ScreenHeader eyebrow={t('sportModule.eyebrow')} title={t('sportModule.title')} intro={t('sportModule.intro')} />

      <p role="note" className="mb-4 border-l-2 border-line-strong px-3 py-2 text-[13px] leading-relaxed text-ink-secondary" data-testid="sport-module-scope">
        {t('sportModule.scope')}
      </p>

      <Panel data-testid="sport-module">
        <PanelHeader
          title={t('sportModule.figures')}
          subtitle={t('sportModule.coverage', { measured: readout.measured, total: readout.metrics.length })}
        />
        <div className="px-4 py-3">
          <ul className="divide-y divide-line">
            {readout.metrics.map((metric) => (
              <li key={metric.key} className="py-3" data-testid={`metric-${metric.key}`}>
                <Figure metric={metric} />
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {cs && (
        <Panel className="mt-4" data-testid="critical-speed">
          <PanelHeader title={t('sportModule.criticalSpeed')} note={t('sportModule.criticalSpeedSub')} />
          <div className="px-4 py-3 text-[13px] leading-relaxed">
            <p className="readout text-[24px] tabular-nums">
              {formatNumber(cs.speed, locale, 2)} <span className="text-[13px] text-ink-muted">m/s</span>
            </p>
            <p className="mt-1 text-ink-secondary">
              {t('sportModule.criticalSpeedPace', { pace: formatPace(1000 / cs.speed) })} ·{' '}
              {t('sportModule.reserve', { meters: formatNumber(cs.reserve, locale, 0) })}
            </p>
            <p className="mt-2 text-[12px] text-ink-muted">
              {t('sportModule.fromTwoRuns', {
                first: t(`tests.${cs.from[0].testSlug}.name`, { defaultValue: cs.from[0].testSlug }),
                second: t(`tests.${cs.from[1].testSlug}.name`, { defaultValue: cs.from[1].testSlug }),
              })}
            </p>
            {domains && (
              <p className="mt-2 text-ink-secondary" data-testid="cs-domains">
                {t('sportModule.domains', {
                  moderate: formatPace(1000 / domains.moderateUpper),
                  heavy: formatPace(1000 / domains.heavyUpper),
                })}
              </p>
            )}
            <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">
              {CRITICAL_SPEED_FORMULA} — {CRITICAL_SPEED_SOURCE}
              {domains && <> · {formulaFor('cs_intensity_domains')?.reference}</>}
            </p>
          </div>
        </Panel>
      )}

      {(reserve || eur) && (
        <Panel className="mt-4" data-testid="combined-metrics">
          <PanelHeader title={t('sportModule.combined')} note={t('sportModule.combinedSub')} />
          <ul className="divide-y divide-line px-4 text-[13px] leading-relaxed">
            {reserve && (
              <li className="py-3" data-testid="speed-reserve">
                <p className="readout text-[20px] tabular-nums">
                  SRR {formatNumber(reserve.srr, locale, 2)}
                  <span className="ml-3 text-[13px] text-ink-muted">
                    ASR {formatNumber(reserve.asr * 3.6, locale, 1)} km/h
                  </span>
                </p>
                <p className="mt-1 text-ink-secondary">
                  {t('sportModule.speedReserve', {
                    mss: formatNumber(reserve.mss * 3.6, locale, 1),
                    mas: formatNumber(reserve.mas * 3.6, locale, 1),
                  })}
                </p>
                <p className="mt-1 max-w-[62ch] text-[12px] text-ink-muted">
                  {formulaFor('speed_reserve_ratio')?.formula} — {formulaFor('speed_reserve_ratio')?.reference}
                </p>
              </li>
            )}
            {eur && (
              <li className="py-3" data-testid="eur">
                <p className="readout text-[20px] tabular-nums">
                  {t('sportModule.eur')} {formatNumber(eur.ratio, locale, 2)}
                </p>
                <p className="mt-1 text-ink-secondary">
                  {t('sportModule.eurFrom', {
                    cmj: formatNumber(eur.cmjCm, locale, 1),
                    sj: formatNumber(eur.sjCm, locale, 1),
                    date: formatDate(eur.performedAt, locale),
                  })}
                </p>
                <p className="mt-1 max-w-[62ch] text-[12px] text-ink-muted">
                  {formulaFor('eccentric_utilization_ratio')?.formula} — {formulaFor('eccentric_utilization_ratio')?.reference}
                </p>
              </li>
            )}
          </ul>
          <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-muted">{t('sportModule.combinedNote')}</p>
        </Panel>
      )}

      <Panel className="mt-4">
        <div className="px-4 py-3">
          <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-secondary">{t('sportModule.toHistory')}</p>
          <Button asChild variant="ghost" size="sm" className="mt-1 -ml-3">
            <Link to="/verlauf">
              {t('nav.history')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
        </div>
      </Panel>
    </>
  )

  function Figure({ metric }: { metric: MetricReadout }) {
    const name = t(`metrics.${metric.key}`, { defaultValue: metric.key })

    if (metric.latest == null) {
      return (
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="min-w-[12rem]">{name}</span>
          {/* Nicht gemessen ist nicht schwach — und keine Null. */}
          <span className="text-[13px] text-ink-muted" data-testid={`unmeasured-${metric.key}`}>
            {t('sportModule.notMeasured')}
          </span>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/diagnostik">{t('sportModule.measureIt')}</Link>
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-[12rem]">{name}</span>
        <span className="readout text-[20px] tabular-nums">{formatNumber(metric.latest, locale, metric.digits)}</span>
        {metric.change != null && metric.previousAt && (
          // Die Differenz mit Vorzeichen. Keine Farbe, kein Pfeil, kein
          // Urteil — ob sie über dem Messfehler liegt, sagt der Verlauf.
          <span className="text-[12px] tabular-nums text-ink-secondary" data-testid={`change-${metric.key}`}>
            {metric.change > 0 ? '+' : ''}
            {formatNumber(metric.change, locale, metric.digits)}{' '}
            {t('sportModule.sincePrevious', { date: formatDate(metric.previousAt, locale) })}
          </span>
        )}
        {metric.latestAt && (
          <span className="text-[12px] text-ink-muted">
            {formatDate(metric.latestAt, locale)}
            {metric.fromTest ? ` · ${t(`tests.${metric.fromTest}.name`, { defaultValue: metric.fromTest })}` : ''}
          </span>
        )}
      </div>
    )
  }
}

/** m:ss je Kilometer — eine Geschwindigkeit liest ein Läufer als Tempo. */
function formatPace(seconds: number): string {
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
