import { useTranslation } from 'react-i18next'
import { HatchPattern, useHatchId, useMeasuredWidth } from '@/components/charts/marks'
import { dayLoad, window as diaryWindow } from '@/domain/diary'
import { formatNumber } from '@/lib/format'
import type { StoredDiaryEntry } from '@/lib/store/localStore'
import type { AppLocale } from '@/types/domain'

/**
 * Vierzehn Tage auf einen Blick — eine Grösse je Streifen.
 *
 * DREI ZEICHEN, DIESELBEN WIE ÜBERALL IM SYSTEM:
 *   Balken   die Tageslast — eine Summe, deshalb ein Balken
 *   Punkt    ein Tageswert (Gewicht, Schlaf, Energie) — eine Messung
 *   Schraffur ein Tag OHNE Eintrag. Er ist nicht null, er fehlt.
 *
 * Keine Linie zwischen den Punkten: sie behauptete, zwischen zwei Abenden
 * sei etwas gemessen worden. Keine Farbe je Wert: «Stress 5» ist rot
 * hiesse, ein Wert sei ein Fehler.
 *
 * Interaktiv über den Titel je Tag — auf dem Telefon per Tipp, am Rechner
 * per Zeiger — und für Screenreader über die Beschriftung des Ganzen.
 */
export function DiaryStrip({
  entries,
  endDay,
  metric,
  locale,
  days = 14,
  height = 72,
}: {
  entries: StoredDiaryEntry[]
  endDay: string
  metric: 'load' | 'weightKg' | 'sleepHours' | 'energy' | 'stress' | 'soreness' | 'steps'
  locale: AppLocale
  days?: number
  height?: number
}) {
  const { t } = useTranslation()
  const hatch = useHatchId()
  const [box, W] = useMeasuredWidth()
  const H = height
  const PAD = 4
  const list = diaryWindow(entries, endDay, days)
  const values = list.map(({ entry }) =>
    entry == null ? null : metric === 'load' ? dayLoad(entry) : (entry[metric] ?? null),
  )
  const present = values.filter((v): v is number => v != null)
  const max = present.length ? Math.max(...present) : 1
  const min = present.length ? Math.min(...present) : 0
  // Für Summen beginnt die Achse bei null; für Messwerte bei der Spanne —
  // ein Gewicht von 83 kg auf einer Null-Achse wäre ein Strich ohne Aussage.
  const lo = metric === 'load' ? 0 : min - (max - min || 1) * 0.3
  const hi = metric === 'load' ? Math.max(max, 1) : max + (max - min || 1) * 0.3
  const slot = (W - PAD * 2) / days
  const y = (v: number) => H - PAD - ((v - lo) / (hi - lo || 1)) * (H - PAD * 2)
  const digits = metric === 'weightKg' ? 1 : metric === 'sleepHours' ? 2 : 0

  const summary = present.length
    ? t('diary.strip.summary', { n: present.length, days })
    : t('diary.strip.none')

  return (
    <div ref={box} className="w-full">
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={`${t(`diary.metrics.${metric}`)}: ${summary}`}
        className="block overflow-visible"
      >
        <HatchPattern id={hatch} />
        {list.map(({ day, entry }, i) => {
          const v = values[i]
          const x0 = PAD + i * slot
          const title = entry
            ? `${day}: ${v == null ? '—' : formatNumber(v, locale, digits)}`
            : `${day}: ${t('diary.strip.gap')}`
          if (v == null) {
            return (
              <g key={day}>
                <title>{title}</title>
                <rect
                  x={x0 + 1}
                  y={PAD}
                  width={Math.max(1, slot - 2)}
                  height={H - PAD * 2}
                  fill={`url(#${hatch})`}
                  opacity={0.55}
                  data-diary-gap={day}
                />
              </g>
            )
          }
          if (metric === 'load') {
            return (
              <g key={day}>
                <title>{title}</title>
                <rect
                  x={x0 + 2}
                  y={y(v)}
                  width={Math.max(1, slot - 4)}
                  height={Math.max(1, H - PAD - y(v))}
                  fill="var(--accent)"
                  opacity={v === 0 ? 0.25 : 0.9}
                  data-diary-bar={day}
                />
              </g>
            )
          }
          return (
            <g key={day}>
              <title>{title}</title>
              <line
                x1={x0 + slot / 2}
                x2={x0 + slot / 2}
                y1={y(v)}
                y2={H - PAD}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <circle
                cx={x0 + slot / 2}
                cy={y(v)}
                r={3.5}
                fill="var(--accent)"
                data-diary-dot={day}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
