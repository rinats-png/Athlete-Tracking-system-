import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2, ShieldOff } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { useAppData } from '@/lib/store/AppDataProvider'
import { hasConsent } from '@/domain/health'
import { staleShares } from '@/lib/health/share'
import { keyState } from '@/lib/supabase/healthSync'
import { ensureEnvelope, myCoaches, ownShares, revokeShare, shareCategory, type CoachRow, type OwnShare } from '@/lib/supabase/healthShare'
import { HEALTH_CATEGORIES, type HealthCategory } from '@/lib/store/schema'

/**
 * Freigabe an einen Trainer, je Kategorie.
 *
 * DREI SÄTZE, DIE DIESER BILDSCHIRM SAGEN MUSS, weil sie sonst niemand
 * sagt — und weil eine Freigabe von Art.-9-Daten keine Kleinigkeit ist:
 *
 *   1. **Es ist eine Abschrift, kein Fenster.** Der Trainer sieht den Stand
 *      vom Tag der Freigabe. Neue Einträge sieht er erst nach dem
 *      Auffrischen — deshalb steht das Datum an jeder Freigabe und ein
 *      Hinweis, wo sich seitdem etwas geändert hat.
 *   2. **Der Entzug löscht die Abschrift, nicht die Erinnerung.** Was der
 *      andere gelesen hat, holt keine App zurück. Das steht da, bevor man
 *      freigibt, nicht danach.
 *   3. **Nur was eingewilligt ist.** Eine Kategorie ohne Einwilligung gibt
 *      es in diesem Bestand nicht und taucht hier nicht auf.
 *
 * OHNE PHRASE GEHT NICHTS. Die Freigabe braucht den privaten Schlüssel
 * dieses Kontos, und der liegt in der Phrase eingewickelt.
 */
export function SharePanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { activeAthleteId, health } = useAppData()
  const [ready, setReady] = useState<'checking' | 'locked' | 'ready' | 'off'>('checking')
  const [coaches, setCoaches] = useState<CoachRow[]>([])
  const [shares, setShares] = useState<OwnShare[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState<string | null>(null)

  const athleteId = activeAthleteId
  const granted = HEALTH_CATEGORIES.filter((c) => hasConsent(health, c))

  const load = async () => {
    const state = await keyState()
    if (state.state === 'unavailable' || state.state === 'not_signed_in') {
      setReady('off')
      return
    }
    if (state.state !== 'unlocked') {
      setReady('locked')
      return
    }
    // Das Schlüsselpaar wird hier angelegt, falls es noch keines gibt —
    // beim ersten Mal, wo es gebraucht wird, nicht auf Vorrat.
    const envelope = await ensureEnvelope(state.key)
    if (!envelope) {
      setReady('locked')
      return
    }
    setCoaches(await myCoaches())
    setShares(await ownShares())
    setReady('ready')
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (ready === 'off') return null

  const stale = new Set(
    staleShares(
      health,
      shares.filter((s) => s.athleteId === athleteId).map((s) => ({ category: s.category, takenAt: s.updatedAt })),
    ),
  )

  const shareOf = (coachId: string, category: HealthCategory) =>
    shares.find((s) => s.coachId === coachId && s.category === category && s.athleteId === athleteId)

  const give = async (coachId: string, category: HealthCategory) => {
    setBusy(`${coachId}:${category}`)
    setError(null)
    const outcome = await shareCategory(athleteId, category, health, coachId)
    if (!outcome.ok) setError(t(`health.share.error.${outcome.reason}`))
    else setShares(await ownShares())
    setBusy('')
  }

  const take = async (coachId: string, category: HealthCategory) => {
    setBusy(`${coachId}:${category}`)
    setError(null)
    if (!(await revokeShare(athleteId, category, coachId))) setError(t('health.share.error.failed'))
    else setShares(await ownShares())
    setAsking(null)
    setBusy('')
  }

  return (
    <Panel data-testid="health-share">
      <PanelHeader title={t('health.share.title')} subtitle={t('health.share.subtitle')} />
      <div className="px-4 py-3 text-[13px] leading-relaxed">
        <p className="max-w-[62ch] text-ink-secondary">{t('health.share.intro')}</p>

        {ready === 'checking' && <p className="mt-3 text-ink-muted">{t('health.share.checking')}</p>}

        {ready === 'locked' && <p className="mt-3 text-ink-secondary" data-testid="share-locked">{t('health.share.locked')}</p>}

        {ready === 'ready' && coaches.length === 0 && (
          <p className="mt-3 text-ink-secondary" data-testid="share-no-coach">{t('health.share.noCoach')}</p>
        )}

        {ready === 'ready' && granted.length === 0 && coaches.length > 0 && (
          <p className="mt-3 text-ink-secondary">{t('health.share.noConsent')}</p>
        )}

        {ready === 'ready' &&
          coaches.map((coach) => (
            <div key={coach.coachId} className="mt-4 border-t border-line pt-3 first:border-t-0" data-testid={`share-coach-${coach.coachId}`}>
              <p className="label-tag">{coach.displayName || t('health.share.unnamedCoach')}</p>

              {!coach.hasEnvelope ? (
                <p className="mt-1 text-[12px] text-ink-muted">{t('health.share.coachHasNoKey')}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {granted.map((category) => {
                    const share = shareOf(coach.coachId, category)
                    const key = `${coach.coachId}:${category}`
                    return (
                      <li key={category} className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid={`share-row-${category}`}>
                        <span className="min-w-[12rem]">{t(`health.categories.${category}`)}</span>
                        {share ? (
                          <>
                            <span className="text-[12px] text-ink-muted">{t('health.share.since', { date: formatDate(share.updatedAt, locale) })}</span>
                            {stale.has(category) && (
                              <span className="text-[12px] text-warning" data-testid={`share-stale-${category}`}>
                                {t('health.share.stale')}
                              </span>
                            )}
                            <Button type="button" variant="outline" size="sm" disabled={busy === key} onClick={() => void give(coach.coachId, category)}>
                              {t('health.share.refresh')}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" disabled={busy === key} onClick={() => setAsking(key)}>
                              <ShieldOff size={14} aria-hidden />
                              {t('health.share.revoke')}
                            </Button>
                          </>
                        ) : (
                          <Button type="button" variant="primary" size="sm" disabled={busy === key} onClick={() => void give(coach.coachId, category)}>
                            <Share2 size={14} aria-hidden />
                            {t('health.share.give')}
                          </Button>
                        )}
                        {asking === key && (
                          <div role="alert" className="w-full border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed">
                            <p className="max-w-[62ch]">{t('health.share.revokeWarning')}</p>
                            <Button type="button" variant="primary" size="sm" className="mt-2" onClick={() => void take(coach.coachId, category)}>
                              {t('health.share.revokeYes')}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setAsking(null)}>
                              {t('actions.cancel')}
                            </Button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-warning">
            {error}
          </p>
        )}

        <p role="note" className="mt-3 border-l-2 border-line-strong px-3 py-2 text-[12px] leading-relaxed text-ink-secondary" data-testid="share-nature">
          {t('health.share.nature')}
        </p>
      </div>
    </Panel>
  )
}
