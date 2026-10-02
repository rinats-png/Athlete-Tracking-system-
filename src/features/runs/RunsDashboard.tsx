import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { computeRunMetrics, raceOutlook, shiftDay, weekStart, zoneBounds, type RaceKey, type RunMetrics } from '@/domain/runMetrics'
import { findFinding, findInsights, type Insight } from '@/domain/runFinding'
import { formatDate, formatNumber } from '@/lib/format'
import type { StoredActivity } from '@/lib/store/localStore'
import type { AppLocale } from '@/i18n/locales'

const pace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
/** «1:40:00», «45:00» oder «45» (Minuten) → Sekunden. */
function readTarget(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const parts = t.split(':').map(Number)
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 60
}

const weekdayNames = (locale: AppLocale) => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i))))
const monthName = (locale: AppLocale, ym: string) => new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(`${ym}-15T00:00:00Z`))

/** Die Läufe-Auswertung: Form, Jahr, Woche, Prognosen, Tempo bei Puls, Intensität, Gewohnheit, Rekorde, Material. */
export function RunsDashboard({ activities }: { activities: StoredActivity[] }) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const m = useMemo(() => computeRunMetrics(activities, { restHr: data.profile.restingHr ?? null }), [activities, data.profile.restingHr])
  if (!m || m.totals.runs === 0) return null
  return (
    <div data-testid="runs-dashboard">
      <FindingPanel m={m} />
      <FormPanel m={m} />
      <YearPanel m={m} activities={activities} />
      <WeekPanel m={m} />
      <PredictionPanel m={m} />
      <PaceHrPanel m={m} />
      <InsightsGrid m={m} />
      <IntensityPanel m={m} />
      <HabitPanel m={m} />
      <RecordsPanel m={m} />
      <ShoesPanel m={m} />
      <DataPanel m={m} />
      <p className="mb-6 text-[11px] leading-relaxed text-ink-muted">{t('runs.dash.sourceNote')}</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="label-tag">{children}</span>
}

// --- Befund ------------------------------------------------------------------------

function FindingPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const f = findFinding(m)
  return (
    <Panel float className="mb-4" data-testid="runs-finding" data-kind={f.kind}>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-pill bg-accent-quiet px-3 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">{t('runs.dash.finding')}</span>
          <span className="rounded-pill border border-line px-3 py-0.5 text-[11px] text-ink-secondary">{t(`runs.dash.basis.${f.basis}`)}</span>
        </div>
        <h2 className="mt-3 font-display text-[28px] font-bold uppercase leading-[1.02] tracking-[0.02em]">
          {t(`runs.finding.${f.kind}.lead`)} <span className="whitespace-nowrap text-accent-text">{t(`runs.finding.${f.kind}.accent`)}</span>
        </h2>
        <p className="mt-2 text-[14px] text-ink-secondary">{t(`runs.finding.${f.kind}.text`, f.params)}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 px-4 pb-4">
        {f.numbers.map((n) => (
          <div key={n.key} className="rounded-md bg-surface-sunken px-3 py-2.5">
            <p className="readout text-[20px] font-light">
              {formatNumber(n.value, locale, Number.isInteger(n.value) ? 0 : 1)}
              {n.unit ? <span className="ml-1 text-[11px] text-ink-muted">{n.unit}</span> : null}
            </p>
            <p className="text-[11px] text-ink-muted">{t(`runs.finding.num.${n.key}`)}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('runs.dash.findingNote')}</p>
    </Panel>
  )
}

// --- Form ---------------------------------------------------------------------------

function FormPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [months, setMonths] = useState<'3' | '6' | '12'>('6')
  if (!m.series || !m.form) return null
  const s = m.series
  const take = Math.min(s.days.length, Number(months) * 30)
  const from = s.days.length - take
  const fit = s.fitness.slice(from)
  const fat = s.fatigue.slice(from)
  const all = [...fit, ...fat]
  const hi = Math.max(...all) * 1.08
  const lo = Math.min(...all) * 0.9
  const X = (i: number) => 8 + (i * 344) / Math.max(1, take - 1)
  const Y = (v: number) => 118 - ((v - lo) / Math.max(1e-6, hi - lo)) * 104
  const line = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const scalePos = Math.max(0, Math.min(1, (m.form.value + 40) / 70))
  const word = m.form.word
  const wordIdx = ['very_loaded', 'building', 'balanced', 'fresh', 'very_fresh'].indexOf(word)
  const sign = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(n)), locale, 0)}`
  return (
    <Panel className="mb-4" data-testid="runs-form">
      <PanelHeader title={t('runs.dash.form.title')} subtitle={t('runs.dash.form.sub')} />
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="readout text-[44px] font-light leading-none">{sign(m.form.value)}</p>
          <span className="rounded-pill bg-accent-quiet px-3 py-1 font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-text">{t(`runs.dash.form.words.${word}`)}</span>
        </div>
        <div className="relative mt-4" aria-hidden>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={`h-2 flex-1 rounded-pill ${i === wordIdx ? 'bg-accent' : 'bg-surface-sunken'}`} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-muted" aria-hidden>
          <span>{t('runs.dash.form.loaded')}</span>
          <span>{t('runs.dash.form.fresh')}</span>
        </div>
        <span className="sr-only">{scalePos}</span>
        <div className="mt-3 flex justify-end">
          <SegmentedControl label={t('runs.dash.period')} value={months} onChange={setMonths} options={[{ value: '3', label: '3M' }, { value: '6', label: '6M' }, { value: '12', label: '12M' }]} />
        </div>
        <svg viewBox="0 0 360 128" width="100%" role="img" aria-label={t('runs.dash.form.chartAlt', { fitness: Math.round(m.form.fitness), fatigue: Math.round(m.form.fatigue) })} className="mt-2">
          <defs>
            <linearGradient id="runs-fit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity=".26" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line(fit)} L${X(take - 1)} 122 L${X(0)} 122Z`} fill="url(#runs-fit)" />
          <path d={line(fat)} fill="none" stroke="var(--ink-muted)" strokeOpacity=".55" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={line(fit)} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={X(take - 1)} cy={Y(fit[take - 1])} r="4.5" fill="var(--accent)" stroke="var(--plane)" strokeWidth="2" />
        </svg>
        <div className="mt-2 flex gap-4 text-[11px] text-ink-muted">
          <span><i className="mr-1 inline-block h-[3px] w-4 rounded bg-accent align-middle" />{t('runs.dash.form.fitness')}</span>
          <span><i className="mr-1 inline-block h-[2px] w-4 rounded bg-ink-muted align-middle" />{t('runs.dash.form.fatigue')}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['runs.dash.form.fitness', formatNumber(m.form.fitness, locale, 0)],
            ['runs.dash.form.fatigue', formatNumber(m.form.fatigue, locale, 0)],
            ['runs.dash.form.ramp', m.ramp != null ? sign(m.ramp) : '–'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-surface-sunken px-3 py-2.5">
              <p className="readout text-[20px] font-light">{v}</p>
              <p className="text-[11px] text-ink-muted">{t(k)}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">
        {t('runs.dash.form.note')} {m.estimatedLoadCount > 0 && t('runs.dash.form.estimated', { n: m.estimatedLoadCount })}
      </p>
    </Panel>
  )
}

// --- Jahr (Skyline) ------------------------------------------------------------------

