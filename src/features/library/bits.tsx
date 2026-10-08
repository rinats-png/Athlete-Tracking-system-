import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import type { CoachGate, Complexity } from '@/domain/libraryTypes'
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
    <p data-testid={testId} className="mb-4 flex gap-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px] text-ink-secondary">
      <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
      <span>{t('lib.unreviewed')}</span>
    </p>
  )
}

/** Inhalte der Bibliothek liegen derzeit nur auf Deutsch vor (bewusste Ausnahme bis zur fachlichen Freigabe). */
export function GermanOnlyNote() {
  const { t, i18n } = useTranslation()
  if (i18n.language.startsWith('de')) return null
  return <p data-testid="lib-german-only" className="mb-3 text-[12px] text-ink-secondary">{t('lib.germanOnly')}</p>
}
