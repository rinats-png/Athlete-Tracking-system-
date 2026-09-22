/**
 * Ende-zu-Ende-Verschlüsselung der Gesundheitsschicht.
 *
 * DAS ZIEL IN EINEM SATZ: Der Betreiber soll die Blutwerte nicht lesen
 * können — nicht «darf nicht», sondern «kann nicht». Für Daten nach Art. 9
 * DSGVO ist «unsere Zugriffsregeln erlauben es nicht» keine befriedigende
 * Antwort auf die Frage, wer mitliest (docs/rechtspruefung-art9-mdr.md §4).
 *
 * DER SCHLÜSSEL KOMMT AUS EINER PHRASE, NICHT AUS DEM PASSWORT. Ein Passwort
 * lässt sich zurücksetzen; ein Schlüssel nicht. Käme der Schlüssel aus dem
 * Passwort, wäre jedes Zurücksetzen ein Datenverlust — und der Nutzer
 * erführe es erst danach. Die Phrase wird einmal erzeugt, einmal angezeigt
 * und vom Menschen verwahrt.
 *
 * DER PREIS, OFFEN BENANNT: Wer die Phrase verliert UND das Gerät verliert,
 * verliert diese Daten. Solange das Gerät da ist, ist nichts verloren — die
 * App kann eine neue Phrase erzeugen und alles neu verschlüsseln. Deshalb
 * drängt der Bildschirm vor der ersten Eingabe auf einen Export (§32), und
 * deshalb ist der Export weiterhin Klartext: er gehört dem Nutzer.
 *
 * WAS DER SERVER SIEHT: eine Kennung, einen Zeitstempel und einen Block
 * Chiffrat. KEINE Kategorie, KEINEN Tag. Dass jemand überhaupt Zyklusdaten
 * oder Körperfotos führt, ist selbst eine Information — sie bleibt im
 * Chiffrat. Auch die Kennung verrät sie nicht: Sie ist der HMAC der lokalen
 * Kennung unter einem zweiten Schlüssel (siehe {@link opaqueId}), also für
 * den Server eine Zeichenkette ohne Struktur, und für zwei Geräte desselben
 * Nutzers dieselbe — genau das braucht ein Abgleich.
 *
 * VERFAHREN: PBKDF2-SHA256 mit 600.000 Runden auf einen zufälligen Salz,
 * daraus 64 Byte: die ersten 32 werden der AES-GCM-256-Schlüssel, die
 * zweiten 32 der HMAC-Schlüssel für die Kennungen. Ein Durchlauf, zwei
 * Schlüssel — der zweite kostet nichts und hält die Kennung stumm. Je Datensatz ein frischer Zufallsvektor.
 * Die Phrase trägt 120 Bit Zufall; die Runden schützen nicht vor dem
 * Erraten der Phrase (das ist aussichtslos), sondern gegen eine schwache
 * Phrase, die jemand von Hand einträgt.
 */

/**
 * 32 Zeichen ohne I, O, 0 und 1 — die vier, die man beim Abschreiben
 * verwechselt. 32 ist eine Zweierpotenz, deshalb liefert eine maskierte
 * Zufallsbyte-Folge jedes Zeichen gleich häufig.
 */
export const PHRASE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PHRASE_GROUPS = 6
export const PHRASE_GROUP_LENGTH = 4
/** 24 Zeichen à 5 Bit. Genug, dass Raten ausgeschlossen ist. */
export const PHRASE_BITS = PHRASE_GROUPS * PHRASE_GROUP_LENGTH * 5

const KDF_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12
/** Was hinter dem Salz steckt, sobald der Schlüssel stimmt. */
export const VERIFIER_PLAINTEXT = 'kydon-health-v1'

const enc = new TextEncoder()
const dec = new TextDecoder()

