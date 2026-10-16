import { playTone, prepareEndSignal, vibrate } from '@/lib/endSignal'

/**
 * Signale während des Trainings: Ton, Vibration, Ansage.
 *
 * Nie nur ein Weg: iOS kennt keine Vibration, ein stummes Telefon keinen Ton,
 * und mit Kopfhörern hört man die Ansage, sieht aber nicht hin. Darum immer
 * Ton und Vibration, die Ansage zusätzlich und abschaltbar.
 *
 * Alles läuft auf dem Gerät und ohne Netz: Töne werden gerechnet, Ansagen
 * spricht die Sprachausgabe des Systems (`speechSynthesis`). Fehlt eine
 * Stimme in der Sprache, bleibt es bei Ton und Vibration.
 *
 * iOS erlaubt Ton und Sprache nur, wenn sie einmal aus einer Berührung heraus
 * freigeschaltet wurden: `unlockCues` gehört deshalb in den Startknopf.
 */
const VOICE_KEY = 'kydon.workout.voice'

export function voiceEnabled(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(VOICE_KEY, on ? 'on' : 'off')
  } catch {
    // privat: gilt für diese Sitzung nicht dauerhaft
  }
}

export function unlockCues(): void {
  prepareEndSignal()
  try {
    // Eine leere Äusserung schaltet die Sprachausgabe auf iOS frei.
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
  } catch {
    // keine Sprachausgabe: Ton und Vibration bleiben
  }
}

export function speak(text: string, lang: string): void {
  if (!voiceEnabled() || !text) return
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 1.05
    window.speechSynthesis.speak(u)
  } catch {
    // keine Stimme: Ton und Vibration bleiben
  }
}

/** Kurzer Ton für «3, 2, 1». */
export function cueCount(): void {
  playTone(660, 0.12)
  vibrate(60)
}

/** Beginn einer Arbeitsphase: hoher, längerer Ton. */
export function cueWork(): void {
  playTone(988, 0.35, 0.2)
  vibrate([200])
}

/** Beginn einer Pause: tieferer Ton. */
export function cueRest(): void {
  playTone(523, 0.35, 0.18)
  vibrate([120, 80, 120])
}

/** Vorwarnung kurz vor Rundenende: zwei kurze Töne. */
export function cueWarn(): void {
  playTone(880, 0.1)
  setTimeout(() => playTone(880, 0.1), 160)
  vibrate([80, 60, 80])
}

/** Ende der Einheit oder der Satzpause. */
export function cueDone(): void {
  playTone(784, 0.25, 0.2)
  setTimeout(() => playTone(1047, 0.4, 0.2), 260)
  vibrate([200, 100, 200])
}
