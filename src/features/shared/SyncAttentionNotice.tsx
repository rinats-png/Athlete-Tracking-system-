import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { SyncAttention } from './useAutoSync'

/**
 * Was der automatische Abgleich nicht allein lösen kann — als schmale Zeile
 * über dem Inhalt. Nur drei Fälle: die Anmeldung ist abgelaufen, der Bestand
 * gehört zu einem anderen Konto, oder ein Athlet wurde auf zwei Geräten
 * verschieden geändert. Alles andere (kein Netz, Server kurz weg) holt der
 * Abgleich von selbst nach.
 */
export function SyncAttentionNotice({ attention }: { attention: SyncAttention }) {
  const { t } = useTranslation()
  if (!attention) return null

  const signInAgain = async () => {
    const [{ signOut }, { clearAccount }] = await Promise.all([
      import('@/lib/supabase/auth'),
      import('@/features/auth/account'),
    ])
    // Der Bestand bleibt liegen; nach der Anmeldung gleicht er weiter ab.
    await signOut()
    clearAccount()
    window.location.assign('/')
  }

  return (
    <div
      role="status"
      data-testid="sync-attention"
      data-kind={attention}
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] text-ink-secondary"
    >
      <p className="min-w-0 flex-1">{t(`syncAttention.${attention}`)}</p>
      {attention === 'signedOut' ? (
        <Button type="button" size="sm" variant="outline" onClick={() => void signInAgain()}>
          {t('syncAttention.signIn')}
        </Button>
      ) : (
        <Link
          to="/profil#sync"
          className="inline-flex min-h-11 items-center font-medium text-accent-text underline underline-offset-2"
        >
          {t('syncAttention.open')}
        </Link>
      )}
    </div>
  )
}
