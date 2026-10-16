import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { planMode } from '@/domain/planMode'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { importPlan } from '@/domain/planFile'
import { deleteTemplate, deleteVersion, latestVersion } from '@/domain/planLibrary'

/** «Meine Vorlagen»: eigene Pläne mit Versionen. Verwenden legt einen Block an, nur ohne aktiven Block. */
export function MyTemplates() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, planTemplates, savePlanTemplates, trainingBlocks, saveTrainingBlock } = useAppData()
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [message, setMessage] = useState<string | null>(null)
  const hasActive = trainingBlocks.some((b) => b.status === 'active')
  if (planTemplates.length === 0) return null

  const use = (id: string) => {
    const tpl = planTemplates.find((x) => x.id === id)
    if (!tpl) return
    const version = tpl.versions.find((v) => v.version === (picked[id] ?? latestVersion(tpl).version)) ?? latestVersion(tpl)
    const now = new Date().toISOString()
    const p = data.profile
    const r = importPlan(version.content, { newId, now, startDay: now.slice(0, 10), disciplineId: p.disciplineId, family: familyOfDiscipline(p.disciplineId), trainingAgeYears: p.trainingAgeYears, mode: planMode(import.meta.env?.VITE_TRAINING_PLAN) })
    if (!r.ok) return setMessage(t('lib.unreadable'))
    saveTrainingBlock({ ...r.block, name: tpl.name })
    navigate('/plan/block')
  }

  return (
    <Panel className="mb-4" data-testid="my-templates">
      <PanelHeader title={t('lib.mine')} note={t('lib.mineSub')} />
      <ul>
        {planTemplates.map((tpl) => {
          const current = picked[tpl.id] ?? latestVersion(tpl).version
          return (
            <li key={tpl.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`my-template-${tpl.id}`}>
              <p className="font-display text-[15px] font-bold">{tpl.name}</p>
              <p className="text-[12px] text-ink-secondary">{t('tpl.weeksTotal', { n: tpl.weeks })} · {t('lib.versionOf', { v: latestVersion(tpl).version })}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="text-[12px]">
                  <span className="sr-only">{t('lib.version')}</span>
                  <select value={current} onChange={(e) => setPicked((s) => ({ ...s, [tpl.id]: Number(e.target.value) }))} data-testid={`my-template-version-${tpl.id}`} className="min-h-11 rounded-md border border-line bg-surface px-2 text-[14px]">
                    {[...tpl.versions].reverse().map((v) => <option key={v.version} value={v.version}>{t('lib.versionLabel', { v: v.version, date: v.savedAt.slice(0, 10) })}</option>)}
                  </select>
                </label>
                <button type="button" data-testid={`my-template-use-${tpl.id}`} disabled={hasActive} onClick={() => use(tpl.id)} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45">{t('lib.use')}</button>
                <button type="button" data-testid={`my-template-delete-version-${tpl.id}`} disabled={tpl.versions.length < 2} onClick={() => savePlanTemplates(deleteVersion(planTemplates, tpl.id, current))} className="min-h-11 px-3 text-[13px] text-accent-text underline underline-offset-2 disabled:opacity-40">{t('lib.deleteVersion')}</button>
                <button type="button" data-testid={`my-template-delete-${tpl.id}`} onClick={() => savePlanTemplates(deleteTemplate(planTemplates, tpl.id))} className="min-h-11 px-3 text-[13px] text-accent-text underline underline-offset-2">{t('lib.delete')}</button>
              </div>
            </li>
          )
        })}
      </ul>
      {hasActive && <p className="px-4 pb-3 text-[12px] text-ink-secondary">{t('lib.activeBlock')}</p>}
      {message && <p role="alert" className="px-4 pb-3 text-[13px] text-accent-text">{message}</p>}
    </Panel>
  )
}
