/**
 * Signal am Ende einer Zeitvorgabe: kurzer Ton und Vibration.
 *
 * Grund: bei einem Zwölf-Minuten-Lauf schaut niemand auf das Telefon. Ohne
 * hörbares Ende läuft man zu weit oder bricht zu früh ab — und der Testwert
 * ist in beiden Fällen falsch, ohne dass es auffällt.
 *
 * Zwei Wege, weil kein einzelner überall trägt: iOS kennt `vibrate` nicht,
 * und auf stummgeschaltetem Android hört man den Ton nicht. Beides zusammen
 * deckt die üblichen Fälle ab.
 *
 * KEIN AUDIOFILE: der Ton wird gerechnet. Eine Tondatei müsste ausgeliefert,
 * zwischengespeichert und offline vorgehalten werden — für 200 Millisekunden
 * Sinuston wäre das unverhältnismässig.
 */

/**
 * Muss aus einer Nutzeraktion heraus vorbereitet werden (Tippen auf «Start»).
 * iOS erlaubt keinen Ton aus einem Timer heraus, wenn der Audiokontext nicht
 * vorher durch eine Berührung freigeschaltet wurde.
 */
let context: AudioContext | null = null

export function prepareEndSignal(): void {
  if (typeof window === 'undefined') return
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    context ??= new Ctor()
    void context.resume()
  } catch {
    context = null
  }
}

const BEEP_HZ = 880
const BEEP_SECONDS = 0.18
const BEEP_GAIN = 0.15

/** Ein gerechneter Ton; ohne freigeschalteten Audiokontext still. */
export function playTone(hz = BEEP_HZ, seconds = BEEP_SECONDS, gainValue = BEEP_GAIN): void {
  if (!context) return
  try {
    const now = context.currentTime
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.frequency.value = hz
    // Sanftes Ein- und Ausblenden: ein hart geschalteter Sinus knackt.
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01)
    gain.gain.linearRampToValueAtTime(0, now + seconds)
    osc.connect(gain).connect(context.destination)
    osc.start(now)
    osc.stop(now + seconds + 0.02)
  } catch {
    // Kein Ton möglich — die Anzeige wechselt trotzdem sichtbar.
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Vibration ist nicht überall erlaubt (iOS gar nicht); Ton und Bild bleiben.
  }
}

export function playEndSignal(): void {
  vibrate([120, 80, 120])
  playTone()
}
