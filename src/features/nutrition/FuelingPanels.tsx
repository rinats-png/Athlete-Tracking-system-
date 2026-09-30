import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { FUEL_SOURCES } from '@/data/fuelRules'
import { disciplineById } from '@/data/sportProfiles'
import { fuelRuleFor, sportDailyNeed } from '@/domain/fuel'
import { feelByBand, gutProfile, planFuel, sweatProfile, type SessionKind } from '@/domain/fuelPlan'
import { pick } from '@/i18n/pick'
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
      <FuelRulePanel weightKg={weightKg} />
      <FuelPlanPanel day={day} weightKg={weightKg} />
      <FuelProfilePanel day={day} />
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
              {f.energyFeel != null && <p className="mt-0.5 text-[11px] text-ink-muted">{t('fueling.sessions.feel', { score: f.energyFeel })}</p>}
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

/**
 * Regel der eigenen Disziplin (docs/fuel.md, Stufe 1): Tagesspanne, Aufladen,
 * Verpflegung im Wettkampf — jeweils mit Evidenzabzeichen und Quellen. Ohne
 * Regel sagt die Karte das, statt eine Spanne herzuleiten.
 */
function FuelRulePanel({ weightKg }: { weightKg: number | null }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const discipline = disciplineById(data.profile.disciplineId)
  const match = fuelRuleFor(data.profile.disciplineId)
  const need = match ? sportDailyNeed(match.rule, weightKg) : null

  if (!discipline || !match) {
    return (
      <Panel className="mb-4" data-testid="fuel-rule">
        <PanelHeader title={t('fueling.rule.title')} subtitle={discipline ? pick(discipline.name, locale) : t('fueling.rule.noDiscipline')} />
        <p className="px-4 py-3 text-[13px] text-ink-secondary" data-testid="fuel-rule-none">
          {discipline ? t('fueling.rule.none') : t('fueling.rule.noDisciplineBody')}
        </p>
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('fueling.rule.scope')}</p>
      </Panel>
    )
  }
  const { rule, specificity } = match
  const ev = rule.evidence
  const badges = [t(`fueling.rule.evidence.strength.${ev.strength}`), t(`fueling.rule.evidence.type.${ev.type}`), t(`fueling.rule.evidence.specificity.${specificity}`), t(`fueling.rule.evidence.verification.${ev.verification}`)]

  return (
    <Panel className="mb-4" data-testid="fuel-rule">
      <PanelHeader title={t('fueling.rule.title')} subtitle={pick(discipline.name, locale)} />
      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
        <div>
          <span className="label-tag">{t('nutrition.macros.carbs')}</span>
          <p className="readout text-[13px]">
            {formatNumber(rule.carbsPerKg[0], locale, 0)}–{formatNumber(rule.carbsPerKg[1], locale, 0)} g/kg
            {need && ` · ${formatNumber(need.carbsG[0], locale, 0)}–${formatNumber(need.carbsG[1], locale, 0)} g`}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">{t('fueling.rule.carbsHow')}</p>
        </div>
        <div>
          <span className="label-tag">{t('nutrition.macros.protein')}</span>
          <p className="readout text-[13px]">
            1,6–2,2 g/kg{need && ` · ${formatNumber(need.proteinG[0], locale, 0)}–${formatNumber(need.proteinG[1], locale, 0)} g`}
          </p>
        </div>
      </div>
      <ul className="space-y-1.5 border-t border-line px-4 py-3 text-[13px] text-ink-secondary">
        <li data-testid="fuel-rule-intra">{t(`fueling.rule.intra.${rule.intra}`)}</li>
        {(rule.intra === 'g30_90' || rule.intra === 'g60_90') && <li className="text-[12px] text-ink-muted">{t('fueling.rule.intra.advanced')}</li>}
        {rule.carbLoad && <li data-testid="fuel-rule-load">{t(`fueling.rule.carbLoad.${rule.carbLoad}`)}</li>}
        <li className="text-[12px] text-ink-muted">{t('fueling.rule.hyponatremia')}</li>
      </ul>
      <div className="border-t border-line px-4 py-3" data-testid="fuel-rule-evidence">
        <span className="label-tag">{t('fueling.rule.evidence.title')}</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b} className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-ink-secondary">
              {b}
            </span>
          ))}
        </div>
        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-ink-muted">
          {ev.sourceIds.map((id) => {
            const src = FUEL_SOURCES[id]
            return (
              <li key={id}>
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                    {src.citation}
                  </a>
                ) : (
                  src.citation
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[11px] text-ink-muted">{t('fueling.rule.version', { version: ev.ruleVersion, date: ev.reviewed })}</p>
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('fueling.rule.scope')}</p>
    </Panel>
  )
}

const rangeText = (a: [number, number], locale: Parameters<typeof formatNumber>[1], digits = 0) => `${formatNumber(a[0], locale, digits)}–${formatNumber(a[1], locale, digits)}`

/**
 * Plan für eine Einheit oder einen Wettkampf (docs/fuel.md, Stufe 2): davor,
 * währenddessen, danach — als Spannen mit Quelle. Nichts wird gespeichert; der
 * Plan entsteht aus den Angaben hier, der Regel der Disziplin und den eigenen
 * Werten aus dem Tagebuch.
 */
function FuelPlanPanel({ day, weightKg }: { day: string; weightKg: number | null }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, diary } = useAppData()
  const match = fuelRuleFor(data.profile.disciplineId)
  const [kind, setKind] = useState<SessionKind>('training')
  const [durationMin, setDurationMin] = useState<number | null>(90)
  const [hoursToNext, setHoursToNext] = useState<number | null>(null)
  const [lossKg, setLossKg] = useState<number | null>(null)
  const gut = useMemo(() => gutProfile(recentFueling(diary, day, 90)), [diary, day])
  if (!match) return null
  const plan = planFuel({ rule: match.rule, weightKg, durationMin: durationMin ?? 0, kind, hoursToNext, gutTroubleGPerH: gut?.troubleGPerH ?? null, lossKg })
  const { before, during, after } = plan

  return (
    <Panel className="mb-4" data-testid="fuel-plan">
      <PanelHeader title={t('fueling.plan.title')} subtitle={t('fueling.plan.why')} />
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
        <div role="group" aria-label={t('fueling.plan.kind')} className="flex gap-2 sm:col-span-2">
          {(['training', 'race'] as const).map((k) => (
            <Button key={k} variant={kind === k ? 'primary' : 'outline'} size="sm" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {t(`fueling.plan.kinds.${k}`)}
            </Button>
          ))}
        </div>
        <NumberField label={t('fueling.plan.duration')} unit="min" value={durationMin} onChange={setDurationMin} min={5} max={1440} step={5} />
        <NumberField label={t('fueling.plan.hoursToNext')} unit="h" value={hoursToNext} onChange={setHoursToNext} min={0} max={168} step={1} />
        <NumberField label={t('fueling.plan.loss')} unit="kg" value={lossKg} onChange={setLossKg} min={0} max={10} step={0.1} />
      </div>
      {durationMin != null && durationMin > 0 && (
        <div className="grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <section className="space-y-1.5 px-4 py-3 text-[13px]" data-testid="fuel-plan-before">
            <span className="label-tag">{t('fueling.plan.before')}</span>
            {before.carbsPerKg && (
              <p className="readout">
                {rangeText(before.carbsPerKg, locale)} g/kg{before.carbsG && ` · ${rangeText(before.carbsG, locale)} g`}
                <span className="block font-body text-[11px] text-ink-muted">{t('fueling.plan.preCarbs')}</span>
              </p>
            )}
            {before.fluidMl && (
              <p className="readout">
                {rangeText(before.fluidMl, locale)} ml
                <span className="block font-body text-[11px] text-ink-muted">{t('fueling.plan.preFluid')}</span>
              </p>
            )}
            {before.load && (
              <p data-testid="fuel-plan-load">
                {t('fueling.plan.load', { perKg: rangeText(before.load.carbsPerKg, locale), hours: rangeText(before.load.hours, locale), g: before.load.carbsG ? rangeText(before.load.carbsG, locale) : '—' })}
              </p>
            )}
            {before.loadNotNeeded && <p className="text-[12px] text-ink-secondary">{t('fueling.plan.loadNotNeeded')}</p>}
          </section>
          <section className="space-y-1.5 px-4 py-3 text-[13px]" data-testid="fuel-plan-during">
            <span className="label-tag">{t('fueling.plan.during')}</span>
            <p className="readout">{bandText(t, during.band)}</p>
            {during.gutCapGPerH != null && (
              <p className="text-[12px] text-warning" data-testid="fuel-plan-gutcap">
                {t('fueling.plan.gutCap', { value: during.gutCapGPerH })}
              </p>
            )}
            {during.needsMixAndPractice && <p className="text-[11px] text-ink-muted">{t('fueling.plan.mix')}</p>}
            <p className="text-[11px] text-ink-muted">{t('fueling.plan.fluidDuring')}</p>
          </section>
          <section className="space-y-1.5 px-4 py-3 text-[13px]" data-testid="fuel-plan-after">
            <span className="label-tag">{t('fueling.plan.after')}</span>
            {after.rapid ? (
              <p className="readout" data-testid="fuel-plan-rapid">
                {rangeText(after.rapid.carbsPerKgH, locale, 1)} g/kg/h · {after.rapid.hours} h{after.rapid.carbsG && ` · ${rangeText(after.rapid.carbsG, locale)} g/h`}
                <span className="block font-body text-[11px] text-ink-muted">{t('fueling.plan.rapid')}</span>
              </p>
            ) : (
              <p className="text-[12px] text-ink-secondary">{t('fueling.plan.noRapid')}</p>
            )}
            {after.proteinPerMealG != null && (
              <p className="readout">
                ≈ {after.proteinPerMealG} g
                <span className="block font-body text-[11px] text-ink-muted">{t('fueling.plan.proteinMeal')}</span>
              </p>
            )}
            {after.rehydrateMl && (
              <p className="readout" data-testid="fuel-plan-rehydrate">
                {rangeText(after.rehydrateMl, locale)} ml
                <span className="block font-body text-[11px] text-ink-muted">{t('fueling.plan.rehydrate')}</span>
              </p>
            )}
          </section>
        </div>
      )}
      <ul className="space-y-1 border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">
        {plan.sourceIds.map((id) => (
          <li key={id}>{FUEL_SOURCES[id].citation}</li>
        ))}
        <li>{t('fueling.plan.note')}</li>
      </ul>
    </Panel>
  )
}

