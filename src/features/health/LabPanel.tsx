import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate, formatNumber } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import { labMarkers, labSeries } from '@/domain/health'
import { CYCLE_PHASES } from '@/lib/store/schema'
import { LAB_GROUPS, LAB_MARKERS, labMarkerByKey } from '@/data/labMarkers'
import type { StoredLabEntry } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

/**
 * Laborwerte: eintragen, wiederfinden, den Verlauf sehen.
 *
 * DER REFERENZBEREICH WIRD ABGESCHRIEBEN, nicht mitgeliefert. Er gehört dem
 * Labor, das gemessen hat. Die App zeichnet ihn als Band hinter die Kurve —
 * und sagt kein Wort dazu, ob ein Wert darin liegt oder nicht. Das ist der
 * Unterschied zwischen einem Ordner und einer Diagnose.
 *
 * Die Präanalytik steht dabei, weil sie den Wert erklärt: Ein CK-Wert nach
 * einer harten Einheit ist ein anderer Wert als derselbe nach drei Ruhetagen.
 */
export function LabPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const [open, setOpen] = useState(false)
  const [marker, setMarker] = useState<string | null>(null)
  const markers = useMemo(() => labMarkers(health.labs), [health.labs])

  return (
    <Panel data-testid="lab-panel">
      <PanelHeader
        title={t('health.lab.title')}
        subtitle={t('health.lab.subtitle')}
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen((v) => !v)}>
            <Plus size={13} aria-hidden />
            {t('health.lab.add')}
          </Button>
        }
      />
      <div className="px-4 py-3">
        {open && <LabForm onDone={() => setOpen(false)} />}

        {markers.length === 0 && !open && <p className="text-[13px] text-ink-secondary">{t('health.lab.empty')}</p>}

        <ul className="divide-y divide-line">
          {markers.map((m) => {
            const name = labMarkerByKey(m.marker) ? t(`health.markers.${m.marker}`) : m.marker
            const series = labSeries(health.labs, m.marker)
            return (
              <li key={m.marker} className="py-3" data-testid={`lab-${m.marker}`}>
                <button type="button" onClick={() => setMarker(marker === m.marker ? null : m.marker)} className="w-full text-left">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
                    <span>{name}</span>
                    <span className="readout tabular-nums">
                      {formatNumber(m.latest.value, locale, 2)} {m.latest.unit}
                    </span>
                    <span className="text-[12px] text-ink-muted">{formatDate(m.latest.day, locale)}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {m.latest.refLow != null || m.latest.refHigh != null
                      ? t('health.lab.refOf', {
                          low: m.latest.refLow != null ? formatNumber(m.latest.refLow, locale, 2) : '—',
                          high: m.latest.refHigh != null ? formatNumber(m.latest.refHigh, locale, 2) : '—',
                          lab: m.latest.lab || t('health.lab.noLab'),
                        })
                      : t('health.lab.noRef')}
                    {' · '}
                    {t('health.lab.count', { count: m.count })}
                  </p>
                </button>
                {marker === m.marker && <LabDetail marker={m.marker} series={series} />}
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )

  function LabDetail({ marker: key, series }: { marker: string; series: ReturnType<typeof labSeries> }) {
    const values = series.map((p) => p.value)
    const refLow = series[series.length - 1]?.refLow ?? null
    const refHigh = series[series.length - 1]?.refHigh ?? null
    const lo = Math.min(...values, refLow ?? Infinity)
    const hi = Math.max(...values, refHigh ?? -Infinity)
    const span = hi - lo || 1
    const x = (i: number) => (series.length === 1 ? 180 : 20 + (i * 320) / (series.length - 1))
    const y = (v: number) => 70 - ((v - lo) / span) * 50

    return (
      <div className="mt-2">
        {series.length >= 2 && (
          <svg viewBox="0 0 360 84" className="w-full" role="img" aria-label={t('health.lab.chartLabel')}>
            {refLow != null && refHigh != null && (
              // Das Band des Labors — gezeichnet, nicht bewertet.
              <rect x="0" y={y(refHigh)} width="360" height={Math.max(1, y(refLow) - y(refHigh))} className="fill-accent/10" />
            )}
            <polyline points={series.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" className="stroke-accent" strokeWidth="2" />
            {series.map((p, i) => (
              <circle key={p.day} cx={x(i)} cy={y(p.value)} r="3.5" className="fill-accent" />
            ))}
            <text x="4" y="82" className="fill-ink-muted text-[9px]">
              {formatDate(series[0].day, locale)}
            </text>
            <text x="300" y="82" className="fill-ink-muted text-[9px]">
              {formatDate(series[series.length - 1].day, locale)}
            </text>
          </svg>
        )}
        <ul className="mt-1 space-y-1">
          {[...series].reverse().map((p, i) => {
            const entry = health.labs.filter((l) => l.marker === key).sort((a, b) => b.day.localeCompare(a.day))[i]
            return (
              <li key={`${p.day}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-ink-secondary">
                <span className="readout tabular-nums">
                  {formatNumber(p.value, locale, 2)} {p.unit}
                </span>
                <span>{formatDate(p.day, locale)}</span>
                {entry && <Preanalytics entry={entry} />}
                {entry && (
                  <button
                    type="button"
                    aria-label={t('actions.delete')}
                    className="ml-auto text-ink-muted hover:text-warning"
                    onClick={() => updateHealth((h) => ({ ...h, labs: h.labs.filter((l) => l.id !== entry.id) }))}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  function Preanalytics({ entry }: { entry: StoredLabEntry }) {
    const bits = [
      entry.time,
      entry.fasting === true ? t('health.lab.fasting') : entry.fasting === false ? t('health.lab.notFasting') : '',
      entry.trainingDayBefore === true ? t('health.lab.trainedBefore') : '',
      entry.infection === true ? t('health.lab.infection') : '',
      entry.cyclePhase ? t(`health.cyclePhases.${entry.cyclePhase}`) : '',
      entry.lab,
      entry.note,
    ].filter(Boolean)
    return <span className="text-ink-muted">{bits.join(' · ')}</span>
  }

  function LabForm({ onDone }: { onDone: () => void }) {
    const today = new Date().toISOString().slice(0, 10)
    const [day, setDay] = useState(today)
    const [key, setKey] = useState(LAB_MARKERS[0].key)
    const [custom, setCustom] = useState('')
    const [value, setValue] = useState('')
    const [unit, setUnit] = useState(LAB_MARKERS[0].unit)
    const [refLow, setRefLow] = useState('')
    const [refHigh, setRefHigh] = useState('')
    const [lab, setLab] = useState('')
    const [time, setTime] = useState('')
    const [fasting, setFasting] = useState<boolean | null>(null)
    const [trained, setTrained] = useState<boolean | null>(null)
    const [infection, setInfection] = useState<boolean | null>(null)
    const [phase, setPhase] = useState<(typeof CYCLE_PHASES)[number] | null>(null)
    const [note, setNote] = useState('')

    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
    const parsed = num(value)

    const save = () => {
      if (parsed == null || !Number.isFinite(parsed)) return
      const at = new Date().toISOString()
      const entry: StoredLabEntry = {
        id: newId(),
        day,
        marker: key === 'custom' ? custom.trim().slice(0, 60) : key,
        value: parsed,
        unit: unit.trim().slice(0, 20),
        refLow: num(refLow),
        refHigh: num(refHigh),
        lab: lab.trim().slice(0, 80),
        time: time.slice(0, 5),
        fasting,
        trainingDayBefore: trained,
        cyclePhase: phase,
        infection,
        note: note.trim().slice(0, 400),
        createdAt: at,
        updatedAt: at,
      }
      if (!entry.marker) return
      updateHealth((h) => ({ ...h, labs: [...h.labs, entry] }))
      onDone()
    }

    const Tri = ({ label, value: v, onChange }: { label: string; value: boolean | null; onChange: (n: boolean | null) => void }) => (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
        <span className="label-tag">{label}</span>
        {[
          { v: true, l: t('actions.yes') },
          { v: false, l: t('actions.no') },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={v === o.v}
            onClick={() => onChange(v === o.v ? null : o.v)}
            className={cn('min-h-11 rounded-pill border px-3 text-[12px]', v === o.v ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted')}
          >
            {o.l}
          </button>
        ))}
      </div>
    )

    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="lab-form">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.day')}</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.marker')}</span>
            <select
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                const m = labMarkerByKey(e.target.value)
                if (m) setUnit(m.unit)
              }}
              className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[14px]"
            >
              {LAB_GROUPS.map((group) => (
                <optgroup key={group} label={t(`health.labGroups.${group}`)}>
                  {LAB_MARKERS.filter((m) => m.group === group).map((m) => (
                    <option key={m.key} value={m.key}>
                      {t(`health.markers.${m.key}`)}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">{t('health.lab.customMarker')}</option>
            </select>
          </label>
          {key === 'custom' && (
            <label className="block text-[13px]">
              <span className="label-tag">{t('health.lab.customName')}</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
            </label>
          )}
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.value')}</span>
            <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.unit')}</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.refLow')}</span>
            <input inputMode="decimal" value={refLow} onChange={(e) => setRefLow(e.target.value)} className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.refHigh')}</span>
            <input inputMode="decimal" value={refHigh} onChange={(e) => setRefHigh(e.target.value)} className="readout mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.lab')}</span>
            <input value={lab} onChange={(e) => setLab(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
          <label className="block text-[13px]">
            <span className="label-tag">{t('health.lab.time')}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
          </label>
        </div>

        <p className="label-tag mt-3">{t('health.lab.preanalytics')}</p>
        <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">{t('health.lab.preanalyticsWhy')}</p>
        <div className="mt-2 space-y-2">
          <Tri label={t('health.lab.fastingQ')} value={fasting} onChange={setFasting} />
          <Tri label={t('health.lab.trainedQ')} value={trained} onChange={setTrained} />
          <Tri label={t('health.lab.infectionQ')} value={infection} onChange={setInfection} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('health.lab.phaseQ')}>
            <span className="label-tag">{t('health.lab.phaseQ')}</span>
            {CYCLE_PHASES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={phase === p}
                onClick={() => setPhase(phase === p ? null : p)}
                className={cn('min-h-11 rounded-pill border px-3 text-[12px]', phase === p ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted')}
              >
                {t(`health.cyclePhases.${p}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-3 block text-[13px]">
          <span className="label-tag">{t('health.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>

        <div className="mt-3 flex gap-2">
          <Button type="button" variant="primary" size="sm" disabled={parsed == null} onClick={save}>
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
