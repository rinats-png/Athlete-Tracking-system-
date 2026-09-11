import { clearBackup } from './backup'
import { LEGACY_PREFIX, STORAGE_PREFIX } from './migrateStorage'

/**
 * Alles löschen, was diese App auf diesem Gerät abgelegt hat.
 *
 * WOFÜR DAS DA IST: das gewöhnliche Abmelden behält den Bestand — die
 * Messwerte gehören dem Menschen und dem Gerät, nicht der Anmeldung (§32),
 * und wer sich abmeldet und wieder anmeldet, will seine Werte vorfinden. Auf
 * einem GETEILTEN Gerät ist genau das falsch: dem Tablet in der Halle, das
 * durch acht Hände geht, dem Rechner im Vereinsheim. Dort muss das Abmelden
 * die Daten mitnehmen, sonst liest sie der Nächste.
 *
 * Beides ist richtig, je nach Gerät. Deshalb zwei Wege statt einer Vorgabe,
 * und deshalb dieser hier mit einer ausdrücklichen Rückfrage davor.
 *
 * WARUM ÜBER DAS PRÄFIX UND NICHT ÜBER EINE LISTE: die Schlüssel liegen über
 * ein Dutzend Module verstreut — Bestand, Abgleich, Darstellung, Gerätekennung,
 * Ausrüstungsfilter, Erinnerungen. Eine Liste hier wäre am Tag ihrer
 * Entstehung vollständig und beim nächsten neuen Schlüssel wieder nicht. Ein
 * vergessener Eintrag in einer Liste ist unsichtbar; er fällt erst auf, wenn
 * jemand fremde Daten sieht. Alles unter `baseline.` zu räumen ist die
 * Regel, die sich nicht selbst überholt.
 *
 * WAS ES NICHT TUT: den Serverstand anfassen. Wer synchronisiert hat, findet
 * seine Daten nach dem nächsten Anmelden auf einem eigenen Gerät wieder —
 * das ist gewollt. Dieses Gerät zu räumen ist eine Aussage über dieses
 * Gerät, nicht über das Konto.
 */

/** Gemeinsames Präfix aller Schlüssel dieser App — an einer Stelle definiert. */
export { STORAGE_PREFIX } from './migrateStorage'

/** Was gelöscht wurde — für die Rückmeldung an den Nutzer und für die Tests. */
export interface WipeReport {
  keys: string[]
  backupCleared: boolean
}

export async function wipeDevice(): Promise<WipeReport> {
  const keys: string[] = []
  try {
    // Erst sammeln, dann löschen: `localStorage.key(i)` verschiebt sich,
    // sobald man während des Durchlaufs entfernt, und dann bleibt jeder
    // zweite Schlüssel stehen.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      // Auch Reste des alten Namens, falls der Umzug sie je übersehen hat.
      if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith(LEGACY_PREFIX)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* Ohne Speicherzugriff gibt es nichts zu räumen. */
  }

  // Die Zweitschrift in IndexedDB ist der Sinn der Übung: sie überlebt das
  // Leeren des localStorage ausdrücklich. Bliebe sie stehen, käme der
  // Bestand beim nächsten Start zurück — die Räumung wäre eine Geste.
  let backupCleared = false
  try {
    await clearBackup()
    backupCleared = true
  } catch {
    /* Kein IndexedDB in diesem Browser. */
  }

  try {
    sessionStorage.clear()
  } catch {
    /* Nicht überall vorhanden. */
  }

  return { keys, backupCleared }
}
