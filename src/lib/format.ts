import type { AppLocale } from '@/types/domain'

const KG_PER_LB = 0.45359237
const M_PER_MILE = 1609.344

export type UnitSystem = 'metric' | 'imperial'

/** mm:ss bzw. h:mm:ss — für Testzeiten und Pace. */
export function formatDuration(totalSeconds: number, withTenths = false): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const secondsText = withTenths
    ? seconds.toFixed(1).padStart(4, '0')
    : String(Math.round(seconds)).padStart(2, '0')

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secondsText}`
    : `${minutes}:${secondsText}`
}

export function formatNumber(
  value: number | null | undefined,
  locale: AppLocale,
  fractionDigits = 1,
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Vorzeichenbehaftete Prozentangabe für Delta-Anzeigen. */
export function formatDelta(value: number | null | undefined, locale: AppLocale): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value)
  return `${formatted} %`
}

export function formatDate(iso: string | null | undefined, locale: AppLocale): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

/** "vor 3 Monaten" — im Diagnostikkontext die wichtigere Zeitangabe. */
export function formatRelativeMonths(iso: string | null | undefined, locale: AppLocale): string {
  if (!iso) return '—'
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (days < 31) return rtf.format(-days, 'day')
  if (days < 365) return rtf.format(-Math.round(days / 30), 'month')
  return rtf.format(-Math.round(days / 365), 'year')
}

/**
 * Anzeigewert eines Testergebnisses. Gespeichert wird immer metrisch; hier
 * entsteht die Einheit, die der Nutzer eingestellt hat.
 */
export function formatMeasurement(
  value: number,
  unit: string,
  locale: AppLocale,
  units: UnitSystem = 'metric',
): { value: string; unit: string } {
  switch (unit) {
    case 's':
      return { value: formatDuration(value, value < 60), unit: '' }
    case 'kg':
      return units === 'imperial'
        ? { value: formatNumber(value / KG_PER_LB, locale, 1), unit: 'lb' }
        : { value: formatNumber(value, locale, 1), unit: 'kg' }
    case 'm':
      // Sprungweiten unter 10 m liest man in Zentimetern, Laufdistanzen nicht.
      if (value < 10) {
        return units === 'imperial'
          ? { value: formatNumber(value * 39.3701, locale, 1), unit: 'in' }
          : { value: formatNumber(value * 100, locale, 0), unit: 'cm' }
      }
      return units === 'imperial'
        ? { value: formatNumber(value / M_PER_MILE, locale, 2), unit: 'mi' }
        : { value: formatNumber(value, locale, 0), unit: 'm' }
    default:
      return { value: formatNumber(value, locale, value < 10 ? 2 : 0), unit }
  }
}

export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const born = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDiff = now.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1
  return age
}
