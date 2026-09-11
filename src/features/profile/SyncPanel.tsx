import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { currentUser } from '@/lib/supabase/auth'
import { readSyncState, resolveWithLocal, syncOnce, type SyncReport } from '@/lib/supabase/sync'

/**
 * Der Abgleich mit dem Server.
 *
 * ER IST AUS, BIS JEMAND IHN EINSCHALTET. Das ist keine Vorsicht um der
 * Vorsicht willen: bis zum Einschalten hat kein Messwert das Gerät verlassen,
 * und genau das steht so in der Datenschutzerklärung. Ein Schalter, der beim
 * ersten Start schon an ist, wäre eine Einwilligung, die niemand gegeben hat.
 *
 * KONFLIKTE WERDEN GEZEIGT, NICHT GELÖST. Wenn ein anderes Gerät denselben
 * Athleten geändert hat, schreibt die App nicht — sie sagt es. Beide Stände
 * bleiben unversehrt, und die Entscheidung trifft ein Mensch (§89).
 */

const ENABLED_KEY = 'kydon.sync.enabled'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'on'
  } catch {
    return false
  }
}

export function SyncPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { store, mergeAthletes, athletes } = useAppData()
  const [enabled, setEnabled] = useState(readEnabled)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [state, setState] = useState(readSyncState)

  useEffect(() => {
    let alive = true
    void currentUser().then((user) => {
      if (alive) setSignedIn(user != null)
    })
    return () => {
      alive = false
    }
  }, [])

  // Ohne hinterlegtes Projekt gibt es nichts abzugleichen — dann bleibt die
  // Fläche weg, statt einen Schalter ohne Wirkung zu zeigen.
  if (!isSupabaseConfigured()) return null

  const run = async () => {
    setBusy(true)
    const outcome = await syncOnce(store, mergeAthletes)
    setBusy(false)
    setReport(outcome)
    setState(readSyncState())
  }

  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name || id

  return (
    <Panel>
      <PanelHeader title={t('sync.title')} subtitle={t('sync.hint')} />
      <div className="space-y-3 px-4 py-4 text-[13px] leading-relaxed">
        {signedIn === false && <p className="text-ink-secondary">{t('sync.signedOut')}</p>}

        {!enabled ? (
          <>
            <p className="text-ink-secondary">{t('sync.offNotice')}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={signedIn !== true}
              onClick={() => {
                try {
                  localStorage.setItem(ENABLED_KEY, 'on')
                } catch {
                  /* Ohne Speicher gilt die Wahl für diese Sitzung. */
                }
                setEnabled(true)
              }}
            >
              {t('sync.enable')}
            </Button>
            <p className="text-[12px] text-ink-muted">{t('sync.whatLeaves')}</p>
          </>
        ) : (
          <>
            <p className="readout text-ink-secondary">
              {state.lastSyncedAt
                ? t('sync.last', { date: formatDate(state.lastSyncedAt, locale) })
                : t('sync.never')}
            </p>

            {report?.reason === 'offline' && <p className="text-ink-secondary">{t('sync.offline')}</p>}
            {report && report.reason == null && (
              <p className="text-ink-secondary">
                {t('sync.result', { pushed: report.pushed, pulled: report.pulled })}
              </p>
            )}

            {state.conflicts.map((id) => (
              <div key={id} className="border-l-2 border-warning bg-warning/10 px-3 py-2">
                <p className="font-medium">
                  {t('sync.conflictTitle')} — {nameOf(id)}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed">{t('sync.conflictBody')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  {t('sync.conflictExplain')}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={async () => {
                    await resolveWithLocal(id)
                    await run()
                  }}
                >
                  {t('sync.conflictKeepLocal')}
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="primary" disabled={busy} onClick={run}>
                {busy ? t('sync.working') : t('sync.now')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  try {
                    localStorage.removeItem(ENABLED_KEY)
                  } catch {
                    /* Nichts zu räumen. */
                  }
                  setEnabled(false)
                }}
              >
                {t('sync.disable')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
