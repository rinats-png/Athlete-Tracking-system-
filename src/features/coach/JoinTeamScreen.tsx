import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { currentUser } from '@/lib/supabase/auth'
import { JoinTeam } from './TeamPanel'

/**
 * Wer einen Einladungslink öffnet, landet hier. Der Code steht im Fragment
 * (#…) und hat den Server nie erreicht; er wird erst mit dem Tipp auf
 * «Beitreten» geschickt — angemeldet, über `accept_team_invite`.
 */
export function JoinTeamScreen() {
  const { t } = useTranslation()
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const code = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''

  useEffect(() => {
    let alive = true
    void currentUser().then((u) => {
      if (alive) setSignedIn(u != null)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <ScreenHeader eyebrow={t('team.eyebrow')} title={t('team.joinTitle')} intro={t('team.joinIntro')} />
      <Panel>
        <PanelHeader title={t('team.title')} />
        <div className="px-4 py-4 text-[13px] leading-relaxed">
          {signedIn === false ? (
            <>
              <p className="text-ink-secondary">{t('team.signInFirst')}</p>
              <Button asChild size="sm" variant="primary" className="mt-2">
                <Link to="/profil">{t('nav.profile')}</Link>
              </Button>
            </>
          ) : (
            <JoinTeam initialCode={code} />
          )}
        </div>
      </Panel>
    </>
  )
}