function YearPanel({ m, activities }: { m: RunMetrics; activities: StoredActivity[] }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const cur = weekStart(m.today)
  const first = shiftDay(cur, -52 * 7)
  const { shapes, box, top } = useMemo(() => {
    const byDay = new Map<string, number>()
    const active = new Set<string>()
    for (const a of activities) {
      if (a.day < first) continue
      active.add(a.day)
      if (a.sport === 'run' || a.sport === 'trail') byDay.set(a.day, (byDay.get(a.day) ?? 0) + (a.distanceM ?? 0) / 1000)
    }
    let max = 0
    let topDay = ''
    for (const [d, v] of byDay) if (v > max) ((max = v), (topDay = d))
    const cells: { u: number; v: number; k: number; day: string }[] = []
    for (let u = 0; u < 53; u++)
      for (let w = 0; w < 7; w++) {
        const day = shiftDay(first, u * 7 + w)
        if (day > m.today) continue
        cells.push({ u, v: 6 - w, k: byDay.get(day) ?? 0, day })
      }
    cells.sort((a, b) => a.v - 0.61 * a.u - (b.v - 0.61 * b.u))
    const P = (u: number, v: number, h: number): [number, number] => [8.2 * u + 5 * v, -1.8 * u + 3.1 * v - h]
    const pts: [number, number][] = []
    const out = cells.map((c) => {
      const h = c.k > 0 ? Math.max(2.5, (c.k / max) * 60) : 1
      const a = P(c.u + 0.17, c.v + 0.17, h), b = P(c.u + 0.83, c.v + 0.17, h), d = P(c.u + 0.83, c.v + 0.83, h), e = P(c.u + 0.17, c.v + 0.83, h)
      const a0 = P(c.u + 0.17, c.v + 0.17, 0), e0 = P(c.u + 0.17, c.v + 0.83, 0), d0 = P(c.u + 0.83, c.v + 0.83, 0)
      pts.push(a, b, d, e, a0, d0)
      return { ...c, a, b, d, e, a0, e0, d0, isTop: c.day === topDay && max > 0, act: active.has(c.day) }
    })
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    const x0 = Math.min(...xs), y0 = Math.min(...ys)
    return { shapes: out, box: `${x0 - 4} ${y0 - 4} ${Math.max(...xs) - x0 + 8} ${Math.max(...ys) - y0 + 8}`, top: topDay ? { day: topDay, km: max } : null }
  }, [activities, first, m.today])
  const f = (n: [number, number][] | [number, number]) => (Array.isArray(n[0]) ? (n as [number, number][]).map((p) => p.join(',')).join(' ') : (n as [number, number]).join(','))
  return (
    <Panel className="mb-4" data-testid="runs-year">
      <PanelHeader title={t('runs.dash.year.title')} subtitle={t('runs.dash.year.sub')} />
      <div className="px-4 py-3">
        <p className="readout text-[44px] font-light leading-none">
          {formatNumber(m.totals.runKm, locale, 0)} <span className="text-[14px] text-ink-muted">km</span>
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          <div><b className="readout text-[16px] font-normal">{formatNumber(m.totals.runs, locale, 0)}</b><br />{t('runs.dash.year.runs')}</div>
          <div><b className="readout text-[16px] font-normal">{formatNumber(m.totals.hours, locale, 0)}</b><br />{t('runs.dash.year.hours')}</div>
          <div><b className="readout text-[16px] font-normal">{formatNumber(m.totals.elevM, locale, 0)}</b><br />{t('runs.dash.year.elev')}</div>
        </div>
        <svg viewBox={box} width="100%" role="img" aria-label={t('runs.dash.year.alt', { km: formatNumber(m.totals.runKm, locale, 0) })} className="mt-3">
          {shapes.map((c) =>
            c.k === 0 ? (
              <polygon key={c.day} points={f([c.a, c.b, c.d, c.e])} fill="var(--line-strong)" opacity={c.act ? 0.5 : 0.22} />
            ) : (
              <g key={c.day}>
                <polygon points={f([c.a0, c.a, c.e, c.e0])} fill="color-mix(in oklab, var(--accent) 55%, var(--plane))" />
                <polygon points={f([c.e0, c.e, c.d, c.d0])} fill="color-mix(in oklab, var(--accent) 35%, var(--plane))" />
                <polygon points={f([c.a, c.b, c.d, c.e])} fill="var(--accent-glow)" stroke={c.isTop ? 'var(--ink)' : 'none'} strokeWidth="1" />
              </g>
            ),
          )}
        </svg>
        {top && <p className="text-[12px] text-ink-muted">{t('runs.dash.year.biggest', { km: formatNumber(top.km, locale, 1), date: formatDate(`${top.day}T12:00:00Z`, locale) })}</p>}
      </div>
    </Panel>
  )
}

