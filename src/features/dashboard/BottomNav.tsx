import { useEffect, useRef, useState } from 'react'
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
 * 3. Bogen statt Pille: die fünf Bereiche sitzen auf einem nach oben
 *    gewölbten Bogen, der mittlere (Test) ist größer. Beim Antippen blinkt
 *    der Tab zweimal, danach folgt die Navigation; bei «Bewegung reduzieren»
 *    entfällt das Blinken und die Verzögerung.
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

/** Dauer des Blinkens in ms; die Navigation folgt danach. Gleicher Wert wie `nav-blink` in theme.css. */
export const BLINK_MS = 480

/**
 * Lage der Tabs auf dem Bogen: Winkel auf einer Ellipse. Der mittlere Tab
 * liegt oben (90°), die übrigen verteilen sich symmetrisch. Bei vier Tabs
 * gibt es keine Mitte; dann sind alle gleich groß.
 */
const ANGLES: Record<number, number[]> = {
  3: [135, 90, 45],
  4: [140, 105, 75, 40],
  5: [150, 120, 90, 60, 30],
}
const RX_PCT = 38.46 // Halbachse der Tab-Ellipse in % der Breite
const BASE_Y = 104 // Unterkante der Tab-Ellipse in px von oben
const RY = 46

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
  const [blinking, setBlinking] = useState<NavKey | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const angles = ANGLES[items.length] ?? ANGLES[5]
  const centerIndex = items.length % 2 === 1 ? Math.floor(items.length / 2) : -1

  const choose = (key: NavKey) => {
    if (blinking) return
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm || key === active) {
      onNavigate?.(key)
      return
    }
    setBlinking(key)
    timer.current = setTimeout(() => {
      setBlinking(null)
      onNavigate?.(key)
    }, BLINK_MS)
  }

  return (
    <nav
      aria-label={t('nav.primary')}
      style={visualInset > 0 ? { bottom: visualInset } : undefined}
      data-visual-inset={visualInset || undefined}
      className={cn('fixed inset-x-0 bottom-0 z-40 lg:hidden', 'pb-[env(safe-area-inset-bottom)]', 'pointer-events-none')}
    >
      <div
        className="pointer-events-none relative mx-auto h-[var(--bottom-nav-h)] max-w-md"
        style={
          {
            '--t-w': 'clamp(44px, 14vw, 60px)',
            '--t-s': 'clamp(40px, 12vw, 48px)',
            '--c-w': 'clamp(60px, 18vw, 72px)',
            '--c-s': 'clamp(56px, 17vw, 68px)',
          } as React.CSSProperties
        }
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible drop-shadow-[0_-6px_18px_rgba(0,0,0,0.16)]" viewBox="0 0 390 122" preserveAspectRatio="none">
          <path d="M0,122 A195,108 0 0 1 390,122 Z" style={{ fill: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)', stroke: 'var(--line)', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' }} />
        </svg>
        {items.map(({ key, icon: Icon }, i) => {
          const big = i === centerIndex
          const theta = (angles[i] * Math.PI) / 180
          const x = 50 + RX_PCT * Math.cos(theta)
          const cy = BASE_Y - RY * Math.sin(theta)
          const isActive = active === key
          const w = big ? 'var(--c-w)' : 'var(--t-w)'
          const size = big ? 'var(--c-s)' : 'var(--t-s)'
          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-current={isActive ? 'page' : undefined}
              data-blinking={blinking === key ? '' : undefined}
              data-big={big ? '' : undefined}
              className="group pointer-events-auto absolute flex flex-col items-center gap-0.5"
              style={{ width: w, left: `calc(${x}% - ${w} / 2)`, top: `calc(${cy}px - ${size} / 2)` }}
            >
              <span
                className={cn(
                  'nav-dot grid place-items-center rounded-full border transition-colors duration-[var(--motion-fast)]',
                  big ? 'border-2' : 'border',
                  isActive ? 'border-accent bg-accent text-accent-ink shadow-[0_0_22px_-4px_var(--glow)]' : 'border-line bg-surface-sunken text-ink-secondary',
                )}
                style={{ width: size, height: size }}
              >
                <Icon size={big ? 28 : 21} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
              </span>
              <span className={cn('w-full truncate text-center font-display text-[10px] leading-none font-semibold tracking-[0.03em] uppercase', isActive ? 'text-accent-text' : 'text-ink-muted')}>
                {t(`nav.short.${key}`)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
