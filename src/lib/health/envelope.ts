import { decryptJson, decryptRaw, encryptJson, encryptRaw, fromBase64, toBase64, type HealthKeys } from './crypto'

/**
 * Der Schlüsselumschlag — wie ein Trainer Gesundheitsdaten lesen kann, ohne
 * dass der Betreiber es kann.
 *
 * DAS PROBLEM. Die Gesundheitsschicht ist mit einem Schlüssel verschlüsselt,
 * den nur der Athlet hat (crypto.ts). Genau das ist der Punkt — und genau
 * das macht eine Trainerfreigabe schwierig: Der Server kann nicht einfach
 * «Lesen erlauben», denn er hat nichts Lesbares. Eine Freigabe muss also
 * kryptografisch sein, nicht nur eine Zugriffsregel.
 *
 * DIE LÖSUNG IN DREI SCHRITTEN:
 *
 *   1. Jedes Konto hat ein Schlüsselpaar (RSA-OAEP-2048). Der öffentliche
 *      Teil steht offen am Konto; der private liegt verschlüsselt daneben,
 *      eingewickelt in den Schlüssel aus der eigenen Phrase. Damit ist er
 *      auf jedem Gerät wiederherstellbar und für den Betreiber wertlos.
 *   2. Gibt der Athlet eine Kategorie frei, würfelt die App einen frischen
 *      AES-Schlüssel, verschlüsselt damit die Einträge DIESER Kategorie und
 *      legt den Schlüssel selbst in einen Umschlag: verschlüsselt für den
 *      öffentlichen Schlüssel des Trainers.
 *   3. Der Trainer öffnet den Umschlag mit seinem privaten Schlüssel und
 *      liest die Kategorie. Mehr nicht — der Umschlag trägt nur diesen einen
 *      Kategorieschlüssel, nie den Schlüssel des Athleten.
 *
 * WAS DARAUS FOLGT, und es ist eine bewusste Entscheidung:
 *
 * - **Die Freigabe ist eine Abschrift, kein Fenster.** Sie enthält den
 *   Stand zum Zeitpunkt der Freigabe. Neue Einträge sieht der Trainer erst,
 *   wenn der Athlet die Freigabe auffrischt. Das ist ehrlicher als ein
 *   Dauerfenster: Der Athlet entscheidet jedes Mal neu, und er sieht am
 *   Datum, was der andere kennt.
 * - **Der Entzug löscht.** Die Zeile verschwindet, und damit das Chiffrat.
 *   Was der Trainer vorher gelesen und abgeschrieben hat, holt keine App
 *   zurück — das sagt der Bildschirm auch.
 * - **Je Kategorie getrennt.** Ein Umschlag für Laborwerte öffnet keine
 *   Zyklusdaten. Das ist der Grund, warum nicht einfach der Hauptschlüssel
 *   weitergereicht wird.
 */

const RSA: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

function subtle(): SubtleCrypto | null {
  return globalThis.crypto?.subtle ?? null
}

export interface EnvelopeKeys {
  /** Geht offen ans Konto — jeder darf damit für dieses Konto verschliessen. */
  publicKeyB64: string
  /** Bleibt hier; wandert nur eingewickelt zum Server. */
  privateKey: CryptoKey
}

/** Ein frisches Paar für ein Konto, das noch keines hat. */
export async function generateEnvelopeKeys(): Promise<EnvelopeKeys | null> {
  const s = subtle()
  if (!s) return null
  try {
    const pair = await s.generateKey(RSA, true, ['encrypt', 'decrypt'])
    const spki = await s.exportKey('spki', pair.publicKey)
    return { publicKeyB64: toBase64(new Uint8Array(spki)), privateKey: pair.privateKey }
  } catch {
    return null
  }
}

/** Den öffentlichen Teil eines anderen Kontos benutzbar machen. */
export async function importPublicKey(b64: string): Promise<CryptoKey | null> {
  const s = subtle()
  if (!s) return null
  try {
    return await s.importKey('spki', fromBase64(b64) as unknown as BufferSource, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
  } catch {
    return null
  }
}

/**
 * Den privaten Schlüssel für die Ablage einwickeln.
 *
 * Eingewickelt wird mit dem Schlüssel aus der eigenen Phrase — derselbe, der
 * auch die Einträge verschlüsselt. Damit gilt für das Schlüsselpaar genau
 * das, was für alles andere gilt: Ohne Phrase ist es auf dem Server nichts.
 */
export async function wrapPrivateKey(keys: HealthKeys, privateKey: CryptoKey): Promise<string | null> {
  const s = subtle()
  if (!s) return null
  try {
    const pkcs8 = await s.exportKey('pkcs8', privateKey)
    return await encryptJson(keys, toBase64(new Uint8Array(pkcs8)))
  } catch {
    return null
  }
}

/** Und wieder auspacken — auf einem zweiten Gerät, nach der Phrase. */
export async function unwrapPrivateKey(keys: HealthKeys, blob: string): Promise<CryptoKey | null> {
  const s = subtle()
  if (!s) return null
  const b64 = await decryptJson(keys, blob)
  if (typeof b64 !== 'string') return null
  try {
    return await s.importKey('pkcs8', fromBase64(b64) as unknown as BufferSource, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt'])
  } catch {
    return null
  }
}

/**
 * Ein frischer Freigabeschlüssel.
 *
 * Für JEDE Freigabe ein neuer. Zwei Freigaben derselben Kategorie an zwei
 * Trainer teilen sich keinen Schlüssel — sonst hinge der Entzug beim einen
 * am anderen.
 */
export async function newShareKey(): Promise<CryptoKey | null> {
  const s = subtle()
  if (!s) return null
  try {
    return await s.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

/** Den Freigabeschlüssel in den Umschlag legen: verschlossen für den Empfänger. */
export async function sealKey(recipientPublic: CryptoKey, shareKey: CryptoKey): Promise<string | null> {
  const s = subtle()
  if (!s) return null
  try {
    const raw = await s.exportKey('raw', shareKey)
    const sealed = await s.encrypt({ name: 'RSA-OAEP' }, recipientPublic, raw)
    return toBase64(new Uint8Array(sealed))
  } catch {
    return null
  }
}

/**
 * Den Umschlag öffnen. Der herausgenommene Schlüssel ist NICHT auslesbar —
 * der Trainer soll die Kategorie lesen können, nicht den Schlüssel
 * weiterreichen.
 */
export async function openSealedKey(privateKey: CryptoKey, sealed: string): Promise<CryptoKey | null> {
  const s = subtle()
  if (!s) return null
  try {
    const raw = await s.decrypt({ name: 'RSA-OAEP' }, privateKey, fromBase64(sealed) as unknown as BufferSource)
    return await s.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
  } catch {
    return null
  }
}

/** Die Einträge einer Kategorie mit dem Freigabeschlüssel verschliessen. */
export async function sealPayload(shareKey: CryptoKey, value: unknown): Promise<string | null> {
  return encryptRaw(shareKey, value)
}

/** Und beim Trainer wieder auf. Null heisst: nicht für diesen Schlüssel. */
export async function openPayload(shareKey: CryptoKey, blob: string): Promise<unknown | null> {
  return decryptRaw(shareKey, blob)
}
