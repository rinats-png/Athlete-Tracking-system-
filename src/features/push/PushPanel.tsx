import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { disablePush, enablePush, pushState, sendTestPush } from '@/lib/push'
import type { PushState } from '@/lib/push'
import { useLocale } from '@/features/shared/useLocale'

/**
 * Push ein- und ausschalten, mit Probenachricht.
 *
 * Der Zustand kommt vom Gerät (Erlaubnis, Abonnement) und vom Konto: ohne
 * Anmeldung gibt es kein Push, weil der Server wissen muss, wem er schreibt.
 */
export function PushPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void pushState().then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])

  const run = async (work: () => Promise<PushState>) => {
    setBusy(true)
    setNote(null)
    try {
      setState(await work())
    } catch {
      setNote(t('push.failed'))
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true)
    const r = await sendTestPush()
    setBusy(false)
    setNote(r.ok ? t('push.testSent') : t('push.failed'))
  }

  return (
    <div className="border-t border-line px-4 py-3" data-testid="push-panel">
      <span className="label-tag">{t('push.title')}</span>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{t('push.hint')}</p>
      {state == null ? null : state === 'on' ? (
        <>
          <p className="mt-2 text-[12px] text-ink-muted">{t('push.on')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void test()}>
              <Send size={14} aria-hidden />
              {t('push.test')}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(disablePush)}>
              <BellOff size={14} aria-hidden />
              {t('push.disable')}
            </Button>
          </div>
        </>
      ) : state === 'off' ? (
        <Button variant="outline" size="sm" className="mt-2" disabled={busy} onClick={() => void run(() => enablePush(locale))}>
          <Bell size={14} aria-hidden />
          {t('push.enable')}
        </Button>
      ) : (
        <p className="mt-2 text-[12px] text-ink-muted">{t(`push.state.${state}`)}</p>
      )}
      {note && <p className="mt-2 text-[12px] text-ink-secondary" role="status">{note}</p>}
    </div>
  )
}
