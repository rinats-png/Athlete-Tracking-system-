import { planAssignEnabled } from '@/lib/planAssign'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DEFAULT_PUSH_TOPICS, PUSH_TOPICS, disablePush, enablePush, pushState, readNotifyCoach, readTopics, saveNotifyCoach, saveTopics, sendTestPush } from '@/lib/push'
import type { PushState, PushTopic } from '@/lib/push'
import { useAppData } from '@/lib/store/AppDataProvider'
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
  const { role } = useAppData()
  const [topics, setTopics] = useState<PushTopic[]>([...DEFAULT_PUSH_TOPICS])
  const [notifyCoach, setNotifyCoach] = useState(true)

  useEffect(() => {
    let alive = true
    void pushState().then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (state !== 'on') return
    let alive = true
    void readTopics().then((tp) => alive && setTopics(tp))
    void readNotifyCoach().then((v) => alive && setNotifyCoach(v))
    return () => {
      alive = false
    }
  }, [state])

  const toggleTopic = async (topic: PushTopic) => {
    const next = topics.includes(topic) ? topics.filter((x) => x !== topic) : PUSH_TOPICS.filter((x) => x === topic || topics.includes(x))
    setTopics(next)
    if (!(await saveTopics(next))) setNote(t('push.failed'))
  }
  const toggleNotifyCoach = async () => {
    const next = !notifyCoach
    setNotifyCoach(next)
    if (!(await saveNotifyCoach(next))) setNote(t('push.failed'))
  }

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
          <fieldset className="mt-3 space-y-1.5" data-testid="push-topics">
            <legend className="label-tag">{t('push.topics.title')}</legend>
            {PUSH_TOPICS.filter((tp) => (tp !== 'activity' || role === 'coach') && (tp !== 'weekly' || role !== 'coach') && (tp !== 'plan' || (role !== 'coach' && planAssignEnabled()))).map((tp) => (
              <label key={tp} className="flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-1" checked={topics.includes(tp)} onChange={() => void toggleTopic(tp)} data-topic={tp} />
                <span>
                  {t(`push.topics.${tp}`)}
                  <span className="block text-[11px] text-ink-muted">{t(`push.topics.${tp}Hint`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {role !== 'coach' && (
            <label className="mt-3 flex items-start gap-2 text-[13px]">
              <input type="checkbox" className="mt-1" checked={notifyCoach} onChange={() => void toggleNotifyCoach()} data-testid="push-notify-coach" />
              <span>
                {t('push.notifyCoach')}
                <span className="block text-[11px] text-ink-muted">{t('push.notifyCoachHint')}</span>
              </span>
            </label>
          )}
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
