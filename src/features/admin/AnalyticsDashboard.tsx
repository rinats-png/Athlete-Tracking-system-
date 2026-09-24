import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import {
  checkAdmin,
  fetchEventNames,
  fetchFunnel,
  fetchLog,
  fetchPages,
  fetchRetention,
  fetchSummary,
  fetchTopEvents,
  funnelView,
  type AdminCheck,
  type FunnelStep,
  type LogRow,
  type PageRow,
  type Range,
  type Retention,
  type Summary,
  type TopEvent,
} from '@/lib/supabase/analyticsAdmin'
import { AdminBroadcast } from './AdminBroadcast'
import { cn } from '@/lib/utils'

/**
 * Nutzungsstatistik — nur für info@kydon.app.
 *
 * ZWEI SCHLÖSSER, UND NUR EINES DAVON ZÄHLT. Diese Seite fragt beim Laden,
 * ob der Angemeldete Admin ist, und schickt alle anderen zur Startseite.
 * Das ist Bequemlichkeit, keine Sicherheit: Die Daten kommen aus Funktionen,
 * die in der Datenbank selbst prüfen und sonst mit 403 antworten. Wer diese
 * Datei im Browser umschreibt, sieht eine leere Seite.
 *
 * NUR AUF DEUTSCH. Eine Seite für einen Menschen braucht keine acht Sprachen.
 */

type Window = '24h' | '7d' | '30d'
const WINDOWS: { key: Window; label: string; hours: number }[] = [
  { key: '24h', label: 'Letzte 24 Stunden', hours: 24 },
  { key: '7d', label: 'Letzte 7 Tage', hours: 24 * 7 },
  { key: '30d', label: 'Letzte 30 Tage', hours: 24 * 30 },
]

/** Voreingestellte Funnels — die Fragen, die sich bei dieser App zuerst stellen. */
const PRESET_FUNNELS: { label: string; steps: string[] }[] = [
  { label: 'Einstieg bis zum ersten Test', steps: ['session_start', 'onboarding_step', 'onboarding_complete', 'test_completed'] },
  { label: 'Vom Öffnen zur Messung', steps: ['session_start', 'page_view', 'test_completed'] },
  { label: 'Schranke bis Kauf', steps: ['gate_shown', 'checkout_started'] },
  { label: 'Registrierung', steps: ['session_start', 'signup', 'login'] },
]

const nf = new Intl.NumberFormat('de-DE')
const pct = (x: number) => `${Math.round(x * 100)} %`
const dt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'medium' })

export function AnalyticsDashboard() {
  const [access, setAccess] = useState<AdminCheck | 'checking'>('checking')
  useEffect(() => {
    void checkAdmin().then(setAccess)
  }, [])

  if (access === 'checking') {
    return <p className="text-[13px] text-ink-muted" data-testid="admin-checking">Zugang wird geprüft …</p>
  }
  if (access !== 'admin') return <Navigate to="/" replace />
  return <Dashboard />
}

