import type { StoredAthlete, StoredDiaryEntry } from '@/lib/store/localStore'

/**
 * Angaben, die Gesundheitsdaten im Sinne von Art. 9 DSGVO sein können — und
 * was davon ohne ausdrückliche Einwilligung das Gerät verlässt.
 *
 * WARUM ES DAS GIBT: Seit das Konto Pflicht ist und der Abgleich von selbst
 * läuft (13.10.2026), ist das Einschalten des Abgleichs keine Einwilligung
 * mehr. Für sportliche Messwerte reicht der Vertrag (Art. 6 Abs. 1 lit. b).
 * Für Angaben, die etwas über den Körper jenseits der Leistung sagen —
 * Schlaf, Stress, Herzfrequenz, Körperfett, Beschwerden — braucht es eine
 * ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a). Ohne sie bleiben diese
 * Angaben auf dem Gerät; alles andere wird abgeglichen.
 *
 * NICHT HIER: die Gesundheitsschicht (Labor, Symptome, Zyklus, Medikation …)
 * und die Peak Week. Die gehen nie in den Abgleich, mit oder ohne diese
 * Einwilligung (`stripHealth` in lib/supabase/series.ts); sie haben ihren
 * eigenen, Ende-zu-Ende-verschlüsselten Weg.
 *
 * Bewusst eine LISTE MIT NAMEN statt einer Heuristik: was hier steht, steht
 * genauso in der Datenschutzerklärung und im Einwilligungstext. Wer ein neues
 * Feld dieser Art einführt, trägt es hier ein — der Prüffall
 * (tests/sensitiveConsent.spec.ts) hält die Liste fest.
 *
 * Rein: kein Speicher, kein Netz. Gibt neue Objekte zurück, ändert nichts.
 */

/** Beobachtungswerte, die gesundheitsnah sind (Kennungen aus data/observations.ts). */
export const SENSITIVE_OBSERVATION_KEYS: readonly string[] = [
  // Erholung: Labor, Muskelkater, Herzfrequenzvariabilität, Ruhepuls
  'ck_u_l',
  'doms',
  'hrv_rmssd_ms',
  'resting_hr_bpm',
  // Schlaf
  'sleep_h',
  // Körperzusammensetzung und Grundumsatz
  'fat_mass_percent',
  'lean_mass_kg',
  'dxa_fat_mass_percent',
  'bia_fat_mass_percent',
  'rmr_kcal_day',
]

/** Für Texte und Prüffälle: die Bereiche, in einer festen Reihenfolge. */
export const SENSITIVE_CATEGORIES = ['wellbeing', 'heart', 'body', 'complaints'] as const
export type SensitiveCategory = (typeof SENSITIVE_CATEGORIES)[number]

/** Ein Tagebucheintrag ohne Schlaf, Energie, Stress, Muskelkater und Magen-Darm-Angaben. */
export function diaryWithoutSensitive(entry: StoredDiaryEntry): StoredDiaryEntry {
  return {
    ...entry,
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    stress: null,
    soreness: null,
    sessions: entry.sessions.map((s) => ({ ...s, giScore: null, energyFeel: null })),
  }
}

/**
 * Ein Athlet ohne gesundheitsnahe Angaben — das Dokument, das ohne
 * Einwilligung auf den Server geht. Gewicht, Grösse, Maximalpuls (für Zonen),
 * Messwerte und Pläne bleiben; sie sind Leistungs- und Trainingsdaten.
 */
export function athleteWithoutSensitive(athlete: StoredAthlete): StoredAthlete {
  const sensitive = new Set(SENSITIVE_OBSERVATION_KEYS)
  return {
    ...athlete,
    profile: { ...athlete.profile, restingHr: null },
    biometrics: athlete.biometrics.map((b) => ({ ...b, bodyFatPercent: null, restingHr: null })),
    assessments: athlete.assessments.map((a) => ({ ...a, readiness: null })),
    observations: athlete.observations.filter((o) => !sensitive.has(o.key)),
    diary: athlete.diary.map(diaryWithoutSensitive),
    trainingBlocks: athlete.trainingBlocks.map((b) => ({
      ...b,
      completions: b.completions.map((c) => ({ ...c, avgHr: null, maxHr: null, pain: false })),
    })),
  }
}
