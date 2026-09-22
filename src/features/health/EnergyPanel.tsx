import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { RangeField } from '@/components/ui/RangeField'
import { useLocale } from '@/features/shared/useLocale'
import { formatNumber } from '@/lib/format'
import { useAppData } from '@/lib/store/AppDataProvider'
import { bodyComposition } from '@/domain/bodyComposition'
import { dayMacros } from '@/domain/nutrition'
import { EA_FORMULA, EA_SOURCE, energyAvailability } from '@/domain/health'

const WINDOW_DAYS = 7

/**
 * Energieverfügbarkeit — eine Rechengrösse mit Formel und Quelle.
 *
 * OHNE SCHWELLE. Der Grenzwert von 30 kcal/kg fettfreier Masse, den man aus
 * der REDs-Literatur kennt, ist ein klinischer Cutoff für ein
 * Krankheitsrisiko. Ihn hier anzuzeigen hiesse, einen Menschen anhand seiner
 * Daten in «unter» und «über» einzuteilen — und das ist die Zweckbestimmung
 * eines Medizinprodukts, nicht die eines Ordners
 * (docs/rechtspruefung-art9-mdr.md §5).
 *
 * DER TRAININGSUMSATZ IST EINE SELBSTAUSKUNFT, wie PAL bei der Ernährung.
 * Die App misst ihn nicht. Ihn zu schätzen hiesse, den grössten Fehler der
 * Rechnung zu erfinden und ihn dann als Zahl auszugeben.
 */
export function EnergyPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, meals, health, updateHealth } = useAppData()

  const days = useMemo(() => {
    const out: string[] = []
    const today = new Date()
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) out.push(new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10))
    return out
  }, [])

  const withMeals = days.filter((d) => meals.some((m) => m.day === d))
  const intake = withMeals.length > 0 ? withMeals.reduce((sum, d) => sum + dayMacros(meals, d).kcal, 0) / withMeals.length : null
  const composition = bodyComposition(data)
  const ffm = composition?.fatFreeMassKg ?? null
  const training = health.trainingKcalPerDay
  const ea = energyAvailability({ intakeKcal: intake, trainingKcal: training, fatFreeMassKg: ffm })

  return (
    <Panel data-testid="energy-panel">
      <PanelHeader title={t('health.energy.title')} subtitle={t('health.energy.subtitle')} />
      <div className="px-4 py-3">
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <div>
            <p className="label-tag">{t('health.energy.value')}</p>
            <p className="readout mt-1 text-[28px] leading-none tabular-nums">
              {ea != null ? formatNumber(ea, locale, 0) : '—'}
              <span className="ml-1 text-[13px] text-ink-secondary">{t('health.energy.unit')}</span>
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">{ea != null ? t('health.energy.basis', { days: withMeals.length }) : t('health.energy.missing')}</p>
          </div>
          <div>
            <p className="label-tag">{t('health.energy.ffm')}</p>
            <p className="readout mt-1 text-[28px] leading-none tabular-nums">
              {ffm != null ? formatNumber(ffm, locale, 1) : '—'}
              <span className="ml-1 text-[13px] text-ink-secondary">kg</span>
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">{ffm != null ? t('health.energy.ffmFrom') : t('health.energy.ffmMissing')}</p>
          </div>
        </div>

        <RangeField
          className="mt-4"
          label={t('health.energy.training')}
          value={training ?? 0}
          onChange={(v) => updateHealth((h) => ({ ...h, trainingKcalPerDay: v === 0 ? null : v }))}
          min={0}
          max={2000}
          step={50}
          unit="kcal"
        />
        <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.energy.trainingHint')}</p>

        <p className="mt-4 max-w-[62ch] text-[12px] leading-relaxed text-ink-secondary">
          {EA_FORMULA} · {EA_SOURCE}
        </p>
        <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.energy.noThreshold')}</p>
      </div>
    </Panel>
  )
}
