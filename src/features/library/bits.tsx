import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check } from 'lucide-react'
import type { CoachGate, Complexity } from '@/domain/libraryTypes'
import type { PlanFit } from '@/domain/library'
import { disciplineById, type Discipline } from '@/data/sportProfiles'
import { useAppData } from '@/lib/store/AppDataProvider'
import { pick } from '@/i18n/pick'
import type { AppLocale } from '@/i18n/locales'
import { cn } from '@/lib/utils'

/** Komplexität als Punkt: hell = LOW, mittel = MODERATE, Warnfarbe = HIGH. Immer mit Text daneben, nie Farbe allein. */
export function ComplexityDot({ level }: { level: Complexity }) {
  return <span aria-hidden className={cn('inline-block size-2.5 rounded-full', level === 'LOW' ? 'bg-accent' : level === 'MODERATE' ? 'bg-ink-muted' : 'bg-warning')} />
}

export function CoachPill({ gate }: { gate: CoachGate }) {
  const { t } = useTranslation()
  if (gate === 'SELF_GUIDED_WITH_CUES') return null
  return <span className="rounded-pill border border-line px-2 py-0.5">{t(`lib.coach.${gate}`)}</span>
}

/** «Fachlich ungeprüft» — steht an jedem Plan und jeder Regel, bis der Review sie freigibt (Regel 11). */
export function UnreviewedBanner({ testId = 'lib-unreviewed' }: { testId?: string }) {
  const { t } = useTranslation()
  return (
    <p data-testid={testId} className="mb-4 flex items-center gap-1.5 text-[12px] text-ink-muted">
      <AlertTriangle size={13} aria-hidden className="shrink-0 text-warning" />
      <span>{t('lib.unreviewedShort')}</span>
    </p>
  )
}

/** Inhalte der Bibliothek liegen derzeit nur auf Deutsch vor (bewusste Ausnahme bis zur fachlichen Freigabe). */
export function GermanOnlyNote() {
  const { t, i18n } = useTranslation()
  if (i18n.language.startsWith('de')) return null
  return <p data-testid="lib-german-only" className="mb-3 text-[12px] text-ink-secondary">{t('lib.germanOnly')}</p>
}

/**
 * Kleines Schild «passt zu deiner Sportart» (`planFit`). Ohne gewählte
 * Sportart steht nichts da — dann gibt es nichts zu vergleichen.
 */
export function FitTag({ fit, sport, testId }: { fit: PlanFit | null; sport: string | undefined; testId?: string }) {
  const { t } = useTranslation()
  if (!fit || !sport) return null
  return (
    <span data-testid={testId} data-fit={fit} className={cn('inline-flex items-center gap-1 text-[12px]', fit === 'match' ? 'font-semibold text-accent-text' : fit === 'supports' ? 'text-ink-secondary' : 'text-ink-muted')}>
      {fit === 'match' && <Check size={13} aria-hidden />}
      {t(`fit.${fit}`, { sport })}
    </span>
  )
}

/** Die gewählte Sportart des Profils mit Namen in der Oberflächensprache. */
export function useMySport(): { discipline: Discipline | undefined; name: string | undefined } {
  const { data } = useAppData()
  const { i18n } = useTranslation()
  const discipline = disciplineById(data.profile.disciplineId ?? null)
  return { discipline, name: pick(discipline?.name, i18n.language as AppLocale) }
}
