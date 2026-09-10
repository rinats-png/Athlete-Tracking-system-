import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { clearAccount, plansForRole, readAccount } from './account'
import { deleteAccount, signOut } from '@/lib/supabase/auth'
import { clearSyncState } from '@/lib/supabase/sync'
import { wipeDevice } from '@/lib/store/wipeDevice'

/**
 * Wer angemeldet ist — und der Weg hinaus.
 *
 * Das gewöhnliche Abmelden räumt NUR das Konto. Der Bestand bleibt: die
 * Messwerte gehören dem Gerät und dem Menschen, nicht der Anmeldung (§32).
 * Wer sich abmeldet und wieder anmeldet, findet seine Werte vor.
 *
 * DANEBEN STEHT DER ZWEITE WEG, und er ist kein Zusatz, sondern die Antwort
 * auf ein Gerät, das nicht einem gehört: das Tablet in der Halle, der
 * Rechner im Vereinsheim. Dort ist «der Bestand bleibt» kein Entgegenkommen,
 * sondern eine Weitergabe an den Nächsten, der sich anmeldet.
 *
 * Die Rückfrage davor ist keine Höflichkeit. Der Weg ist unumkehrbar, und er
 * sieht dem harmlosen Weg zum Verwechseln ähnlich — zwei Knöpfe nebeneinander,
 * einer davon endgültig. Wer den zweiten drückt, soll es ein zweites Mal
 * bestätigen müssen, und der Hinweis auf den Export steht dabei.
 */
export function AccountPanel() {
  const { t } = useTranslation()
  const [askWipe, setAskWipe] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              // Auch die Sitzung beim Dienst beenden, nicht nur die lokale
              // Marke: sonst wäre man beim nächsten Start wieder angemeldet,
              // ohne es gewollt zu haben.
              await signOut()
              clearSyncState()
              clearAccount()
              // Neu laden statt den Zustand zu drehen: der Ablauf beginnt beim
              // Tor, und das ist ein Programmstart, kein Bildschirmwechsel.
              window.location.assign('/')
            }}
          >
            {t('auth.signOut')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="sign-out-wipe"
            onClick={() => setAskWipe(true)}
          >
            {t('auth.signOutAndWipe')}
          </Button>
        </div>

        {/* Die Kontolöschung steht abgesetzt und zuletzt. Sie trifft nicht nur
            dieses Gerät, sondern den Serverstand — und sie ist der einzige
            Weg hier, den niemand rückgängig machen kann. */}
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[12px] text-ink-muted">{t('auth.deleteAccountHint')}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            data-testid="delete-account"
            onClick={() => {
              setDeleteError(null)
              setAskDelete(true)
            }}
          >
            {t('auth.deleteAccount')}
          </Button>
        </div>

        {askDelete && (
          <div className="panel mt-3 space-y-3 border border-critical p-3" role="alertdialog">
            <p className="text-[13px] font-semibold">{t('auth.deleteConfirmTitle')}</p>
            <p className="text-[12px] text-ink-secondary">{t('auth.deleteConfirmBody')}</p>
            {deleteError && (
              <p role="alert" className="text-[12px] text-critical">
                {deleteError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="delete-account-confirm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setDeleteError(null)
                  const outcome = await deleteAccount()
                  if (!outcome.ok) {
                    // Nichts lokal anfassen, solange der Server nicht bestätigt
                    // hat: sonst stünde jemand ohne seine Daten da, dessen
                    // Konto noch existiert.
                    setBusy(false)
                    setDeleteError(t(`auth.deleteFailed.${outcome.reason}`))
                    return
                  }
                  await wipeDevice()
                  clearSyncState()
                  clearAccount()
                  window.location.assign('/')
                }}
              >
                {t('auth.deleteConfirm')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAskDelete(false)}>
                {t('auth.wipeCancel')}
              </Button>
            </div>
          </div>
        )}

        {askWipe && (
          <div className="panel mt-3 space-y-3 border border-line p-3" role="alertdialog" aria-live="polite">
            <p className="text-[13px] font-semibold">{t('auth.wipeConfirmTitle')}</p>
            <p className="text-[12px] text-ink-secondary">{t('auth.wipeConfirmBody')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="sign-out-wipe-confirm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  // Reihenfolge mit Absicht: erst die Sitzung beenden, dann
                  // räumen. Andersherum könnte ein fehlgeschlagenes Abmelden
                  // ein geräumtes Gerät zurücklassen, auf dem noch jemand
                  // angemeldet ist.
                  await signOut()
                  await wipeDevice()
                  window.location.assign('/')
                }}
              >
                {t('auth.wipeConfirm')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAskWipe(false)}>
                {t('auth.wipeCancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
