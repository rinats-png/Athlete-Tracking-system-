import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { clearAccount, plansForRole, readAccount } from './account'

/**
 * Wer angemeldet ist — und der Weg hinaus.
 *
 * Das Abmelden räumt NUR das Konto. Der Bestand bleibt: die Messwerte gehören
 * dem Gerät und dem Menschen, nicht der Anmeldung (§32). Wer sich abmeldet
 * und wieder anmeldet, findet seine Werte vor. Für «alles löschen» gibt es
 * den eigenen, ausdrücklichen Weg weiter unten im Profil.
 */
export function AccountPanel() {
  const { t } = useTranslation()
  const account = readAccount()
  if (!account) return null

  const plan = account.planId
    ? (plansForRole(account.role).find((p) => p.id === account.planId)?.label ?? null)
    : null

  return (
    <Panel>
      <PanelHeader title={t('auth.eyebrow')} subtitle={t(`auth.role.${account.role}`)} />
      <div className="space-y-2 px-4 py-4 text-[13px] leading-relaxed">
        <p>{t('auth.signedInAs', { name: account.name })}</p>
        {account.email && <p className="readout text-ink-secondary">{account.email}</p>}
        <p className="text-ink-secondary">
          {plan ? t('auth.planChosen', { plan }) : t('auth.planNone')}
        </p>
        <p className="text-[12px] text-ink-muted">{t('auth.signOutKeepsData')}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            clearAccount()
            // Neu laden statt den Zustand zu drehen: der Ablauf beginnt beim
            // Tor, und das ist ein Programmstart, kein Bildschirmwechsel.
            window.location.assign('/')
          }}
        >
          {t('auth.signOut')}
        </Button>
      </div>
    </Panel>
  )
}
