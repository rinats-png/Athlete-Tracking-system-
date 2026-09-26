import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { bandPosition, dailyFuelNeed, recentFueling, weeklyWeightRate, type IntraBand } from '@/domain/fueling'
import type { Macros } from '@/domain/nutrition'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

function shift(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Bedarf nach Belastung, Verpflegung je Einheit, Gewichtsband
 * (Master-Spezifikation E). Spannen nach Quelle neben dem Gegessenen —
 * kein Ziel, keine Anweisung (§81). Keine Energieverfügbarkeit
 * (Entscheidung 6).
 */
export function FuelingPanels({ day, weightKg, totals }: { day: string; weightKg: number | null; totals: Macros }) {
  return (
    <>
      <FuelNeedPanel day={day} weightKg={weightKg} totals={totals} />
      <SessionFuelingPanel day={day} />
      <WeightBandPanel day={day} />
    </>
  )
}

function Range({ lo, hi, value, unit }: { lo: number; hi: number; value: number; unit: string }) {
  const locale = useLocale()
  const max = Math.max(hi * 1.25, value * 1.05, 1)
  return (
    <div className="mt-1.5">
      <div className="relative h-2 w-full rounded-pill bg-surface-sunken" aria-hidden>
        <div className="absolute inset-y-0 rounded-pill bg-accent/30" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
        {value > 0 && <div className="absolute inset-y-[-3px] w-[3px] rounded-pill bg-ink" style={{ left: `calc(${Math.min(100, (value / max) * 100)}% - 1px)` }} />}
      </div>
      <p className="readout mt-1 text-[12px] text-ink-secondary">
        {formatNumber(lo, locale, 0)}–{formatNumber(hi, locale, 0)} {unit}
      </p>
    </div>
  )
}

function FuelNeedPanel({ day, weightKg, totals }: { day: string; weightKg: number | null; totals: Macros }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary } = useAppData()
  const need = useMemo(() => dailyFuelNeed(diary, day, weightKg), [diary, day, weightKg])

  return (
    <Panel className="mb-4" data-testid="fuel-need">
      <PanelHeader
        title={t('fueling.need.title')}
        subtitle={
          need
            ? t('fueling.need.level', { level: t(`fueling.level.${need.level}`), minutes: need.minutesPerDay, days: need.daysWithEntry })
            : weightKg == null
              ? t('fueling.need.noWeight')
              : t('fueling.need.noDiary')
        }
      />
      {need && (
        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <span className="label-tag">{t('nutrition.macros.carbs')}</span>
            <p className="text-[13px]">
              {t('fueling.need.eaten', { value: formatNumber(totals.carbs, locale, 0) })}
            </p>
            <Range lo={need.carbsG[0]} hi={need.carbsG[1]} value={totals.carbs} unit="g" />
          </div>
          <div>
            <span className="label-tag">{t('nutrition.macros.protein')}</span>
            <p className="text-[13px]">
              {t('fueling.need.eaten', { value: formatNumber(totals.protein, locale, 0) })}
            </p>
            <Range lo={need.proteinG[0]} hi={need.proteinG[1]} value={totals.protein} unit="g" />
          </div>
        </div>
      )}
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('fueling.need.source')}</p>
    </Panel>
  )
}

function bandText(t: (k: string, o?: Record<string, unknown>) => string, band: IntraBand): string {
  if (band.kind === 'none') return t('fueling.band.none')
  if (band.kind === 'small') return t('fueling.band.small')
  return t('fueling.band.range', { lo: band.lo, hi: band.hi })
}

