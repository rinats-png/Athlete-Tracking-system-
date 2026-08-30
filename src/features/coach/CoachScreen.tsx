import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CoachDashboard } from './CoachDashboard'
import { useAppData } from '@/lib/store/AppDataProvider'
import type { AppLocale } from '@/types/domain'

/**
 * Trainerbereich.
 *
 * Nur im Trainermodus erreichbar. Im Einzelmodus stünde hier eine Tabelle
 * mit genau einer Zeile — die Dashboard-Ansicht sagt dasselbe besser.
 */
export function CoachScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { role } = useAppData()

  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {t('coachDash.title')}
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
          {t('coachDash.intro')}
        </p>
      </header>

      {role === 'coach' ? (
        <CoachDashboard locale={locale} />
      ) : (
        <EmptyState
          title={t('coachDash.soloTitle')}
          body={t('coachDash.soloBody')}
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/profil">{t('coachDash.switchMode')}</Link>
            </Button>
          }
        />
      )}
    </>
  )
}
