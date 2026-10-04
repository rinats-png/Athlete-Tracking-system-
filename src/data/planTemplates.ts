import type { Intent, Phase, SportFamily } from '@/domain/trainingTypes'

/**
 * Planvorlagen (docs/training-engine.md, Trainingsbereich Etappe 2).
 *
 * Eine Vorlage ist eine STRUKTUR: welche Einheiten in welchen Wochen, mit
 * welcher Absicht. Eine Dosierung steht nie in der Vorlage. Wo ein Platz auf
 * eine Regel des Registers zeigt (`ruleId`), kommt die Dosierung von dort,
 * samt Evidenz und Prüfstatus. Wo keine belegte Dosis vorliegt (`ruleId: null`),
 * bleibt die Einheit OFFEN: Absicht ja, Zahlen nein.
 *
 * ALLE VORLAGEN SIND UNGEPRÜFT, solange keine fachkundige Person sie geprüft
 * hat. Sie erscheinen nur hinter dem Vorschauschalter (`planMode`).
 * Ob eine Vorlage zur Familie und Phase ihrer Regeln passt, prüft ein Prüffall.
 *
 * `high`: zählt zum Wochenbudget hoher Intensität (Planungsregel 3 des Bauers).
 * `needs`: Ausstattung, ohne die der Platz entfällt und als übersprungen gemeldet wird.
 */
export type Equipment = 'weights' | 'cardio' | 'sprint'
export const EQUIPMENT: readonly Equipment[] = ['weights', 'cardio', 'sprint']

export interface TemplateSlot {
  key: string
  intent: Intent
  /** Regel des Registers; `null` = offene Einheit ohne belegte Dosis. */
  ruleId: string | null
  /** Einheiten je Woche bei offenen Plätzen; bei Regeln gilt deren Frequenz. */
  perWeek: number
  weekFrom: number
  weekTo: number | null
  high: boolean
  needs: Equipment | null
}

export interface PlanTemplate {
  id: string
  family: SportFamily
  phase: Phase
  weeks: number
  /** Ziel für die Auswahl in der Bibliothek. */
  goal: 'base' | 'strength' | 'power' | 'event'
  slots: TemplateSlot[]
}

const open = (key: string, intent: Intent, o: Partial<Omit<TemplateSlot, 'key' | 'intent' | 'ruleId'>> = {}): TemplateSlot => ({ key, intent, ruleId: null, perWeek: 1, weekFrom: 1, weekTo: null, high: false, needs: null, ...o })
const rule = (key: string, intent: Intent, ruleId: string, o: Partial<Omit<TemplateSlot, 'key' | 'intent' | 'ruleId'>> = {}): TemplateSlot => ({ key, intent, ruleId, perWeek: 1, weekFrom: 1, weekTo: null, high: ['VO2MAX', 'REPEATED_SPRINT'].includes(intent), needs: null, ...o })

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'hybrid_base',
    family: 'hybrid',
    phase: 'GPP',
    weeks: 6,
    goal: 'base',
    slots: [
      rule('vo2', 'VO2MAX', 'vo2_4x4'),
      rule('strength', 'MAX_STRENGTH', 'max_strength_80', { needs: 'weights' }),
      open('base', 'AEROBIC_BASE', { perWeek: 2 }),
      open('compromised', 'COMPROMISED_RUNNING', { weekFrom: 4, high: true }),
    ],
  },
  {
    id: 'hybrid_strength',
    family: 'hybrid',
    phase: 'GPP',
    weeks: 6,
    goal: 'strength',
    slots: [
      rule('strength', 'MAX_STRENGTH', 'max_strength_80', { needs: 'weights' }),
      rule('power', 'POWER', 'power_30_70', { needs: 'weights', weekFrom: 3 }),
      open('base', 'AEROBIC_BASE'),
    ],
  },
  {
    id: 'hyrox_prep',
    family: 'hybrid',
    phase: 'BUILD',
    weeks: 8,
    goal: 'event',
    slots: [
      rule('vo2', 'VO2MAX', 'vo2_4x4'),
      rule('strength', 'MAX_STRENGTH', 'max_strength_80', { needs: 'weights' }),
      open('stations', 'HYROX_STATIONS', { weekTo: 6, high: true }),
      open('compromised', 'COMPROMISED_RUNNING', { weekFrom: 3, high: true }),
      open('rehearsal', 'RACE_REHEARSAL', { weekFrom: 7, weekTo: 7, high: true }),
    ],
  },
  {
    id: 'grappling_gpp',
    family: 'combat_grappling',
    phase: 'GPP',
    weeks: 6,
    goal: 'base',
    slots: [
      rule('strength', 'MAX_STRENGTH', 'max_strength_80', { needs: 'weights' }),
      rule('rst', 'REPEATED_SPRINT', 'rst_30m', { needs: 'sprint' }),
      open('base', 'AEROBIC_BASE'),
      open('grip', 'GRIP_ENDURANCE', { weekFrom: 3 }),
    ],
  },
  {
    id: 'grappling_build',
    family: 'combat_grappling',
    phase: 'BUILD',
    weeks: 6,
    goal: 'power',
    slots: [
      rule('power', 'POWER', 'power_30_70', { needs: 'weights' }),
      rule('rst', 'REPEATED_SPRINT', 'rst_30m', { needs: 'sprint' }),
      rule('plyo', 'PLYOMETRIC', 'plyo_combat'),
      open('sim', 'FIGHT_SIMULATION', { weekFrom: 5, high: true }),
    ],
  },
  {
    id: 'striking_gpp',
    family: 'combat_striking',
    phase: 'GPP',
    weeks: 6,
    goal: 'base',
    slots: [
      rule('strength', 'MAX_STRENGTH', 'max_strength_80', { needs: 'weights' }),
      rule('vo2', 'VO2MAX', 'vo2_4x4'),
      open('base', 'AEROBIC_BASE'),
    ],
  },
  {
    id: 'striking_build',
    family: 'combat_striking',
    phase: 'BUILD',
    weeks: 6,
    goal: 'power',
    slots: [
      rule('power', 'POWER', 'power_30_70', { needs: 'weights' }),
      rule('rst', 'REPEATED_SPRINT', 'rst_30m', { needs: 'sprint' }),
      rule('plyo', 'PLYOMETRIC', 'plyo_combat'),
      open('sim', 'FIGHT_SIMULATION', { weekFrom: 5, high: true }),
    ],
  },
]

export const templateById = (id: string | null | undefined): PlanTemplate | undefined => PLAN_TEMPLATES.find((t) => t.id === id)
