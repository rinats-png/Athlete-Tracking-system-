import { useEffect, useMemo, useState } from 'react'
import { dueTests } from '@/domain/reminders'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { agendaDates } from '@/domain/pushAgenda'
import { PUSH_CHANGED, pushFlag, syncPushAgenda, syncPushDue } from '@/lib/push'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Meldet dem Server das nächste Fälligkeitsdatum und die Erinnerungstage für
 * Wettkampf und Testtermin — und nur diese Daten.
 *
 * Läuft nur, wenn Push auf diesem Gerät eingeschaltet ist. Sind Erinnerungen
 * aus oder ist nichts gemessen, wird das Datum gelöscht.
 */
export function usePushDueSync(): void {
  const { data } = useAppData()
  const next = useMemo(() => {
    const settings = reminderSettingsOf(data.profile)
    if (!settings.remindersEnabled) return null
    const dates = dueTests(data.results, settings).map((d) => d.dueOn).sort()
    return dates[0] ?? null
  }, [data.results, data.profile])

  // Erinnerungstage für Wettkampf (Vortag) und den nächsten geplanten Testtermin.
  const agenda = useMemo(() => agendaDates({ profile: data.profile, assessments: data.assessments }, new Date().toISOString().slice(0, 10)), [data.profile, data.assessments])

  const [epoch, setEpoch] = useState(0)
  useEffect(() => {
    const bump = () => setEpoch((n) => n + 1)
    window.addEventListener(PUSH_CHANGED, bump)
    return () => window.removeEventListener(PUSH_CHANGED, bump)
  }, [])

  useEffect(() => {
    if (!pushFlag()) return
    void syncPushDue(next).catch(() => undefined)
  }, [next, epoch])

  useEffect(() => {
    if (!pushFlag()) return
    void syncPushAgenda('competition', agenda.competition).catch(() => undefined)
    void syncPushAgenda('assessment', agenda.assessment).catch(() => undefined)
  }, [agenda.competition, agenda.assessment, epoch])
}
