import { parseStoredData, type LoadReport } from './schema'
import type { StoredData } from './localStore'

/**
 * Zweitschrift des Bestands in IndexedDB.
 *
 * Der `localStorage` ist der Arbeitsspeicher der App: synchron, sofort da,
 * und alle Lesepfade hängen daran. Er hat aber zwei Eigenschaften, die einen
 * Datenverlust ohne Vorwarnung erlauben — Browser räumen ihn unter
 * Speicherdruck weg, und «Websitedaten löschen» trifft ihn zuerst. Für
 * Messreihen, die über Jahre entstehen, ist das zu wenig.
 *
 * Deshalb geht jeder Schreibvorgang zusätzlich in IndexedDB. Gelesen wird von
 * dort nur, wenn der `localStorage` leer zurückkommt, obwohl eine Zweitschrift
 * existiert — dann war es eine Räumung, und der Bestand kehrt zurück.
 *
 * Die Zweitschrift ist bewusst genau ein Datensatz unter einem festen
 * Schlüssel. Kein Verlauf, keine Versionsstände: sie soll den letzten Stand
 * halten, nicht ein zweites Datenmodell werden.
 */

const DB_NAME = 'kydon'
/** Der Name bis September 2026. Wird einmal umgezogen, dann gelöscht. */
const LEGACY_DB_NAME = 'baseline'
const DB_VERSION = 1
const STORE = 'snapshots'
const KEY = 'current'

/** IndexedDB fehlt im privaten Modus mancher Browser und in Testumgebungen. */
function available(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(name: string = DB_NAME): Promise<IDBDatabase | null> {
  if (!available()) return Promise.resolve(null)
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(name, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    // Ein blockierter Upgrade darf nicht ewig hängen bleiben.
    request.onblocked = () => resolve(null)
  })
}

function readRecord(db: IDBDatabase): Promise<BackupRecord | null> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      request.onsuccess = () => {
        const value = request.result as BackupRecord | undefined
        resolve(value && typeof value === 'object' && 'data' in value ? value : null)
      }
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}

/**
 * Umzug der Zweitschrift vom alten Namen «baseline».
 *
 * Läuft nur, wenn die neue Datenbank noch keine Zweitschrift hat — also genau
 * dann, wenn der Umzug etwas zu tun hätte. Ein Öffnen legt eine Datenbank an,
 * die es nicht gab; deshalb wird die alte danach in jedem Fall gelöscht:
 * entweder war sie leer und ist damit nur ein Artefakt des Nachsehens, oder
 * ihr Inhalt liegt jetzt unter dem neuen Namen.
 */
async function migrateLegacyBackup(): Promise<BackupRecord | null> {
  const legacy = await openDb(LEGACY_DB_NAME)
  if (!legacy) return null
  const record = await readRecord(legacy)
  legacy.close()
  if (record) await writeBackup(record.data)
  await deleteDatabase(LEGACY_DB_NAME)
  return record
}

export interface BackupRecord {
  savedAt: string
  data: StoredData
}

/**
 * Zweitschrift schreiben. Schlägt sie fehl, ist das kein Fehler der Sitzung:
 * der `localStorage` trägt den Stand weiter. Der Rückgabewert sagt nur, ob es
 * geklappt hat.
 */
export async function writeBackup(data: StoredData): Promise<boolean> {
  const db = await openDb()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      const record: BackupRecord = { savedAt: new Date().toISOString(), data }
      tx.objectStore(STORE).put(record, KEY)
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
      tx.onabort = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

export async function readBackup(): Promise<BackupRecord | null> {
  const db = await openDb()
  if (!db) return null
  const record = await readRecord(db)
  db.close()
  if (record) return record
  // Nichts unter dem neuen Namen — vielleicht liegt es noch unter dem alten.
  return migrateLegacyBackup()
}

export async function clearBackup(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = () => db.close()
  } catch {
    db.close()
  }
  // Ein Gerät zu leeren heisst auch: nichts unter dem alten Namen zurücklassen.
  await deleteDatabase(LEGACY_DB_NAME)
}

export interface Recovery {
  data: StoredData
  report: LoadReport
  savedAt: string
}

/**
 * Wiederherstellung nach einer Räumung.
 *
 * Aufgerufen wird das nur, wenn der `localStorage` nichts hergab. Die
 * Zweitschrift durchläuft dieselbe Prüfung und Migration wie eine Importdatei —
 * sie kann aus einer älteren Fassung der App stammen, und ungeprüft
 * zurückzuschreiben hiesse, das Schema zu umgehen.
 */
export async function recoverFromBackup(): Promise<Recovery | null> {
  const record = await readBackup()
  if (!record) return null
  const { data, report } = parseStoredData(record.data)
  if (!data) return null
  return { data, report, savedAt: record.savedAt }
}
