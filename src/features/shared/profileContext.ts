import type { AthleteData } from '@/lib/store/localStore'
import type { RatingContext } from '@/domain/rating'
import type { ReminderSettings } from '@/domain/reminders'

/** Alles, was eine Einordnung über die Person wissen muss — Hauptsportart zuerst. */
export function ratingContextOf(profile: AthleteData['profile']): RatingContext {
  return {
    sex: profile.sex,
    birthDate: profile.birthDate,
    disciplineIds: [profile.disciplineId, ...profile.additionalDisciplineIds].filter(
      (id): id is string => id != null,
    ),
  }
}

export function reminderSettingsOf(profile: AthleteData['profile']): ReminderSettings {
  return {
    remindersEnabled: profile.remindersEnabled,
    reminderIntervalDays: profile.reminderIntervalDays,
  }
}

/** Alle Sportarten der Person, Hauptsportart zuerst. */
export function disciplineIdsOf(profile: AthleteData['profile']): string[] {
  return ratingContextOf(profile).disciplineIds
}
