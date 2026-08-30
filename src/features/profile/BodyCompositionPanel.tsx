import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { bodyComposition } from '@/domain/bodyComposition'
import { formatDate, formatNumber } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

/**
 * Körperzusammensetzung aus dem jüngsten Eintrag.
 *
 * Fettmasse und fettfreie Masse werden gerechnet, nicht gespeichert — sie
 * sind vollständig aus Gewicht und Körperfettanteil bestimmt. Ein zweiter
 * gespeicherter Wert könnte davon abweichen, und dann wüsste niemand, welcher
 * stimmt.
 *
 * Der BMI steht bewusst zuletzt und kleiner: bei einem muskulösen Athleten
 * ist er als Einordnung wertlos, und die App soll ihn nicht wichtiger
 * aussehen lassen, als er ist.
 */
export function BodyCompositionPanel({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const composition = bodyComposition(data)

  if (!composition) {
    return (
      <Panel>
        <PanelHeader title={t('profile.composition')} />
        <p className="px-4 py-4 text-[13px] text-ink-secondary">
          {t('profile.compositionEmpty')}
        </p>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHeader
        title={t('profile.composition')}
        subtitle={t('profile.compositionOn', {
          date: formatDate(composition.measuredOn, locale),
        })}
      />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-4">
        <Figure
          label={t('profile.bodyWeight')}
          value={`${formatNumber(composition.bodyWeightKg, locale, 1)} kg`}
        />
        <Figure
          label={t('profile.bodyFat')}
          value={
            composition.bodyFatPercent == null
              ? '—'
              : `${formatNumber(composition.bodyFatPercent, locale, 1)} %`
          }
        />
        <Figure
          label={t('profile.fatMass')}
          value={
            composition.fatMassKg == null
              ? '—'
              : `${formatNumber(composition.fatMassKg, locale, 1)} kg`
          }
        />
        <Figure
          label={t('profile.fatFreeMass')}
          value={
            composition.fatFreeMassKg == null
              ? '—'
              : `${formatNumber(composition.fatFreeMassKg, locale, 1)} kg`
          }
        />
      </dl>
      <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
        {composition.bmi != null && (
          <>
            {t('profile.bmi')}: {formatNumber(composition.bmi, locale, 1)}.{' '}
          </>
        )}
        {t('profile.bmiCaveat')}
      </p>
    </Panel>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-tag">{label}</dt>
      <dd className="readout mt-1 font-display text-[20px] font-bold tabular-nums">{value}</dd>
    </div>
  )
}
