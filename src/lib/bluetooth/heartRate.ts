import { parseHeartRateMeasurement, type HeartRateMeasurement } from '@/domain/hrv'

/**
 * Brustgurt über Web Bluetooth — die einzige Stelle, die mit dem Gerät spricht.
 *
 * STANDARD STATT HERSTELLER. Verbunden wird über den genormten
 * Herzfrequenz-Dienst (0x180D) mit dem Merkmal «Heart Rate Measurement»
 * (0x2A37). Den sprechen alle gängigen Brustgurte (Polar, Garmin, Wahoo,
 * Coospo, Magene …); eine Herstellerschnittstelle ist nicht nötig.
 *
 * WO ES GEHT: Chrome und Edge auf Android, Windows, macOS, Linux und
 * ChromeOS. NICHT in Safari auf dem iPhone oder iPad — Apple bietet Web
 * Bluetooth nicht an. Das wird auf dem Bildschirm gesagt, bevor jemand
 * sucht (siehe `bluetoothSupport`). In der nativen App übernimmt später ein
 * Capacitor-Plugin diese Datei (docs/native-app.md).
 *
 * KEINE BIBLIOTHEK. Die wenigen Typen stehen unten selbst — das Paket
 * `@types/web-bluetooth` wäre eine Abhängigkeit für vierzig Zeilen.
 */

interface BtCharacteristic extends EventTarget {
  value?: DataView
  startNotifications(): Promise<BtCharacteristic>
  stopNotifications(): Promise<BtCharacteristic>
}
interface BtService {
  getCharacteristic(name: string): Promise<BtCharacteristic>
}
interface BtServer {
  connected: boolean
  getPrimaryService(name: string): Promise<BtService>
  disconnect(): void
}
interface BtDevice extends EventTarget {
  name?: string
  gatt?: { connect(): Promise<BtServer> }
}
interface BtNavigator {
  bluetooth?: {
    getAvailability?: () => Promise<boolean>
    requestDevice(options: { filters: { services: string[] }[] }): Promise<BtDevice>
  }
}

export type BluetoothSupport = 'available' | 'no_adapter' | 'unsupported'

/** Ob Web Bluetooth in diesem Browser grundsätzlich und mit Adapter geht. */
export async function bluetoothSupport(): Promise<BluetoothSupport> {
  const bt = (navigator as unknown as BtNavigator).bluetooth
  if (!bt || typeof bt.requestDevice !== 'function') return 'unsupported'
  try {
    if (bt.getAvailability && !(await bt.getAvailability())) return 'no_adapter'
  } catch {
    /* Manche Browser kennen getAvailability nicht — dann einfach versuchen. */
  }
  return 'available'
}

export interface HeartRateConnection {
  deviceName: string
  disconnect(): void
}

/**
 * Gurt auswählen (Browserdialog), verbinden, Pakete empfangen.
 * `onMeasurement` bekommt jedes Paket fertig gelesen; `onDisconnect` meldet
 * einen Abbruch der Verbindung (Gurt abgenommen, ausser Reichweite).
 */
export async function connectHeartRate(
  onMeasurement: (m: HeartRateMeasurement) => void,
  onDisconnect: () => void,
): Promise<HeartRateConnection> {
  const bt = (navigator as unknown as BtNavigator).bluetooth
  if (!bt) throw new Error('bluetooth_unsupported')
  const device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] })
  if (!device.gatt) throw new Error('bluetooth_no_gatt')
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService('heart_rate')
  const characteristic = await service.getCharacteristic('heart_rate_measurement')

  const onValue = (event: Event) => {
    const view = (event.target as BtCharacteristic).value
    if (!view) return
    try {
      onMeasurement(parseHeartRateMeasurement(view))
    } catch {
      /* Ein kaputtes Paket wird übergangen — die Artefaktzählung sieht es als Lücke. */
    }
  }
  const onGone = () => onDisconnect()

  characteristic.addEventListener('characteristicvaluechanged', onValue)
  device.addEventListener('gattserverdisconnected', onGone)
  await characteristic.startNotifications()

  let closed = false
  return {
    deviceName: device.name?.trim() || 'Bluetooth',
    disconnect: () => {
      if (closed) return
      closed = true
      characteristic.removeEventListener('characteristicvaluechanged', onValue)
      device.removeEventListener('gattserverdisconnected', onGone)
      void characteristic.stopNotifications().catch(() => {})
      if (server.connected) server.disconnect()
    },
  }
}
