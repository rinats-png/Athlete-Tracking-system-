import { useTranslation } from 'react-i18next'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Meldung über den Zustand des geladenen Bestands.
 *
 * Eine Migration oder ein abgewiesener Datensatz darf nicht unsichtbar
 * bleiben: wer nicht erfährt, dass ein Eintrag nicht gelesen werden konnte,
 * merkt den Verlust erst Monate später beim Vergleich. Die Meldung nennt
 * deshalb Zahl und Art der betroffenen Datensätze statt einer Floskel.
 */
export function DataLoadNotice() {
  const { t } = useTranslation()
  const { loadReport } = useAppData()

  const hasRejects = loadReport.rejected.length > 0
  if (!loadReport.migratedFrom && !loadReport.fromNewerVersion && !hasRejects) return null

  const critical = loadReport.fromNewerVersion || hasRejects

  return (
    <div
      role="status"
      className={
        'mb-4 border-l-2 px-3 py-2 text-[13px] text-ink-secondary ' +
        (critical ? 'border-critical bg-critical/10' : 'border-accent bg-accent/10')
      }
    >
      {loadReport.migratedFrom != null && (
        <p>{t('storage.migrated', { from: loadReport.migratedFrom })}</p>
      )}
      {loadReport.fromNewerVersion && <p>{t('storage.newerVersion')}</p>}
      {hasRejects && (
        <>
          <p>{t('storage.rejected', { count: loadReport.rejected.length })}</p>
          <ul className="mt-1 list-disc pl-4">
            {loadReport.rejected.slice(0, 5).map((entry, i) => (
              <li key={`${entry.kind}-${entry.id}-${i}`}>
                {t(`storage.kind.${entry.kind}`, { defaultValue: entry.kind })} · {entry.id} ·{' '}
                {entry.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
