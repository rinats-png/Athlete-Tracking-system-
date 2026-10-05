import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { DayChips } from '@/features/plan/DayChips'
import { blockText } from '@/features/plan/planText'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { planMode } from '@/domain/planMode'
import { familyOfDiscipline } from '@/domain/trainingPlan'
import { fitTemplate } from '@/domain/planFit'
import { TRAINING_RULES } from '@/data/trainingRules'
import { EQUIPMENT, PLAN_TEMPLATES, templateById, type Equipment, type PlanTemplate } from '@/data/planTemplates'
import { cn } from '@/lib/utils'

/**
 * Planbibliothek, Plan-Detail und «Plan anpassen» (Trainingsbereich Etappe 2).
 *
 * Alle Vorlagen sind ungeprüft und erscheinen nur hinter dem Vorschauschalter.
 * Jede Einheit zeigt, ob ihre Dosis aus einer Regel stammt oder offen ist.
 */
const GOALS = ['all', 'base', 'strength', 'power', 'event'] as const
const today = () => new Date().toISOString().slice(0, 10)

function Off() {
  const { t } = useTranslation()
  return <EmptyState title={t('plan.title')} body={t('plan.off')} />
}

const Chip = ({ children, tone = 'quiet' }: { children: React.ReactNode; tone?: 'quiet' | 'accent' }) => (
  <span className={cn('inline-flex min-h-6 items-center rounded-pill border px-2.5 text-[11px]', tone === 'accent' ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line text-ink-secondary')}>{children}</span>
)

/** Wochenspanne einer Einheit als Text: «Woche 3–6» oder leer, wenn sie den ganzen Block gilt. */
function WeeksText({ from, to, weeks }: { from: number; to: number | null; weeks: number }) {
  const { t } = useTranslation()
  const end = to ?? weeks
  if (from === 1 && end === weeks) return null
  return <>{from === end ? t('tpl.week', { n: from }) : t('tpl.weeks', { from, to: end })}</>
}

export function PlanLibraryScreen() {
  const { t } = useTranslation()
  const { data } = useAppData()
  const [goal, setGoal] = useState<(typeof GOALS)[number]>('all')
  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <Off />
  const family = familyOfDiscipline(data.profile.disciplineId)
  const list = PLAN_TEMPLATES.filter((x) => (!family || x.family === family) && (goal === 'all' || x.goal === goal))
  return (
    <div data-testid="plan-library">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('tpl.libraryTitle')} intro={t(family ? 'tpl.libraryIntro' : 'tpl.libraryIntroAll')} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('tpl.goalLabel')}>
        {GOALS.map((g) => (
          <button key={g} type="button" aria-pressed={goal === g} data-testid={`tpl-goal-${g}`} onClick={() => setGoal(g)} className={cn('min-h-11 rounded-pill border px-4 text-[13px]', goal === g ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
            {t(`tpl.goal.${g}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-[14px] text-ink-secondary" data-testid="tpl-none">{t('tpl.none')}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((x) => (
            <li key={x.id}>
              <Link to={`/plan/vorlagen/${x.id}`} data-testid={`tpl-card-${x.id}`} className="block rounded-lg border border-line bg-surface-raised p-4">
                <p className="font-display text-[17px] font-bold">{t(`tpl.t.${x.id}.name`)}</p>
                <p className="mt-1 text-[13px] text-ink-secondary">{t(`tpl.t.${x.id}.sum`)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip tone="accent">{t('tpl.unreviewed')}</Chip>
                  <Chip>{t('tpl.weeksTotal', { n: x.weeks })}</Chip>
                  <Chip>{t(`plan.phase.${x.phase}`)}</Chip>
                  <Chip>{t(`tpl.family.${x.family}`)}</Chip>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[12px] text-ink-muted">{t('tpl.note')}</p>
    </div>
  )
}

function SlotRow({ tpl, slot }: { tpl: PlanTemplate; slot: PlanTemplate['slots'][number] }) {
  const { t } = useTranslation()
  const rule = slot.ruleId ? TRAINING_RULES.find((r) => r.id === slot.ruleId) : null
  return (
    <li className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`tpl-slot-${slot.key}`}>
      <p className="font-display text-[15px] font-bold">
        {t(`plan.intent.${slot.intent}`)}
        <span className="ml-2 text-[12px] font-normal text-ink-muted"><WeeksText from={slot.weekFrom} to={slot.weekTo} weeks={tpl.weeks} /></span>
      </p>
      {rule ? (
        <p className="text-[12px] text-ink-secondary">
          {t(`plan.rules.${rule.id}.title`)} · {t('plan.evidence.strength', { level: t(`plan.strength.${rule.evidence.strength}`) })}
        </p>
      ) : (
        <p className="text-[12px] text-ink-secondary" data-testid={`tpl-open-${slot.key}`}>{t('tpl.openDose')}</p>
      )}
    </li>
  )
}

export function PlanTemplateDetailScreen() {
  const { t } = useTranslation()
  const { id } = useParams()
  const tpl = templateById(id)
  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <Off />
  if (!tpl) return <EmptyState title={t('tpl.libraryTitle')} body={t('tpl.unknown')} />
  return (
    <div data-testid="plan-template">
      <ScreenHeader eyebrow={t('tpl.libraryTitle')} title={t(`tpl.t.${tpl.id}.name`)} intro={t(`tpl.t.${tpl.id}.sum`)} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip tone="accent">{t('tpl.unreviewed')}</Chip>
        <Chip>{t('tpl.weeksTotal', { n: tpl.weeks })}</Chip>
        <Chip>{t(`plan.phase.${tpl.phase}`)}</Chip>
        <Chip>{t(`tpl.family.${tpl.family}`)}</Chip>
      </div>
      <Panel className="mb-4">
        <PanelHeader title={t('tpl.structure')} />
        <ul>{tpl.slots.map((s) => <SlotRow key={s.key} tpl={tpl} slot={s} />)}</ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">{t('tpl.structureNote')}</p>
      </Panel>
      <Link to={`/plan/vorlagen/${tpl.id}/anpassen`} data-testid="tpl-fit-link" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink">
        {t('tpl.fit.cta')}
      </Link>
    </div>
  )
}

export function PlanTemplateFitScreen() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, saveTrainingBlock } = useAppData()
  const tpl = templateById(id)
  const profile = data.profile
  const mode = planMode(import.meta.env?.VITE_TRAINING_PLAN)
  const [available, setAvailable] = useState<number[]>([1, 2, 3, 4, 6])
  const [hard, setHard] = useState<number[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([...EQUIPMENT])
  const [startDay, setStartDay] = useState(today())
  const [eventDay, setEventDay] = useState(profile.competition?.on ?? '')

  const fit = useMemo(
    () =>
      tpl
        ? fitTemplate({
            template: tpl,
            disciplineId: profile.disciplineId,
            trainingAgeYears: profile.trainingAgeYears,
            availableDays: available,
            fixedSessions: hard.map((day) => ({ day, kind: 'hard_rounds' as const })),
            equipment,
            hrMaxPlausible: profile.maxHr != null,
            mode,
            startDay,
            eventDay: eventDay || null,
            today: today(),
          })
        : null,
    [tpl, profile.disciplineId, profile.trainingAgeYears, profile.maxHr, available, hard, equipment, startDay, eventDay, mode],
  )

  if (mode === 'off') return <Off />
  if (!tpl || !fit) return <EmptyState title={t('tpl.libraryTitle')} body={t('tpl.unknown')} />

  const adopt = () => {
    const now = new Date().toISOString()
    saveTrainingBlock({
      id: newId(),
      family: tpl.family,
      name: '',
      disciplineId: profile.disciplineId,
      phase: tpl.phase,
      startDay: fit.startDay,
      weeks: tpl.weeks,
      retestMetrics: fit.retestMetrics,
      templateId: tpl.id,
      assignmentId: null,
      eventDay: eventDay || null,
      sessions: fit.sessions,
      completions: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    navigate('/plan/block')
  }

  return (
    <div data-testid="plan-fit">
      <ScreenHeader eyebrow={t(`tpl.t.${tpl.id}.name`)} title={t('tpl.fit.title')} intro={t('tpl.fit.intro')} />
      <Panel className="mb-4">
        <div className="space-y-4 px-4 py-4">
          <DayChips label={t('plan.days.available')} value={available} onChange={setAvailable} testId="fit-available" />
          <DayChips label={t('plan.days.hard')} value={hard} onChange={setHard} testId="fit-hard" />
          <div role="group" aria-label={t('tpl.fit.equipment')} data-testid="fit-equipment">
            <span className="label-tag">{t('tpl.fit.equipment')}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => {
                const on = equipment.includes(e)
                return (
                  <button key={e} type="button" aria-pressed={on} data-testid={`fit-equipment-${e}`} onClick={() => setEquipment(on ? equipment.filter((x) => x !== e) : [...equipment, e])} className={cn('min-h-11 rounded-pill border px-3 text-[13px]', on ? 'border-accent bg-accent-quiet text-accent-text' : 'border-line')}>
                    {t(`tpl.equipment.${e}`)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px]">
              <span className="label-tag">{t('tpl.fit.start')}</span>
              <input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} data-testid="fit-start" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
            </label>
            <label className="block text-[13px]">
              <span className="label-tag">{t('tpl.fit.event')}</span>
              <input type="date" value={eventDay} onChange={(e) => setEventDay(e.target.value)} data-testid="fit-event" className="mt-1.5 block min-h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
            </label>
          </div>
          {fit.tooShort && <p className="text-[13px] text-accent-text" data-testid="fit-tooshort">{t('tpl.fit.tooShort', { weeks: tpl.weeks })}</p>}
          <p className="text-[12px] text-ink-secondary" data-testid="fit-startinfo">{t('tpl.fit.startsOn', { day: fit.startDay })}</p>
        </div>
      </Panel>

      <Panel className="mb-4" data-testid="fit-sessions">
        <PanelHeader title={t('plan.sessions.title')} />
        {fit.sessions.length === 0 ? (
          <p className="px-4 pb-4 text-[14px]">{t('plan.sessions.none')}</p>
        ) : (
          <ul>
            {fit.sessions.map((s) => (
              <li key={s.id} className="border-t border-line px-4 py-3 first:border-t-0" data-testid={`fit-session-${s.id}`}>
                <p className="font-display text-[15px] font-bold">
                  {t(`plan.day.${s.day}`)} · {t(`plan.intent.${s.primaryIntent}`)}
                  <span className="ml-2 text-[12px] font-normal text-ink-muted"><WeeksText from={s.weekFrom} to={s.weekTo} weeks={tpl.weeks} /></span>
                </p>
                <p className="text-[12px] text-ink-secondary">{s.ruleId ? t(`plan.rules.${s.ruleId}.title`) : t('tpl.openDose')}</p>
                {s.blocks.map((b, i) => <p key={i} className="mt-1 text-[14px]">{blockText(b, t)}</p>)}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {fit.skipped.length > 0 && (
        <Panel className="mb-4" data-testid="fit-skipped">
          <PanelHeader title={t('plan.skipped.title')} />
          <ul className="px-4 pb-4 text-[14px]">
            {fit.skipped.map((s) => (
              <li key={s.slotKey} className="border-t border-line py-2 first:border-t-0">
                <span className="font-medium">{t(`plan.intent.${s.intent}`)}</span>: {t(`tpl.skip.${s.reason}`)}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <button type="button" data-testid="fit-adopt" disabled={fit.sessions.length === 0} onClick={adopt} className="min-h-11 rounded-pill bg-accent px-5 text-[13px] font-semibold text-accent-ink disabled:opacity-45">
        {t('plan.adopt.button')}
      </button>
      <p className="mt-2 text-[12px] text-ink-secondary">{t('plan.adopt.hint')}</p>
    </div>
  )
}
