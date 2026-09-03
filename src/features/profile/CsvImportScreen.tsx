import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Upload } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { TEST_CATALOG, getTest } from '@/data/testCatalog'
import {
  parseCsv,
  previewImport,
  suggestRoles,
  type ColumnRole,
  type CsvTable,
} from '@/lib/csvImport'

/**
 * Werte aus einer Tabelle übernehmen (Excel-Export als CSV).
 *
 * Der Ablauf ist bewusst dreistufig — Datei, Zuordnung, Vorschau — und
 * schreibt erst nach der Vorschau. Eine falsch zugeordnete Spalte erzeugt
 * sonst eine Historie, die aussieht wie Daten und keine ist; das fällt erst
 * Monate später auf, wenn niemand mehr weiss, woher die Zahlen kamen.
 */
export function CsvImportScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { recordResult } = useAppData()

  const [table, setTable] = useState<CsvTable | null>(null)
  const [roles, setRoles] = useState<ColumnRole[]>([])
  const [error, setError] = useState<string | null>(null)
  const [written, setWritten] = useState<number | null>(null)

  const read = (file: File) => {
    void file.text().then((text) => {
      const parsed = parseCsv(text)
      if (!parsed) {
        setTable(null)
        setError('csvImport.unreadable')
        return
      }
      setError(null)
      setTable(parsed)
      setRoles(suggestRoles(parsed.headers))
      setWritten(null)
    })
  }

  const preview = table ? previewImport(table, roles) : null

  const apply = () => {
    if (!preview) return
    let count = 0
    for (const row of preview.rows) {
      const test = getTest(row.testSlug)
      if (!test) continue
      const result = recordResult({
        testSlug: row.testSlug,
        performedAt: new Date(`${row.day}T12:00:00`).toISOString(),
        values: { [test.primaryMetric]: row.value },
        notes: t('csvImport.noteMarker'),
      })
      if (result) count++
    }
    setWritten(count)
  }

  const setRole = (index: number, role: ColumnRole) =>
    setRoles((current) => current.map((r, i) => (i === index ? role : r)))

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/profil">
          <ArrowLeft size={14} aria-hidden />
          {t('nav.profile')}
        </Link>
      </Button>
      <ScreenHeader
        eyebrow={t('nav.profile')}
        title={t('csvImport.title')}
        intro={t('csvImport.intro')}
      />

      <Panel>
        <PanelHeader title={t('csvImport.step1')} subtitle={t('csvImport.step1Hint')} />
        <div className="px-4 py-4">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px]">
            <Upload size={16} aria-hidden />
            <span>{t('csvImport.choose')}</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              aria-label={t('csvImport.choose')}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) read(file)
              }}
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-[13px] text-critical">
              {t(error)}
            </p>
          )}
        </div>
      </Panel>

      {table && (
        <Panel className="mt-4">
          <PanelHeader title={t('csvImport.step2')} subtitle={t('csvImport.step2Hint')} />
          <ul className="divide-y divide-line">
            {table.headers.map((header, index) => (
              <li key={`${header}-${index}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  {header || t('csvImport.unnamedColumn')}
                  <span className="block text-[11px] text-ink-muted">
                    {table.rows[0]?.[index] ?? ''}
                  </span>
                </span>
                <label className="flex items-center gap-2">
                  <span className="sr-only">{t('csvImport.roleOf', { column: header })}</span>
                  <select
                    className="min-h-11 border border-line bg-surface px-2 text-[13px]"
                    value={
                      roles[index]?.kind === 'test'
                        ? (roles[index] as { slug: string }).slug
                        : (roles[index]?.kind ?? 'ignore')
                    }
                    onChange={(e) => {
                      const value = e.target.value
                      setRole(
                        index,
                        value === 'ignore'
                          ? { kind: 'ignore' }
                          : value === 'date'
                            ? { kind: 'date' }
                            : { kind: 'test', slug: value },
                      )
                    }}
                  >
                    <option value="ignore">{t('csvImport.roleIgnore')}</option>
                    <option value="date">{t('csvImport.roleDate')}</option>
                    {TEST_CATALOG.map((test) => (
                      <option key={test.slug} value={test.slug}>
                        {test.name[locale]}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {preview && (
        <Panel className="mt-4">
          <PanelHeader title={t('csvImport.step3')} subtitle={t('csvImport.step3Hint')} />
          <div className="px-4 py-4">
            <p className="text-[14px]">
              {t('csvImport.willImport', { count: preview.rows.length })}
            </p>
            {preview.skipped.length > 0 && (
              <p className="mt-1 text-[13px] text-ink-secondary">
                {t('csvImport.willSkip', { count: preview.skipped.length })}
              </p>
            )}
            {!roles.some((r) => r.kind === 'date') && (
              <p className="mt-2 text-[13px] text-warning">{t('csvImport.needDate')}</p>
            )}

            {preview.rows.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        {t('csvImport.day')}
                      </th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">
                        {t('table.test')}
                      </th>
                      <th scope="col" className="py-1.5 font-medium">
                        {t('csvImport.value')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 8).map((row, i) => (
                      <tr key={`${row.line}-${row.testSlug}-${i}`} className="border-b border-line last:border-b-0">
                        <td className="readout py-1.5 pr-3 tabular-nums">{row.day}</td>
                        <td className="py-1.5 pr-3">{getTest(row.testSlug)?.name[locale]}</td>
                        <td className="readout py-1.5 tabular-nums">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 8 && (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {t('csvImport.andMore', { count: preview.rows.length - 8 })}
                  </p>
                )}
              </div>
            )}

            {written == null ? (
              <Button className="mt-4" onClick={apply} disabled={preview.rows.length === 0}>
                {t('csvImport.apply')}
              </Button>
            ) : (
              <div className="mt-4">
                <p role="status" className="text-[14px] text-good">
                  {t('csvImport.done', { count: written })}
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/verlauf')}>
                  {t('nav.history')}
                </Button>
              </div>
            )}
          </div>
        </Panel>
      )}
    </>
  )
}
