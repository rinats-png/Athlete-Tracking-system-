import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { FuelPlanned } from '@/features/fuel/FuelPlanned'
import { FuelHub } from '@/features/nutrition/FuelingPanels'
import { entryOn, rollingMean, toDay } from '@/domain/diary'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Fuel: Verpflegung, Flüssigkeit und Erholung nach Disziplin (docs/fuel.md).
 *
 * Eigener Bereich in der unteren Leiste. Die Mahlzeiten und der Tagesbedarf
 * bleiben in der Ernährung; von hier führt eine Karte dorthin und zurück.
 * Die Schranke (Pro) sitzt an der Route.
 */
export function FuelScreen() {
  const { t } = useTranslation()
  const { diary } = useAppData()
  const today = toDay(new Date())
  const weight = entryOn(diary, today)?.weightKg ?? rollingMean(diary, 'weightKg', today, 7).mean

  return (
    <>
      <ScreenHeader eyebrow={t('fuel.eyebrow')} title={t('fuel.title')} intro={t('fuel.intro')} />
      <FuelPlanned day={today} />
      <FuelHub day={today} weightKg={weight ?? null} />
      <Panel lift className="mb-4">
        <Link to="/ernaehrung" data-testid="fuel-to-nutrition" className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
          <span>
            <span className="label-tag block">{t('fuel.mealsLabel')}</span>
            {t('fuel.mealsLink')}
          </span>
          <ArrowRight size={18} aria-hidden />
        </Link>
      </Panel>
    </>
  )
}
