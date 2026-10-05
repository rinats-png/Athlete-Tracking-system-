import type { TFunction } from 'i18next'
import type { StoredPlannedSession } from '@/lib/store/localStore'

/** Text eines Blocks einer Einheit; gleiche Wörter in Vorschau, Block und Player. */
export function blockText(b: StoredPlannedSession['blocks'][number], t: TFunction): string {
  switch (b.type) {
    case 'interval':
      return t('plan.block.interval', { reps: b.repetitions, work: b.workSeconds / 60, rec: b.recoverySeconds / 60, min: b.intensity.type === 'hr_percent_max' ? b.intensity.min : 0, max: b.intensity.type === 'hr_percent_max' ? b.intensity.max : 0 })
    case 'sprint_repeats':
      return t('plan.block.sprint', { sets: b.sets, reps: b.repetitions, dist: b.distanceM, rec: b.maxRecoverySeconds })
    case 'strength': {
      const l = b.loadTarget
      const range = l.type === 'percent_1rm' ? { min: l.min, max: l.max } : { min: 0, max: 0 }
      return b.maxRepsPerSet != null ? t('plan.block.strengthMax', { ...range, reps: b.maxRepsPerSet }) : t('plan.block.strength', { ...range, sets: b.sets ?? 0 })
    }
    case 'exercise':
      return `${b.name}: ${[`${b.sets}${b.reps != null ? ` × ${b.reps}` : ''}`, b.load].filter(Boolean).join(' · ')}`
    case 'jumps':
      return t('plan.block.jumps')
    default:
      return ''
  }
}

/** Welche Art Tagebuch-Einheit zur Intention gehört. */
export const diaryKindOf = (intent: string): 'strength' | 'endurance' => (intent === 'VO2MAX' || intent === 'REPEATED_SPRINT' || intent === 'REPEATED_HIGH_INTENSITY' ? 'endurance' : 'strength')

type Tr = (key: string, opts?: Record<string, unknown>) => string
interface NamedSession {
  kind: 'rule' | 'open' | 'own'
  title: string
  primaryIntent: string
  ruleId: string | null
}
/** Name einer Einheit: bei eigenen der selbst gewählte Titel, sonst die Absicht. */
export const sessionName = (s: NamedSession, t: Tr): string => (s.kind === 'own' && s.title ? s.title : t(`plan.intent.${s.primaryIntent}`))
/** Zeile darunter: Regel, «Eigene Einheit» oder «Offen». */
export const sessionSource = (s: NamedSession, t: Tr): string => (s.ruleId ? t(`plan.rules.${s.ruleId}.title`) : s.kind === 'own' ? t('own.tag') : t('plan.openSession'))
