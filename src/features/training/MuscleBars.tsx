import { useTranslation } from 'react-i18next'
import { MUSCLES, type Muscle } from '@/data/exercises'

/**
 * Arbeitssätze je Muskelgruppe, diese Woche — als Balken, nicht als Tabelle.
 *
 * Keine Ziellinie, kein «10–20 Sätze empfohlen»: das wäre eine Trainings-
 * empfehlung (§81). Die Balken zeigen, wo die Woche hingegangen ist. Was
 * daraus folgt, entscheidet, wer plant.
 *
 * Nur Gruppen mit mindestens einem Satz — eine Liste von dreizehn Nullen
 * sagte, dass man dreizehn Dinge nicht getan hat.
 */
export function MuscleBars({ sets }: { sets: Record<Muscle, number> }) {
  const { t } = useTranslation()
  const rows = MUSCLES.filter((m) => sets[m] > 0).sort((a, b) => sets[b] - sets[a])
  const max = Math.max(1, ...rows.map((m) => sets[m]))
  if (rows.length === 0) {
    return <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('training.muscles.none')}</p>
  }
  return (
    <ul className="space-y-2 px-4 py-3" aria-label={t('training.muscles.title')}>
      {rows.map((m) => (
        <li key={m} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-[13px]">
          <span className="truncate text-ink-secondary">{t(`training.muscles.names.${m}`)}</span>
          <div className="h-3 bg-surface-sunken" role="img" aria-label={`${t(`training.muscles.names.${m}`)}: ${sets[m]}`}>
            <div className="h-full bg-accent" style={{ width: `${(sets[m] / max) * 100}%` }} />
          </div>
          <span className="readout text-right">{sets[m]}</span>
        </li>
      ))}
    </ul>
  )
}