// --- Woche, Ringe ---------------------------------------------------------------------

function Ring({ r, value, color, w = 12 }: { r: number; value: number; color: string; w?: number }) {
  const c = 2 * Math.PI * r
  return (
    <>
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={w} />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(1, value)) * c} ${c}`} transform="rotate(-90 70 70)" />
    </>
  )
}

function WeekPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [weeks, setWeeks] = useState<'12' | '26' | '52'>('12')
  const rows = m.weeks.slice(-Number(weeks) - 1)
  const cur = m.weeks[m.weeks.length - 1]
  const goal = m.weeklyGoal
  const max = Math.max(...rows.map((r) => r.km), goal ?? 0, 1)
  const bw = Math.min(24, 330 / rows.length - 3)
  const step = 340 / rows.length
  const weekPct = goal ? cur.km / goal : 0
  const consistPct = m.consistency.hitsLastSix / 6
  return (
    <Panel className="mb-4" data-testid="runs-week">
      <PanelHeader title={t('runs.dash.week.title')} subtitle={goal ? t('runs.dash.week.sub') : t('runs.dash.week.noGoal')} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 140 140" width="132" role="img" aria-label={t('runs.dash.week.ringsAlt', { week: Math.round(weekPct * 100), hits: m.consistency.hitsLastSix })}>
            <Ring r={58} value={weekPct} color="var(--accent)" />
            <Ring r={42} value={consistPct} color="var(--accent-glow)" />
          </svg>
          <div className="flex-1 text-[13px]">
            <div className="flex justify-between"><span>{t('runs.dash.week.ringWeek')}</span><b className="readout font-normal">{goal ? `${Math.round(weekPct * 100)} %` : '–'}</b></div>
            <div className="flex justify-between"><span>{t('runs.dash.week.ringConsistency')}</span><b className="readout font-normal">{m.consistency.hitsLastSix}/6</b></div>
            {goal && <p className="mt-2 text-[11px] text-ink-muted">{t('runs.dash.week.derived')}</p>}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <SegmentedControl label={t('runs.dash.period')} value={weeks} onChange={setWeeks} options={[{ value: '12', label: t('runs.dash.week.w12') }, { value: '26', label: t('runs.dash.week.w26') }, { value: '52', label: t('runs.dash.week.w52') }]} />
        </div>
        <svg viewBox="0 0 360 110" width="100%" role="img" aria-label={t('runs.dash.week.barsAlt', { km: Math.round(cur.km) })} className="mt-2">
          {rows.map((r, i) => {
            const h = (r.km / max) * 80
            const x = 10 + i * step + (step - bw) / 2
            const isJump = m.jump?.start === r.start
            return (
              <g key={r.start}>
                <rect x={x} y={92 - h} width={bw} height={Math.max(h, 1)} rx="4" fill={r.closed ? (isJump ? 'var(--accent)' : 'var(--line-strong)') : 'var(--accent-quiet)'} stroke={r.closed ? 'none' : 'var(--accent)'} strokeDasharray={r.closed ? undefined : '3 3'} />
                {isJump && <text x={x + bw / 2} y={86 - h} textAnchor="middle" fontSize="9" fill="var(--accent-text)">+{m.jump!.pct} %</text>}
              </g>
            )
          })}
          {goal && <line x1="6" x2="354" y1={92 - (goal / max) * 80} y2={92 - (goal / max) * 80} stroke="var(--accent)" strokeWidth="1.2" />}
        </svg>
        {goal && <p className="text-[11px] text-ink-muted">{t('runs.dash.week.goalLine', { km: formatNumber(goal, locale, 0) })}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['runs.dash.week.streak', m.consistency.currentStreak],
            ['runs.dash.week.longest', m.consistency.longestStreak],
            ['runs.dash.week.active', m.consistency.activeDays],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-md bg-surface-sunken px-3 py-2.5">
              <p className="readout text-[20px] font-light">{v}</p>
              <p className="text-[11px] text-ink-muted">{t(k as string)}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// --- Prognosen ---------------------------------------------------------------------------

function PredictionPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [key, setKey] = useState<RaceKey>('half')
  const [text, setText] = useState('')
  const p = m.predictions
  if (!p) return null
  const sel = p.list.find((x) => x.key === key)!
  const target = readTarget(text)
  const names: Record<RaceKey, string> = { '5k': '5 km', '10k': '10 km', half: t('runs.dash.pred.half'), marathon: t('runs.dash.pred.marathon') }
  return (
    <Panel className="mb-4" data-testid="runs-pred">
      <PanelHeader title={t('runs.dash.pred.title')} subtitle={t('runs.dash.pred.sub', { vdot: formatNumber(p.vdot.vdot, locale, 1), km: formatNumber(p.vdot.distanceM / 1000, locale, 1), date: formatDate(`${p.vdot.day}T12:00:00Z`, locale) })} />
      <div className="px-4 pb-3">
        {p.list.map((x) => (
          <div key={x.key} className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0" data-testid={`pred-${x.key}`}>
            <span>{names[x.key]}</span>
            <b className="readout text-[20px] font-light">{clock(x.low)}{x.low !== x.high ? `–${clock(x.high)}` : ''}</b>
          </div>
        ))}
        {m.easyPace && <p className="mt-1 text-[12px] text-ink-secondary">{t('runs.dash.pred.easy', { fast: pace(m.easyPace.fast), slow: pace(m.easyPace.slow) })}</p>}
      </div>
      <div className="border-t border-line px-4 py-3">
        <Label>{t('runs.dash.pred.target')}</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SegmentedControl label={t('runs.dash.pred.target')} value={key} onChange={setKey} options={p.list.map((x) => ({ value: x.key, label: names[x.key] }))} />
          <input
            inputMode="numeric"
            placeholder="h:mm:ss"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('runs.dash.pred.target')}
            data-testid="pred-target"
            className="h-11 w-28 rounded-md border border-line bg-surface-sunken px-3 font-mono text-[15px]"
          />
        </div>
        {target != null && (
          <p className="mt-2 text-[13px]" data-testid="pred-outlook">
            <span className="rounded-pill bg-accent-quiet px-2.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">{t(`runs.dash.pred.outlook.${raceOutlook(target, sel)}`)}</span>{' '}
            {t('runs.dash.pred.outlookText', { target: clock(target), low: clock(sel.low), high: clock(sel.high) })}
          </p>
        )}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('runs.dash.pred.note')}</p>
    </Panel>
  )
}

// --- Tempo bei gleichem Puls ----------------------------------------------------------------

function PaceHrPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const pa = m.paceAtHr
  if (!pa || pa.monthly.length < 2) return null
  const vals = pa.monthly.map((x) => x.paceSPerKm)
  const lo = Math.min(...vals) - 4
  const hi = Math.max(...vals) + 4
  const X = (i: number) => 24 + (i * 312) / Math.max(1, vals.length - 1)
  const Y = (v: number) => 14 + ((v - lo) / (hi - lo)) * 76 // schneller = oben
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' ')
  const delta = pa.deltaSPerKm
  return (
    <Panel className="mb-4" data-testid="runs-pacehr">
      <PanelHeader title={t('runs.dash.pace.title')} subtitle={t('runs.dash.pace.sub', { lo: pa.bandLo, hi: pa.bandHi, n: pa.runsInBand })} />
      <div className="px-4 py-3">
        {delta != null && pa.firstQuarter != null && pa.lastQuarter != null && (
          <div className="flex items-center gap-4">
            <p className="readout text-[40px] font-light leading-none">
              {delta < 0 ? '−' : '+'}{formatNumber(Math.abs(delta), locale, 0)}<span className="text-[13px] text-ink-muted"> s/km</span>
            </p>
            <p className="text-[13px] text-ink-secondary">{t('runs.dash.pace.text', { first: pace(pa.firstQuarter), last: pace(pa.lastQuarter) })}</p>
          </div>
        )}
        <svg viewBox="0 0 360 110" width="100%" role="img" aria-label={t('runs.dash.pace.alt', { n: vals.length })} className="mt-2">
          <text x="2" y="9" fontSize="9" fill="var(--ink-muted)">{t('runs.dash.pace.axis')}</text>
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => (
            <circle key={pa.monthly[i].month} cx={X(i)} cy={Y(v)} r={i === vals.length - 1 ? 5 : 4} fill={i === vals.length - 1 ? 'var(--accent)' : 'var(--plane)'} stroke="var(--accent)" strokeWidth="2" />
          ))}
          <text x={X(0)} y="106" fontSize="9" fill="var(--ink-muted)" textAnchor="middle">{monthName(locale, pa.monthly[0].month)}</text>
          <text x={X(vals.length - 1)} y="106" fontSize="9" fill="var(--ink-muted)" textAnchor="middle">{monthName(locale, pa.monthly[vals.length - 1].month)}</text>
        </svg>
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('runs.dash.pace.note', { n: pa.excluded })}</p>
    </Panel>
  )
}

// --- Insights ----------------------------------------------------------------------------------

function InsightsGrid({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const list = findInsights(m)
  const show = (i: Insight) => (i.value.type === 'number' ? formatNumber(i.value.n, locale, i.value.digits) : i.value.type === 'seconds' ? clock(i.value.s) : i.value.text)
  const days = weekdayNames(locale)
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2" data-testid="runs-insights">
      {list.map((i) => (
        <Panel key={i.key} float data-testid={`insight-${i.key}`}>
          <div className="flex items-start justify-between gap-2 px-4 pt-4">
            <span className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-ink-secondary">{t(`runs.dash.basis.${i.basis}`)}</span>
            <p className="readout text-[28px] font-light leading-none">
              {show(i)}
              {i.unit && <span className="ml-1 text-[12px] text-ink-muted">{i.unit === 'percent' ? '%' : i.unit === 'vdot' ? 'VDOT' : 'km'}</span>}
            </p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <h3 className="font-display text-[16px] font-bold uppercase tracking-[0.04em]">{t(`runs.insight.${i.key}.title`)}</h3>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {t(`runs.insight.${i.key}.text`, {
                ...i.params,
                low: i.params.low != null ? clock(Number(i.params.low)) : '',
                high: i.params.high != null ? clock(Number(i.params.high)) : '',
                weekday: days[Number(i.params.weekday ?? 0)],
                hour: String(i.params.hour ?? 0).padStart(2, '0'),
              })}
            </p>
          </div>
        </Panel>
      ))}
    </div>
  )
}

// --- Intensität ---------------------------------------------------------------------------------

function IntensityPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const i = m.intensity
  if (!m.threshold || i.easyShare == null) return null
  const total = i.zoneMinutes.reduce((a, b) => a + b, 0)
  const b = zoneBounds(m.threshold.hr)
  const ranges = [`< ${b[0]}`, `${b[0]}–${b[1] - 1}`, `${b[1]}–${b[2] - 1}`, `${b[2]}–${b[3] - 1}`, `≥ ${b[3]}`]
  const shades = ['var(--line-strong)', 'color-mix(in oklab, var(--accent) 30%, var(--plane))', 'color-mix(in oklab, var(--accent) 55%, var(--plane))', 'color-mix(in oklab, var(--accent) 80%, var(--plane))', 'var(--accent)']
  return (
    <Panel className="mb-4" data-testid="runs-intensity">
      <PanelHeader title={t('runs.dash.int.title')} subtitle={t('runs.dash.int.sub')} />
      <div className="px-4 py-3">
        <p className="readout text-[40px] font-light leading-none">
          {formatNumber(i.easyShare * 100, locale, 0)} <span className="text-[14px] text-ink-muted">% {t('runs.dash.int.easy')}</span>
        </p>
        <div className="mt-3 flex h-8 gap-0.5 overflow-hidden rounded-md" role="img" aria-label={t('runs.dash.int.alt', { easy: Math.round(i.easyShare * 100) })}>
          {i.zoneMinutes.map((z, k) => (z > 0 ? <i key={k} style={{ width: `${(z / total) * 100}%`, background: shades[k] }} /> : null))}
        </div>
        <ul className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-ink-muted">
          {i.zoneMinutes.map((z, k) => (
            <li key={k}>
              <b className="block text-ink">Z{k + 1}</b>
              {ranges[k]}
              <br />
              {formatNumber((z / total) * 100, locale, 0)} %
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-surface-sunken px-3 py-2.5" data-testid="int-easy-above">
            <p className="readout text-[18px] font-light">{i.easyAboveZ3} {t('runs.dash.int.of')} {i.easyRuns12w.length}</p>
            <p className="text-[11px] text-ink-muted">{t('runs.dash.int.easyAbove')}</p>
          </div>
          <div className="rounded-md bg-surface-sunken px-3 py-2.5">
            <p className="readout text-[18px] font-light">{i.hardAtOrAboveThreshold} {t('runs.dash.int.of')} {i.hardSessions12w}</p>
            <p className="text-[11px] text-ink-muted">{t('runs.dash.int.hardAbove')}</p>
          </div>
          <div className="rounded-md bg-surface-sunken px-3 py-2.5">
            <p className="readout text-[18px] font-light">{i.hardBackToBack}</p>
            <p className="text-[11px] text-ink-muted">{t('runs.dash.int.backToBack')}</p>
          </div>
        </div>
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('runs.dash.int.note')}</p>
    </Panel>
  )
}

// --- Gewohnheit ----------------------------------------------------------------------------------

function HabitPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const h = m.habit
  if (h.before9Share == null || !h.mostCommon) return null
  const days = weekdayNames(locale)
  const max = h.mostCommon.runs
  return (
    <Panel className="mb-4" data-testid="runs-habit">
      <PanelHeader title={t('runs.dash.habit.title')} subtitle={t('runs.dash.habit.sub', { day: days[h.mostCommon.weekday], hour: String(h.mostCommon.hour).padStart(2, '0') })} />
      <div className="px-4 py-3">
        <p className="readout text-[40px] font-light leading-none">
          {formatNumber(h.before9Share * 100, locale, 0)} <span className="text-[14px] text-ink-muted">% {t('runs.dash.habit.before9')}</span>
        </p>
        <svg viewBox="0 0 360 130" width="100%" role="img" aria-label={t('runs.dash.habit.alt')} className="mt-3">
          {h.grid.map((row, w) => (
            <g key={w}>
              <text x="0" y={w * 17 + 12} fontSize="9" fill="var(--ink-muted)">{days[w]}</text>
              {row.map((c, hr) => {
                const top = c === max
                return c > 0 ? <circle key={hr} cx={34 + hr * 13.5} cy={w * 17 + 8} r={2 + (c / max) * 5.5} fill="var(--accent)" fillOpacity={top ? 1 : 0.35 + 0.5 * (c / max)} stroke={top ? 'var(--plane)' : 'none'} strokeWidth="1.5" /> : <circle key={hr} cx={34 + hr * 13.5} cy={w * 17 + 8} r="1.2" fill="var(--line-strong)" />
              })}
            </g>
          ))}
          {[0, 6, 12, 18, 23].map((hr) => (
            <text key={hr} x={34 + hr * 13.5} y="127" fontSize="9" fill="var(--ink-muted)" textAnchor="middle">{hr}</text>
          ))}
        </svg>
      </div>
    </Panel>
  )
}

// --- Rekorde, Material, Daten -----------------------------------------------------------------------

function RecordsPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const r = m.records
  const d = (day: string) => formatDate(`${day}T12:00:00Z`, locale)
  const items: [string, string, string][] = []
  if (r.best5k) items.push(['5 km', clock(r.best5k.s), d(r.best5k.day)])
  if (r.best10k) items.push(['10 km', clock(r.best10k.s), d(r.best10k.day)])
  if (r.bestHalf) items.push([t('runs.dash.pred.half'), clock(r.bestHalf.s), d(r.bestHalf.day)])
  if (r.longestRunKm) items.push([t('runs.dash.rec.longest'), `${formatNumber(r.longestRunKm.km, locale, 1)} km`, d(r.longestRunKm.day)])
  if (r.biggestWeek) items.push([t('runs.dash.rec.week'), `${formatNumber(r.biggestWeek.km, locale, 0)} km`, d(r.biggestWeek.start)])
  if (r.mostElevation) items.push([t('runs.dash.rec.elev'), `${formatNumber(r.mostElevation.m, locale, 0)} m`, d(r.mostElevation.day)])
  if (r.earliestHour) items.push([t('runs.dash.rec.early'), `${String(r.earliestHour.hour).padStart(2, '0')}:00`, d(r.earliestHour.day)])
  if (r.bestMonth) items.push([t('runs.dash.rec.month'), `${formatNumber(r.bestMonth.km, locale, 0)} km`, monthName(locale, r.bestMonth.month)])
  if (items.length === 0) return null
  return (
    <Panel className="mb-4" data-testid="runs-records">
      <PanelHeader title={t('runs.dash.rec.title')} />
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {items.map(([k, v, day]) => (
          <div key={k} className="rounded-md bg-surface-sunken px-3 py-2.5">
            <p className="label-tag">{k}</p>
            <p className="readout text-[20px] font-light">{v}</p>
            <p className="text-[11px] text-ink-muted">{day}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function ShoesPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (m.shoes.length === 0) return null
  return (
    <Panel className="mb-4" data-testid="runs-shoes">
      <PanelHeader title={t('runs.dash.shoes.title')} subtitle={t('runs.dash.shoes.sub')} />
      <ul className="px-4 pb-4">
        {m.shoes.map((s) => (
          <li key={s.name} className="border-t border-line py-2.5 first:border-t-0">
            <div className="flex justify-between text-[13px]"><span>{s.name}</span><b className="readout font-normal">{formatNumber(s.km, locale, 0)} km</b></div>
            <div className="relative mt-1.5 h-2 rounded-pill bg-surface-sunken" aria-hidden>
              <i className="absolute inset-y-0 left-0 rounded-pill" style={{ width: `${Math.min(100, (s.km / 800) * 100)}%`, background: s.km >= 600 ? 'var(--warning)' : 'var(--accent)' }} />
              <i className="absolute inset-y-[-2px] w-[2px] bg-ink-muted" style={{ left: `${(700 / 800) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function DataPanel({ m }: { m: RunMetrics }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const rows: [string, string][] = [
    [t('runs.dash.data.maxHr'), m.maxHr != null ? `${m.maxHr} bpm` : t('runs.dash.data.none')],
    [t('runs.dash.data.restHr'), `${m.restHr} bpm${m.restHrAssumed ? ` · ${t('runs.dash.data.assumed')}` : ''}`],
    [t('runs.dash.data.thr'), m.threshold ? `${m.threshold.hr} bpm · ${formatDate(`${m.threshold.day}T12:00:00Z`, locale)}, ${formatNumber(m.threshold.km, locale, 1)} km` : t('runs.dash.data.none')],
    [t('runs.dash.data.noHr'), formatNumber(m.estimatedLoadCount, locale, 0)],
  ]
  return (
    <Panel className="mb-4" data-testid="runs-data">
      <PanelHeader title={t('runs.dash.data.title')} />
      <dl className="px-4 pb-3 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-line py-2 first:border-t-0">
            <dt className="text-ink-secondary">{k}</dt>
            <dd className="readout text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('runs.dash.data.formula')}</p>
    </Panel>
  )
}
