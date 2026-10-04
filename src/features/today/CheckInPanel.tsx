import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TapScale } from '@/components/ui/TapScale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { checkinsOf, CHECKIN_FIELDS, type CheckinField } from '@/domain/checkin'
import { entryOn, toDay } from '@/domain/diary'
import { checkinShareEnabled } from '@/lib/checkinShare'
import { publishCheckins, withdrawCheckins, type ShareResult } from '@/lib/supabase/checkinShare'

/**
 * Der 15-Sekunden-Check-in (Produktdoktrin §4, §32).
 *
 * Drei Fragen, drei Antippen, ein Knopf. Die Werte landen im Tagebuch — es ist
 * derselbe Eintrag, nur schneller. Selbsteinschätzung, keine Messung.
 *
 * Teilen mit dem Trainer: aus, bis der Athlet es einschaltet, und nur, wenn der
 * Bau-Schalter an ist. Ausschalten löscht die geteilten Zeilen. Der Check-in
 * selbst funktioniert ohne Konto und ohne Netz.
 */
export function CheckInPanel({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { diary, saveDiaryEntry, shareCheckins, setShareCheckins } = useAppData()
  const day = toDay(new Date())
  const saved = entryOn(diary, day)
  const [values, setValues] = useState<Record<CheckinField, number | null>>({
    energy: saved?.energy ?? null,
    soreness: saved?.soreness ?? null,
    stress: saved?.stress ?? null,
  })
  const [done, setDone] = useState(false)
  const [shareNote, setShareNote] = useState<ShareResult | null>(null)
  const dirty = CHECKIN_FIELDS.some((f) => values[f] !== (saved?.[f] ?? null))
  const any = CHECKIN_FIELDS.some((f) => values[f] != null)

  useEffect(() => {
    // Ein anderer Tag oder ein anderer Athlet: die Anzeige folgt dem Bestand.
    setValues({ energy: saved?.energy ?? null, soreness: saved?.soreness ?? null, stress: saved?.stress ?? null })
  }, [saved?.energy, saved?.soreness, saved?.stress, day])

  const save = async () => {
    saveDiaryEntry(day, { energy: values.energy, soreness: values.soreness, stress: values.stress })
    setDone(true)
    if (shareCheckins && checkinShareEnabled()) {
      const list = checkinsOf([...diary.filter((e) => e.day !== day), { day, ...values } as never])
      setShareNote(await publishCheckins(list))
    }
  }

  const toggleShare = async (on: boolean) => {
    setShareCheckins(on)
    setShareNote(null)
    if (on) setShareNote(await publishCheckins(checkinsOf(diary)))
    else setShareNote(await withdrawCheckins())
  }

  return (
    <Panel className={className} data-testid="checkin-panel">
      <PanelHeader title={t('checkin.title')} subtitle={t('checkin.sub')} />
      <div className="space-y-3 px-4 pb-3">
        {CHECKIN_FIELDS.map((field) => (
          <TapScale
            key={field}
            label={t(`checkin.field.${field}`)}
            value={values[field]}
            onChange={(v) => {
              setDone(false)
              setValues((cur) => ({ ...cur, [field]: v }))
            }}
            lowLabel={t('checkin.scale.low')}
            highLabel={t('checkin.scale.high')}
          />
        ))}
        <p className="text-[12px] text-ink-muted">{t('checkin.note')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" onClick={save} disabled={!any || (!dirty && done)} data-testid="checkin-save">
            {t('checkin.save')}
          </Button>
          {done && !dirty && <span role="status" className="text-[13px] text-accent-text" data-testid="checkin-saved">{t('checkin.saved')}</span>}
          <Link to="/tagebuch" className="inline-flex min-h-11 min-w-11 items-center text-[12px] text-accent-text underline underline-offset-2">
            {t('checkin.diary')}
          </Link>
        </div>
      </div>
      {checkinShareEnabled() && (
        <div className="border-t border-line px-4 py-3" data-testid="checkin-share">
          <label className="flex min-h-11 items-center gap-3 text-[14px]">
            <input type="checkbox" checked={shareCheckins} onChange={(e) => void toggleShare(e.target.checked)} className="size-5 accent-[var(--accent)]" data-testid="checkin-share-toggle" />
            <span>{t('checkin.share.label')}</span>
          </label>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{t('checkin.share.hint')}</p>
          {shareNote && shareNote !== 'ok' && (
            <p role="status" className="mt-1 text-[12px] text-ink-secondary" data-testid="checkin-share-note">
              {t(`checkin.share.note.${shareNote}`)}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
