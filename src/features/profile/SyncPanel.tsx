import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { currentUser } from '@/lib/supabase/auth'
import { readSyncState, resolveWithLocal, syncOnce, type SyncReport } from '@/lib/supabase/sync'
import { onSyncPreferenceChange, setSyncEnabled, syncEnabled, syncPausedAt } from '@/lib/supabase/syncPreference'

/**
 * Der Abgleich mit dem Konto.
 *
 * ER IST AN, BIS JEMAND IHN AUSSCHALTET. KYDON braucht ein Konto, und mit dem
 * Konto gleicht das Gerät von selbst ab (`features/shared/useAutoSync`). Hier
 * steht, wie es darum steht, und hier lässt er sich ausschalten.
 *
 * AUSSCHALTEN NUR MIT BLICK AUF DIE FOLGEN. Vor dem Ausschalten öffnet sich ein
 * Fenster, das sagt, was danach nicht mehr geht: keine Sicherung, kein zweites
 * Gerät, der Trainer sieht nur noch den alten Stand. Die Kopie auf dem Server
 * bleibt dabei liegen, wie sie ist — gelöscht wird sie nur mit dem Konto.
 *
 * KONFLIKTE WERDEN GEZEIGT, NICHT GELÖST. Wenn ein anderes Gerät denselben
 * Athleten geändert hat, schreibt die App nicht — sie sagt es. Beide Stände
 * bleiben unversehrt, und die Entscheidung trifft ein Mensch (§89).
 *
 * Die Gesundheitsangaben gehen nie mit; sie haben ihren eigenen Abgleich mit
 * eigener Einwilligung und eigenem Schlüssel.
 */
export function SyncPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { mode, store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes, athletes } = useAppData()
  const [enabled, setEnabled] = useState(syncEnabled)
  const [pausedAt, setPausedAt] = useState(syncPausedAt)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SyncReport | null>(null)
  const [state, setState] = useState(readSyncState)
  const [confirming, setConfirming] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let alive = true
    void currentUser().then((user) => {
      if (alive) setSignedIn(user != null)
    })
    return () => {
      alive = false
    }
  }, [])

  // Der automatische Abgleich schreibt im Hintergrund — den Stand mitziehen.
  useEffect(() => {
    setState(readSyncState())
  }, [store])

  useEffect(
    () =>
      onSyncPreferenceChange(() => {
        setEnabled(syncEnabled())
        setPausedAt(syncPausedAt())
      }),
    [],
  )

  useEffect(() => {
    const el = dialog.current
    if (confirming && el && !el.open) el.showModal()
  }, [confirming])

  // Ohne hinterlegtes Projekt gibt es nichts abzugleichen; die Demo gleicht
  // nie ab — Beispieldaten gehören in kein Konto.
  if (!isSupabaseConfigured() || mode === 'demo') return null

  const run = async () => {
    setBusy(true)
    const outcome = await syncOnce(store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes)
    setBusy(false)
    setReport(outcome)
    setState(readSyncState())
  }

  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name || id
  const frozenAt = state.lastSyncedAt ? formatDate(state.lastSyncedAt, locale) : null

  return (
    <Panel id="sync" data-testid="sync-panel">
      <PanelHeader title={t('sync.title')} subtitle={t('sync.hint')} />
      <div className="space-y-3 px-4 py-4 text-[13px] leading-relaxed">
        {signedIn === false && <p className="text-ink-secondary">{t('sync.signedOut')}</p>}

        {!enabled ? (
          <>
            <p className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-ink-secondary" data-testid="sync-paused">
              {t('sync.paused', { date: pausedAt ? formatDate(pausedAt, locale) : '—' })}{' '}
              {frozenAt ? t('sync.frozen', { date: frozenAt }) : t('sync.frozenNever')}
            </p>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => {
                setSyncEnabled(true)
                setReport(null)
              }}
            >
              {t('sync.enable')}
            </Button>
          </>
        ) : (
          <>
            <p className="readout text-ink-secondary">
              {state.lastSyncedAt
                ? t('sync.last', { date: formatDate(state.lastSyncedAt, locale) })
                : t('sync.never')}
            </p>
            <p className="text-[12px] text-ink-muted">{t('sync.auto')}</p>

            {report?.reason === 'offline' && <p className="text-ink-secondary">{t('sync.offline')}</p>}
            {report?.reason === 'newer_version' && <p className="text-ink-secondary">{t('storage.newerTitle')}</p>}
            {report?.reason === 'other_account' && <p className="text-ink-secondary">{t('syncAttention.otherAccount')}</p>}
            {report && report.reason == null && (
              <p className="text-ink-secondary">
                {t('sync.result', { pushed: report.pushed, pulled: report.pulled, series: report.seriesPushed + report.seriesPulled })}
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
              <Button type="button" size="sm" variant="outline" disabled={busy || signedIn === false} onClick={run}>
                {busy ? t('sync.working') : t('sync.now')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                {t('sync.disable')}
              </Button>
            </div>
            <p className="text-[12px] text-ink-muted">{t('sync.whatLeaves')}</p>
          </>
        )}
      </div>

      {confirming && (
        <dialog
          ref={dialog}
          data-testid="sync-off-dialog"
          aria-labelledby="sync-off-title"
          onClose={() => setConfirming(false)}
          // Tippen auf das abgedunkelte Feld neben dem Fenster heisst: anlassen.
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.close()
          }}
          className="m-auto w-[min(92vw,32rem)] rounded-panel border border-card-border bg-surface-raised p-0 text-ink shadow-elev-3 backdrop:bg-black/50"
        >
          <div className="px-5 pt-5 pb-3">
            <p className="label-tag">{t('sync.offDialog.eyebrow')}</p>
            <h2 id="sync-off-title" className="mt-1 font-display text-[24px] font-bold uppercase tracking-[0.04em]">
              {t('sync.offDialog.title')}
            </h2>
          </div>
          <ul className="max-h-[55vh] space-y-2.5 overflow-y-auto px-5 pb-4 text-[14px] leading-relaxed text-ink-secondary">
            {(['backup', 'devices', 'coach', 'plans', 'server', 'local'] as const).map((key) => (
              <li key={key} className="flex gap-2.5" data-testid={`sync-off-${key}`}>
                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-warning" />
                <span>{t(`sync.offDialog.${key}`)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="sync-off-confirm"
              onClick={() => {
                setSyncEnabled(false)
                setReport(null)
                dialog.current?.close()
              }}
            >
              {t('sync.offDialog.confirm')}
            </Button>
            <Button type="button" variant="primary" size="sm" autoFocus onClick={() => dialog.current?.close()}>
              {t('sync.offDialog.keep')}
            </Button>
          </div>
        </dialog>
      )}
    </Panel>
  )
}
