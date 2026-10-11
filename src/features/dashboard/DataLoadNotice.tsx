import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { downloadFile } from '@/lib/export/csv'
import { formatDate } from '@/lib/format'
import { readBackup } from '@/lib/store/backup'
import { exportQuarantine } from '@/lib/store/localStore'
import { useAppData } from '@/lib/store/AppDataProvider'

/** So viele abgewiesene Einträge werden einzeln genannt, der Rest gezählt. */
const LISTED = 5

/**
 * Meldung über den Zustand des geladenen Bestands.
 *
 * Eine Migration oder ein abgewiesener Datensatz darf nicht unsichtbar
 * bleiben: wer nicht erfährt, dass ein Eintrag nicht gelesen werden konnte,
 * merkt den Verlust erst Monate später beim Vergleich. Die Meldung nennt
 * deshalb Zahl und Bereich der betroffenen Datensätze statt einer Floskel —
 * und sagt, was mit ihnen geschehen ist (aufbewahrt, nicht gelöscht) und ob
 * eine Sicherung auf dem Gerät liegt.
 */
export function DataLoadNotice() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { loadReport } = useAppData()
  const [backupAt, setBackupAt] = useState<string | null | undefined>(undefined)

  const hasRejects = loadReport.rejected.length > 0

  useEffect(() => {
    if (!hasRejects) return
    let gone = false
    void readBackup().then((record) => {
      if (!gone) setBackupAt(record?.savedAt ?? null)
    })
    return () => {
      gone = true
    }
  }, [hasRejects])

  if (!loadReport.migratedFrom && !loadReport.fromNewerVersion && !hasRejects) return null

  const critical = loadReport.fromNewerVersion || hasRejects
  // Der Bereich ist das erste Glied der Art: «health.labs» gehört zu «health».
  const area = (kind: string) => {
    const head = kind.split('.')[0]
    return t(`storage.kind.${head}`, { defaultValue: t('storage.kind.other') })
  }

  return (
    <div
      role="status"
      data-testid="data-load-notice"
      className={
        'mb-4 border-l-2 px-3 py-2 text-[13px] text-ink-secondary ' +
        (critical ? 'border-critical bg-critical/10' : 'border-accent bg-accent/10')
      }
    >
      {loadReport.migratedFrom != null && (
        <p>{t('storage.migrated', { from: loadReport.migratedFrom })}</p>
      )}
      {loadReport.fromNewerVersion && (
        <div data-testid="newer-version-notice">
          <p className="font-medium text-ink">{t('storage.newerTitle')}</p>
          <p className="mt-1">{t('storage.newerVersion')}</p>
          <Button className="mt-2" variant="primary" size="sm" onClick={() => window.location.reload()}>
            {t('storage.reload')}
          </Button>
        </div>
      )}
      {hasRejects && (
        <div data-testid="rejected-notice">
          <p>{t('storage.rejected', { count: loadReport.rejected.length })}</p>
          <ul className="mt-1 list-disc pl-4">
            {loadReport.rejected.slice(0, LISTED).map((entry, i) => (
              <li key={`${entry.kind}-${entry.id}-${i}`}>
                {area(entry.kind)} · {entry.id} · {entry.reason}
              </li>
            ))}
          </ul>
          {loadReport.rejected.length > LISTED && (
            <p className="mt-1">{t('storage.more', { count: loadReport.rejected.length - LISTED })}</p>
          )}
          <p className="mt-2">{t('storage.kept')}</p>
          <p className="mt-1">{t('storage.quarantined')}</p>
          {backupAt !== undefined && (
            <p className="mt-1" data-testid="backup-state">
              {backupAt ? t('storage.backup', { date: formatDate(backupAt, locale) }) : t('storage.noBackup')}
            </p>
          )}
          <Button
            className="mt-2"
            variant="ghost"
            size="sm"
            onClick={() =>
              downloadFile(`kydon-quarantaene-${new Date().toISOString().slice(0, 10)}.json`, exportQuarantine(), 'application/json')
            }
          >
            {t('storage.saveQuarantine')}
          </Button>
        </div>
      )}
    </div>
  )
}
