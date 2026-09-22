import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import type { StoredMedEntry } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

/**
 * Supplemente und Medikamente als LISTE.
 *
 * KEIN WECHSELWIRKUNGSHINWEIS, KEINE DOSISEMPFEHLUNG, KEINE WARNUNG. Beides
 * wäre eine Bewertung von Arzneimitteln und damit ein Medizinprodukt
 * (docs/rechtspruefung-art9-mdr.md §5). Die Dosis steht als Text da, so wie
 * jemand sie aufschreibt — die App liest sie nicht.
 *
 * Verschreibungspflichtiges gehört hier hinein wie alles andere: als Notiz
 * des Menschen über sich selbst, nicht als Datenfeld mit Bedeutung.
 */
export function MedsPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const active = health.meds.filter((m) => m.to == null || m.to >= today)
  const past = health.meds.filter((m) => m.to != null && m.to < today)

  const row = (m: StoredMedEntry) => (
    <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-[13px]">
      <span>{m.name}</span>
      {m.dose && <span className="readout text-ink-secondary">{m.dose}</span>}
      <span className="text-[12px] text-ink-muted">
        {t(`health.meds.kinds.${m.kind}`)} · {formatDate(m.from, locale)}
        {m.to ? ` – ${formatDate(m.to, locale)}` : ` – ${t('health.meds.ongoing')}`}
      </span>
      {m.note && <span className="text-[12px] text-ink-muted">{m.note}</span>}
      <button
        type="button"
        aria-label={t('actions.delete')}
        className="ml-auto text-ink-muted hover:text-warning"
        onClick={() => updateHealth((h) => ({ ...h, meds: h.meds.filter((x) => x.id !== m.id) }))}
      >
        <Trash2 size={13} aria-hidden />
      </button>
    </li>
  )

  return (
    <Panel data-testid="meds-panel">
      <PanelHeader
        title={t('health.meds.title')}
        subtitle={t('health.meds.subtitle')}
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen((v) => !v)}>
            <Plus size={13} aria-hidden />
            {t('health.meds.add')}
          </Button>
        }
      />
      <div className="px-4 py-3">
        {open && <MedForm onDone={() => setOpen(false)} />}
        {health.meds.length === 0 && !open && <p className="text-[13px] text-ink-secondary">{t('health.meds.empty')}</p>}
        {active.length > 0 && (
          <>
            <p className="label-tag">{t('health.meds.current')}</p>
            <ul className="divide-y divide-line">{active.map(row)}</ul>
          </>
        )}
        {past.length > 0 && (
          <>
            <p className="label-tag mt-3">{t('health.meds.past')}</p>
            <ul className="divide-y divide-line">{past.map(row)}</ul>
          </>
        )}
        <p className="mt-3 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.meds.noAdvice')}</p>
      </div>
    </Panel>
  )

  function MedForm({ onDone }: { onDone: () => void }) {
    const [kind, setKind] = useState<StoredMedEntry['kind']>('supplement')
    const [name, setName] = useState('')
    const [dose, setDose] = useState('')
    const [from, setFrom] = useState(today)
    const [to, setTo] = useState('')
    const [note, setNote] = useState('')

    const save = () => {
      if (!name.trim()) return
      const at = new Date().toISOString()
      const entry: StoredMedEntry = {
        id: newId(),
        kind,
        name: name.trim().slice(0, 120),
        dose: dose.trim().slice(0, 60),
        from,
        to: to || null,
        note: note.trim().slice(0, 400),
        createdAt: at,
        updatedAt: at,
      }
      updateHealth((h) => ({ ...h, meds: [...h.meds, entry] }))
      onDone()
    }

    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="med-form">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('health.meds.kind')}>
          {(['supplement', 'medication'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn('min-h-11 rounded-pill border px-3 text-[12px]', kind === k ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted')}
            >
              {t(`health.meds.kinds.${k}`)}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.meds.name')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.meds.dose')}</span>
            <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder={t('health.meds.dosePlaceholder')} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.meds.from')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.meds.to')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
        </div>
        <label className="mt-3 block text-[13px]">
          <span className="label-tag">{t('health.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="primary" size="sm" disabled={!name.trim()} onClick={save}>
            {t('actions.save')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t('actions.cancel')}
          </Button>
        </div>
      </div>
    )
  }
}
