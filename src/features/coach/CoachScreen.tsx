import { useTranslation } from 'react-i18next'
import { readAccount } from '@/features/auth/account'
import { DPA_VERSION } from '@/features/legal/dpaVersion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CoachDashboard } from './CoachDashboard'
import { CoachSignals } from './CoachSignals'
import { useBilling } from '@/features/billing/BillingProvider'
import { LimitNotice } from '@/features/billing/CoachPlanPanel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useLocale } from '@/features/shared/useLocale'

/**
 * Trainerbereich.
 *
 * Nur im Trainermodus erreichbar. Im Einzelmodus stünde hier eine Tabelle
 * mit genau einer Zeile — die Dashboard-Ansicht sagt dasselbe besser.
 */
export function CoachScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
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
        <>
          <DpaNotice />
          <CoachLimitLine />
          <div className="mb-4 flex flex-wrap gap-2">
            <Button asChild variant="primary" size="sm">
              <Link to="/trainer/testtag">{t('testDay.plural')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/trainer/gruppentest">{t('group.title')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/trainer/vergleich">{t('compare.title')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/trainer/gruppenbericht">{t('compare.group.title')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/trainer/heatmap">{t('coachDash.heatmap.title')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/trainer/nachweis">{t('coachDash.proof.title')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/cockpit">{t('cockpit.title')}</Link>
            </Button>
          </div>
          <CoachSignals />
          <CoachDashboard locale={locale} />
        </>
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

/**
 * Der Hinweis auf den ausstehenden Vertrag zur Auftragsverarbeitung.
 *
 * Er steht oben im Trainerbereich, solange keine gültige Fassung angenommen
 * ist — und sperrt nichts: Wer Athleten führt, ohne den Vertrag angenommen
 * zu haben, hat ein Datenschutzproblem, kein Bedienproblem. Der Weg zur
 * Lösung ist ein Tipp.
 */
function DpaNotice() {
  const { t } = useTranslation()
  const account = readAccount()
  if (!account || account.role !== 'coach') return null
  if (account.dpaAcceptedAt && account.dpaVersion === DPA_VERSION) return null
  return (
    <p role="status" data-testid="dpa-notice" className="mb-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-ink-secondary">
      {account.dpaAcceptedAt ? t('coachDash.dpa.outdated') : t('coachDash.dpa.missing')}{' '}
      <Link to="/auftragsverarbeitung" className="underline underline-offset-2">
        {t('coachDash.dpa.open')}
      </Link>
    </p>
  )
}

/** Stufe überschritten? Dann steht es hier, über allem — mit dem Weg zum Wechsel. */
function CoachLimitLine() {
  const { limit } = useBilling()
  if (!limit) return null
  return (
    <div className="mb-4">
      <LimitNotice limit={limit} compact />
    </div>
  )
}