function subtle(): SubtleCrypto | null {
  const c = globalThis.crypto
  return c?.subtle ?? null
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function fromBase64(value: string): Uint8Array {
  const s = atob(value)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

/** Eine neue Phrase. Gruppen mit Bindestrich, damit man sie abschreiben kann. */
export function generatePhrase(): string {
  const bytes = new Uint8Array(PHRASE_GROUPS * PHRASE_GROUP_LENGTH)
  globalThis.crypto.getRandomValues(bytes)
  const chars = [...bytes].map((b) => PHRASE_ALPHABET[b & 31])
  const groups: string[] = []
  for (let i = 0; i < PHRASE_GROUPS; i++) groups.push(chars.slice(i * PHRASE_GROUP_LENGTH, (i + 1) * PHRASE_GROUP_LENGTH).join(''))
  return groups.join('-')
}

/**
 * Eine eingetippte Phrase auf ihre Form bringen: Grossbuchstaben, alles
 * Fremde raus. Wer ein I oder O tippt, hat sich vertippt — die Zeichen gibt
 * es nicht, und sie werden entfernt statt geraten.
 */
export function normalizePhrase(input: string): string {
  const cleaned = [...input.toUpperCase()].filter((c) => PHRASE_ALPHABET.includes(c)).join('')
  const groups: string[] = []
  for (let i = 0; i < cleaned.length; i += PHRASE_GROUP_LENGTH) groups.push(cleaned.slice(i, i + PHRASE_GROUP_LENGTH))
  return groups.join('-')
}

export function isCompletePhrase(input: string): boolean {
  return normalizePhrase(input).replace(/-/g, '').length === PHRASE_GROUPS * PHRASE_GROUP_LENGTH
}

export function newSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  return toBase64(bytes)
}

/**
 * Aus Phrase und Salz einen Schlüssel ableiten.
 *
 * `extractable: false` — der Schlüssel lässt sich danach nicht mehr auslesen,
 * auch nicht vom eigenen Code. Er kann in IndexedDB liegen und benutzt
 * werden, aber nicht herausgetragen.
 */
export interface HealthKeys {
  /** Verschlüsselt und entschlüsselt die Nutzlast. */
  cipher: CryptoKey
  /** Macht aus einer lokalen Kennung eine stumme (siehe {@link opaqueId}). */
  tag: CryptoKey
}

export async function deriveKey(phrase: string, saltB64: string): Promise<HealthKeys | null> {
  const s = subtle()
  if (!s) return null
  const material = await s.importKey('raw', enc.encode(normalizePhrase(phrase)), 'PBKDF2', false, ['deriveBits'])
  const bits = await s.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltB64) as unknown as BufferSource, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    material,
    512,
  )
  const raw = new Uint8Array(bits)
  const cipher = await s.importKey('raw', raw.slice(0, 32) as unknown as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  const tag = await s.importKey('raw', raw.slice(32, 64) as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return { cipher, tag }
}

/**
 * Aus `photo:3f2a…` wird eine Zeichenkette ohne Struktur.
 *
 * WARUM DAS NÖTIG IST: Die Nutzlast ist verschlüsselt, die Kennung war es
 * nicht. Ein Blick in die Tabelle hätte gereicht, um zu sehen, dass jemand
 * Zyklusdaten oder Körperfotos führt — und genau das ist selbst schon ein
 * Datum nach Art. 9. Der HMAC ist deterministisch (zwei Geräte derselben
 * Phrase bilden dieselbe Kennung, sonst gäbe es keinen Abgleich) und für
 * den Server nicht umkehrbar, weil ihm der Schlüssel fehlt.
 */
export async function opaqueId(keys: HealthKeys, entryId: string): Promise<string | null> {
  const s = subtle()
  if (!s) return null
  try {
    const mac = await s.sign('HMAC', keys.tag, enc.encode(entryId) as unknown as BufferSource)
    return toBase64(new Uint8Array(mac)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return null
  }
}

/** Ein Wert als Chiffrat: `v1.<Vektor>.<Geheimtext>`, beides Base64. */
export async function encryptJson(keys: HealthKeys, value: unknown): Promise<string | null> {
  return encryptRaw(keys.cipher, value)
}

/**
 * Dasselbe mit einem blossen AES-Schlüssel statt dem Schlüsselpaar aus der
 * Phrase. Der Umschlag (envelope.ts) braucht das: dort verschlüsselt ein
 * frisch gewürfelter Freigabeschlüssel, der nichts mit der Phrase zu tun hat.
 */
export async function encryptRaw(cipher: CryptoKey, value: unknown): Promise<string | null> {
  const s = subtle()
  if (!s) return null
  const iv = new Uint8Array(IV_BYTES)
  globalThis.crypto.getRandomValues(iv)
  const data = enc.encode(JSON.stringify(value))
  const blob = await s.encrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, cipher, data as unknown as BufferSource)
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(blob))}`
}

/**
 * Zurück in den Klartext. Null bei falschem Schlüssel, beschädigtem Block
 * oder fremdem Format — GCM merkt jede Veränderung, und ein Fehlschlag ist
 * hier ein normaler Fall, kein Absturz.
 */
export async function decryptJson(keys: HealthKeys, blob: string): Promise<unknown | null> {
  return decryptRaw(keys.cipher, blob)
}

/** Gegenstück zu {@link encryptRaw}. */
export async function decryptRaw(cipher: CryptoKey, blob: string): Promise<unknown | null> {
  const s = subtle()
  if (!s) return null
  const parts = blob.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  try {
    const plain = await s.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]) as unknown as BufferSource },
      cipher,
      fromBase64(parts[2]) as unknown as BufferSource,
    )
    return JSON.parse(dec.decode(plain))
  } catch {
    return null
  }
}

/**
 * Die Probe: ein bekannter Text, mit dem Schlüssel verschlüsselt. Ein
 * zweites Gerät prüft daran, ob die eingetippte Phrase stimmt — ohne dass
 * irgendwo die Phrase oder der Schlüssel liegen müsste.
 */
export async function makeVerifier(keys: HealthKeys): Promise<string | null> {
  return encryptJson(keys, VERIFIER_PLAINTEXT)
}

export async function checkVerifier(keys: HealthKeys, verifier: string): Promise<boolean> {
  return (await decryptJson(keys, verifier)) === VERIFIER_PLAINTEXT
}
