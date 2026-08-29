import { useTranslation } from 'react-i18next'
import { BarChart3, House, Play, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mobile Navigation. Der Testabruf sitzt als erhöhte Schaltfläche in der Mitte:
 * das ist die einzige Aktion, die in der Halle mit einer Hand erreichbar sein
 * muss. Auf grossen Bildschirmen entfällt die Leiste.
 */
export function BottomNav({ onStartTest }: { onStartTest?: () => void }) {
  const { t } = useTranslation()
  const items = [
    { key: 'dashboard', icon: House, active: true },
    { key: 'history', icon: BarChart3, active: false },
    { key: 'challenges', icon: Trophy, active: false },
    { key: 'settings', icon: BarChart3, active: false },
  ] as const

  return (
    <nav
      aria-label={t('nav.dashboard')}
      className="sticky bottom-0 z-20 border-t border-line bg-plane/95 backdrop-blur-sm sm:hidden"
    >
      <div className="relative grid grid-cols-4 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.slice(0, 2).map(({ key, icon: Icon, active }) => (
          <NavItem key={key} icon={Icon} label={t(`nav.${key}`)} active={active} />
        ))}

        <button
          type="button"
          onClick={onStartTest}
          aria-label={t('actions.startTest')}
          className="absolute left-1/2 -top-5 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-plane bg-accent text-accent-ink"
        >
          <Play size={20} strokeWidth={2.4} aria-hidden />
        </button>

        {items.slice(2).map(({ key, icon: Icon, active }) => (
          <NavItem key={key} icon={Icon} label={t(`nav.${key}`)} active={active} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof House
  label: string
  active: boolean
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 py-1',
        active ? 'text-ink' : 'text-ink-muted',
      )}
    >
      <Icon size={18} strokeWidth={1.9} aria-hidden />
      <span className="font-display text-[10px] font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
    </button>
  )
}
