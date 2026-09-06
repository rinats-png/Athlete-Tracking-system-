import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getTest } from '@/data/testCatalog'
import { overdueTests } from '@/domain/reminders'
import { reminderSettingsOf } from '@/features/shared/profileContext'
import { notifyOverdue } from '@/lib/notify'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useLocale } from '@/features/shared/useLocale'

/**
 * Sagt beim Öffnen, was inzwischen fällig geworden ist.
 *
 * Mehr kann eine Web-App ohne Push-Server nicht: sie erfährt nichts,
 * während sie geschlossen ist. Deshalb ist das hier die Zugabe und die
 * Kalenderdatei der verlässliche Weg — beides steht so auch in der
 * Oberfläche (§81).
 *
 * Läuft genau einmal je Sitzung und nur, wenn die Erlaubnis vorliegt und
 * Erinnerungen eingeschaltet sind. Die Sperre in `notifyOverdue` verhindert
 * zusätzlich, dass dreimaliges Öffnen an einem Tag dreimal meldet.
 */
export function useOverdueNotice(): void {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, loadReport } = useAppData()

  useEffect(() => {
    const overdue = overdueTests(data.results, reminderSettingsOf(data.profile))
    if (overdue.length === 0) return
    const first = getTest(overdue[0].slug)?.name[locale] ?? overdue[0].slug
    notifyOverdue(
      t('reminders.notifyTitle'),
      t('reminders.notifyBody', { count: overdue.length, test: first }),
    )
    // Bewusst nur an den Ladebefund gebunden: bei jeder Änderung der
    // Ergebnisse erneut zu melden, hiesse, direkt nach einer Messung zu
    // melden — genau dann, wenn nichts mehr fällig ist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadReport])
}
