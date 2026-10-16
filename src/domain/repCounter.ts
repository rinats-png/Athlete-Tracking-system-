/**
 * Wiederholungen aus Körperpunkten zählen (Kameraerkennung im Training).
 *
 * WAS GEZÄHLT WIRD: ein Gelenkwinkel je Bewegungsmuster — Knie bei Kniebeuge
 * und Ausfallschritt, Hüfte beim Hüftbeugen, Ellbogen bei Drücken und Ziehen.
 * Eine Wiederholung ist der Weg oben → unten → oben mit einer Mindest-
 * Amplitude; Zittern um einen Schwellwert zählt nicht (Hysterese).
 *
 * TEMPO NUR RELATIV: je Wiederholung die Winkelgeschwindigkeit im Hochweg
 * (Grad je Sekunde). Das ist keine Hantelgeschwindigkeit in m/s und darf nicht
 * so heissen — die Kamera misst mit 30 Bildern je Sekunde und ohne Massstab.
 * Aussagekräftig ist nur der Verlauf im Satz (Tempoverlust) und, sobald der
 * eigene Messfehler bekannt ist, der Vergleich zwischen Tagen
 * (`domain/change.ts`, Regel 7). Eine Last wird daraus nicht empfohlen.
 *
 * Die Punkte kommen von der Pose-Erkennung auf dem Gerät (MediaPipe Pose,
 * 33 Punkte, Koordinaten 0..1). Kein Bild erreicht diese Datei.
 *
 * Rein: kein React, keine Kamera, keine Uhr.
 */

export type RepPattern = 'squat' | 'hinge' | 'push' | 'pull'

export interface Landmark {
  x: number
  y: number
  /** Sichtbarkeit 0..1 laut Erkennung. */
  visibility?: number
}

/** Indizes der Körperpunkte (MediaPipe Pose). */
const P = { lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 } as const

/** Die drei Punkte des Gelenkwinkels je Muster und Seite. */
const JOINTS: Record<RepPattern, [number, number, number][]> = {
  squat: [[P.lHip, P.lKnee, P.lAnkle], [P.rHip, P.rKnee, P.rAnkle]],
  hinge: [[P.lShoulder, P.lHip, P.lKnee], [P.rShoulder, P.rHip, P.rKnee]],
  push: [[P.lShoulder, P.lElbow, P.lWrist], [P.rShoulder, P.rElbow, P.rWrist]],
  pull: [[P.lShoulder, P.lElbow, P.lWrist], [P.rShoulder, P.rElbow, P.rWrist]],
}

/** Unter dieser Sichtbarkeit gilt ein Punkt als nicht erkannt. */
export const MIN_VISIBILITY = 0.5
/** Mindest-Amplitude einer Wiederholung in Grad. */
export const MIN_AMPLITUDE_DEG = 35

/** Winkel am Punkt b zwischen a und c in Grad (0..180). */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
  if (n === 0) return 180
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / n))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Der Winkel der besser sichtbaren Seite; null, wenn keine Seite erkannt ist. */
export function patternAngle(pattern: RepPattern, landmarks: Landmark[]): number | null {
  let best: { vis: number; angle: number } | null = null
  for (const [a, b, c] of JOINTS[pattern]) {
    const pts = [landmarks[a], landmarks[b], landmarks[c]]
    if (pts.some((p) => !p)) continue
    const vis = Math.min(...pts.map((p) => p.visibility ?? 1))
    if (vis < MIN_VISIBILITY) continue
    if (!best || vis > best.vis) best = { vis, angle: jointAngle(pts[0], pts[1], pts[2]) }
  }
  return best?.angle ?? null
}

/** Ob die Punkte für das Muster vollständig im Bild sind (Einrichten). */
export function bodyVisible(pattern: RepPattern, landmarks: Landmark[] | null): boolean {
  return landmarks != null && patternAngle(pattern, landmarks) != null
}

export interface Rep {
  index: number
  /** Tiefster (kleinster) Winkel der Wiederholung. */
  bottomDeg: number
  topDeg: number
  /** Dauer des Hochwegs (unten → oben) in Sekunden. */
  upS: number
  /** Winkelgeschwindigkeit im Hochweg (Grad/s) — nur relativ vergleichbar. */
  speed: number
}

export interface RepState {
  phase: 'top' | 'down' | 'up'
  /** Höchster Winkel seit der letzten Wiederholung (Ausgangsstellung). */
  top: number | null
  bottom: number | null
  bottomT: number | null
  reps: Rep[]
  lastT: number | null
}

export const startReps = (): RepState => ({ phase: 'top', top: null, bottom: null, bottomT: null, reps: [], lastT: null })

/**
 * Einen Messpunkt verarbeiten (Zeit in Sekunden, Winkel oder null).
 * Hysterese: «unten» erst, wenn der Winkel um die halbe Mindestamplitude unter
 * der Ausgangsstellung liegt; gezählt wird beim Rückweg auf 80 % des Wegs.
 */
export function stepReps(state: RepState, t: number, angle: number | null): RepState {
  if (angle == null || !Number.isFinite(angle)) return { ...state, lastT: t }
  const s = { ...state, lastT: t }
  if (s.phase === 'top') {
    const top = s.top == null ? angle : Math.max(s.top, angle)
    if (angle < top - MIN_AMPLITUDE_DEG / 2) return { ...s, top, phase: 'down', bottom: angle, bottomT: t }
    return { ...s, top }
  }
  const top = s.top ?? angle
  if (s.phase === 'down' || s.phase === 'up') {
    if (s.bottom == null || angle < s.bottom) return { ...s, phase: 'down', bottom: angle, bottomT: t }
    const amp = top - s.bottom
    const back = s.bottom + amp * 0.8
    if (amp >= MIN_AMPLITUDE_DEG && angle >= back) {
      const upS = Math.max(0.05, t - (s.bottomT ?? t))
      const rep: Rep = { index: s.reps.length + 1, bottomDeg: Math.round(s.bottom), topDeg: Math.round(top), upS: Math.round(upS * 100) / 100, speed: Math.round(((back - s.bottom) / upS) * 10) / 10 }
      return { ...s, phase: 'top', top: angle, bottom: null, bottomT: null, reps: [...s.reps, rep] }
    }
    return { ...s, phase: 'up' }
  }
  return s
}

/**
 * Tempoverlust im Satz in Prozent: schnellste der ersten beiden
 * Wiederholungen gegen die letzte. Null unter zwei Wiederholungen.
 */
export function velocityLossPercent(reps: Rep[]): number | null {
  if (reps.length < 2) return null
  const best = Math.max(...reps.slice(0, 2).map((r) => r.speed))
  if (best <= 0) return null
  const last = reps[reps.length - 1].speed
  return Math.round(((best - last) / best) * 100)
}

/**
 * Muster einer Übung aus ihren Bewegungsmustern in der Übungsdatenbank
 * (`patterns`, z. B. SQUAT_KNEE_DOMINANT). Null: die Kamera zählt diese
 * Übung nicht (Halten, Laufen, Werfen …).
 */
export function patternForExercise(patterns: readonly string[] | null | undefined): RepPattern | null {
  for (const p of patterns ?? []) {
    if (p === 'SQUAT_KNEE_DOMINANT') return 'squat'
    if (p === 'HINGE_HIP_EXTENSION') return 'hinge'
    if (p === 'HORIZONTAL_PUSH' || p === 'VERTICAL_PUSH') return 'push'
    if (p === 'HORIZONTAL_PULL' || p === 'VERTICAL_PULL') return 'pull'
  }
  return null
}
