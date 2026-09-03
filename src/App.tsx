import { Suspense, lazy, useCallback, useState, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/routes/AppShell'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { DiagnosticsHub } from '@/features/diagnostics/DiagnosticsHub'
import { WelcomeScreen } from '@/features/auth/WelcomeScreen'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { AppDataProvider, readMode, writeMode, useAppData, type AppMode } from '@/lib/store/AppDataProvider'
import { IntroSequence } from '@/features/intro/IntroSequence'
import { introEnabled, introSeenThisSession, markIntroSeen } from '@/features/intro/introPreference'

/**
 * Einstiegspunkt.
 *
 * Zwei Wege in die App, beide ohne Konto und ohne Datenerfassung:
 *   'guest' — leerer Bestand, alles bleibt auf dem Gerät
 *   'demo'  — mitgelieferter Beispielsatz, ebenfalls lokal und bearbeitbar
 *
 * Der gewählte Modus überlebt einen Reload, damit man nicht bei jedem Start
 * wieder auf dem Willkommensbildschirm landet. Anmeldung über E-Mail, Apple
 * oder Google folgt später und ersetzt lediglich die Datenschicht.
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
  const Lazy = lazy(() => load().then((module) => ({ default: module[name] as ComponentType })))
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
      { path: 'bericht', element: screen(() => import('@/features/report/ReportScreen'), 'ReportScreen') },
      { path: 'bericht/:id', element: screen(() => import('@/features/report/ReportScreen'), 'ReportScreen') },
      { path: 'profil', element: screen(() => import('@/features/profile/ProfileScreen'), 'ProfileScreen') },
      { path: 'preise', element: screen(() => import('@/features/profile/PricingScreen'), 'PricingScreen') },
      { path: 'profil/import', element: screen(() => import('@/features/profile/CsvImportScreen'), 'CsvImportScreen') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const [mode, setMode] = useState<AppMode | null>(() => readMode())
  const [intro, setIntro] = useState(() => introEnabled() && !introSeenThisSession())

  const enter = useCallback((next: AppMode) => {
    writeMode(next)
    setMode(next)
  }, [])

  /*
   * Die Sequenz steht ganz vorn: vor der Wahl zwischen Gast und Demo, vor
   * dem Einstieg, vor dem Router. Sie ist der Moment, in dem die App sagt,
   * was sie ist — und danach ist man da, wo man ohne sie auch gewesen wäre.
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

  if (!mode) {
    return <WelcomeScreen onEnter={enter} />
  }

  return (
    <AppDataProvider mode={mode}>
      <OnboardingGate />
    </AppDataProvider>
  )
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
    return <OnboardingFlow onDone={setTarget} />
  }
  if (target && window.location.pathname !== target) {
    // Der Ablauf endet ausserhalb des Routers; der Zielpfad wird einmal
    // gesetzt, bevor der Router übernimmt.
    window.history.replaceState(null, '', target)
  }
  return <RouterProvider router={router} />
}
