import { parseHeartRate } from '@/domain/liveHr'

/**
 * Pulsgurt über Web Bluetooth (Merkmal «Heart Rate», 0x180D/0x2A37).
 * Nur Chrome auf Android und Desktop; iOS und Firefox kennen es nicht, dort
 * bleibt die Handeingabe. Die Verbindung braucht eine Nutzerhandlung und
 * schickt nichts irgendwohin: Werte bleiben im Arbeitsspeicher der Seite.
 */
interface BtCharacteristic {
  startNotifications(): Promise<BtCharacteristic>
  addEventListener(type: 'characteristicvaluechanged', fn: (e: { target: { value?: DataView } }) => void): void
  removeEventListener(type: 'characteristicvaluechanged', fn: (e: { target: { value?: DataView } }) => void): void
}
interface BtDevice {
  name?: string
  gatt?: { connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtCharacteristic> }>; disconnect(): void }> ; connected?: boolean }
  addEventListener(type: 'gattserverdisconnected', fn: () => void): void
}
type BtNavigator = Navigator & { bluetooth?: { requestDevice(o: { filters: { services: string[] }[] }): Promise<BtDevice> } }

export const bluetoothHrSupported = (): boolean => typeof navigator !== 'undefined' && 'bluetooth' in navigator

export interface HrConnection {
  deviceName: string
  disconnect: () => void
}

export async function connectHeartRate(onBpm: (bpm: number) => void, onLost: () => void): Promise<HrConnection> {
  const bt = (navigator as BtNavigator).bluetooth
  if (!bt) throw new Error('unsupported')
  const device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] })
  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService('heart_rate')
  const ch = await service.getCharacteristic('heart_rate_measurement')
  const handler = (e: { target: { value?: DataView } }) => {
    const v = e.target.value
    if (!v) return
    const bpm = parseHeartRate(Array.from({ length: v.byteLength }, (_, i) => v.getUint8(i)))
    if (bpm != null) onBpm(bpm)
  }
  ch.addEventListener('characteristicvaluechanged', handler)
  await ch.startNotifications()
  device.addEventListener('gattserverdisconnected', onLost)
  return {
    deviceName: device.name ?? '',
    disconnect: () => {
      ch.removeEventListener('characteristicvaluechanged', handler)
      try {
        server.disconnect()
      } catch {
        // schon getrennt
      }
    },
  }
}