function SessionFuelingPanel({ day }: { day: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary } = useAppData()
  const rows = useMemo(() => recentFueling(diary, day, 28), [diary, day])

  return (
    <Panel className="mb-4" data-testid="fuel-sessions">
      <PanelHeader title={t('fueling.sessions.title')} subtitle={rows.length === 0 ? t('fueling.sessions.empty') : t('fueling.sessions.why')} />
      {rows.length > 0 && (
        <ul className="divide-y divide-line">
          {rows.slice(0, 8).map((f) => (
            <li key={f.sessionId} className="px-4 py-2.5 text-[13px]" data-below={f.belowBand ?? undefined}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {formatDate(`${f.day}T12:00:00Z`, locale)} · {f.durationMin} min
                </span>
                {f.carbsPerHour != null && <span className="readout tabular-nums">{t('fueling.sessions.perHour', { value: formatNumber(f.carbsPerHour, locale, 0) })}</span>}
              </div>
              <p className={cn('mt-0.5 text-[11px]', f.belowBand ? 'text-warning' : 'text-ink-muted')}>
                {bandText(t, f.band)}
                {f.belowBand && ` · ${t('fueling.sessions.below')}`}
              </p>
              {(f.sweatRateLph != null || f.giScore != null) && (
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {f.sweatRateLph != null &&
                    t('fueling.sessions.sweat', { rate: formatNumber(f.sweatRateLph, locale, 2), loss: formatNumber(f.massLossPct, locale, 1) })}
                  {f.massLossPct != null && f.massLossPct > 2 && ` · ${t('fueling.sessions.lossAbove2')}`}
                  {f.sweatRateLph != null && f.giScore != null && ' · '}
                  {f.giScore != null && t('fueling.sessions.gi', { score: f.giScore })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('fueling.sessions.source')}</p>
    </Panel>
  )
}

function WeightBandPanel({ day }: { day: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary, nutrition, saveNutrition } = useAppData()
  const band = nutrition.weightRateBand ?? null
  const thisWeek = weeklyWeightRate(diary, day)
  const lastWeek = weeklyWeightRate(diary, shift(day, -7))
  const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${formatNumber(v, locale, 1)} %`)

  return (
    <Panel className="mb-4" data-testid="weight-band">
      <PanelHeader title={t('fueling.weight.title')} subtitle={t('fueling.weight.why')} />
      <div className="px-4 py-3 text-[13px]">
        <p>
          {t('fueling.weight.thisWeek')}: <span className="readout">{pct(thisWeek)}</span> · {t('fueling.weight.lastWeek')}: <span className="readout">{pct(lastWeek)}</span>
        </p>
        {band && thisWeek != null && (
          <p className="mt-1 text-[12px] text-ink-secondary" data-testid="weight-band-position">
            {t(`fueling.weight.position.${bandPosition(thisWeek, band)}`, { min: pct(band.minPctWeek), max: pct(band.maxPctWeek) })}
          </p>
        )}
        {thisWeek == null && <p className="mt-1 text-[12px] text-ink-muted">{t('fueling.weight.needs')}</p>}
      </div>
      <div className="grid gap-3 border-t border-line px-4 py-3 sm:grid-cols-2">
        {/* Ein leeres Feld ändert nichts — sonst verschwände das Band beim
            Tippen des Minuszeichens. Entfernt wird es über den Knopf. */}
        <NumberField
          label={t('fueling.weight.min')}
          unit={t('fueling.weight.unit')}
          value={band?.minPctWeek ?? null}
          onChange={(v) => v != null && saveNutrition({ weightRateBand: { minPctWeek: Math.min(v, band?.maxPctWeek ?? v), maxPctWeek: Math.max(v, band?.maxPctWeek ?? v) } })}
          min={-2}
          max={2}
          step={0.1}
        />
        <NumberField
          label={t('fueling.weight.max')}
          unit={t('fueling.weight.unit')}
          value={band?.maxPctWeek ?? null}
          onChange={(v) => v != null && saveNutrition({ weightRateBand: { minPctWeek: Math.min(v, band?.minPctWeek ?? v), maxPctWeek: Math.max(v, band?.minPctWeek ?? v) } })}
          min={-2}
          max={2}
          step={0.1}
        />
        {band && (
          <Button variant="ghost" size="sm" className="-ml-3 justify-self-start" onClick={() => saveNutrition({ weightRateBand: null })}>
            {t('fueling.weight.clear')}
          </Button>
        )}
        <p className="text-[11px] leading-relaxed text-ink-muted sm:col-span-2">{t('fueling.weight.note')}</p>
      </div>
    </Panel>
  )
}
