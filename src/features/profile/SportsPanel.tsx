import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SportList } from '@/features/onboarding/SportList'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'

/**
 * Sportarten im Profil (Konzept §27): eine Hauptsportart, beliebig viele
 * weitere. Dieselbe Liste wie im Einstieg — eine Auswahl, die an zwei Orten
 * verschieden aussähe, wäre zwei Auswahlen.
 */
export function SportsPanel() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, saveProfile } = useAppData()
  const [editing, setEditing] = useState<'main' | 'additional' | null>(null)
  const main = disciplineById(data.profile.disciplineId)
  const additional = data.profile.additionalDisciplineIds.map((id) => disciplineById(id)).filter((d): d is NonNullable<typeof d> => d != null)

  const setMain = (id: string) => {
    const d = disciplineById(id)
    saveProfile({
      disciplineId: d?.id ?? null,
      sportCategoryId: d?.categoryId ?? null,
      additionalDisciplineIds: data.profile.additionalDisciplineIds.filter((x) => x !== id),
    })
    setEditing(null)
  }
  const toggleAdditional = (id: string) =>
    saveProfile({
      additionalDisciplineIds: data.profile.additionalDisciplineIds.includes(id)
        ? data.profile.additionalDisciplineIds.filter((x) => x !== id)
        : [...data.profile.additionalDisciplineIds, id],
    })

  return (
    <Panel>
      <PanelHeader title={t('profile.sports')} subtitle={t('profile.sportsHint')} />
      <div className="space-y-4 px-4 py-4">
        <div>
          <span className="label-tag">{t('profile.mainSport')}</span>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[16px] font-medium">
              {main ? <Link to={`/sport/${main.id}`} className="hover:underline">{main.name[locale]}</Link> : '—'}
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditing(editing === 'main' ? null : 'main')}>
              {editing === 'main' ? t('actions.cancel') : t('profile.changeMain')}
            </Button>
          </div>
          {editing === 'main' && (
            <div className="mt-3 h-80">
              <SportList selected={main ? [main.id] : []} onToggle={setMain} />
            </div>
          )}
        </div>
        <div>
          <span className="label-tag">{t('profile.additional')}</span>
          {additional.length === 0 ? (
            <p className="mt-1 text-[13px] text-ink-secondary">{t('profile.noneAdditional')}</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-2">
              {additional.map((d) => (
                <li key={d.id} className="flex items-center gap-1 border border-line px-2 py-1 text-[13px]">
                  <Link to={`/sport/${d.id}`} className="hover:underline">{d.name[locale]}</Link>
                  <button type="button" aria-label={`${t('profile.remove')}: ${d.name[locale]}`} onClick={() => toggleAdditional(d.id)} className="ml-1 flex size-6 items-center justify-center text-ink-muted hover:text-ink">
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditing(editing === 'additional' ? null : 'additional')}>
            {editing === 'additional' ? t('profile.done') : t('profile.addAdditional')}
          </Button>
          {editing === 'additional' && (
            <div className="mt-3 h-80">
              <SportList multiple selected={data.profile.additionalDisciplineIds} exclude={main ? [main.id] : []} onToggle={toggleAdditional} />
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
