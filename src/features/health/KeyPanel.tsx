import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { generatePhrase, isCompletePhrase, normalizePhrase } from '@/lib/health/crypto'
import { createHealthKey, dropHealthOnServer, keyState, resetHealthKey, syncHealthOnce, unlockHealthKey, type HealthSyncReport, type KeyState } from '@/lib/supabase/healthSync'
import { cn } from '@/lib/utils'

/**
 * Schlüssel und Zweitschrift der Gesundheitsschicht.
 *
 * DIE PHRASE WIRD GENAU EINMAL GEZEIGT. Sie liegt danach nirgends — nicht
 * auf dem Server, nicht im Gerät, nicht in diesem Code. Nur der abgeleitete
 * Schlüssel liegt im Gerät, und der ist nicht auslesbar.
 *
 * WARUM DER BILDSCHIRM AUF DEN EXPORT DRÄNGT, bevor irgendetwas passiert:
 * Wer Phrase UND Gerät verliert, verliert die Zweitschrift. Der Export ist
 * die Kopie, die dem Nutzer gehört (§32) — und er ist Klartext, weil er
 * sonst dasselbe Problem hätte.
 *
 * DER WEG AUS DER SACKGASSE steht daneben: Solange das Gerät da ist, ist
 * nichts verloren. «Neue Phrase» verschlüsselt alles neu und ersetzt den
 * Serverstand. Ohne Gerät bleibt nur «Zweitschrift löschen» — ehrlicher als
 * ein Wiederherstellungsversprechen, das niemand einlösen kann.
 */
export function KeyPanel() {
  const { t } = useTranslation()
  const { store, mergeHealthRecords } = useAppData()
  const [state, setState] = useState<KeyState | null>(null)
  const [phrase, setPhrase] = useState<string | null>(null)
  const [noted, setNoted] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<HealthSyncReport | null>(null)
  const [asking, setAsking] = useState<'reset' | 'drop' | null>(null)

  const refresh = () => {
    void keyState().then(setState)
  }
  useEffect(refresh, [])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    await fn()
    setBusy(false)
  }

  const say = (reason: string) => setError(t(`health.key.${reason === 'wrong_phrase' ? 'wrongPhrase' : reason === 'not_signed_in' ? 'signedOut' : reason === 'unavailable' ? 'unavailable' : 'failed'}`))

  return (
    <Panel ticked data-testid="health-key">
      <PanelHeader title={t('health.key.title')} subtitle={t('health.key.subtitle')} />
      <div className="space-y-2 px-4 py-3 text-[13px] leading-relaxed">
        {state == null && <p className="text-ink-muted">{t('health.key.checking')}</p>}
        {state?.state === 'unavailable' && <p className="text-ink-secondary">{t('health.key.unavailable')}</p>}
        {state?.state === 'not_signed_in' && <p className="text-ink-secondary">{t('health.key.signedOut')}</p>}

        {state?.state === 'none' && (
          <>
            <p className="text-ink-secondary">{t('health.key.none')}</p>
            <p className="text-[12px] text-ink-muted">{t('health.key.noneHint')}</p>
            {phrase == null ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setPhrase(generatePhrase())}>
                <KeyRound size={13} aria-hidden />
                {t('health.key.generate')}
              </Button>
            ) : (
              <>
                <p className="label-tag mt-2">{t('health.key.phraseLabel')}</p>
                <p className="readout border border-line-strong bg-surface-sunken px-3 py-2 text-[18px] tracking-[0.18em]" data-testid="health-phrase">
                  {phrase}
                </p>
                <p role="alert" className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px]">
                  {t('health.key.phraseWarn')}
                </p>
                <label className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={noted} onChange={(e) => setNoted(e.target.checked)} className="mt-1 size-4" />
                  <span>{t('health.key.noted')}</span>
                </label>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!noted || busy}
                  onClick={() =>
                    run(async () => {
                      const r = await createHealthKey(phrase)
                      if (r.ok) {
                        setPhrase(null)
                        setNoted(false)
                        refresh()
                      } else say(r.reason)
                    })
                  }
                >
                  {t('health.key.create')}
                </Button>
              </>
            )}
          </>
        )}

        {state?.state === 'locked' && (
          <>
            <p className="text-ink-secondary">{t('health.key.locked')}</p>
            <p className="text-[12px] text-ink-muted">{t('health.key.lockedHint')}</p>
            <label className="block">
              <span className="label-tag">{t('health.key.phraseInput')}</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px] tracking-[0.12em] uppercase"
              />
            </label>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !isCompletePhrase(input)}
              onClick={() =>
                run(async () => {
                  const r = await unlockHealthKey(normalizePhrase(input))
                  if (r.ok) {
                    setInput('')
                    refresh()
                  } else say(r.reason)
                })
              }
            >
              {t('health.key.unlock')}
            </Button>
            <LostPath />
          </>
        )}

        {state?.state === 'unlocked' && (
          <>
            <p className="flex items-center gap-2 text-ink">
              <ShieldCheck size={15} className="text-accent-text" aria-hidden />
              {t('health.key.unlocked')}
            </p>
            <p className="text-[12px] text-ink-muted">{t('health.key.unlockedHint')}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await syncHealthOnce(store, state.key, mergeHealthRecords)
                    setReport(r)
                    if (!r.ok && r.reason) say(r.reason)
                  })
                }
              >
                <RefreshCw size={13} aria-hidden />
                {busy ? t('health.key.syncing') : t('health.key.syncNow')}
              </Button>
            </div>
            {report?.ok && (
              <p role="status" className="text-[12px] text-ink-secondary">
                {t('health.key.result', { pushed: report.pushed, pulled: report.pulled })}
                {report.unreadable > 0 ? ` · ${t('health.key.unreadable', { count: report.unreadable })}` : ''}
              </p>
            )}
            <LostPath />
          </>
        )}

        {error && (
          <p role="alert" className="text-[12px] text-warning">
            {error}
          </p>
        )}
      </div>
    </Panel>
  )

  function LostPath() {
    return (
      <div className={cn('mt-2 border-t border-line pt-2')}>
        <p className="text-[12px] text-ink-muted">{t('health.key.lostHint')}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => setAsking(asking === 'reset' ? null : 'reset')}>
            {t('health.key.reset')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(asking === 'drop' ? null : 'drop')}>
            {t('health.key.drop')}
          </Button>
        </div>
        {asking === 'reset' && (
          <div role="alert" className="mt-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px]">
            <p>{t('health.key.resetConfirm')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-2"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = generatePhrase()
                  const r = await resetHealthKey(next)
                  setAsking(null)
                  if (r.ok) {
                    setPhrase(next)
                    setState(null)
                    refresh()
                  } else say(r.reason)
                })
              }
            >
              {t('health.key.resetYes')}
            </Button>
          </div>
        )}
        {asking === 'drop' && (
          <div role="alert" className="mt-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px]">
            <p>{t('health.key.dropConfirm')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-2"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const ok = await dropHealthOnServer()
                  setAsking(null)
                  if (ok) refresh()
                  else say('failed')
                })
              }
            >
              {t('health.key.dropYes')}
            </Button>
          </div>
        )}
      </div>
    )
  }
}