function Dashboard() {
  const [windowKey, setWindowKey] = useState<Window>('7d')
  const range = useMemo<Range>(() => {
    const hours = WINDOWS.find((w) => w.key === windowKey)!.hours
    const to = new Date()
    return { from: new Date(to.getTime() - hours * 3_600_000), to }
  }, [windowKey])

  const [summary, setSummary] = useState<Summary | null>(null)
  const [top, setTop] = useState<TopEvent[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [retention, setRetention] = useState<Retention | null>(null)
  const [names, setNames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setError(null)
    Promise.all([fetchSummary(range), fetchTopEvents(range, 5), fetchPages(range), fetchRetention(range), fetchEventNames(range)])
      .then(([s, t, p, r, n]) => {
        if (!alive) return
        setSummary(s)
        setTop(t)
        setPages(p)
        setRetention(r)
        setNames(n.map((x) => x.event_name))
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [range])

  return (
    <div className="space-y-4" data-testid="analytics-dashboard">
      <header>
        <p className="label-tag">Admin</p>
        <h1 className="font-display text-[28px] leading-tight font-bold sm:text-[34px]">Nutzungsstatistik</h1>
        <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-ink-secondary">
          Nur Ereignisse von Menschen, die eingewilligt haben. Nichts aus der Gesundheitsschicht, keine Messwerte, keine
          IP-Adressen. Alles älter als 90 Tage ist gelöscht.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Zeitraum">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            type="button"
            aria-pressed={windowKey === w.key}
            onClick={() => setWindowKey(w.key)}
            className={cn(
              'min-h-11 rounded-pill border px-4 text-[13px]',
              windowKey === w.key ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-secondary',
            )}
          >
            {w.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-[13px]">
          Laden fehlgeschlagen: {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="metric-cards">
        <Metric label="Ereignisse" value={summary?.total_events} />
        <Metric label="Aktive Personen" value={summary?.unique_people} hint="Konten und Sitzungen ohne Konto" />
        <Metric label="Davon angemeldet" value={summary?.signed_in_people} />
        <Metric label="Sitzungen" value={summary?.sessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Häufigste Ereignisse" subtitle="Die fünf häufigsten im Zeitraum" />
          <div className="px-4 py-3">
            <Bars rows={top.map((t) => ({ label: t.event_name, value: t.total, note: `${nf.format(t.people)} Personen` }))} />
          </div>
        </Panel>

        <RetentionPanel retention={retention} />
      </div>

      <PagesPanel pages={pages} />
      <FunnelPanel range={range} names={names} />
      <LogPanel range={range} />
      <AdminBroadcast />
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: number | undefined; hint?: string }) {
  return (
    <Panel>
      <div className="px-4 py-3">
        <p className="label-tag">{label}</p>
        <p className="readout mt-1 text-[28px] leading-none tabular-nums">{value == null ? '—' : nf.format(value)}</p>
        {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
      </div>
    </Panel>
  )
}

/** Waagrechte Balken ohne Diagrammbibliothek — die App liefert keine aus. */
function Bars({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  if (rows.length === 0) return <p className="text-[13px] text-ink-muted">Noch keine Daten im Zeitraum.</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-mono text-[12px]">{r.label}</span>
            <span className="tabular-nums">
              {nf.format(r.value)}
              {r.note && <span className="ml-2 text-[11px] text-ink-muted">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 w-full bg-surface-sunken">
            <div className="h-2 bg-accent" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function RetentionPanel({ retention }: { retention: Retention | null }) {
  const row = (label: string, returned: number, eligible: number) => (
    <li className="flex items-baseline justify-between gap-3 py-2 text-[13px]">
      <span>{label}</span>
      <span className="tabular-nums">
        {eligible === 0 ? (
          <span className="text-ink-muted">noch zu jung</span>
        ) : (
          <>
            <span className="readout text-[18px]">{pct(returned / eligible)}</span>
            <span className="ml-2 text-[11px] text-ink-muted">
              {nf.format(returned)} von {nf.format(eligible)}
            </span>
          </>
        )}
      </span>
    </li>
  )
  return (
    <Panel data-testid="retention">
      <PanelHeader
        title="Wer kommt wieder?"
        subtitle={retention ? `${nf.format(retention.cohort)} Personen zum ersten Mal im Zeitraum` : 'Neue Personen im Zeitraum'}
      />
      <div className="px-4 py-2">
        {retention == null ? (
          <p className="py-2 text-[13px] text-ink-muted">Wird geladen …</p>
        ) : (
          <ul className="divide-y divide-line">
            {row('Nach mindestens 1 Tag', retention.returned_1d, retention.eligible_1d)}
            {row('Nach mindestens 7 Tagen', retention.returned_7d, retention.eligible_7d)}
            {row('Nach mindestens 30 Tagen', retention.returned_30d, retention.eligible_30d)}
          </ul>
        )}
        <p className="mt-1 pb-2 text-[11px] leading-relaxed text-ink-muted">
          Gezählt wird nur, wer alt genug ist: Eine Person von gestern kann noch nicht nach 7 Tagen wiedergekommen sein.
        </p>
      </div>
    </Panel>
  )
}

function PagesPanel({ pages }: { pages: PageRow[] }) {
  return (
    <Panel>
      <PanelHeader title="Was die Leute hält" subtitle="Je Seite: Aufrufe, Verweildauer, und wie oft sie die letzte Seite vor dem Gehen war" />
      <div className="overflow-x-auto px-4 py-3">
        {pages.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Noch keine Seitenaufrufe im Zeitraum.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] text-ink-muted uppercase">
              <tr>
                <th className="py-1 pr-3 font-normal">Seite</th>
                <th className="py-1 pr-3 text-right font-normal">Aufrufe</th>
                <th className="py-1 pr-3 text-right font-normal">Median</th>
                <th className="py-1 pr-3 text-right font-normal">Mittel</th>
                <th className="py-1 text-right font-normal">Ausstiege</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((p) => (
                <tr key={p.path}>
                  <td className="py-1.5 pr-3 font-mono text-[12px]">{p.path}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{nf.format(p.views)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p.median_seconds == null ? '—' : `${nf.format(p.median_seconds)} s`}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p.avg_seconds == null ? '—' : `${nf.format(p.avg_seconds)} s`}</td>
                  <td className="py-1.5 text-right tabular-nums">{nf.format(p.exits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}

function FunnelPanel({ range, names }: { range: Range; names: string[] }) {
  const [steps, setSteps] = useState<string[]>(PRESET_FUNNELS[0].steps)
  const [result, setResult] = useState<FunnelStep[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState('')

  useEffect(() => {
    let alive = true
    setError(null)
    if (steps.length < 2) {
      setResult(null)
      return
    }
    fetchFunnel(steps, range)
      .then((r) => alive && setResult(r))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [steps, range])

  const view = result ? funnelView(result) : []

  return (
    <Panel data-testid="funnel">
      <PanelHeader title="Funnel" subtitle="Jeder Schritt zählt nur, wenn er nach dem vorigen kam — je Person" />
      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {PRESET_FUNNELS.map((f) => (
            <Button key={f.label} type="button" variant="outline" size="sm" onClick={() => setSteps(f.steps)}>
              {f.label}
            </Button>
          ))}
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-[12px]">
          {steps.map((s, i) => (
            <li key={`${s}-${i}`} className="flex items-center gap-1 border border-line px-2 py-1 font-mono">
              <span>
                {i + 1}. {s}
              </span>
              <button type="button" aria-label={`Schritt ${s} entfernen`} className="text-ink-muted hover:text-warning" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                ×
              </button>
            </li>
          ))}
          {steps.length < 10 && (
            <li className="flex items-center gap-1">
              <select aria-label="Schritt hinzufügen" value={adding} onChange={(e) => setAdding(e.target.value)} className="min-h-9 border border-line bg-surface-sunken px-2 text-[13px]">
                <option value="">Schritt hinzufügen …</option>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!adding}
                onClick={() => {
                  setSteps([...steps, adding])
                  setAdding('')
                }}
              >
                +
              </Button>
            </li>
          )}
        </ol>

        {error && <p role="alert" className="text-[12px] text-warning">Funnel fehlgeschlagen: {error}</p>}
        {steps.length < 2 && <p className="text-[13px] text-ink-muted">Ein Funnel braucht mindestens zwei Schritte.</p>}

        {view.length > 0 && (
          <ul className="space-y-3" data-testid="funnel-steps">
            {view.map((s, i) => (
              <li key={`${s.event_name}-${i}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-mono text-[12px]">
                    {i + 1}. {s.event_name}
                  </span>
                  <span className="tabular-nums">
                    <span className="readout text-[16px]">{nf.format(s.people)}</span>
                    <span className="ml-2 text-[11px] text-ink-muted">{pct(s.ofStart)} vom Start</span>
                    {s.fromPrevious != null && (
                      <span className="ml-2 text-[11px] text-ink-muted">
                        · {pct(s.fromPrevious)} vom vorigen, {pct(1 - s.fromPrevious)} Abfall
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-3 w-full bg-surface-sunken">
                  <div className="h-3 bg-accent" style={{ width: `${s.ofStart * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

function LogPanel({ range }: { range: Range }) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const PAGE = 50

  const load = useCallback(
    async (before: string | null, replace: boolean) => {
      setLoading(true)
      try {
        const next = await fetchLog(range, before, PAGE)
        setRows((cur) => (replace ? next : [...cur, ...next]))
        setDone(next.length < PAGE)
      } finally {
        setLoading(false)
      }
    },
    [range],
  )

  useEffect(() => {
    void load(null, true)
  }, [load])

  return (
    <Panel data-testid="event-log">
      <PanelHeader title="Ereignisprotokoll" subtitle="Die jüngsten Ereignisse, seitenweise" />
      <div className="overflow-x-auto px-4 py-3">
        {rows.length === 0 && !loading ? (
          <p className="text-[13px] text-ink-muted">Noch keine Ereignisse im Zeitraum.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead className="text-[11px] text-ink-muted uppercase">
              <tr>
                <th className="py-1 pr-3 font-normal">Zeit</th>
                <th className="py-1 pr-3 font-normal">Ereignis</th>
                <th className="py-1 pr-3 font-normal">Konto</th>
                <th className="py-1 font-normal">Eigenschaften</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{dt.format(new Date(r.created_at))}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.event_name}</td>
                  {/* Nur die ersten acht Zeichen: genug, um Ereignisse einer
                      Person zu verfolgen, nicht genug zum Abschreiben. */}
                  <td className="py-1.5 pr-3 font-mono text-ink-muted">{r.user_id ? r.user_id.slice(0, 8) : r.session_id ? `s:${r.session_id.slice(0, 8)}` : '—'}</td>
                  <td className="py-1.5 font-mono break-all text-ink-secondary">{Object.keys(r.properties ?? {}).length ? JSON.stringify(r.properties) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!done && rows.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 -ml-3" disabled={loading} onClick={() => void load(rows[rows.length - 1].created_at, false)}>
            {loading ? 'Lädt …' : 'Ältere laden'}
          </Button>
        )}
      </div>
    </Panel>
  )
}
