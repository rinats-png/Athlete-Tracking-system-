import { useEffect, useMemo, useState } from 'react'
import { dueTests } from '@/domain/reminders'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { PUSH_CHANGED, pushFlag, syncPushDue } from '@/lib/push'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Meldet dem Server das nächste Fälligkeitsdatum — und nur das.
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
}
