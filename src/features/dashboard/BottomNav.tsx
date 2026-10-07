import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarRange, ChartLine, ClipboardList, Ellipsis, FileText, Flame, Gauge, HeartPulse, House, MessageCircleQuestion, Mountain, NotebookPen, Settings, Share2, User, Users, UsersRound } from 'lucide-react'
import { navEdge, navPick, navTick, primeNavSound } from '@/lib/navSound'
import { cn } from '@/lib/utils'
import { useVisualViewportInset } from '@/lib/useVisualViewportInset'
import { planEnabled } from '@/domain/planMode'

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
 * 3. Lupen-Dock statt fester Tabs: alle Bereiche liegen in einer Leiste,
 *    die über den Displayrand hinausläuft und seitlich verschoben wird. Die
 *    Lupe steht fest in der Mitte; was dort einrastet, ist gewählt. Symbole
 *    nahe der Mitte wachsen. Antippen holt ein Symbol in die Mitte. Dazu ein
 *    leiser Ton (`navSound`), abschaltbar unter Mehr. Bei «Bewegung
 *    reduzieren» entfallen Vergrößerung und weiches Gleiten.
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
    key: 'athleteTest',
    icon: ClipboardList,
    path: '/diagnostik',
    alsoMatches: ['/tests', '/sport', '/batterie', '/ergebnis', '/beobachtung', '/hrv-messung'],
  },
  // Training (Etappe 1 des neuen Trainingsbereichs): Hub, Block, Player, Berechnung.
  { key: 'athletePlan', icon: CalendarRange, path: '/plan', alsoMatches: ['/training'] },
  {
    key: 'athletePerformance',
    icon: BarChart3,
    path: '/performance',
    alsoMatches: ['/verlauf', '/analyse', '/bericht', '/community', '/hinweise', '/einseiter'],
  },
  { key: 'fuel', icon: Flame, path: '/fuel', alsoMatches: ['/ernaehrung'] },
  {
    key: 'athleteMore',
    icon: Ellipsis,
    path: '/mehr',
    alsoMatches: ['/profil', '/tagebuch', '/cockpit', '/belastung', '/gesundheit', '/peakweek', '/sportmodul', '/sportanalyse', '/freigaben', '/team', '/preise', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/auftragsverarbeitung'],
  },
] as const

/**
 * Die Bereiche des Trainers (Produktdoktrin §6): Heute, Athleten, (Plan), Test,
 * Team, Mehr. Der Trainer arbeitet in Fragen, nicht in Themen: wer braucht
 * Aufmerksamkeit (Heute, Athleten), was wird gemessen (Test), wie steht die
 * Gruppe da (Team). Alles andere liegt unter Mehr.
 */
