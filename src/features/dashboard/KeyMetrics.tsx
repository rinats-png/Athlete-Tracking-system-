import { useTranslation } from 'react-i18next'
import { CalendarClock, CalendarCheck, Gauge, HeartPulse, Ruler, Weight } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/format'
import { ageFromBirthDate } from '@/lib/format'
import type { AppLocale, AthleteProfile } from '@/types/domain'

/**
 * Stammdaten und Termine als Liste neben der Körperansicht.
 *
 * Sechs Zeilen aus Icon, Wert und Beschriftung — keine Diagramme: das sind
 * Einzelwerte ohne Verlauf, da ist die Zahl die klarste Darstellung.
 */
export function KeyMetrics({
  athlete,
  nextDueIso,
  locale,
}: {
  athlete: AthleteProfile
  nextDueIso: string | null
  locale: AppLocale
}) {
  const { t } = useTranslation()
  const age = ageFromBirthDate(athlete.birthDate)

  const rows: { icon: typeof Weight; value: string; unit?: string; label: string }[] = [
    {
      icon: Weight,
      value: formatNumber(athlete.bodyWeightKg, locale, 1),
      unit: 'kg',
      label: t('dashboard.bodyWeight'),
    },
    {
      icon: Ruler,
      value: athlete.heightCm == null ? '—' : String(athlete.heightCm),
      unit: 'cm',
      label: t('dashboard.height'),
    },
    {
      icon: HeartPulse,
      value: athlete.restingHr == null ? '—' : String(athlete.restingHr),
      unit: 'bpm',
      label: t('dashboard.restingHr'),
    },
    {
      icon: Gauge,
      value: athlete.maxHr == null ? '—' : String(athlete.maxHr),
      unit: 'bpm',
      label: t('dashboard.maxHr'),
    },
    {
      icon: CalendarCheck,
      value: formatDate(athlete.lastAssessmentOn, locale),
      label: t('dashboard.lastAssessment'),
    },
    {
      icon: CalendarClock,
      value: nextDueIso ? formatDate(nextDueIso, locale) : '—',
      label: t('dashboard.nextDue'),
    },
  ]

  return (
    <ul className="divide-y divide-line">
      {rows.map(({ icon: Icon, value, unit, label }) => (
        <li key={label} className="flex items-center gap-3 px-4 py-[13px]">
          <Icon size={16} strokeWidth={1.7} className="shrink-0 text-ink-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="readout text-[17px] leading-none">{value}</span>
              {unit && <span className="text-[11px] text-ink-muted">{unit}</span>}
            </div>
            <span className="label-tag">{label}</span>
          </div>
        </li>
      ))}
      <li className="px-4 py-3">
        <p className="text-[12px] leading-snug text-ink-muted">
          {age != null && `${age} ${t('dashboard.years')} · `}
          {t('dashboard.retestHint')}
        </p>
      </li>
    </ul>
  )
}
