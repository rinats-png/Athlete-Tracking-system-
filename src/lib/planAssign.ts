/**
 * Zugewiesene Pläne hinter einem Bau-Schalter, bis der Datenschutztext dazu
 * freigegeben ist (Puls ist ein Gesundheitsdatum, Art. 9). Eigene Pläne,
 * Vorlagen und Datei-Import laufen immer; nur der Weg über den Server ist aus.
 */
export const planAssignEnabled = (): boolean => import.meta.env?.VITE_PLAN_ASSIGN === 'on'
