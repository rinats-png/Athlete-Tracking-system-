import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gauge } from 'lucide-react'
import { checkAdmin } from '@/lib/supabase/analyticsAdmin'

/**
 * Der Weg zum Dashboard — sichtbar nur für den Admin.
 *
 * Die Frage stellt die Datenbank (is_analytics_admin), nicht diese Datei.
 * Für alle anderen erscheint hier nichts; und selbst wer den Link von Hand
 * aufruft, bekommt keine Daten, weil jede Auswertung serverseitig prüft.
 */
export function AdminLink() {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    let alive = true
    void checkAdmin().then((r) => alive && setAdmin(r === 'admin'))
    return () => {
      alive = false
    }
  }, [])
  if (!admin) return null
  return (
    <Link
      to="/admin/analytics"
      data-testid="admin-link"
      className="flex min-h-14 items-center justify-between gap-3 border border-line bg-surface px-4 py-3 hover:bg-accent-quiet"
    >
      <span className="flex items-center gap-3">
        <Gauge size={18} className="text-ink-muted" aria-hidden />
        <span>
          <span className="block text-[14px] font-medium">Nutzungsstatistik</span>
          <span className="block text-[12px] text-ink-secondary">Admin · Funnels, Wiederkehr, Ereignisse</span>
        </span>
      </span>
      <ArrowRight size={16} className="text-ink-muted" aria-hidden />
    </Link>
  )
}
