import { useCallback, useState } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/routes/AppShell'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { DiagnosticsHub } from '@/features/diagnostics/DiagnosticsHub'
import { AreaScreen } from '@/features/diagnostics/AreaScreen'
import { SportScreen } from '@/features/diagnostics/SportScreen'
import { BatteryScreen } from '@/features/diagnostics/BatteryScreen'
import { ResultScreen } from '@/features/diagnostics/ResultScreen'
import { TestCatalogScreen } from '@/features/tests/TestCatalogScreen'
import { TestRunScreen } from '@/features/tests/TestRunScreen'
import { TestDetailScreen } from '@/features/tests/TestDetailScreen'
import { HistoryScreen } from '@/features/history/HistoryScreen'
import { HistoryHome } from '@/features/history/HistoryHome'
import { CalendarScreen } from '@/features/history/CalendarScreen'
import { RemindersScreen } from '@/features/history/RemindersScreen'
import { AnalysisHome } from '@/features/analysis/AnalysisHome'
import { CommunityScreen } from '@/features/analysis/CommunityScreen'
import { CoachScreen } from '@/features/coach/CoachScreen'
import { ReportScreen } from '@/features/report/ReportScreen'
import { AssessmentListScreen } from '@/features/assessments/AssessmentListScreen'
import { AssessmentCreateScreen } from '@/features/assessments/AssessmentCreateScreen'
import { AssessmentDetailScreen } from '@/features/assessments/AssessmentDetailScreen'
import { AssessmentSummaryScreen } from '@/features/assessments/AssessmentSummaryScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { WelcomeScreen } from '@/features/auth/WelcomeScreen'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { AppDataProvider, readMode, writeMode, useAppData, type AppMode } from '@/lib/store/AppDataProvider'

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

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewScreen /> },
      { path: 'diagnostik', element: <DiagnosticsHub /> },
      { path: 'diagnostik/bereich/:area', element: <AreaScreen /> },
      { path: 'diagnostik/termine', element: <AssessmentListScreen /> },
      { path: 'sport/:id', element: <SportScreen /> },
      { path: 'batterie/:slug', element: <BatteryScreen /> },
      { path: 'ergebnis/:id', element: <ResultScreen /> },
      { path: 'diagnostik/neu', element: <AssessmentCreateScreen /> },
      { path: 'diagnostik/:id', element: <AssessmentDetailScreen /> },
      { path: 'diagnostik/:id/abschluss', element: <AssessmentSummaryScreen /> },
      { path: 'tests', element: <TestCatalogScreen /> },
      { path: 'tests/:slug', element: <TestRunScreen /> },
      { path: 'tests/:slug/details', element: <TestDetailScreen /> },
      { path: 'verlauf', element: <HistoryHome /> },
      { path: 'verlauf/test/:slug', element: <HistoryHome /> },
      { path: 'verlauf/werte', element: <HistoryScreen /> },
      { path: 'verlauf/kalender', element: <CalendarScreen /> },
      { path: 'verlauf/erinnerungen', element: <RemindersScreen /> },
      { path: 'analyse', element: <AnalysisHome /> },
      { path: 'community', element: <CommunityScreen /> },
      { path: 'trainer', element: <CoachScreen /> },
      { path: 'bericht', element: <ReportScreen /> },
      { path: 'bericht/:id', element: <ReportScreen /> },
      { path: 'profil', element: <ProfileScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  const [mode, setMode] = useState<AppMode | null>(() => readMode())

  const enter = useCallback((next: AppMode) => {
    writeMode(next)
    setMode(next)
  }, [])

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
  const { data, role } = useAppData()
  const [target, setTarget] = useState<'overview' | 'tests' | null>(null)

  // Im Trainermodus trägt der Trainer die Angaben seiner Kunden im Profil
  // ein; ein Einstieg je Kunde wäre ein Fragebogen an die falsche Person.
  if (role === 'solo' && data.profile.onboardingCompletedAt == null) {
    return <OnboardingFlow onDone={setTarget} />
  }
  if (target === 'tests' && window.location.pathname !== '/diagnostik') {
    // Der Ablauf endet ausserhalb des Routers; der Zielpfad wird einmal
    // gesetzt, bevor der Router übernimmt.
    window.history.replaceState(null, '', '/diagnostik')
  }
  return <RouterProvider router={router} />
}