/** Eigene Werte aus dem Tagebuch: Schweissrate, Magen-Darm-Grenze, Energie nach Zufuhr. */
function FuelProfilePanel({ day }: { day: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary } = useAppData()
  const rows = useMemo(() => recentFueling(diary, day, 90), [diary, day])
  const sweat = sweatProfile(rows)
  const gut = gutProfile(rows)
  const feel = feelByBand(rows)
  const empty = !sweat && !gut && !feel

  return (
    <Panel className="mb-4" data-testid="fuel-profile">
      <PanelHeader title={t('fueling.profile.title')} subtitle={empty ? t('fueling.profile.empty') : t('fueling.profile.why')} />
      {!empty && (
        <ul className="divide-y divide-line text-[13px]">
          {sweat && (
            <li className="px-4 py-2.5" data-testid="fuel-profile-sweat">
              <span className="label-tag">{t('fueling.profile.sweat')}</span>
              <p className="readout">
                {sweat.n === 1 ? `${formatNumber(sweat.median, locale, 2)} l/h` : `${rangeText([sweat.min, sweat.max], locale, 2)} l/h · ${t('fueling.profile.median', { value: formatNumber(sweat.median, locale, 2) })}`}
              </p>
              <p className="text-[11px] text-ink-muted">{t('fueling.profile.sweatN', { n: sweat.n })}</p>
            </li>
          )}
          {gut && (
            <li className="px-4 py-2.5" data-testid="fuel-profile-gut">
              <span className="label-tag">{t('fueling.profile.gut')}</span>
              {gut.toleratedGPerH != null && <p className="readout">{t('fueling.profile.tolerated', { value: gut.toleratedGPerH })}</p>}
              {gut.troubleGPerH != null && <p className="readout text-warning">{t('fueling.profile.trouble', { value: gut.troubleGPerH })}</p>}
              <p className="text-[11px] text-ink-muted">{t('fueling.profile.gutN', { n: gut.n })}</p>
            </li>
          )}
          {feel && (
            <li className="px-4 py-2.5" data-testid="fuel-profile-feel">
              <span className="label-tag">{t('fueling.profile.feel')}</span>
              <p className="readout">
                {t('fueling.profile.feelWithin', { mean: formatNumber(feel.within.mean, locale, 1), n: feel.within.n })} · {t('fueling.profile.feelBelow', { mean: formatNumber(feel.below.mean, locale, 1), n: feel.below.n })}
              </p>
              <p className="text-[11px] text-ink-muted">{t('fueling.profile.feelNote')}</p>
            </li>
          )}
        </ul>
      )}
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('fueling.profile.source')}</p>
    </Panel>
  )
}
