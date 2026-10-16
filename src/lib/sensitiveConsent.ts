/**
 * Einwilligung in den Abgleich gesundheitsnaher Angaben — der Stand auf dem
 * Gerät (Art. 9 Abs. 2 lit. a DSGVO, docs/datenschutz-art9-abgleich.md).
 *
 * MASSGEBLICH IST DER SERVER (`sensitive_consents`). Der Abgleich fragt dort
 * bei jedem Lauf nach (`lib/supabase/sensitiveConsent.ts`) und schickt
 * gesundheitsnahe Angaben nur, wenn dort eine gültige Einwilligung für die
 * aktuelle Fassung steht. Dieser Eintrag hier ist die Gerätekopie — und der
 * Ort für eine Wahl, die den Server noch nicht erreicht hat (`pending`):
 * bei der Registrierung gibt es oft noch keine Sitzung, weil erst die
 * E-Mail bestätigt werden muss.
 *
 * Ohne Supabase-Import: die Registrierung liegt im Startpaket.
 */

/** Fassung des Einwilligungstexts. Eine neue Fassung gilt als «nicht gefragt». */
export const SENSITIVE_CONSENT_VERSION = '2026-10-13'

export type SensitiveConsentState = 'granted' | 'withdrawn' | 'unset'
export type SensitiveConsentKind = 'self' | 'coach'

export interface SensitiveConsentRecord {
  state: SensitiveConsentState
  kind: SensitiveConsentKind
  /** Die Wahl steht noch nicht auf dem Server. */
  pending: boolean
  ageConfirmed: boolean
  /** Bei einer Wahl aus der Registrierung: für welches Konto sie gilt. */
  email: string | null
  at: string | null
}

const KEY = 'kydon.sensitive.consent.v1'
const MODE_KEY = 'kydon.sync.sensitiveMode'
const EVENT = 'kydon:sensitive-consent'

const UNSET: SensitiveConsentRecord = { state: 'unset', kind: 'self', pending: false, ageConfirmed: false, email: null, at: null }

export function readSensitiveConsent(): SensitiveConsentRecord {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return UNSET
    const v = JSON.parse(raw) as Partial<SensitiveConsentRecord> & { version?: string }
    const kind: SensitiveConsentKind = v.kind === 'coach' ? 'coach' : 'self'
    const base = { kind, pending: v.pending === true, ageConfirmed: v.ageConfirmed === true, email: typeof v.email === 'string' ? v.email : null, at: typeof v.at === 'string' ? v.at : null }
    if (v.state === 'withdrawn') return { ...base, state: 'withdrawn' }
    // Eine Einwilligung zu einer älteren Fassung gilt nicht mehr.
    if (v.state === 'granted' && v.version === SENSITIVE_CONSENT_VERSION) return { ...base, state: 'granted' }
    return UNSET
  } catch {
    return UNSET
  }
}

export function writeSensitiveConsent(record: SensitiveConsentRecord): void {
  try {
    if (record.state === 'unset') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ ...record, version: SENSITIVE_CONSENT_VERSION }))
  } catch {
    /* Ohne Speicher gilt die Wahl nicht — ohne Einwilligung bleibt alles Sensible auf dem Gerät. */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

/**
 * Eine Wahl festhalten, die noch zum Server muss. Einwilligen setzt die
 * Altersbestätigung voraus (16 Jahre, Art. 8 DSGVO) — ohne sie gilt nichts.
 */
export function chooseSensitiveConsent(choice: {
  granted: boolean
  kind: SensitiveConsentKind
  ageConfirmed: boolean
  email?: string | null
}): SensitiveConsentRecord {
  const granted = choice.granted && choice.ageConfirmed
  const record: SensitiveConsentRecord = {
    state: granted ? 'granted' : 'withdrawn',
    kind: choice.kind,
    pending: true,
    ageConfirmed: granted,
    email: choice.email?.trim().toLowerCase() || null,
    at: new Date().toISOString(),
  }
  writeSensitiveConsent(record)
  return record
}

export function onSensitiveConsentChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

/**
 * Mit oder ohne gesundheitsnahe Angaben zuletzt abgeglichen. Wechselt das,
 * schreibt der nächste Abgleich alle Zeitreihen neu — sonst blieben nach einem
 * Widerruf alte Tagebuchzeilen mit Schlaf und Stress auf dem Server stehen.
 */
export function readSensitiveMode(): 'with' | 'without' | null {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return v === 'with' || v === 'without' ? v : null
  } catch {
    return null
  }
}

export function writeSensitiveMode(mode: 'with' | 'without'): void {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* Dann schreibt der nächste Abgleich die Zeitreihen eben noch einmal. */
  }
}
