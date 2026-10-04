import { useTranslation } from 'react-i18next'
import { BarChart3, ClipboardList, Ellipsis, Flame, House, Users, UsersRound } from 'lucide-react'
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
 * 3. Pillenform, schwebend, Milchglas (Designsystem: Floating Navigation).
 *    Der aktive Anzeiger wandert per `transform` zur neuen Position, statt
 *    umzuspringen: die Bewegung sagt, woher man kommt. `transform` und nicht
 *    `left`, damit die Leiste dabei kein Layout neu berechnet.
 *
 * 4. Feste Höhe über `--bottom-nav-h`. Die App-Hülle reserviert exakt diesen
 *    Betrag als Innenabstand, sonst liegt der letzte Inhalt unerreichbar
 *    unter der Leiste. Eine fixierte Leiste nimmt keinen Platz im Fluss ein —
 *    der Platz muss ihr gegeben werden.
 *
 * 5. Verankerung am sichtbaren Viewport. `fixed; bottom: 0` verankert am
 *    Layout-Viewport; fallen beide auseinander (Tastatur, Zoom, mobile
 *    Emulation), sitzt die Leiste ausserhalb des Bildschirms. Der gemessene
 *    Abstand wird deshalb aufaddiert.
 */

/**
 * Die fünf Hauptbereiche des Athleten (Produktdoktrin §6): Heute, Performance,
 * Test, Fuel, Mehr. Verlauf, Analyse und Bericht gehören zu Performance; Profil,
 * Tagebuch, Training und Rechtliches liegen unter Mehr. Die Adressen blieben.
 */
export const NAV_ITEMS = [
  { key: 'athleteToday', icon: House, path: '/', alsoMatches: ['/uebersicht', '/checkin', '/woche'] },
  {
    key: 'athletePerformance',
    icon: BarChart3,
    path: '/performance',
    alsoMatches: ['/verlauf', '/analyse', '/bericht', '/community', '/hinweise', '/einseiter'],
  },
  {
    key: 'athleteTest',
    icon: ClipboardList,
    path: '/diagnostik',
    alsoMatches: ['/tests', '/sport', '/batterie', '/ergebnis', '/beobachtung', '/hrv-messung'],
  },
  { key: 'fuel', icon: Flame, path: '/fuel', alsoMatches: ['/ernaehrung'] },
  {
    key: 'athleteMore',
    icon: Ellipsis,
    path: '/mehr',
    alsoMatches: ['/profil', '/tagebuch', '/training', '/cockpit', '/belastung', '/gesundheit', '/peakweek', '/sportmodul', '/sportanalyse', '/freigaben', '/team', '/preise', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/auftragsverarbeitung'],
  },
] as const

/**
 * Die fünf Bereiche des Trainers (Produktdoktrin §6): Heute, Athleten, Test,
 * Team, Mehr. Der Trainer arbeitet in Fragen, nicht in Themen: wer braucht
 * Aufmerksamkeit (Heute, Athleten), was wird gemessen (Test), wie steht die
 * Gruppe da (Team). Alles andere liegt unter Mehr.
 */
export const COACH_NAV_ITEMS = [
  { key: 'coachToday', icon: House, path: '/', alsoMatches: [] },
  { key: 'coachAthletes', icon: Users, path: '/trainer', alsoMatches: ['/cockpit'] },
  {
    key: 'coachTest',
    icon: ClipboardList,
    path: '/trainer/testtag',
    alsoMatches: ['/trainer/gruppentest', '/tests', '/diagnostik', '/batterie', '/sport', '/ergebnis'],
  },
  {
    key: 'coachTeam',
    icon: UsersRound,
    path: '/trainer/team',
    alsoMatches: ['/trainer/vergleich', '/trainer/gruppenbericht', '/trainer/heatmap', '/trainer/nachweis', '/team'],
  },
  { key: 'coachMore', icon: Ellipsis, path: '/mehr', alsoMatches: ['/profil', '/verlauf', '/analyse', '/bericht', '/tagebuch', '/training', '/fuel', '/ernaehrung', '/belastung', '/hinweise', '/preise', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/auftragsverarbeitung'] },
] as const

export type AthleteNavKey = (typeof NAV_ITEMS)[number]['key']
export type CoachNavKey = (typeof COACH_NAV_ITEMS)[number]['key']
export type NavKey = AthleteNavKey | CoachNavKey
export type NavItem = { key: NavKey; icon: typeof House; path: string; alsoMatches: readonly string[] }
export type NavRole = 'solo' | 'coach'

export function navItemsFor(role: NavRole): readonly NavItem[] {
  return role === 'coach' ? COACH_NAV_ITEMS : NAV_ITEMS
}

export function pathForNavKey(key: NavKey): string {
  return [...NAV_ITEMS, ...COACH_NAV_ITEMS].find((item) => item.key === key)?.path ?? '/'
}

/**
 * Aktiver Eintrag aus dem Pfad. Längster Treffer gewinnt, damit
 * /tests/cooper_12min ebenfalls den Tab "Tests" markiert.
 */
export function navKeyForPath(pathname: string, role: NavRole = 'solo'): NavKey {
  const items = navItemsFor(role)
  const match = items
    .flatMap((item) =>
      [item.path, ...item.alsoMatches]
        .filter((path) => path !== '/' && pathname.startsWith(path))
        .map((path) => ({ key: item.key, path })),
    )
    .sort((a, b) => b.path.length - a.path.length)[0]
  return match?.key ?? items[0].key
}

export function BottomNav({
  active = 'athleteToday',
  onNavigate,
  items = NAV_ITEMS,
}: {
  active?: NavKey
  onNavigate?: (key: NavKey) => void
  items?: readonly NavItem[]
}) {
  const { t } = useTranslation()
  const visualInset = useVisualViewportInset()

  const index = Math.max(
    0,
    items.findIndex((item) => item.key === active),
  )

  return (
    <nav
      aria-label={t('nav.primary')}
      style={visualInset > 0 ? { bottom: visualInset } : undefined}
      data-visual-inset={visualInset || undefined}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        // Die Leiste schwebt: sie sitzt nicht auf der Kante, sondern darüber.
        // Der Abstand nach unten kommt aus dem sicheren Bereich plus 10 px.
        'px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]',
        'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-auto grid max-w-md items-center',
          'h-[var(--bottom-nav-h)] rounded-pill border border-line px-1',
          // Milchglas: was darunter durchläuft, bleibt erkennbar. Ohne den
          // Weichzeichner wäre die Leiste entweder undurchsichtig (und
          // verdeckte Inhalt) oder unlesbar.
          'bg-glass-strong shadow-elev-2 backdrop-blur-xl',
        )}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {/*
         * Der aktive Anzeiger WANDERT — er wird nicht neu gezeichnet.
         * Die Bewegung sagt, woher man kommt und wohin man geht; ein
         * Umspringen sagt nur, dass sich etwas geändert hat.
         *
         * `transform` statt `left`: nur so läuft das auf der GPU und
         * erzwingt kein Neu-Layout der ganzen Leiste.
         */}
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1 rounded-pill bg-accent-quiet"
          style={{
            width: `calc((100% - 0.5rem) / ${items.length})`,
            transform: `translateX(${index * 100}%)`,
            transition: 'transform var(--motion-base) var(--ease-out)',
          }}
        />
        {items.map(({ key, icon }) => (
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
        'relative z-10 flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-pill px-0.5',
        'transition-colors duration-[var(--motion-fast)]',
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
