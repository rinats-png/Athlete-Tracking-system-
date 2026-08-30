import { useCallback, useState } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/routes/AppShell'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { TestCatalogScreen } from '@/features/tests/TestCatalogScreen'
import { TestRunScreen } from '@/features/tests/TestRunScreen'
import { HistoryScreen } from '@/features/history/HistoryScreen'
import { AnalysisScreen } from '@/features/analysis/AnalysisScreen'
import { ReportScreen } from '@/features/report/ReportScreen'
import { AssessmentListScreen } from '@/features/assessments/AssessmentListScreen'
import { AssessmentCreateScreen } from '@/features/assessments/AssessmentCreateScreen'
import { AssessmentDetailScreen } from '@/features/assessments/AssessmentDetailScreen'
import { AssessmentSummaryScreen } from '@/features/assessments/AssessmentSummaryScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { WelcomeScreen } from '@/features/auth/WelcomeScreen'
import { AppDataProvider, readMode, writeMode, type AppMode } from '@/lib/store/AppDataProvider'

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
      { index: true, element: <DashboardScreen /> },
      { path: 'diagnostik', element: <AssessmentListScreen /> },
      { path: 'diagnostik/neu', element: <AssessmentCreateScreen /> },
      { path: 'diagnostik/:id', element: <AssessmentDetailScreen /> },
      { path: 'diagnostik/:id/abschluss', element: <AssessmentSummaryScreen /> },
      { path: 'tests', element: <TestCatalogScreen /> },
      { path: 'tests/:slug', element: <TestRunScreen /> },
      { path: 'verlauf', element: <HistoryScreen /> },
      { path: 'analyse', element: <AnalysisScreen /> },
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
      <RouterProvider router={router} />
    </AppDataProvider>
  )
}
