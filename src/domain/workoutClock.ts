/**
 * Uhrenmotor für Training: Runden (Kampfsport), Tabata, EMOM, AMRAP und
 * Intervalle. Eine Uhr, viele Formen — alle sind eine Folge von Phasen
 * (Vorlauf, Arbeit, Pause) mit fester Dauer.
 *
 * GEGEN DIE WANDUHR: die Anzeige rechnet aus Startzeit und Pausensumme, nie
 * aus gezählten Ticks. Ein gedrosselter Timer im Hintergrund oder ein
 * neu geladener Bildschirm zeigt deshalb trotzdem die richtige Zeit.
 *
 * KEINE TRAININGSREGEL: die Voreinstellungen sind gängige Formate (eine
 * Boxrunde dauert drei Minuten, Tabata ist 8 × 20/10), keine Empfehlung,
 * was jemand trainieren soll. Jede Zahl lässt sich ändern.
 *
 * Rein: kein React, kein Speicher, keine eigene Uhr — die Zeit wird übergeben.
 */

export type ClockKind = 'rounds' | 'tabata' | 'emom' | 'amrap' | 'intervals'

export interface ClockSpec {
  kind: ClockKind
  /** Arbeitszeit je Runde in Sekunden (AMRAP: Gesamtdauer). */
  workS: number
  /** Pause zwischen den Runden in Sekunden (EMOM und AMRAP: 0). */
  restS: number
  /** Zahl der Runden (AMRAP: 1). */
  rounds: number
  /** Vorwarnung vor dem Ende einer Arbeitsphase in Sekunden (0 = keine). */
  warnS: number
  /** Vorlauf vor der ersten Runde in Sekunden. */
  prepS: number
}

export type PhaseKind = 'prep' | 'work' | 'rest'

export interface Phase {
  kind: PhaseKind
  /** Runde, zu der die Phase gehört (1-basiert; Vorlauf: 0). */
  round: number
  durationS: number
  /** Beginn relativ zum Start in Sekunden. */
  startS: number
}

export interface ClockState {
  phaseIndex: number
  phase: Phase | null
  /** Restzeit der laufenden Phase in Sekunden (gebrochen). */
  remainingS: number
  /** Laufende Runde (0 im Vorlauf). */
  round: number
  /** Vorwarnung aktiv: Arbeitsphase und Restzeit ≤ warnS. */
  warn: boolean
  done: boolean
  /** Gesamtdauer aller Phasen in Sekunden. */
  totalS: number
  elapsedS: number
}

export const CLOCK_LIMITS = {
  workS: { min: 5, max: 3600 },
  restS: { min: 0, max: 900 },
  rounds: { min: 1, max: 99 },
  warnS: { min: 0, max: 60 },
  prepS: { min: 0, max: 60 },
} as const

/** Gängige Formate als Startpunkt; jede Zahl bleibt änderbar. */
export const CLOCK_PRESETS: Record<string, ClockSpec> = {
  boxing: { kind: 'rounds', workS: 180, restS: 60, rounds: 12, warnS: 10, prepS: 10 },
  mma: { kind: 'rounds', workS: 300, restS: 60, rounds: 3, warnS: 10, prepS: 10 },
  grappling: { kind: 'rounds', workS: 360, restS: 60, rounds: 5, warnS: 10, prepS: 10 },
  tabata: { kind: 'tabata', workS: 20, restS: 10, rounds: 8, warnS: 3, prepS: 10 },
  emom: { kind: 'emom', workS: 60, restS: 0, rounds: 10, warnS: 5, prepS: 10 },
  amrap: { kind: 'amrap', workS: 720, restS: 0, rounds: 1, warnS: 10, prepS: 10 },
  intervals: { kind: 'intervals', workS: 40, restS: 20, rounds: 10, warnS: 3, prepS: 10 },
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)))

