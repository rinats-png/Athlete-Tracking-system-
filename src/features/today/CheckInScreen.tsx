import { useTranslation } from 'react-i18next'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { CheckInPanel } from './CheckInPanel'

/** Der Check-in als eigener Bildschirm — derselbe Baustein wie auf «Heute». */
export function CheckInScreen() {
  const { t } = useTranslation()
  return (
    <div data-testid="checkin-screen">
      <ScreenHeader eyebrow={t('checkin.eyebrow')} title={t('checkin.screenTitle')} intro={t('checkin.intro')} />
      <div className="max-w-xl">
        <CheckInPanel />
      </div>
    </div>
  )
}
