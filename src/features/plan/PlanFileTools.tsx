import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload } from 'lucide-react'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId, type StoredTrainingBlock } from '@/lib/store/localStore'
import { planMode } from '@/domain/planMode'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { exportPlan, importPlan, PLAN_FILE_MAX_BYTES, type ImportReport } from '@/domain/planFile'
import { saveAsTemplate } from '@/domain/planLibrary'

/** Export eines Blocks als Datei. Die Datei trägt Struktur und Eigenes, keine Gesundheitsdaten. */
export function PlanExportButton({ block }: { block: StoredTrainingBlock }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      data-testid="plan-export"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([exportPlan(block)], { type: 'application/json' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `kydon-plan-${(block.name || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'}.json`
        a.click()
        URL.revokeObjectURL(url)
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line px-4 text-[13px]"
    >
      <Download size={15} aria-hidden />
      {t('file.export')}
    </button>
  )
}

/** Import aus einer Datei, nur wenn kein aktiver Block läuft (nichts wird überschrieben). */
export function PlanImportButton({ onImported }: { onImported: (report: ImportReport) => void }) {
  const { t } = useTranslation()
  const { data, saveTrainingBlock } = useAppData()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const profile = data.profile

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > PLAN_FILE_MAX_BYTES) return setMessage(t('file.err.too_big'))
    const now = new Date().toISOString()
    const r = importPlan(await file.text(), {
      newId,
      now,
      startDay: now.slice(0, 10),
      disciplineId: profile.disciplineId,
      family: familyOfDiscipline(profile.disciplineId),
      trainingAgeYears: profile.trainingAgeYears,
      mode: planMode(import.meta.env?.VITE_TRAINING_PLAN),
    })
    if (!r.ok) return setMessage(t(`file.err.${r.error}`))
    saveTrainingBlock(r.block)
    setMessage(null)
    onImported(r.report)
  }

  return (
    <div className="space-y-2" data-testid="plan-import">
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" data-testid="plan-import-input" onChange={(e) => void onFile(e.target.files?.[0])} />
      <button type="button" data-testid="plan-import-button" onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line px-4 text-[13px]">
        <Upload size={15} aria-hidden />
        {t('file.import')}
      </button>
      <p className="text-[12px] text-ink-secondary">{t('file.importNote')}</p>
      {message && <p role="alert" className="text-[13px] text-accent-text" data-testid="plan-import-error">{message}</p>}
    </div>
  )
}

/** Plan als eigene Vorlage speichern; unter demselben Namen wird es eine neue Version. */
export function SaveTemplateButton({ block }: { block: StoredTrainingBlock }) {
  const { t } = useTranslation()
  const { planTemplates, savePlanTemplates } = useAppData()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(block.name)
  const [message, setMessage] = useState<string | null>(null)
  const save = () => {
    const r = saveAsTemplate(planTemplates, block, name, newId, new Date().toISOString())
    if (!r.ok) return setMessage(t(`lib.err.${r.error}`))
    savePlanTemplates(r.list)
    setMessage(t('lib.saved', { name: name.trim(), version: r.version }))
    setOpen(false)
  }
  return (
    <div data-testid="save-template">
      {!open ? (
        <button type="button" data-testid="save-template-open" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center rounded-pill border border-line px-4 text-[13px]">{t('lib.save')}</button>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[13px]"><span className="label-tag">{t('own.name')}</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="save-template-name" className="mt-1.5 block min-h-11 rounded-md border border-line bg-surface px-3 text-[16px]" /></label>
          <button type="button" data-testid="save-template-confirm" onClick={save} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">{t('lib.saveConfirm')}</button>
        </div>
      )}
      {message && <p className="mt-1 text-[12px] text-ink-secondary" role="status" data-testid="save-template-message">{message}</p>}
    </div>
  )
}