/** Eine Vorgabe in die erlaubten Grenzen bringen; EMOM und AMRAP haben keine Pause. */
export function normalizeClock(spec: ClockSpec): ClockSpec {
  const kind: ClockKind = (['rounds', 'tabata', 'emom', 'amrap', 'intervals'] as const).includes(spec.kind) ? spec.kind : 'rounds'
  const workS = clamp(spec.workS, CLOCK_LIMITS.workS.min, CLOCK_LIMITS.workS.max)
  return {
    kind,
    workS,
    restS: kind === 'emom' || kind === 'amrap' ? 0 : clamp(spec.restS, CLOCK_LIMITS.restS.min, CLOCK_LIMITS.restS.max),
    rounds: kind === 'amrap' ? 1 : clamp(spec.rounds, CLOCK_LIMITS.rounds.min, CLOCK_LIMITS.rounds.max),
    warnS: Math.min(clamp(spec.warnS, CLOCK_LIMITS.warnS.min, CLOCK_LIMITS.warnS.max), Math.floor(workS / 2)),
    prepS: clamp(spec.prepS, CLOCK_LIMITS.prepS.min, CLOCK_LIMITS.prepS.max),
  }
}

/** Die Phasen einer Vorgabe; nach der letzten Arbeitsphase keine Pause. */
export function clockPhases(input: ClockSpec): Phase[] {
  const spec = normalizeClock(input)
  const out: Phase[] = []
  let t = 0
  if (spec.prepS > 0) {
    out.push({ kind: 'prep', round: 0, durationS: spec.prepS, startS: t })
    t += spec.prepS
  }
  for (let r = 1; r <= spec.rounds; r++) {
    out.push({ kind: 'work', round: r, durationS: spec.workS, startS: t })
    t += spec.workS
    if (r < spec.rounds && spec.restS > 0) {
      out.push({ kind: 'rest', round: r, durationS: spec.restS, startS: t })
      t += spec.restS
    }
  }
  return out
}

export const clockTotalS = (spec: ClockSpec): number => clockPhases(spec).reduce((s, p) => s + p.durationS, 0)

/** Zustand der Uhr nach `elapsedS` Sekunden Laufzeit (ohne Pausen des Nutzers). */
export function clockAt(spec: ClockSpec, elapsedS: number): ClockState {
  const norm = normalizeClock(spec)
  const phases = clockPhases(norm)
  const totalS = phases.reduce((s, p) => s + p.durationS, 0)
  const e = Math.max(0, elapsedS)
  if (e >= totalS) {
    const last = phases[phases.length - 1] ?? null
    return { phaseIndex: phases.length - 1, phase: last, remainingS: 0, round: norm.rounds, warn: false, done: true, totalS, elapsedS: totalS }
  }
  const phaseIndex = phases.findIndex((p) => e < p.startS + p.durationS)
  const phase = phases[phaseIndex]
  const remainingS = phase.startS + phase.durationS - e
  return {
    phaseIndex,
    phase,
    remainingS,
    round: phase.round,
    warn: phase.kind === 'work' && norm.warnS > 0 && remainingS <= norm.warnS,
    done: false,
    totalS,
    elapsedS: e,
  }
}

/**
 * Laufzeit aus Wanduhr: Start, Summe der abgeschlossenen Pausen und ggf. der
 * Beginn der laufenden Pause. Alles in Millisekunden.
 */
export function runningMs(startedAt: number, pausedMs: number, pausedAt: number | null, now: number): number {
  return Math.max(0, (pausedAt ?? now) - startedAt - pausedMs)
}

/**
 * Was zwischen zwei Zuständen hörbar werden soll: Phasenwechsel, Beginn der
 * Vorwarnung, letzte drei Sekunden (einmal je Sekunde), Ende.
 */
export type ClockCue = { kind: 'phase'; phase: PhaseKind; round: number } | { kind: 'warn' } | { kind: 'count'; n: number } | { kind: 'done' }

export function clockCues(prev: ClockState, next: ClockState): ClockCue[] {
  const out: ClockCue[] = []
  if (next.done && !prev.done) return [{ kind: 'done' }]
  if (next.done || !next.phase) return out
  if (next.phaseIndex !== prev.phaseIndex) out.push({ kind: 'phase', phase: next.phase.kind, round: next.round })
  else if (next.warn && !prev.warn) out.push({ kind: 'warn' })
  const sec = Math.ceil(next.remainingS)
  const prevSec = next.phaseIndex === prev.phaseIndex ? Math.ceil(prev.remainingS) : Number.POSITIVE_INFINITY
  if (sec <= 3 && sec >= 1 && sec < prevSec) out.push({ kind: 'count', n: sec })
  return out
}

/** m:ss oder h:mm:ss für Anzeigen. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds - 1e-9))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}
