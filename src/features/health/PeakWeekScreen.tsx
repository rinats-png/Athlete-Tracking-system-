import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TapScale } from '@/components/ui/TapScale'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate, formatNumber } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import { hasConsent, peakSummary, photosOfDay } from '@/domain/health'
import { PEAK_STAGES } from '@/lib/store/schema'
import type { StoredPeakDay, StoredPeakWeek } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

/**
 * Peak Week als PROTOKOLL.
 *
 * Was hier steht, ist beobachtet: Gewicht am Morgen, die eigene
 * Einschätzung des Aussehens, der Verdauungskomfort, die Posing-Minuten.
 *
 * WAS HIER NICHT STEHT, mit Absicht: Vorgaben für Wasser, Natrium oder
 * Kohlenhydrate. Sie wären eine Empfehlung (§81) — und anders als bei
 * Trainingsempfehlungen hätte eine falsche Wasser- oder Elektrolytvorgabe in
 * der Woche vor einem Wettkampf ein echtes gesundheitliches Risiko. Das
 * Coaching-System v4 hat sie ebenfalls nicht ausgegeben, und das war richtig.
 *
 * Der «Look» ist ausdrücklich eine Heuristik: eine Selbstangabe von 1 bis 10,
 * aus der die App nichts ableitet. Aus einer einzigen Peak Week lässt sich
 * kein Zusammenhang lesen, und die App behauptet auch keinen.
 */
