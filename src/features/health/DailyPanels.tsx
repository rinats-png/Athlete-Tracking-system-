import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TapScale } from '@/components/ui/TapScale'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'
import { symptomSeries, symptomsUsed } from '@/domain/health'
import { CYCLE_PHASES, SYMPTOM_KEYS } from '@/lib/store/schema'
import type { StoredCycleEntry, StoredSelfImageEntry, StoredSymptomEntry } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

const DAYS_SHOWN = 14

function lastDays(n: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) out.push(new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  return out
}

/**
 * Symptome: erfasst, nicht bewertet.
 *
 * DER HINWEIS STEHT IMMER DA, unabhängig von dem, was eingetragen ist. Er ist
 * ein fester Text und keine Auswertung — die App liest die Einträge nicht,
 * um zu entscheiden, ob sie ihn zeigt. Genau das wäre Triage und damit ein
 * Medizinprodukt (docs/rechtspruefung-art9-mdr.md §5).
 *
 * Ein Tag ohne Eintrag ist kein beschwerdefreier Tag, sondern ein nicht
 * erfasster. Die Punktreihe lässt ihn leer (§89).
 */
export function SymptomPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const [open, setOpen] = useState(false)
  const days = useMemo(() => lastDays(DAYS_SHOWN), [])
  const used = symptomsUsed(health.symptoms)

  return (
    <Panel data-testid="symptom-panel">
      <PanelHeader
        title={t('health.symptoms.title')}
        subtitle={t('health.symptoms.subtitle')}
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen((v) => !v)}>
            {t('health.symptoms.add')}
          </Button>
        }
      />
      <div className="px-4 py-3">
        {open && <SymptomForm onDone={() => setOpen(false)} />}
        {used.length === 0 && !open && <p className="text-[13px] text-ink-secondary">{t('health.symptoms.empty')}</p>}
        {used.map((key) => {
          const series = symptomSeries(health.symptoms, key, days)
          return (
            <div key={key} className="mt-3 first:mt-0" data-testid={`symptom-${key}`}>
              <p className="label-tag">{t(`health.symptomNames.${key}`)}</p>
              <svg viewBox="0 0 360 30" className="mt-1 w-full" role="img" aria-label={t(`health.symptomNames.${key}`)}>
                {series.map((v, i) => {
                  const x = 12 + (i * 336) / (DAYS_SHOWN - 1)
                  if (v == null) return <line key={i} x1={x} y1="22" x2={x} y2="26" className="stroke-line-strong" strokeWidth="2" />
                  return <circle key={i} cx={x} cy={24 - v * 6} r="3" className="fill-accent" />
                })}
              </svg>
            </div>
          )
        })}
        {used.length > 0 && <p className="mt-2 text-[12px] text-ink-muted">{t('health.symptoms.legend', { from: formatDate(days[0], locale), to: formatDate(days[days.length - 1], locale) })}</p>}
        <p role="note" className="mt-3 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink-secondary" data-testid="symptom-safety">
          {t('health.symptoms.safety')}
        </p>
      </div>
    </Panel>
  )

  function SymptomForm({ onDone }: { onDone: () => void }) {
    const today = new Date().toISOString().slice(0, 10)
    const [day, setDay] = useState(today)
    const existing = health.symptoms.find((s) => s.day === day)
    const [items, setItems] = useState<Record<string, number>>(() => Object.fromEntries((existing?.items ?? []).map((i) => [i.key, i.severity])))
    const [note, setNote] = useState(existing?.note ?? '')

    const save = () => {
      const at = new Date().toISOString()
      const entry: StoredSymptomEntry = {
        id: existing?.id ?? newId(),
        day,
        items: Object.entries(items).map(([key, severity]) => ({ key: key as (typeof SYMPTOM_KEYS)[number], severity })),
        note: note.trim().slice(0, 400),
        createdAt: existing?.createdAt ?? at,
        updatedAt: at,
      }
      updateHealth((h) => ({ ...h, symptoms: [...h.symptoms.filter((s) => s.id !== entry.id), entry] }))
      onDone()
    }

    return (
      <div className="mb-3 border border-dashed border-line-strong p-3" data-testid="symptom-form">
        <label className="block text-[13px]">
          <span className="label-tag">{t('health.day')}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <p className="mt-3 text-[12px] text-ink-muted">{t('health.symptoms.scale')}</p>
        <div className="mt-2 space-y-2">
          {SYMPTOM_KEYS.map((key) => (
            <div key={key} className="flex flex-wrap items-center gap-2" role="group" aria-label={t(`health.symptomNames.${key}`)}>
              <span className="min-w-[10rem] text-[13px]">{t(`health.symptomNames.${key}`)}</span>
              {[0, 1, 2, 3].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={items[key] === v}
                  onClick={() => setItems((cur) => (cur[key] === v ? Object.fromEntries(Object.entries(cur).filter(([k]) => k !== key)) : { ...cur, [key]: v }))}
                  className={cn('readout min-h-11 w-11 rounded-pill border text-[13px]', items[key] === v ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted')}
                >
                  {v}
                </button>
              ))}
            </div>
          ))}
        </div>
        <label className="mt-3 block text-[13px]">
          <span className="label-tag">{t('health.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="primary" size="sm" onClick={save}>
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

/**
 * Zyklus: die Phase als Selbstangabe.
 *
 * KEINE VORHERSAGE, kein Kalenderalgorithmus, kein Fruchtbarkeitsfenster.
 * Eine App, die den nächsten Zyklus berechnet, trifft eine Aussage über einen
 * physiologischen Vorgang — und Zyklus-Apps mit Verhütungszweck sind
 * zertifizierte Medizinprodukte. Hier steht nur, was jemand eingetragen hat.
 */
export function CyclePanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const today = new Date().toISOString().slice(0, 10)
  const [day, setDay] = useState(today)
  const entry = health.cycle.find((c) => c.day === day)
  const recent = [...health.cycle].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 10)

  const set = (patch: Partial<StoredCycleEntry>) => {
    const at = new Date().toISOString()
    const next: StoredCycleEntry = {
      id: entry?.id ?? newId(),
      day,
      phase: entry?.phase ?? 'unknown',
      bleeding: entry?.bleeding ?? null,
      note: entry?.note ?? '',
      createdAt: entry?.createdAt ?? at,
      updatedAt: at,
      ...patch,
    }
    updateHealth((h) => ({ ...h, cycle: [...h.cycle.filter((c) => c.id !== next.id), next] }))
  }

  return (
    <Panel data-testid="cycle-panel">
      <PanelHeader title={t('health.cycle.title')} subtitle={t('health.cycle.subtitle')} />
      <div className="px-4 py-3">
        <label className="block text-[13px]">
          <span className="label-tag">{t('health.day')}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('health.cycle.phase')}>
          {CYCLE_PHASES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={entry?.phase === p}
              onClick={() => set({ phase: p })}
              className={cn('min-h-11 rounded-pill border px-3 text-[12px]', entry?.phase === p ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted')}
            >
              {t(`health.cyclePhases.${p}`)}
            </button>
          ))}
        </div>
        <TapScale className="mt-3" label={t('health.cycle.bleeding')} value={entry?.bleeding ?? null} onChange={(v) => set({ bleeding: v })} min={0} max={3} lowLabel={t('health.cycle.bleedingNone')} highLabel={t('health.cycle.bleedingStrong')} />
        <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{t('health.cycle.noForecast')}</p>
        {recent.length > 0 && (
          <ul className="mt-2 space-y-1 text-[12px] text-ink-secondary">
            {recent.map((c) => (
              <li key={c.id}>
                {formatDate(c.day, locale)} · {t(`health.cyclePhases.${c.phase}`)}
                {c.bleeding != null ? ` · ${t('health.cycle.bleedingShort', { value: c.bleeding })}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

/** Körperbild und Libido — zwei Skalen, kein Kommentar dazu. */
export function SelfImagePanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { health, updateHealth } = useAppData()
  const today = new Date().toISOString().slice(0, 10)
  const [day, setDay] = useState(today)
  const entry = health.selfImage.find((s) => s.day === day)
  const recent = [...health.selfImage].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 7)

  const set = (patch: Partial<StoredSelfImageEntry>) => {
    const at = new Date().toISOString()
    const next: StoredSelfImageEntry = {
      id: entry?.id ?? newId(),
      day,
      bodyImage: entry?.bodyImage ?? null,
      libido: entry?.libido ?? null,
      note: entry?.note ?? '',
      createdAt: entry?.createdAt ?? at,
      updatedAt: at,
      ...patch,
    }
    updateHealth((h) => ({ ...h, selfImage: [...h.selfImage.filter((s) => s.id !== next.id), next] }))
  }

  return (
    <Panel data-testid="selfimage-panel">
      <PanelHeader title={t('health.selfImage.title')} subtitle={t('health.selfImage.subtitle')} />
      <div className="px-4 py-3">
        <label className="block text-[13px]">
          <span className="label-tag">{t('health.day')}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <TapScale className="mt-3" label={t('health.selfImage.bodyImage')} value={entry?.bodyImage ?? null} onChange={(v) => set({ bodyImage: v })} min={1} max={10} />
        <TapScale className="mt-3" label={t('health.selfImage.libido')} value={entry?.libido ?? null} onChange={(v) => set({ libido: v })} min={1} max={10} />
        <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{t('health.selfImage.noJudgement')}</p>
        {recent.length > 0 && (
          <ul className="mt-2 space-y-1 text-[12px] text-ink-secondary">
            {recent.map((s) => (
              <li key={s.id}>
                {formatDate(s.day, locale)} · {t('health.selfImage.row', { body: s.bodyImage ?? '—', libido: s.libido ?? '—' })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
