import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Library, PenLine, Wrench } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Thumb } from '@/components/ui/PhotoCard'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { openToDo, type Occurrence } from '@/domain/trainingBlock'
import { AREA_IMAGES, sessionImage } from '@/data/visuals'
import { sessionName } from '@/features/plan/planText'

/**
 * Training starten: ein Ort für alles, was man heute tun kann.
 *
 * Aus dem Plan: die Einheiten von heute, verpasste und die der nächsten zwei
 * Wochen. Jede lässt sich jetzt durchführen; der Player hakt dann ihren
 * Termin ab (`planDay`), egal an welchem Tag trainiert wurde.
 *
 * Ohne Plan: etwas eintragen (Trainingslog), eine Einheit aus dem Katalog
 * wählen oder eine eigene zusammenstellen. Das zählt als Training, hakt aber
 * keinen Termin ab.
 */
export function TrainingStartScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { trainingBlocks } = useAppData()
  const block = trainingBlocks.find((b) => b.status === 'active') ?? null
  const today = new Date().toISOString().slice(0, 10)
  const todo = useMemo(() => (block ? openToDo(block, today) : null), [block, today])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />

  const dateText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' })
  const row = (o: Occurrence, primary: boolean) => (
    <li key={`${o.session.id}|${o.planned}`} className="flex min-h-16 items-center gap-3 py-2">
      <Thumb src={sessionImage(o.session)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px]">{sessionName(o.session, t)}</span>
        <span className="block text-[12px] text-ink-secondary">{o.date === today ? t('start.today') : dateText(o.date)}</span>
      </span>
      <Link
        to={`/plan/heute?s=${encodeURIComponent(o.session.id)}&d=${o.planned}`}
        data-testid={`start-occ-${o.session.id}-${o.planned}`}
        className={primary ? 'inline-flex min-h-11 items-center rounded-pill bg-accent px-4 text-[13px] font-semibold text-accent-ink' : 'inline-flex min-h-11 items-center rounded-pill border border-accent px-4 text-[13px] font-semibold text-accent-text'}
      >
        {t('player.start')}
      </Link>
    </li>
  )
  const group = (key: 'today' | 'missed' | 'upcoming', list: Occurrence[]) =>
    list.length > 0 && (
      <div data-testid={`start-${key}`}>
        <p className="label-tag px-4 pt-3">{t(`start.${key}`)}</p>
        <ul className="divide-y divide-line px-4">{list.map((o) => row(o, key === 'today'))}</ul>
      </div>
    )
  const way = (to: string, testId: string, Icon: typeof Library, key: 'log' | 'catalog' | 'build') => (
    <li>
      <Link to={to} data-testid={testId} className="flex min-h-16 items-center gap-3 px-4 py-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-accent-quiet text-accent-text"><Icon size={18} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t(`start.${key}`)}</span>
          <span className="block text-[12px] text-ink-secondary">{t(`start.${key}Sub`)}</span>
        </span>
        <ChevronRight size={18} aria-hidden className="text-ink-muted" />
      </Link>
    </li>
  )
  const nothing = !todo || todo.today.length + todo.missed.length + todo.upcoming.length === 0

  return (
    <div data-testid="training-start">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('start.title')} image={AREA_IMAGES.training} />

      <Panel className="mb-4" data-testid="start-plan">
        {block && todo ? (
          <>
            {group('today', todo.today)}
            {group('missed', todo.missed)}
            {group('upcoming', todo.upcoming)}
            {nothing && <p className="px-4 py-3 text-[14px] text-ink-secondary">{t('start.allDone')}</p>}
            <p className="px-4 pb-3 text-[12px] text-ink-muted">{t('start.countsHint')}</p>
          </>
        ) : (
          <div className="space-y-2 px-4 py-3" data-testid="start-no-block">
            <p className="text-[14px] text-ink-secondary">{t('start.none')}</p>
            <Link to="/plan/programme" className="inline-flex min-h-11 items-center text-[13px] text-accent-text underline underline-offset-2">{t('planHub.empty.ready')}</Link>
          </div>
        )}
      </Panel>

      <Panel data-testid="start-free">
        <p className="label-tag px-4 pt-3">{t('start.free')}</p>
        <ul className="divide-y divide-line">
          {way('/training?neu=1', 'start-log', PenLine, 'log')}
          {way('/plan/frei/katalog', 'start-catalog', Library, 'catalog')}
          {way('/plan/frei/neu', 'start-build', Wrench, 'build')}
        </ul>
      </Panel>
    </div>
  )
}

export default TrainingStartScreen
