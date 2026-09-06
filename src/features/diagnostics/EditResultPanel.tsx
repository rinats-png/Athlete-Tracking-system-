import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Einen Messwert korrigieren.
 *
 * WARUM ES DAS BRAUCHT: bis hierher liess sich ein Ergebnis nur löschen. Wer
 * sich vertippt hatte — 172,5 statt 127,5 —, musste den Eintrag wegwerfen und
 * neu erfassen und verlor dabei Datum, Bedingungen, Beleg und die Zuordnung
 * zum Termin. Der häufigste Handgriff überhaupt war der einzige, den die App
 * nicht konnte.
 *
 * ZUGEKLAPPT, BIS JEMAND IHN BRAUCHT: ein Formular, das über dem Ergebnis
 * steht, lädt zum Ändern ein. Ein Messwert soll aber die Regel sein und die
 * Korrektur die Ausnahme — sonst wird aus einer Messung eine Meinung.
 *
 * DIE ÄNDERUNG WIRD FESTGEHALTEN. Der Nachweis (§57) trägt ein, dass an
 * diesem Ergebnis etwas geändert wurde. Was vorher drinstand, steht dort
 * ausdrücklich nicht — ein Verlaufsspeicher aller alten Stände wäre ein
 * zweiter Datenbestand mit denselben personenbezogenen Daten (§50).
 */
export function EditResultPanel({ result }: { result: StoredResult }) {
  const { t } = useTranslation()
  const { editResult } = useAppData()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const test = getTest(result.testSlug)

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(result.values).map(([k, v]) => [k, String(v)])),
  )
  const [day, setDay] = useState(() => result.performedAt.slice(0, 10))

  if (!test) return null

  if (!open) {
    return (
      <div className="no-print">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil size={14} aria-hidden />
          {t('editResult.open')}
        </Button>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed: Record<string, number> = {}
    for (const field of test.fields) {
      const raw = values[field.key]
      if (raw == null || raw.trim() === '') continue
      const num = Number(raw.replace(',', '.'))
      if (!Number.isFinite(num)) return
      parsed[field.key] = num
    }
    /*
     * Die Uhrzeit des ursprünglichen Eintrags bleibt erhalten: geändert wird
     * der TAG, und zwei Messungen am selben Tag sollen ihre Reihenfolge
     * behalten.
     */
    const time = result.performedAt.slice(10)
    editResult(result.id, { values: parsed, performedAt: `${day}${time}` })
    setSaved(true)
    setOpen(false)
  }

  return (
    <Panel className="no-print">
      <PanelHeader title={t('editResult.title')} subtitle={t('editResult.hint')} />
      <form className="space-y-3 px-4 py-4" onSubmit={submit}>
        {test.fields.map((field) => (
          <label key={field.key} className="block">
            <span className="label-tag">
              {t(`fields.${field.key}`)}
              {field.unit ? ` (${field.unit})` : ''}
            </span>
            <input
              className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]"
              inputMode="decimal"
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </label>
        ))}

        <label className="block">
          <span className="label-tag">{t('editResult.day')}</span>
          <input
            className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>

        <p className="text-[12px] leading-relaxed text-ink-muted">{t('editResult.recalculates')}</p>

        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="primary">
            {t('editResult.save')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t('editResult.cancel')}
          </Button>
        </div>
      </form>
      {saved && (
        <p role="status" className="border-t border-line px-4 py-2 text-[12px] text-accent-text">
          {t('editResult.saved')}
        </p>
      )}
    </Panel>
  )
}