export const COACH_NAV_ITEMS = [
  { key: 'coachToday', icon: House, path: '/', alsoMatches: [] },
  { key: 'coachAthletes', icon: Users, path: '/trainer', alsoMatches: ['/cockpit'] },
  // Plan (Trainingsbereich Etappe 11): Block, Kalender, Vorlagen, Zuweisen. Nur mit Trainingsbereich.
  { key: 'coachPlan', icon: CalendarRange, path: '/plan', alsoMatches: ['/training'] },
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
export type NavKey = AthleteNavKey | CoachNavKey | DockKey
export type NavItem = { key: NavKey; icon: typeof House; path: string; alsoMatches: readonly string[] }
export type NavRole = 'solo' | 'coach'

/** Reihenfolge ohne Trainingsbereich: Test sitzt in der Mitte der fünf. */
const WITHOUT_PLAN = ['athleteToday', 'athletePerformance', 'athleteTest', 'fuel', 'athleteMore']

/** Trainer ohne Trainingsbereich: die fünf Bereiche der Doktrin, Test in der Mitte. */
const COACH_WITHOUT_PLAN = ['coachToday', 'coachAthletes', 'coachTest', 'coachTeam', 'coachMore']

export function navItemsFor(role: NavRole): readonly NavItem[] {
  if (role === 'coach') return planEnabled() ? COACH_NAV_ITEMS : COACH_WITHOUT_PLAN.map((key) => COACH_NAV_ITEMS.find((i) => i.key === key)!)
  if (planEnabled()) return NAV_ITEMS
  return WITHOUT_PLAN.map((key) => NAV_ITEMS.find((i) => i.key === key)!)
}

export function pathForNavKey(key: NavKey): string {
  if (key === 'dockSettings') return DOCK_SETTINGS.path
  return [...NAV_ITEMS, ...COACH_NAV_ITEMS, ...ATHLETE_DOCK_EXTRA, ...COACH_DOCK_EXTRA].find((item) => item.key === key)?.path ?? '/'
}

/**
 * Aktiver Eintrag aus dem Pfad. Längster Treffer gewinnt, damit
 * /tests/cooper_12min ebenfalls den Tab "Tests" markiert.
 */
export function navKeyForPath(pathname: string, role: NavRole = 'solo', items: readonly NavItem[] = navItemsFor(role)): NavKey {
  const match = items
    .flatMap((item) =>
      [item.path, ...item.alsoMatches]
        .filter((path) => path !== '/' && pathname.startsWith(path))
        .map((path) => ({ key: item.key, path })),
    )
    .sort((a, b) => b.path.length - a.path.length)[0]
  return match?.key ?? items[0].key
}

/**
 * Die Leiste unten (Lupen-Dock) zeigt mehr als die Kopfzeile: die
 * Hauptbereiche und danach, was bisher nur unter «Mehr» lag. «Mehr» selbst
 * heißt in der Leiste «Einstellungen» und steht am Ende; dort liegen weiter
 * Konto, Rechtliches und alles Übrige. Die Adressen bleiben dieselben.
 */
const ATHLETE_DOCK_EXTRA = [
  { key: 'dockDiary', icon: NotebookPen, path: '/tagebuch', alsoMatches: [] },
  { key: 'dockLoad', icon: Gauge, path: '/belastung', alsoMatches: [] },
  { key: 'dockHealth', icon: HeartPulse, path: '/gesundheit', alsoMatches: [] },
  { key: 'dockPeakWeek', icon: Mountain, path: '/peakweek', alsoMatches: [] },
  { key: 'dockProfile', icon: User, path: '/profil', alsoMatches: [] },
  { key: 'dockShares', icon: Share2, path: '/freigaben', alsoMatches: [] },
] as const

const COACH_DOCK_EXTRA = [
  { key: 'dockWeeklyReport', icon: FileText, path: '/trainer/wochenbericht', alsoMatches: [] },
  { key: 'dockAsk', icon: MessageCircleQuestion, path: '/fragen', alsoMatches: [] },
  { key: 'dockAnalysis', icon: ChartLine, path: '/analyse', alsoMatches: ['/verlauf', '/bericht'] },
  { key: 'dockProfile', icon: User, path: '/profil', alsoMatches: [] },
] as const

const DOCK_SETTINGS = { key: 'dockSettings', icon: Settings, path: '/mehr' } as const

export type DockKey = (typeof ATHLETE_DOCK_EXTRA)[number]['key'] | (typeof COACH_DOCK_EXTRA)[number]['key'] | 'dockSettings'

/** Alle Einträge der Leiste in Reihenfolge; ohne Trainingsbereich fehlt Plan. */
export function dockItemsFor(role: NavRole): readonly NavItem[] {
  const main = navItemsFor(role)
  const more = main.find((i) => i.key === 'athleteMore' || i.key === 'coachMore')!
  const extra: readonly NavItem[] = role === 'coach' ? COACH_DOCK_EXTRA : ATHLETE_DOCK_EXTRA
  const taken = new Set(extra.flatMap((i) => [i.path, ...i.alsoMatches]))
  const settings: NavItem = { ...DOCK_SETTINGS, alsoMatches: more.alsoMatches.filter((p) => !taken.has(p)) }
  return [...main.filter((i) => i !== more), ...extra, settings]
}

/** Abstand zweier Symbole: 46 px Symbol + 10 px Lücke. Symbol i steht mittig, wenn scrollLeft = i · STEP. */
const STEP = 56

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function BottomNav({
  active,
  onNavigate,
  items,
}: {
  active: NavKey
  onNavigate?: (key: NavKey) => void
  items: readonly NavItem[]
}) {
  const { t } = useTranslation()
  const visualInset = useVisualViewportInset()
  const scroller = useRef<HTMLDivElement>(null)
  const dots = useRef<(HTMLSpanElement | null)[]>([])
  const activeIndex = Math.max(0, items.findIndex((i) => i.key === active))
  const [hot, setHot] = useState(activeIndex)
  // Nur eine Bewegung, die von Finger, Maus oder Rad kommt, wählt beim Einrasten.
  // Programmatisches Scrollen (Routenwechsel, Fokus, Testwerkzeuge) wählt nie.
  const user = useRef(false)
  const state = useRef({ hot: activeIndex, x: 0, t: 0, v: 0, edge: false, settle: 0 as ReturnType<typeof setTimeout> | 0, raf: 0 })
  const live = useRef({ active, onNavigate, items })
  live.current = { active, onNavigate, items }

  const layout = () => {
    const el = scroller.current
    if (!el) return
    const pos = el.scrollLeft / STEP
    const calm = reducedMotion()
    dots.current.forEach((dot, i) => {
      if (!dot) return
      if (calm) return void (dot.style.transform = '')
      const d = (i - pos) * STEP
      const dist = Math.abs(d)
      // Lupe: nur das Symbol in der Mitte wächst deutlich; die Nachbarn weichen
      // so weit aus, wie es wächst, und zwar nach außen abnehmend — so überlappt nichts.
      const f = Math.max(0, 1 - dist / 70)
      const scale = 1 + 0.4 * f * f
      const lift = 10 * f * f
      const push = Math.sign(d) * 9 * Math.min(1, dist / STEP) * Math.min(1, Math.max(0, (140 - dist) / 84))
      dot.style.transform = `translate(${push.toFixed(1)}px, ${(-lift).toFixed(1)}px) scale(${scale.toFixed(3)})`
    })
    const next = Math.min(items.length - 1, Math.max(0, Math.round(pos)))
    if (next !== state.current.hot) {
      state.current.hot = next
      setHot(next)
      if (user.current) navTick(state.current.v)
    }
  }

  const center = (i: number, smooth: boolean) => {
    const el = scroller.current
    if (!el) return
    if (typeof el.scrollTo === 'function') el.scrollTo({ left: i * STEP, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
    else el.scrollLeft = i * STEP
  }

  const choose = (key: NavKey) => {
    if (key === live.current.active) return
    navPick()
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8)
    live.current.onNavigate?.(key)
  }

  const onSettle = () => {
    const el = scroller.current
    if (!el || !user.current) return
    user.current = false
    const i = Math.min(live.current.items.length - 1, Math.max(0, Math.round(el.scrollLeft / STEP)))
    choose(live.current.items[i].key)
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const s = state.current
    const now = performance.now()
    s.v = ((el.scrollLeft - s.x) / Math.max(1, now - s.t)) * 16
    s.x = el.scrollLeft
    s.t = now
    // Anschlag: einmal pro Ankunft am Rand, nur bei Schwung.
    const atEdge = el.scrollLeft <= 0 || el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
    if (atEdge && !s.edge && user.current && Math.abs(s.v) > 4) navEdge()
    s.edge = atEdge
    cancelAnimationFrame(s.raf)
    s.raf = requestAnimationFrame(layout)
    if (s.settle) clearTimeout(s.settle)
    s.settle = setTimeout(onSettle, 140)
  }

  const grab = () => {
    user.current = true
    primeNavSound()
  }

  // Erster Aufbau: ohne Gleiten auf den aktiven Bereich; danach bei jedem Routenwechsel weich.
  const mounted = useRef(false)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (Math.round(el.scrollLeft / STEP) !== activeIndex && !user.current) center(activeIndex, mounted.current)
    mounted.current = true
    layout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length])

  useEffect(() => {
    const s = state.current
    return () => {
      if (s.settle) clearTimeout(s.settle)
      cancelAnimationFrame(s.raf)
    }
  }, [])

  const edgeMask = 'linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent)'

  return (
    <nav
      aria-label={t('nav.primary')}
      style={visualInset > 0 ? { bottom: visualInset } : undefined}
      data-visual-inset={visualInset || undefined}
      className={cn('fixed inset-x-0 bottom-0 z-40 lg:hidden', 'pb-[env(safe-area-inset-bottom)]', 'pointer-events-none')}
    >
      {/* Schiene über die volle Breite, auch über den sicheren Bereich unten. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[calc(84px+env(safe-area-inset-bottom))] border-t border-line bg-surface-raised shadow-[0_-6px_18px_rgba(0,0,0,0.16)]" />
      <div className="relative mx-auto h-[var(--bottom-nav-h)] max-w-md">
        <div
          ref={scroller}
          data-testid="nav-dock"
          onScroll={onScroll}
          onPointerDown={grab}
          onTouchStart={grab}
          onWheel={grab}
          className="nav-dock pointer-events-auto absolute inset-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          style={{ maskImage: edgeMask, WebkitMaskImage: edgeMask }}
        >
          <div className="flex h-full w-max items-end gap-[10px] px-[calc(50%-23px)] pb-[26px]">
            {items.map(({ key, icon: Icon }, i) => {
              const isActive = key === active
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  data-hot={i === hot ? '' : undefined}
                  onClick={() => {
                    user.current = false
                    center(i, true)
                    choose(key)
                  }}
                  className="relative h-[46px] w-[46px] shrink-0 snap-center rounded-[16px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  <span
                    ref={(el) => void (dots.current[i] = el)}
                    className={cn(
                      'nav-dot pointer-events-none absolute inset-0 grid origin-bottom place-items-center rounded-[16px] border will-change-transform',
                      isActive ? 'border-accent bg-accent text-accent-ink shadow-[0_0_20px_-4px_var(--glow)]' : 'border-line bg-surface-sunken text-ink-secondary',
                    )}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                  </span>
                  {/* Name als Text statt aria-label: so bleibt getByLabel für Formularfelder eindeutig. */}
                  <span className="sr-only">{t(`nav.short.${key}`)}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute top-full left-1/2 mt-[5px] -translate-x-1/2 font-display text-[10px] leading-none font-semibold tracking-[0.03em] whitespace-nowrap uppercase transition-opacity duration-[var(--motion-fast)]',
                      isActive ? 'text-accent-text' : 'text-ink-muted',
                      i === hot ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    {t(`nav.short.${key}`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
