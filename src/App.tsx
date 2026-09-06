import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/routes/AppShell'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { DiagnosticsHub } from '@/features/diagnostics/DiagnosticsHub'

/*
 * Der Einstieg läuft genau einmal je Bestand. Er liegt deshalb in einem
 * eigenen Paket: mit den Sportmotiven in der Auswahlliste wäre er sonst der
 * Posten, der das Startpaket über sein Budget hebt — für neun Schritte, die
 * die allermeisten Starts gar nicht sehen.
 */
/*
 * Der Halo-Landeschirm kommt erst NACH dem Tor: bis dahin ist er totes
 * Gewicht im Startpaket, und mit ihm drin sass das Paket punktgenau auf
 * seiner Grenze. Wer die App oeffnet, laedt jetzt die Anmeldung, nicht die
 * Landeseite dahinter.
 */
/**
 * Die Rechtsseiten stehen VOR allen Toren.
 *
 * DER GRUND: zugestimmt wird auf der Landeseite und bei der Registrierung —
 * also bevor es einen Bestand, eine Rolle oder einen Router gibt. Ein Verweis
 * auf Nutzungsbedingungen, der erst nach der Anmeldung funktioniert, führt
 * genau dann ins Leere, wenn er gebraucht wird.
 */
const LEGAL_ROUTES: Record<string, 'ImprintScreen' | 'PrivacyScreen' | 'TermsScreen'> = {
  '/impressum': 'ImprintScreen',
  '/datenschutz': 'PrivacyScreen',
  '/nutzungsbedingungen': 'TermsScreen',
}

