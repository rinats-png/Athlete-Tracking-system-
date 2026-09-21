import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { TapScale } from '@/components/ui/TapScale'
import { RangeField } from '@/components/ui/RangeField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatTile } from '@/components/ui/StatTile'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { DIARY_OPTIONAL_FIELDS, type DiaryOptionalField } from '@/lib/store/schema'
import { newId } from '@/lib/store/localStore'
import type { StoredDiarySession } from '@/lib/store/localStore'
import {
  acuteChronic,
  completeness,
  dayLoad,
  entryOn,
  loadSum,
  rollingMean,
  sessionLoad,
  toDay,
  weightTrend,
} from '@/domain/diary'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DiaryStrip } from './DiaryStrip'

const SESSION_KINDS: StoredDiarySession['kind'][] = ['strength', 'endurance', 'sport', 'mobility', 'other']

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

/**
 * Das Tagebuch — Schicht S1 (docs/ausbau.md).
 *
 * DER TÄGLICHE GRUND, DIE APP ZU ÖFFNEN. Diagnostik ist periodisch; das
 * Tagebuch ist jeden Abend. Es trägt die Zahlen, die den nächsten Testtag
 * lesbar machen: wie geschlafen, wie belastet, wie schwer.
 *
 * DREI FESTLEGUNGEN:
 *
 *   1. Der Kern ist klein. Gewicht, Schlaf, Energie, Einheiten. Alles andere
 *      schaltet man einzeln dazu («mehr erfassen») und sieht es sonst nicht.
 *      Ein Einsteiger sieht nie vierzig Felder.
 *   2. Nichts wird bewertet. Kein «gut geschlafen», keine Ampel, kein
 *      Vorschlag (§81). Die Zahlen stehen mit ihrem Verlauf da — was daraus
 *      folgt, sagt ein Mensch.
 *   3. Jedes Feld ist freiwillig, und leer heisst leer. Ein Tag ohne Eintrag
 *      ist im Diagramm schraffiert, nicht null (§89).
 *
 * Die Rolle spielt hier keine Rolle: ein Trainer sieht das Tagebuch des
 * gerade aktiven Athleten über denselben Bildschirm — die Umschaltung sitzt
 * in der Kopfzeile, nicht hier.
 */
