import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/features/dashboard/AppHeader'
import { BottomNav, navKeyForPath, pathForNavKey } from '@/features/dashboard/BottomNav'
import { DataLoadNotice } from '@/features/dashboard/DataLoadNotice'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useTranslation } from 'react-i18next'

/**
 * App-Hülle: Kopfzeile, Inhalt, Navigationsleiste.
 *
 * Die Leiste liegt hier und nicht in den Screens. Dadurch wird sie beim
 * Routenwechsel nicht neu montiert — sie flackert nicht, verliert keinen
 * Zustand und animiert nicht mit. Der aktive Eintrag kommt aus der Route,
 * nicht aus lokalem Zustand: nach einem Reload oder einem Deep Link stimmt er
 * deshalb sofort.
 */
export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { mode, storageBlocked } = useAppData()
  const active = navKeyForPath(pathname)

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        mode={mode}
        active={active}
        onNavigate={(key) => navigate(pathForNavKey(key))}
      />

      <main
        id="main"
        className={
          // Die fixierte Leiste nimmt keinen Platz im Fluss ein — hier wird er
          // reserviert, damit der letzte Inhalt nicht darunter liegt.
          // Seitliche sichere Bereiche: im Querformat liegen sonst die ersten
          // Zeichen jeder Zeile unter der abgerundeten Ecke.
          'mx-auto w-full max-w-6xl flex-1 py-5 ' +
          'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] ' +
          'sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] ' +
          'pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] lg:pb-8'
        }
      >
        {storageBlocked && (
          <p className="mb-4 border-l-2 border-critical bg-critical/10 px-3 py-2 text-[13px] text-ink-secondary">
            {t('storage.blocked')}
          </p>
        )}
        <DataLoadNotice />
        <Outlet />
      </main>

      <BottomNav active={active} onNavigate={(key) => navigate(pathForNavKey(key))} />
    </div>
  )
}
