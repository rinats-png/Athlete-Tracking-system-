import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { OBSERVATIONS, observationByKey } from '@/data/observations'
import type { ObservationGroup } from '@/data/observations'
import { formatDate, formatNumber } from '@/lib/format'

const GROUPS: ObservationGroup[] = ['recovery', 'environment', 'sensor', 'body', 'screening']

/**
 * Beobachtungswerte erfassen und im Verlauf sehen.
 *
 * DIE ENTSCHEIDUNG, DIE DIESEN BILDSCHIRM PRÄGT: hier wird nichts bewertet.
 * Keine Stufe, keine Farbe, kein Vergleich mit anderen. Für keinen dieser
 * Werte liegt eine belastbare Norm vor — und ausgerechnet bei einem
 * Laborwert eine erfundene Einordnung anzuzeigen, hätte nicht nur fachliche,
 * sondern gesundheitliche Folgen (§81, §82).
 *
 * Was der Bildschirm stattdessen leistet: er hält die Zahl mit Datum und
 * Gerät fest und zeigt, wie sie sich bei DIESEM Menschen bewegt.
 */
export function ObservationScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { observations, addObservation, deleteObservation } = useAppData()

  const [key, setKey] = useState(OBSERVATIONS[0].key)
  const [value, setValue] = useState('')
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [device, setDevice] = useState('')
  const [note, setNote] = useState('')

  const definition = observationByKey(key)
  const byKey = useMemo(() => {
    const map = new Map<string, typeof observations>()
    for (const entry of observations) {
      map.set(entry.key, [...(map.get(entry.key) ?? []), entry])
    }
    for (const list of map.values()) list.sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    return map
  }, [observations])

  const numeric = Number(value.replace(',', '.'))
  const valid =
    definition != null &&
    value.trim() !== '' &&
    Number.isFinite(numeric) &&
    numeric >= definition.min &&
    numeric <= definition.max

  const save = () => {
    if (!valid || !definition) return
    addObservation({
      key,
      observedAt: new Date(`${observedAt}T12:00:00`).toISOString(),
      value: numeric,
      device: device.trim(),
      note: note.trim(),
    })
    setValue('')
    setNote('')
  }

  return (
    <>
      <ScreenHeader
        eyebrow={t('observation.title')}
        title={t('observation.title')}
        intro={t('observation.intro')}
      />

      <Panel ticked className="mb-4">
        <PanelHeader title={t('observation.add')} subtitle={t('observation.why')} />
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          <label className="text-[13px]">
            <span className="label-tag">{t('observation.title')}</span>
            <select
              aria-label={t('observation.title')}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[14px]"
            >
              {GROUPS.map((group) => (
                <optgroup key={group} label={t(`observation.groups.${group}`)}>
                  {OBSERVATIONS.filter((o) => o.group === group).map((o) => (
                    <option key={o.key} value={o.key}>
                      {t(`observation.keys.${o.key}`)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="text-[13px]">
            <span className="label-tag">
              {t('observation.value')}
              {definition ? ` (${definition.unit})` : ''}
            </span>
            <input
              type="text"
              inputMode="decimal"
              aria-label={t('observation.value')}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[16px]"
            />
          </label>

          <label className="text-[13px]">
            <span className="label-tag">{t('observation.date')}</span>
            <input
              type="date"
              aria-label={t('observation.date')}
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[16px]"
            />
          </label>

          <label className="text-[13px]">
            <span className="label-tag">{t('observation.device')}</span>
            <input
              type="text"
              maxLength={80}
              aria-label={t('observation.device')}
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[16px]"
            />
          </label>

          <label className="text-[13px] sm:col-span-2">
            <span className="label-tag">{t('observation.note')}</span>
            <input
              type="text"
              maxLength={500}
              aria-label={t('observation.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 min-h-11 w-full border border-line bg-transparent px-3 text-[16px]"
            />
          </label>
        </div>

        {definition && (
          <div className="border-t border-line px-4 py-3">
            <p className="text-[12px] leading-relaxed text-ink-secondary">
              {t(`observation.meaning.${definition.key}`)}
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              {t(`observation.sources.${definition.source}`)}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">{t('observation.deviceHint')}</p>
          </div>
        )}

        <div className="border-t border-line px-4 py-3">
          <Button variant="primary" size="sm" disabled={!valid} onClick={save}>
            <Plus size={14} aria-hidden />
            {t('observation.add')}
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {t('observation.noMedical')}
          </p>
        </div>
      </Panel>

      {observations.length === 0 ? (
        <Panel>
          <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('observation.empty')}</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {[...byKey.entries()].map(([entryKey, list]) => {
            const def = observationByKey(entryKey)
            return (
              <Panel key={entryKey}>
                <PanelHeader
                  title={t(`observation.keys.${entryKey}`)}
                  subtitle={t('observation.history')}
                />
                <ul className="divide-y divide-line">
                  {list.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div>
                        <p className="text-[14px]">
                          <span className="readout">{formatNumber(entry.value, locale, 1)}</span>
                          {def ? ` ${def.unit}` : ''}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {formatDate(entry.observedAt, locale)}
                          {entry.device ? ` · ${entry.device}` : ''}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${t('observation.delete')}: ${t(`observation.keys.${entryKey}`)}`}
                        onClick={() => deleteObservation(entry.id)}
                      >
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          })}
        </div>
      )}
    </>
  )
}