const WelcomeScreen = lazy(() =>
  import('@/features/auth/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen })),
)

// Der Zusatzteil des Wörterbuchs gehört dazu: der Einstieg zeigt
// Profiltexte, und ohne ihn stünden dort die Schlüsselnamen.
const OnboardingFlow = lazy(() =>
  Promise.all([import('@/features/onboarding/OnboardingFlow'), loadExtra()]).then(([m]) => ({
    default: m.OnboardingFlow,
  })),
)
import { AppDataProvider, readMode, writeMode, useAppData, type AppMode } from '@/lib/store/AppDataProvider'
import { loadExtra } from '@/i18n'
import { IntroSequence } from '@/features/intro/IntroSequence'
import { introEnabled, markIntroSeen } from '@/features/intro/introPreference'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { readAccount, type Account } from '@/features/auth/account'

/**
 * Einstiegspunkt.
 *
 * DER ABLAUF, VON GANZ VORN:
 *
 *   1. Anmeldung — Partikel bilden den Umriss der Fläche, die Fläche steht,
 *      nach dem Absenden zerfällt sie wieder in Partikel.
 *   2. Sequenz — die Auflösung geht in die Intro über. Sie läuft nach JEDER
 *      Anmeldung, nicht nur beim ersten Mal.
 *   3. Einstieg — die neun Schritte, solange der Bestand sie nicht kennt.
 *   4. Die App.
 *
 * Die Anmeldung prüft nichts (siehe `features/auth/account.ts`): es gibt
 * keinen Server. Sie ordnet den Einstieg und sagt das auch. Der Bestand
 * bleibt davon unberührt lokal — angemeldet oder nicht, gemessen wird auf
 * diesem Gerät.
 *
 * Zwei Bestandsarten hinter der Anmeldung:
 *   'guest' — leerer Bestand, alles bleibt auf dem Gerät
 *   'demo'  — mitgelieferter Beispielsatz, ebenfalls lokal und bearbeitbar
 */


/**
 * Bildschirme, die nicht auf jedem Weg gebraucht werden, kommen erst beim
 * Aufruf.
 *
 * DER GEMESSENE GRUND: das Startpaket war 1,0 MB. Bezahlt hat das jeder
 * Start — auch der, bei dem jemand nur einen Wert einträgt. Übersicht,
 * Diagnostik, Testdurchführung und Verlauf bleiben deshalb fest eingebunden;
 * alles Übrige wird nachgeladen. Offline bleibt es trotzdem verfügbar: der
 * Service Worker legt die Teilpakete beim ersten Besuch mit ab.
 */
function screen<T extends Record<string, ComponentType>>(
  load: () => Promise<T>,
  name: keyof T & string,
) {
  // Der Zusatzteil des Wörterbuchs kommt mit dem ersten nachgeladenen
  // Bildschirm — vor dem Rendern, sonst stünden dort kurz die Schlüssel.
  const Lazy = lazy(() =>
    Promise.all([load(), loadExtra()]).then(([module]) => ({
      default: module[name] as ComponentType,
    })),
  )
  return (
    // Ohne sichtbaren Platzhalter: die Teilpakete sind klein, und ein
    // aufblitzender Ladehinweis wäre unruhiger als ein kurzer Moment Leere.
    <Suspense fallback={<div aria-busy="true" className="min-h-[50vh]" />}>
      <Lazy />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewScreen /> },
      { path: 'diagnostik', element: <DiagnosticsHub /> },
      { path: 'diagnostik/bereich/:area', element: screen(() => import('@/features/diagnostics/AreaScreen'), 'AreaScreen') },
      { path: 'diagnostik/termine', element: screen(() => import('@/features/assessments/AssessmentListScreen'), 'AssessmentListScreen') },
      { path: 'sport/:id', element: screen(() => import('@/features/diagnostics/SportScreen'), 'SportScreen') },
      { path: 'batterie/:slug', element: screen(() => import('@/features/diagnostics/BatteryScreen'), 'BatteryScreen') },
      { path: 'ergebnis/:id', element: screen(() => import('@/features/diagnostics/ResultScreen'), 'ResultScreen') },
      { path: 'diagnostik/neu', element: screen(() => import('@/features/assessments/AssessmentCreateScreen'), 'AssessmentCreateScreen') },
      { path: 'diagnostik/:id', element: screen(() => import('@/features/assessments/AssessmentDetailScreen'), 'AssessmentDetailScreen') },
      { path: 'diagnostik/:id/abschluss', element: screen(() => import('@/features/assessments/AssessmentSummaryScreen'), 'AssessmentSummaryScreen') },
      { path: 'tests', element: screen(() => import('@/features/tests/TestCatalogScreen'), 'TestCatalogScreen') },
      { path: 'tests/:slug', element: screen(() => import('@/features/tests/TestRunScreen'), 'TestRunScreen') },
      { path: 'tests/:slug/details', element: screen(() => import('@/features/tests/TestDetailScreen'), 'TestDetailScreen') },
      { path: 'verlauf', element: screen(() => import('@/features/history/HistoryHome'), 'HistoryHome') },
      { path: 'verlauf/test/:slug', element: screen(() => import('@/features/history/HistoryHome'), 'HistoryHome') },
      { path: 'verlauf/werte', element: screen(() => import('@/features/history/HistoryScreen'), 'HistoryScreen') },
      { path: 'verlauf/kalender', element: screen(() => import('@/features/history/CalendarScreen'), 'CalendarScreen') },
      { path: 'verlauf/erinnerungen', element: screen(() => import('@/features/history/RemindersScreen'), 'RemindersScreen') },
      { path: 'analyse', element: screen(() => import('@/features/analysis/AnalysisHome'), 'AnalysisHome') },
      { path: 'analyse/jahr', element: screen(() => import('@/features/analysis/YearReviewScreen'), 'YearReviewScreen') },
      { path: 'community', element: screen(() => import('@/features/analysis/CommunityScreen'), 'CommunityScreen') },
      { path: 'trainer', element: screen(() => import('@/features/coach/CoachScreen'), 'CoachScreen') },
      { path: 'trainer/gruppentest', element: screen(() => import('@/features/coach/GroupTestScreen'), 'GroupTestScreen') },
      { path: 'trainer/testtag', element: screen(() => import('@/features/coach/TestDayScreen'), 'TestDayScreen') },
      { path: 'trainer/testtag/:id', element: screen(() => import('@/features/coach/TestDayDetailScreen'), 'TestDayDetailScreen') },
      { path: 'trainer/vergleich', element: screen(() => import('@/features/coach/AthleteCompare'), 'AthleteCompare') },
      { path: 'trainer/gruppenbericht', element: screen(() => import('@/features/coach/GroupReportScreen'), 'GroupReportScreen') },
      { path: 'trainer/heatmap', element: screen(() => import('@/features/coach/GroupHeatmapScreen'), 'GroupHeatmapScreen') },
      { path: 'trainer/nachweis', element: screen(() => import('@/features/coach/CoachProofScreen'), 'CoachProofScreen') },
      { path: 'bericht', element: screen(() => import('@/features/report/ReportScreen'), 'ReportScreen') },
      { path: 'beobachtung', element: screen(() => import('@/features/observations/ObservationScreen'), 'ObservationScreen') },
      { path: 'einseiter', element: screen(() => import('@/features/report/OnePagerScreen'), 'OnePagerScreen') },
      { path: 'bericht/:id', element: screen(() => import('@/features/report/ReportScreen'), 'ReportScreen') },
      { path: 'profil', element: screen(() => import('@/features/profile/ProfileScreen'), 'ProfileScreen') },
      { path: 'preise', element: screen(() => import('@/features/profile/PricingScreen'), 'PricingScreen') },
      { path: 'profil/import', element: screen(() => import('@/features/profile/CsvImportScreen'), 'CsvImportScreen') },
      // Rechtstexte: eigener Baustein, weil sie selten gelesen werden und
      // nicht in jedem Programmstart mitbezahlt werden sollen.
      { path: 'impressum', element: screen(() => import('@/features/legal/LegalScreen'), 'ImprintScreen') },
      { path: 'datenschutz', element: screen(() => import('@/features/legal/LegalScreen'), 'PrivacyScreen') },
      { path: 'nutzungsbedingungen', element: screen(() => import('@/features/legal/LegalScreen'), 'TermsScreen') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const [account, setAccount] = useState<Account | null>(() => readAccount())
  const [mode, setMode] = useState<AppMode | null>(() => readMode())
  /*
   * Die Sequenz gehört zur Anmeldung, nicht zum Programmstart: sie läuft, wenn
   * jemand sich gerade angemeldet hat. Wer nur die Seite neu lädt, ist schon
   * drin und soll nicht warten — sonst stünde zwischen jedem Reload eine
   * Animation.
   */
  const [intro, setIntro] = useState(false)

  const enter = useCallback((next: AppMode) => {
    writeMode(next)
    setMode(next)
  }, [])

  const signedIn = useCallback((next: Account) => {
    setAccount(next)
    setIntro(introEnabled())
  }, [])

  // 0. Rechtstexte — vor jedem Tor, siehe LEGAL_ROUTES.
  const legal = typeof window === 'undefined' ? undefined : LEGAL_ROUTES[window.location.pathname]
  if (legal) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        {screen(() => import('@/features/legal/LegalScreen'), legal)}
      </main>
    )
  }

  // 1. Das Tor. Ohne Konto kommt niemand weiter.
  if (!account) {
    return <AuthScreen onSignedIn={signedIn} />
  }

  /*
   * 2. Die Sequenz. Sie schliesst unmittelbar an die Auflösung der
   * Anmeldefläche an: dieselben Partikel, dieselbe Bewegung — erst dort
   * bekommt der Übergang seinen Sinn.
   */
  if (intro) {
    return (
      <IntroSequence
        onDone={() => {
          markIntroSeen()
          setIntro(false)
        }}
      />
    )
  }

  // 3. Welcher Bestand: der eigene oder der Beispielsatz.
  if (!mode) {
    return (
      <Suspense fallback={null}>
        <WelcomeScreen onEnter={enter} />
      </Suspense>
    )
  }

  return (
    <AppDataProvider mode={mode}>
      <RoleFromAccount role={account.role} />
      <OnboardingGate />
    </AppDataProvider>
  )
}

