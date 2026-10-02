import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

/** Die Reiter innerhalb der Analyse: Profil (bisher) und Läufe. */
export function AnalysisTabs({ active }: { active: 'profile' | 'runs' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <SegmentedControl
      className="mb-4"
      label={t('runs.tabs.label')}
      value={active}
      onChange={(v) => navigate(v === 'runs' ? '/analyse/laeufe' : '/analyse')}
      options={[
        { value: 'profile', label: t('runs.tabs.profile') },
        { value: 'runs', label: t('runs.tabs.runs') },
      ]}
    />
  )
}
