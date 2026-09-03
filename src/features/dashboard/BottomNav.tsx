import { useTranslation } from 'react-i18next'
import { Activity, BarChart3, ClipboardList, House, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisualViewportInset } from '@/lib/useVisualViewportInset'

/**
 * Primäre Navigation auf Touch-Geräten.
 *
 * Drei Festlegungen, die jeweils einen konkreten Fehler verhindern:
 *
 * 1. `fixed` statt `sticky`. Eine sticky-Leiste hängt an ihrem Containing
 *    Block und pinnt nur, solange dessen Kanten im Viewport liegen; in
 *    Messungen stand sie je nach Layoutkontext mal am Viewportrand, mal
 *    weit darunter. `fixed` ist unabhängig von der Scrollposition und vom
 *    umgebenden Layout — und damit die einzige Variante, die die Zusage
 *    "immer sichtbar" wirklich hält.
 *
 * 2. `lg:hidden` statt `sm:hidden`. Ein Telefon im Querformat ist 844 px
 *    breit und lag damit über dem sm-Breakpoint — beim Drehen verschwand die
 *    Navigation. Ab lg übernimmt die Kopfzeile, darunter bleibt die Leiste.
 *
 * 3. Feste Höhe über `--bottom-nav-h`. Die App-Hülle reserviert exakt diesen
 *    Betrag als Innenabstand, sonst liegt der letzte Inhalt unerreichbar
 *    unter der Leiste. Eine fixierte Leiste nimmt keinen Platz im Fluss ein —
 *    der Platz muss ihr gegeben werden.
 *
 * 4. Verankerung am sichtbaren Viewport. `fixed; bottom: 0` verankert am
 *    Layout-Viewport; fallen beide auseinander (Tastatur, Zoom, mobile
 *    Emulation), sitzt die Leiste ausserhalb des Bildschirms. Der gemessene
 *    Abstand wird deshalb aufaddiert.
 */

/**
 * Die fünf Hauptbereiche (Konzept §5): Übersicht, Diagnostik, Analyse,
 * Verlauf, Profil. Der Testkatalog und die Einzeltests gehören zur
 * Diagnostik; Bericht und Trainer-Ansicht liegen unter Analyse bzw. Profil.
 */
export const NAV_ITEMS = [
  { key: 'overview', icon: House, path: '/', alsoMatches: [] },
  { key: 'diagnostics', icon: ClipboardList, path: '/diagnostik', alsoMatches: ['/tests', '/sport', '/batterie'] },
  { key: 'analysis', icon: Activity, path: '/analyse', alsoMatches: ['/bericht', '/community'] },
  { key: 'history', icon: BarChart3, path: '/verlauf', alsoMatches: ['/werte', '/kalender'] },
  { key: 'profile', icon: User, path: '/profil', alsoMatches: ['/trainer'] },
] as const

export type NavKey = (typeof NAV_ITEMS)[number]['key']

export function pathForNavKey(key: NavKey): string {
  return NAV_ITEMS.find((item) => item.key === key)?.path ?? '/'
}

/**
 * Aktiver Eintrag aus dem Pfad. Längster Treffer gewinnt, damit
 * /tests/cooper_12min ebenfalls den Tab "Tests" markiert.
 */
export function navKeyForPath(pathname: string): NavKey {
  const match = NAV_ITEMS.flatMap((item) =>
    [item.path, ...item.alsoMatches]
      .filter((path) => path !== '/' && pathname.startsWith(path))
      .map((path) => ({ key: item.key, path })),
  ).sort((a, b) => b.path.length - a.path.length)[0]
  return match?.key ?? 'overview'
}

export function BottomNav({
  active = 'overview',
  onNavigate,
}: {
  active?: NavKey
  onNavigate?: (key: NavKey) => void
}) {
  const { t } = useTranslation()
  const visualInset = useVisualViewportInset()

  return (
    <nav
      aria-label={t('nav.primary')}
      style={visualInset > 0 ? { bottom: visualInset } : undefined}
      data-visual-inset={visualInset || undefined}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        'border-t border-line bg-plane/95 backdrop-blur-md',
        // Der Bereich unterhalb der Leiste (Home-Indikator) bekommt dieselbe
        // Fläche, damit dort nichts durchscheint.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="relative mx-auto grid h-[var(--bottom-nav-h)] max-w-md grid-cols-5 items-center px-1">
        {NAV_ITEMS.map(({ key, icon }) => (
          <NavItem
            key={key}
            icon={icon}
            label={t(`nav.short.${key}`)}
            active={active === key}
            onClick={() => onNavigate?.(key)}
          />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof House
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      // min-h-11 = 44 px: die kleinste Fläche, die sich zuverlässig mit dem
      // Daumen treffen lässt.
      className={cn(
        'flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[2px] px-0.5 transition-colors',
        active ? 'text-accent-text' : 'text-ink-muted',
      )}
    >
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
      {/* Abschneiden statt Überlappen: in längeren Sprachen darf die
          Beschriftung kürzen, aber nie in die Nachbarspalte laufen. */}
      <span className="w-full truncate text-center font-display text-[10px] leading-none font-semibold tracking-[0.03em] uppercase">
        {label}
      </span>
    </button>
  )
}
