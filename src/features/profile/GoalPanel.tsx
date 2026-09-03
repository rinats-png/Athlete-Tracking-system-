import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { GOAL_KEYS } from '@/lib/store/schema'
import { cn } from '@/lib/utils'

/** Ziel (Konzept §3, Schritt 5) — änderbar, abwählbar, ohne Folgen für Messwerte. */
export function GoalPanel() {
  const { t } = useTranslation()
  const { data, saveProfile } = useAppData()
  const goal = data.profile.goalKey
  return (
    <Panel>
      <PanelHeader title={t('profile.goalTitle')} subtitle={t('profile.goalHint')} />
      <ul className="grid gap-1.5 px-4 py-3 sm:grid-cols-2">
        {GOAL_KEYS.map((key) => {
          const active = goal === key
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => saveProfile({ goalKey: active ? null : key })}
                className={cn(
                  'flex min-h-11 w-full items-center justify-between gap-2 border px-3 py-2 text-left text-[13px]',
                  active ? 'border-accent bg-accent-quiet' : 'border-line hover:bg-accent-quiet',
                )}
              >
                {t(`onboarding.goal.options.${key}`)}
                {active && <Check size={14} className="shrink-0 text-accent-text" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
      {!goal && <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">{t('profile.goalNone')}</p>}
    </Panel>
  )
}
