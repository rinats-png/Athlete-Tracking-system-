/**
 * Brustgurte und Sensoren für die HRV-Messung — was geht und was nicht.
 *
 * Die Liste nennt, was der genormte Herzfrequenz-Dienst über Bluetooth
 * liefert: den Puls (alle) und die RR-Intervalle (nur Gurte mit
 * EKG-Elektroden). Ohne RR-Intervalle gibt es keinen RMSSD, nur den Puls.
 *
 * `note` ist ein Schlüssel unter `hrv.strapNote.*` — die Namen selbst sind
 * Produktnamen und werden nicht übersetzt. Dieselbe Liste steht auf der
 * Landingpage (landing/src/i18n, Abschnitt «straps»); ändert sich hier
 * etwas, dort mitziehen.
 */

export interface HeartRateStrap {
  id: string
  name: string
  /** Liefert RR-Intervalle über Bluetooth — Voraussetzung für die HRV. */
  rr: boolean
  recommended?: boolean
  note: 'dualBluetooth' | 'singleBluetooth' | 'antPlus' | 'budget' | 'opticalNoRr' | 'broadcastNoRr'
}

export const HEART_RATE_STRAPS: HeartRateStrap[] = [
  { id: 'polar_h10', name: 'Polar H10', rr: true, recommended: true, note: 'dualBluetooth' },
  { id: 'polar_h9', name: 'Polar H9', rr: true, note: 'singleBluetooth' },
  { id: 'garmin_hrm_pro', name: 'Garmin HRM-Pro / HRM-Pro Plus / HRM 600', rr: true, note: 'antPlus' },
  { id: 'garmin_hrm_dual', name: 'Garmin HRM-Dual', rr: true, note: 'antPlus' },
  { id: 'wahoo_tickr', name: 'Wahoo TICKR / TICKR X', rr: true, note: 'singleBluetooth' },
  { id: 'budget', name: 'Coospo H6 / H808S, Magene H64', rr: true, note: 'budget' },
  { id: 'optical', name: 'Polar Verity Sense, Wahoo TICKR FIT, Scosche Rhythm', rr: false, note: 'opticalNoRr' },
  { id: 'watch', name: 'Sportuhren im Modus «Puls senden»', rr: false, note: 'broadcastNoRr' },
]