export function PeakWeekScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, peakWeeks, savePeakWeek, deletePeakWeek } = useAppData()
  const [openId, setOpenId] = useState<string | null>(peakWeeks[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const sorted = [...peakWeeks].sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  const open = sorted.find((w) => w.id === openId) ?? null

  const create = (name: string, eventDate: string) => {
    const at = new Date().toISOString()
    const week: StoredPeakWeek = { id: newId(), name: name.trim().slice(0, 80), eventDate, days: [], note: '', createdAt: at, updatedAt: at }
    savePeakWeek(week)
    setOpenId(week.id)
    setCreating(false)
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/gesundheit">
          <ArrowLeft size={14} aria-hidden />
          {t('health.title')}
        </Link>
      </Button>
      <ScreenHeader eyebrow={t('peak.eyebrow')} title={t('peak.title')} intro={t('peak.intro')} />

      <Panel className="mb-4">
        <PanelHeader
          title={t('peak.events')}
          subtitle={t('peak.eventsHint')}
          action={
            <Button type="button" variant="primary" size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus size={13} aria-hidden />
              {t('peak.new')}
            </Button>
          }
        />
        <div className="px-4 py-3">
          {creating && <NewWeek onCreate={create} onCancel={() => setCreating(false)} />}
          {sorted.length === 0 && !creating && <p className="text-[13px] text-ink-secondary">{t('peak.empty')}</p>}
          <ul className="divide-y divide-line">
            {sorted.map((w) => {
              const s = peakSummary(w)
              return (
                <li key={w.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-[13px]" data-testid={`peak-${w.id}`}>
                  <button type="button" onClick={() => setOpenId(openId === w.id ? null : w.id)} className="text-left">
                    <span className="font-display font-semibold">{w.name || t('peak.unnamed')}</span>
                    <span className="ml-2 text-[12px] text-ink-muted">
                      {formatDate(w.eventDate, locale)}
                      {s.daysToEvent != null && s.daysToEvent >= 0 ? ` · ${t('peak.inDays', { count: s.daysToEvent })}` : ''}
                      {` · ${t('peak.dayCount', { count: s.days })}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('actions.delete')}
                    className="ml-auto text-ink-muted hover:text-warning"
                    onClick={() => {
                      deletePeakWeek(w.id)
                      if (openId === w.id) setOpenId(null)
                    }}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Panel>

      {open && <WeekDetail week={open} />}
    </>
  )

  function NewWeek({ onCreate, onCancel }: { onCreate: (name: string, eventDate: string) => void; onCancel: () => void }) {
    const [name, setName] = useState('')
    const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="peak-form">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px]">
            <span className="label-tag">{t('peak.name')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('peak.eventDate')}</span>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="primary" size="sm" onClick={() => onCreate(name, eventDate)}>
            {t('actions.save')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  function WeekDetail({ week }: { week: StoredPeakWeek }) {
    const s = peakSummary(week)
    const [adding, setAdding] = useState(false)
    const days = [...week.days].sort((a, b) => a.day.localeCompare(b.day))

    const saveDay = (day: StoredPeakDay) => {
      savePeakWeek({ ...week, days: [...week.days.filter((d) => d.id !== day.id), day], updatedAt: new Date().toISOString() })
    }
    const removeDay = (id: string) => {
      savePeakWeek({ ...week, days: week.days.filter((d) => d.id !== id), updatedAt: new Date().toISOString() })
    }

    return (
      <div className="space-y-4">
        <Panel ticked data-testid="peak-summary">
          <PanelHeader title={week.name || t('peak.unnamed')} subtitle={t('peak.summarySubtitle')} />
          <div className="grid grid-cols-2 divide-x divide-y divide-line">
            <div className="px-4 py-3">
              <p className="label-tag">{t('peak.weightFrom')}</p>
              <p className="readout mt-1 text-[22px] tabular-nums">{s.weightFrom != null ? `${formatNumber(s.weightFrom, locale, 1)} kg` : '—'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="label-tag">{t('peak.weightTo')}</p>
              <p className="readout mt-1 text-[22px] tabular-nums">{s.weightTo != null ? `${formatNumber(s.weightTo, locale, 1)} kg` : '—'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="label-tag">{t('peak.delta')}</p>
              <p className="readout mt-1 text-[22px] tabular-nums">{s.weightDelta != null ? `${s.weightDelta > 0 ? '+' : ''}${formatNumber(s.weightDelta, locale, 1)} kg` : '—'}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{t('peak.deltaHint')}</p>
            </div>
            <div className="px-4 py-3">
              <p className="label-tag">{t('peak.weighed')}</p>
              <p className="readout mt-1 text-[22px] tabular-nums">{s.weighed}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{t('peak.ofDays', { count: s.days })}</p>
            </div>
          </div>
          <p className="px-4 py-3 text-[12px] leading-relaxed text-ink-muted">{t('peak.noPrescription')}</p>
        </Panel>

        <Panel>
          <PanelHeader
            title={t('peak.days')}
            subtitle={t('peak.daysHint')}
            action={
              <Button type="button" variant="primary" size="sm" onClick={() => setAdding((v) => !v)}>
                <Plus size={13} aria-hidden />
                {t('peak.addDay')}
              </Button>
            }
          />
          <div className="px-4 py-3">
            {adding && <DayForm week={week} onSave={saveDay} onDone={() => setAdding(false)} />}
            {days.length === 0 && !adding && <p className="text-[13px] text-ink-secondary">{t('peak.noDays')}</p>}
            <ul className="divide-y divide-line">
              {days.map((d) => (
                <li key={d.id} className="py-2 text-[13px]" data-testid={`peak-day-${d.day}`}>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="label-tag">{t(`peak.stages.${d.stage}`)}</span>
                  <span>{formatDate(d.day, locale)}</span>
                  {d.weightKg != null && <span className="readout tabular-nums">{formatNumber(d.weightKg, locale, 1)} kg</span>}
                  {d.lookIndex != null && <span className="text-[12px] text-ink-muted">{t('peak.lookShort', { value: d.lookIndex })}</span>}
                  {d.giComfort != null && <span className="text-[12px] text-ink-muted">{t('peak.giShort', { value: d.giComfort })}</span>}
                  {d.posingMin != null && <span className="text-[12px] text-ink-muted">{t('peak.posingShort', { value: d.posingMin })}</span>}
                  {d.note && <span className="text-[12px] text-ink-muted">{d.note}</span>}
                  <button type="button" aria-label={t('actions.delete')} className="ml-auto text-ink-muted hover:text-warning" onClick={() => removeDay(d.id)}>
                    <Trash2 size={13} aria-hidden />
                  </button>
                  </div>
                  <DayPhotos day={d.day} />
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    )
  }

  /**
   * Die Fotos dieses Tages, falls es welche gibt.
   *
   * Aufgenommen werden sie in der Gesundheitsschicht, nicht hier — ein
   * zweiter Aufnahmeweg hiesse ein zweiter Ort, an dem die Einwilligung
   * geprueft werden muss. Hier stehen sie nur, weil der Tag vor dem
   * Wettkampf der Tag ist, an dem man sie ansieht. Ohne Einwilligung fuer
   * die Kategorie erscheint nichts.
   */
  function DayPhotos({ day }: { day: string }) {
    if (!hasConsent(health, 'photos')) return null
    const photos = photosOfDay(health.photos, day)
    if (photos.length === 0) return null
    return (
      <div className="mt-2 flex flex-wrap gap-2" data-testid={`peak-photos-${day}`}>
        {photos.map((photo) => (
          <figure key={photo.id} className="w-[96px]">
            <img src={photo.dataUrl} alt={t('health.photos.alt', { pose: t(`health.poses.${photo.pose}`), date: formatDate(day, locale) })} className="w-full border border-line" />
            <figcaption className="mt-1 text-[11px] text-ink-muted">{t(`health.poses.${photo.pose}`)}</figcaption>
          </figure>
        ))}
      </div>
    )
  }

  function DayForm({ week, onSave, onDone }: { week: StoredPeakWeek; onSave: (day: StoredPeakDay) => void; onDone: () => void }) {
    const [day, setDay] = useState(new Date().toISOString().slice(0, 10))
    const [stage, setStage] = useState<(typeof PEAK_STAGES)[number]>('peak')
    const [weight, setWeight] = useState('')
    const [look, setLook] = useState<number | null>(null)
    const [gi, setGi] = useState<number | null>(null)
    const [posing, setPosing] = useState('')
    const [note, setNote] = useState('')
    const existing = week.days.find((d) => d.day === day)

    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="peak-day-form">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.day')}</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('peak.weight')}</span>
            <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('peak.posing')}</span>
            <input inputMode="numeric" value={posing} onChange={(e) => setPosing(e.target.value)} className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('peak.stage')}>
          {PEAK_STAGES.map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={stage === st}
              onClick={() => setStage(st)}
              className={cn('min-h-11 rounded-pill border px-3 text-[12px]', stage === st ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted')}
            >
              {t(`peak.stages.${st}`)}
            </button>
          ))}
        </div>
        <TapScale className="mt-3" label={t('peak.look')} value={look} onChange={setLook} min={1} max={10} />
        <p className="mt-1 text-[12px] text-ink-muted">{t('peak.lookHint')}</p>
        <TapScale className="mt-3" label={t('peak.gi')} value={gi} onChange={setGi} min={0} max={3} lowLabel={t('peak.giLow')} highLabel={t('peak.giHigh')} />
        <label className="mt-3 block text-[13px]">
          <span className="label-tag">{t('health.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              const at = new Date().toISOString()
              onSave({
                id: existing?.id ?? newId(),
                day,
                stage,
                weightKg: num(weight),
                lookIndex: look,
                giComfort: gi,
                posingMin: posing.trim() === '' ? null : Math.round(Number(posing)),
                note: note.trim().slice(0, 400),
                createdAt: existing?.createdAt ?? at,
                updatedAt: at,
              })
              onDone()
            }}
          >
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
