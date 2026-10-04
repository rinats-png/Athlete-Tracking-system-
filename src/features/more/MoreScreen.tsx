import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/trainingRules'

/**
 * Mehr — alles, was nicht zu den fünf Hauptbereichen gehört (Produktdoktrin §6).
 *
 * Die Seite ersetzt keine Funktion, sie ordnet nur: jeder Eintrag führt auf
 * dieselbe Adresse wie vorher. Für Trainer stehen die Messbereiche mit
 * dabei, weil dort der Testkatalog nicht mehr in der Leiste liegt.
 */
const GROUPS: { key: string; items: { key: string; to: string }[] }[] = [
  {
    key: 'measure',
    items: [
      { key: 'catalog', to: '/tests' },
      { key: 'diagnostics', to: '/diagnostik' },
      { key: 'observation', to: '/beobachtung' },
    ],
  },
  {
    key: 'evaluate',
    items: [
      { key: 'brief', to: '/brief' },
      { key: 'plan', to: '/plan' },
      { key: 'weeklyReport', to: '/trainer/wochenbericht' },
      { key: 'week', to: '/woche' },
      { key: 'ask', to: '/fragen' },
      { key: 'history', to: '/verlauf' },
      { key: 'analysis', to: '/analyse' },
      { key: 'runs', to: '/analyse/laeufe' },
      { key: 'report', to: '/bericht' },
      { key: 'hints', to: '/hinweise' },
    ],
  },
  {
    key: 'between',
    items: [
      { key: 'diary', to: '/tagebuch' },
      { key: 'training', to: '/training' },
      { key: 'load', to: '/belastung' },
      { key: 'cockpit', to: '/cockpit' },
      { key: 'fuel', to: '/fuel' },
      { key: 'hrv', to: '/hrv-messung' },
    ],
  },
  {
    key: 'account',
    items: [
      { key: 'profile', to: '/profil' },
      { key: 'pricing', to: '/preise' },
      { key: 'imprint', to: '/impressum' },
      { key: 'privacy', to: '/datenschutz' },
      { key: 'terms', to: '/nutzungsbedingungen' },
      { key: 'dpa', to: '/auftragsverarbeitung' },
    ],
  },
]

export function MoreScreen() {
  const { t } = useTranslation()
  const { role } = useAppData()
  return (
    <div data-testid="more-screen">
      <ScreenHeader eyebrow={t('more.eyebrow')} title={t('more.title')} intro={t('more.intro')} />
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => {
          // Der Messbereich ist für Trainer hier, für Athleten liegt er in der Leiste.
          const items = group.items
            .filter(() => group.key !== 'measure' || role === 'coach')
            .filter((i) => i.key !== 'weeklyReport' || role === 'coach')
            .filter((i) => i.key !== 'plan' || planMode(import.meta.env?.VITE_TRAINING_PLAN) !== 'off')
          if (items.length === 0) return null
          return (
            <Panel key={group.key} data-testid={`more-${group.key}`}>
              <PanelHeader title={t(`more.group.${group.key}`)} />
              <ul className="px-2 pb-2">
                {items.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to} className="flex min-h-12 items-center gap-3 rounded-md px-2 text-[14px] hover:bg-surface-sunken">
                      <span className="flex-1">{t(`more.item.${item.key}`)}</span>
                      <ChevronRight size={16} aria-hidden className="text-ink-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
