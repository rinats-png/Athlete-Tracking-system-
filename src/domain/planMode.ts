/**
 * Der Bau-Schalter der Training Engine, bewusst in einer eigenen kleinen Datei:
 * die Navigation braucht ihn schon beim Start, ohne das Regelregister zu laden.
 */

export type PlanMode = 'off' | 'preview' | 'live'

/** Aus dem Bau-Schalter. Alles außer `preview` ist aus; `live` wird nur durch geprüfte Regeln wirksam. */
export function planMode(flag: string | undefined): PlanMode {
  if (flag === 'preview') return 'preview'
  if (flag === 'on') return 'live'
  return 'off'
}

/** Ist der Trainingsbereich in diesem Bau sichtbar? */
export const planEnabled = (): boolean => planMode(import.meta.env?.VITE_TRAINING_PLAN) !== 'off'