export function DiaryScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary, saveDiaryEntry, diaryFields, setDiaryFields, role } = useAppData()
  const today = toDay(new Date())
  const [day, setDay] = useState(today)
  const entry = useMemo(() => entryOn(diary, day), [diary, day])
  const enabled = (field: DiaryOptionalField) => diaryFields.includes(field)

  // Einheit in Arbeit — steht lokal, bis sie hinzugefügt wird.
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<StoredDiarySession['kind']>('strength')
  const [durationMin, setDurationMin] = useState(60)
  const [rpe, setRpe] = useState<number | null>(null)

  const patch = (p: Parameters<typeof saveDiaryEntry>[1]) => saveDiaryEntry(day, p)

  const addSession = () => {
    if (rpe == null) return
    const session: StoredDiarySession = { id: newId(), kind, durationMin, rpe, note: '' }
    patch({ sessions: [...(entry?.sessions ?? []), session] })
    setAdding(false)
    setRpe(null)
  }
  const removeSession = (id: string) =>
    patch({ sessions: (entry?.sessions ?? []).filter((s) => s.id !== id) })

  const toggleField = (field: DiaryOptionalField) =>
    setDiaryFields(enabled(field) ? diaryFields.filter((f) => f !== field) : [...diaryFields, field])

  // Kennzahlen: beschreibend, nie bewertend.
  const weight7 = rollingMean(diary, 'weightKg', today, 7)
  const sleep7 = rollingMean(diary, 'sleepHours', today, 7)
  const load7 = loadSum(diary, today, 7)
  const trend = weightTrend(diary, today)
  const ratio = acuteChronic(diary, today)
  const full = completeness(diary, today, 14)

  return (
    <>
      <ScreenHeader
        eyebrow={t('diary.eyebrow')}
        title={t('diary.title')}
        intro={role === 'coach' ? t('diary.introCoach') : t('diary.intro')}
      />

      {/* --- Der Tag -------------------------------------------------- */}
      <Panel ticked float className="mb-4">
        <div className="flex items-center justify-between gap-2 border-b border-line px-2 py-2">
          <Button variant="ghost" size="icon" aria-label={t('diary.prevDay')} onClick={() => setDay(shift(day, -1))}>
            <ChevronLeft size={18} aria-hidden />
          </Button>
          <div className="text-center">
            <p className="font-display text-[18px] font-bold uppercase tracking-[0.06em]">
              {day === today ? t('diary.today') : day === shift(today, -1) ? t('diary.yesterday') : formatDate(`${day}T12:00:00Z`, locale)}
            </p>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className="text-[11px] text-accent-text underline-offset-2 hover:underline">
                {t('diary.backToToday')}
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('diary.nextDay')}
            disabled={day >= today}
            onClick={() => setDay(shift(day, 1))}
          >
            <ChevronRight size={18} aria-hidden />
          </Button>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <NumberField
            label={t('diary.fields.weightKg')}
            unit="kg"
            value={entry?.weightKg ?? null}
            onChange={(v) => patch({ weightKg: v })}
            min={20}
            max={400}
            step={0.1}
          />
          <NumberField
            label={t('diary.fields.sleepHours')}
            unit="h"
            value={entry?.sleepHours ?? null}
            onChange={(v) => patch({ sleepHours: v })}
            min={0}
            max={24}
            step={0.25}
          />
          <TapScale
            label={t('diary.fields.energy')}
            value={entry?.energy ?? null}
            onChange={(v) => patch({ energy: v })}
            lowLabel={t('diary.scale.low')}
            highLabel={t('diary.scale.high')}
            className="sm:col-span-2"
          />
          {enabled('sleepQuality') && (
            <TapScale
              label={t('diary.fields.sleepQuality')}
              value={entry?.sleepQuality ?? null}
              onChange={(v) => patch({ sleepQuality: v })}
              lowLabel={t('diary.scale.poor')}
              highLabel={t('diary.scale.deep')}
            />
          )}
          {enabled('stress') && (
            <TapScale
              label={t('diary.fields.stress')}
              value={entry?.stress ?? null}
              onChange={(v) => patch({ stress: v })}
              lowLabel={t('diary.scale.calm')}
              highLabel={t('diary.scale.tense')}
            />
          )}
          {enabled('soreness') && (
            <TapScale
              label={t('diary.fields.soreness')}
              value={entry?.soreness ?? null}
              onChange={(v) => patch({ soreness: v })}
              lowLabel={t('diary.scale.none')}
              highLabel={t('diary.scale.strong')}
            />
          )}
          {enabled('adherence') && (
            <TapScale
              label={t('diary.fields.adherence')}
              value={entry?.adherence ?? null}
              onChange={(v) => patch({ adherence: v })}
              lowLabel={t('diary.scale.offPlan')}
              highLabel={t('diary.scale.onPlan')}
            />
          )}
          {enabled('steps') && (
            <NumberField
              label={t('diary.fields.steps')}
              value={entry?.steps ?? null}
              onChange={(v) => patch({ steps: v == null ? null : Math.round(v) })}
              min={0}
              max={200000}
              step={100}
            />
          )}
          {enabled('note') && (
            <label className="text-[13px] sm:col-span-2">
              <span className="label-tag">{t('diary.fields.note')}</span>
              <input
                type="text"
                maxLength={500}
                aria-label={t('diary.fields.note')}
                value={entry?.note ?? ''}
                onChange={(e) => patch({ note: e.target.value })}
                className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
              />
            </label>
          )}
        </div>

        {/* --- Einheiten ----------------------------------------------- */}
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="label-tag">{t('diary.sessions.title')}</span>
            {(entry?.sessions.length ?? 0) > 0 && (
              <span className="readout text-[13px] text-ink-secondary">
                {t('diary.sessions.dayLoad', { load: formatNumber(dayLoad(entry!), locale, 0) })}
              </span>
            )}
          </div>

          {(entry?.sessions.length ?? 0) > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label={t('diary.sessions.title')}>
              {entry!.sessions.map((s) => (
                <li
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-sunken py-1 pr-1 pl-3 text-[13px]"
                >
                  <span>
                    {t(`diary.sessions.kinds.${s.kind}`)} · {s.durationMin} min · RPE {s.rpe}
                    <span className="readout ml-2 text-ink-muted">{sessionLoad(s)} AU</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`${t('diary.sessions.remove')}: ${t(`diary.sessions.kinds.${s.kind}`)} ${s.durationMin} min`}
                    onClick={() => removeSession(s.id)}
                  >
                    <Trash2 size={13} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {adding ? (
            <div className="mt-3 grid gap-4 border border-line bg-surface-sunken p-3 sm:grid-cols-2">
              <SegmentedControl
                label={t('diary.sessions.kind')}
                value={kind}
                onChange={setKind}
                options={SESSION_KINDS.map((k) => ({ value: k, label: t(`diary.sessions.kinds.${k}`) }))}
                className="sm:col-span-2 flex-wrap"
              />
              <RangeField
                label={t('diary.sessions.duration')}
                value={durationMin}
                onChange={setDurationMin}
                min={5}
                max={240}
                step={5}
                unit="min"
              />
              <TapScale
                label={t('diary.sessions.rpe')}
                value={rpe}
                onChange={setRpe}
                max={10}
                lowLabel={t('diary.scale.easy')}
                highLabel={t('diary.scale.maximal')}
              />
              <p className="text-[12px] text-ink-secondary sm:col-span-2">
                {rpe == null
                  ? t('diary.sessions.rpeHint')
                  : t('diary.sessions.loadPreview', { load: durationMin * rpe })}
              </p>
              <div className="flex gap-2 sm:col-span-2">
                <Button variant="primary" size="sm" disabled={rpe == null} onClick={addSession}>
                  <Plus size={14} aria-hidden />
                  {t('diary.sessions.add')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  {t('actions.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setAdding(true)} disabled={(entry?.sessions.length ?? 0) >= 6}>
              <Plus size={14} aria-hidden />
              {t('diary.sessions.new')}
            </Button>
          )}
        </div>

        {/* --- Mehr erfassen ------------------------------------------- */}
        <div className="border-t border-line px-4 py-3">
          <span className="label-tag">{t('diary.more.title')}</span>
          <p className="mt-1 text-[12px] text-ink-secondary">{t('diary.more.why')}</p>
          <Button asChild variant="ghost" size="sm" className="mt-1 -ml-3">
            <Link to="/training">
              {t('diary.sessions.toTraining')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('diary.more.title')}>
            {DIARY_OPTIONAL_FIELDS.map((field) => (
              <button
                key={field}
                type="button"
                aria-pressed={enabled(field)}
                onClick={() => toggleField(field)}
                className={cn(
                  'min-h-11 rounded-pill border px-3 font-display text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors',
                  enabled(field) ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                {t(`diary.fields.${field}`)}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* --- Vierzehn Tage ------------------------------------------- */}
      <Panel className="mb-4">
        <PanelHeader title={t('diary.strip.title')} subtitle={t('diary.strip.why')} />
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          {(['weightKg', 'sleepHours', 'energy', 'load'] as const).map((metric) => (
            <div key={metric}>
              <span className="label-tag">{t(`diary.metrics.${metric}`)}</span>
              <div className="mt-1">
                <DiaryStrip entries={diary} endDay={today} metric={metric} locale={locale} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* --- Kennzahlen ------------------------------------------------ */}
      <Panel>
        <PanelHeader title={t('diary.stats.title')} subtitle={t('diary.stats.why')} />
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <StatTile
            label={t('diary.stats.weight7')}
            value={formatNumber(weight7.mean, locale, 1)}
            unit="kg"
            meta={weight7.n > 0 ? t('diary.stats.onDays', { n: weight7.n }) : t('diary.stats.noData')}
          />
          <StatTile
            label={t('diary.stats.trend')}
            value={trend == null ? '—' : `${trend > 0 ? '+' : ''}${formatNumber(trend, locale, 1)}`}
            unit={trend == null ? undefined : 'kg'}
            meta={trend == null ? t('diary.stats.trendNeeds') : t('diary.stats.trendMeta')}
          />
          <StatTile
            label={t('diary.stats.sleep7')}
            value={formatNumber(sleep7.mean, locale, 1)}
            unit="h"
            meta={sleep7.n > 0 ? t('diary.stats.onDays', { n: sleep7.n }) : t('diary.stats.noData')}
          />
          <StatTile
            label={t('diary.stats.load7')}
            value={formatNumber(load7, locale, 0)}
            unit="AU"
            meta={
              ratio == null
                ? t('diary.stats.ratioNeeds')
                : t('diary.stats.ratio', { ratio: formatNumber(ratio, locale, 2) })
            }
          />
        </div>
        <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          {t('diary.stats.completeness', { pct: Math.round(full * 100) })} · {t('diary.stats.noJudgement')}
        </p>
        <div className="border-t border-line px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/cockpit">
              {t('cockpit.title')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Button>
        </div>
      </Panel>
    </>
  )
}
