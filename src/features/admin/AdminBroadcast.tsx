import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { sendBroadcast } from '@/lib/push'

/**
 * Nachricht des Admins an alle, die Push eingeschaltet haben.
 *
 * Ob gesendet werden darf, entscheidet der Server (is_analytics_admin);
 * höchstens drei Rundnachrichten je Tag. Nur Deutsch, wie das Dashboard.
 */
export function AdminBroadcast() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const send = async () => {
    setBusy(true)
    setNote(null)
    const r = await sendBroadcast(title.trim(), body.trim())
    setBusy(false)
    setConfirm(false)
    if (r.ok) {
      setNote(`Verschickt an ${r.sent ?? 0} Gerät(e).`)
      setTitle('')
      setBody('')
    } else if (r.status === 429) setNote('Tageslimit erreicht (3 Rundnachrichten pro Tag).')
    else if (r.status === 403) setNote('Keine Berechtigung.')
    else setNote('Das hat nicht geklappt.')
  }

  const ready = title.trim().length > 0 && body.trim().length > 0

  return (
    <Panel data-testid="admin-broadcast">
      <PanelHeader
        title="Push an alle"
        subtitle="Geht an alle Geräte mit eingeschaltetem Push. Höchstens 3 Nachrichten pro Tag."
      />
      <div className="space-y-3 px-4 py-3">
        <label className="block">
          <span className="label-tag">Titel</span>
          <input
            type="text"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>
        <label className="block">
          <span className="label-tag">Nachricht</span>
          <textarea
            value={body}
            maxLength={200}
            rows={3}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 w-full resize-y border border-line bg-surface-sunken px-3 py-2 text-[16px]"
          />
        </label>
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px]">Wirklich an alle senden?</span>
            <Button size="sm" disabled={busy} onClick={() => void send()}>
              <Send size={14} aria-hidden />
              Ja, senden
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Abbrechen
            </Button>
          </div>
        ) : (
          <Button size="sm" disabled={!ready} onClick={() => setConfirm(true)}>
            <Send size={14} aria-hidden />
            Senden
          </Button>
        )}
        {note && <p className="text-[12px] text-ink-secondary" role="status">{note}</p>}
      </div>
    </Panel>
  )
}
