import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { myLinkedAthletes, sendCoachPush } from '@/lib/push'
import type { LinkedAthlete } from '@/lib/push'

const MAX = 140

/**
 * Nachricht eines Trainers an seine verbundenen Athleten.
 *
 * Erscheint nur, wenn es aktiv verbundene Athleten mit eigenem Konto gibt.
 * Wer empfangen darf, prüft der Server ein zweites Mal — diese Liste ist
 * nur die Anzeige.
 */
export function CoachPushPanel() {
  const { t } = useTranslation()
  const [athletes, setAthletes] = useState<LinkedAthlete[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void myLinkedAthletes().then((list) => {
      if (!alive) return
      setAthletes(list)
      setPicked(new Set(list.filter((a) => a.has_push).map((a) => a.athlete_id)))
    })
    return () => {
      alive = false
    }
  }, [])

  if (athletes.length === 0) return null

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const send = async () => {
    setBusy(true)
    setNote(null)
    const r = await sendCoachPush([...picked], text.trim())
    setBusy(false)
    if (r.ok) {
      setNote(t('push.coach.sent', { count: r.recipients ?? 0 }))
      setText('')
    } else setNote(r.status === 429 ? t('push.coach.limit') : t('push.failed'))
  }

  return (
    <Panel data-testid="coach-push">
      <PanelHeader title={t('push.coach.title')} subtitle={t('push.coach.hint')} />
      <ul className="divide-y divide-line">
        {athletes.map((a) => (
          <li key={a.athlete_id}>
            <label className="flex min-h-11 items-center gap-3 px-4 py-2 text-[14px]">
              <input
                type="checkbox"
                className="size-5"
                checked={picked.has(a.athlete_id)}
                onChange={() => toggle(a.athlete_id)}
              />
              <span className="flex-1">{a.display_name ?? '—'}</span>
              {!a.has_push && <span className="text-[12px] text-ink-muted">{t('push.coach.noPush')}</span>}
            </label>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-3">
        <textarea
          value={text}
          maxLength={MAX}
          rows={2}
          aria-label={t('push.coach.message')}
          placeholder={t('push.coach.placeholder')}
          onChange={(e) => setText(e.target.value)}
          className="w-full resize-y border border-line bg-surface-sunken px-3 py-2 text-[16px]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[12px] text-ink-muted tabular-nums">
            {text.length}/{MAX}
          </span>
          <Button size="sm" disabled={busy || picked.size === 0 || text.trim().length === 0} onClick={() => void send()}>
            <Send size={14} aria-hidden />
            {t('push.coach.send')}
          </Button>
        </div>
        {note && <p className="mt-2 text-[12px] text-ink-secondary" role="status">{note}</p>}
      </div>
    </Panel>
  )
}
