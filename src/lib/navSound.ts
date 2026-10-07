/**
 * Ton der Navigationsleiste: leises Rasten beim Durchwischen, zwei
 * aufsteigende Töne bei der Auswahl, ein dumpfer Ton am Anschlag.
 *
 * Die Töne werden mit Web Audio erzeugt — keine Dateien, nichts zu laden,
 * funktioniert ohne Netz. Der AudioContext entsteht erst bei der ersten
 * Berührung (Vorgabe der Browser). Fehlt Web Audio, bleibt es still.
 *
 * Die Einstellung ist eine Geräte-Vorliebe wie das Farbschema und liegt
 * deshalb nicht im Datenbestand, sondern unter einem eigenen Schlüssel.
 * Standard: an.
 */
const KEY = 'kydon.navSound'

export function navSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setNavSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Ohne Speicher gilt der Schalter nur bis zum Neuladen.
  }
  enabledOverride = on
}

let enabledOverride: boolean | null = null
let ctx: AudioContext | null = null

const on = () => enabledOverride ?? navSoundEnabled()

/** Bei der ersten Berührung aufrufen, damit der Ton danach sofort kommt. */
export function primeNavSound() {
  if (!on()) return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType) {
  if (!on() || !ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Rasten: ein Symbol zieht unter der Lupe vorbei; schneller = heller. */
export function navTick(speed = 0) {
  blip(1400 + Math.min(Math.abs(speed), 30) * 25, 0.035, 0.05, 'triangle')
}

/** Auswahl: zwei Töne aufwärts. */
export function navPick() {
  blip(660, 0.09, 0.12, 'sine')
  setTimeout(() => blip(990, 0.12, 0.09, 'sine'), 60)
}

/** Anschlag am Ende der Leiste. */
export function navEdge() {
  blip(180, 0.12, 0.1, 'sine')
}