/**
 * Wer sich als Trainer registriert hat, findet den Trainerbereich vor.
 *
 * Nur EINMAL und nur in eine Richtung: wer die Rolle später im Profil
 * umstellt, soll sie nicht beim nächsten Start zurückgesetzt bekommen. Die
 * Registrierung gibt den Anfangszustand vor, nicht die Wahrheit über alle
 * Zeit — sonst wäre der Schalter im Profil eine Attrappe.
 */
function RoleFromAccount({ role }: { role: Account['role'] }) {
  const { role: current, setRole } = useAppData()
  const applied = useRef(false)
  useEffect(() => {
    if (applied.current) return
    applied.current = true
    if (role === 'coach' && current === 'solo') setRole('coach')
  }, [role, current, setRole])
  return null
}

/**
 * Der Einstieg (Konzept §3) kommt genau dann, wenn das Profil ihn noch nicht
 * abgeschlossen hat. Der Stand liegt IM Bestand, nicht in einem eigenen
 * Schalter: ein importierter Bestand bringt seinen Einrichtungsstand mit,
 * und «alles löschen» führt ehrlich wieder durch den Einstieg.
 */
function OnboardingGate() {
  const { data } = useAppData()
  const [target, setTarget] = useState<string | null>(null)

  // Die Rolle wird IM Einstieg gewählt — er läuft deshalb für beide. Ein
  // Athlet, den ein Trainer anlegt, gilt als eingerichtet und kommt hier gar
  // nicht an: ein Einstieg je Kunde wäre ein Fragebogen an die falsche
  // Person.
  if (data.profile.onboardingCompletedAt == null) {
    return (
      <Suspense fallback={null}>
        <OnboardingFlow onDone={setTarget} />
      </Suspense>
    )
  }
  if (target && window.location.pathname !== target) {
    // Der Ablauf endet ausserhalb des Routers; der Zielpfad wird einmal
    // gesetzt, bevor der Router übernimmt.
    window.history.replaceState(null, '', target)
  }
  return <RouterProvider router={router} />
}
