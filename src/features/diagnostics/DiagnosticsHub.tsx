import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Dumbbell, Gauge, HeartPulse, ListChecks, Plus, Zap } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { disciplineIdsOf } from '@/features/shared/profileContext'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById, type Discipline } from '@/data/sportProfiles'
import { TEST_CATALOG } from '@/data/testCatalog'
import { TEST_BATTERIES, disciplineBattery } from '@/data/testBatteries'
import { AREAS, type Area } from '@/domain/areas'
import { cn } from '@/lib/utils'

const AREA_ICONS: Record<Area, typeof Dumbbell> = {
  strength: Dumbbell,
  endurance: HeartPulse,
  power: Zap,
  speed: Gauge,
}

/**
 * Der Einstieg in die Diagnostik (Konzept §7): «Was möchtest du testen?»
 *
 * Keine Liste beim Öffnen. Sechs Wege: die eigene Sportart, vier
 * Leistungsbereiche, die ganze Datenbank. Darunter die Sportkarten (§8) und
 * die Batterien (§10) — alles, was jemand hier anfangen kann, ohne vorher
 * zu wissen, wie ein Test heisst.
 */
export function DiagnosticsHub() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const main = disciplineById(data.profile.disciplineId)
  const sports = disciplineIdsOf(data.profile)
    .map((id) => disciplineById(id))
    .filter((d): d is Discipline => d != null)

  const batteries = useMemo(() => {
    const own = main ? disciplineBattery(main.id) : null
    const forSports = TEST_BATTERIES.filter(
      (b) => !b.disciplineIds || b.disciplineIds.some((id) => sports.some((s) => s.id === id)),
    )
    return [...(own ? [own] : []), ...forSports]
  }, [main, sports])

  /**
   * Die Kategorien als schwebende Karten in kontrollierter Asymmetrie.
   *
   * Die Breiten und Versätze sind FEST und nicht zufällig: eine Anordnung,
   * die bei jedem Öffnen anders aussieht, verhindert, dass sich jemand die
   * Lage merkt. Auf schmalen Bildschirmen fällt die Versetzung weg — dort
   * ist kein Platz dafür, und Lesbarkeit geht vor.
   *
   * Die erste Karte (die eigene Sportart) trägt den Akzent als Fläche: sie
   * ist der Weg, den die meisten hier nehmen sollen.
   */
  const entry = (
    to: string,
    title: string,
    hint: string,
    Icon: typeof Dumbbell,
    primary = false,
    offset = 0,
    index = 0,
  ) => (
    <li key={to} className="sm:[margin-top:var(--offset)]" style={{ ['--offset' as string]: `${offset}px` }}>
      <Link
        to={to}
        className={cn(
          'float-lift flex min-h-20 items-center gap-3 rounded-[var(--radius)] border px-4 py-3.5',
          'rise shadow-elev-1',
          primary
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line bg-surface-raised',
        )}
        style={{ ['--rise-delay' as string]: `${index * 70}ms` }}
      >
        <Icon
          size={22}
          className={cn('shrink-0', primary ? 'text-accent-ink' : 'text-accent-text')}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-semibold tracking-[0.06em] uppercase">
            {title}
          </span>
          <span
            className={cn('block text-[12px]', primary ? 'text-accent-ink/75' : 'text-ink-secondary')}
          >
            {hint}
          </span>
        </span>
        <ChevronRight
          size={16}
          className={cn('shrink-0', primary ? 'text-accent-ink/70' : 'text-ink-muted')}
          aria-hidden
        />
      </Link>
    </li>
  )

  return (
    <>
      <ScreenHeader
        eyebrow={t('diag.eyebrow')}
        title={t('diag.title')}
        intro={t('diag.intro', { count: TEST_CATALOG.length })}
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {main
          ? entry(`/sport/${main.id}`, t('diag.mySport'), t('diag.mySportHint', { sport: main.name[locale] }), ListChecks, true, 0, 0)
          : entry('/profil', t('diag.mySport'), t('diag.noSportHint'), ListChecks, false, 0, 0)}
        {AREAS.map((area, i) =>
          entry(
            `/diagnostik/bereich/${area}`,
            t(`diag.areas.${area}`),
            t(`diag.areaHints.${area}`),
            AREA_ICONS[area],
            false,
            // Versatz im Wechsel: rechte Spalte tiefer, linke höher.
            [26, -8, 18, -4][i] ?? 0,
            i + 1,
          ),
        )}
        {entry('/tests', t('diag.pick'), t('diag.pickHint'), ListChecks, false, 10, 5)}
      </ul>

      <section className="mt-6">
        <h2 className="label-tag mb-2">{t('diag.sports')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <SportCard key={sport.id} sport={sport} isMain={sport.id === main?.id} />
          ))}
          <li>
            <Link
              to="/profil"
              className="flex min-h-[7.5rem] items-center justify-center gap-2 border border-dashed border-line-strong px-4 text-[13px] text-ink-secondary hover:bg-accent-quiet"
            >
              <Plus size={16} aria-hidden />
              {t('diag.addSport')}
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t('diag.batteries')} subtitle={t('diag.batteriesHint')} />
          <ul className="divide-y divide-line">
            {batteries.map((battery) => (
              <li key={battery.slug}>
                <Link to={`/batterie/${encodeURIComponent(battery.slug)}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent-quiet">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{battery.name[locale]}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {t('diag.testCount', { count: battery.testSlugs.length })} · {battery.durationMinutes} min
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title={t('diag.sessions')} subtitle={t('diag.sessionsHint')} />
          <Link to="/diagnostik/termine" className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] hover:bg-accent-quiet">
            {t('assessments.all')}
            <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
          </Link>
        </Panel>
      </section>
    </>
  )
}

/** Sportkarte (Konzept §8): Name, Zahl der Tests, eigene Ergebnisse, offene Tests. */
export function SportCard({ sport, isMain }: { sport: Discipline; isMain: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const slugs = sport.tests.map((entry) => entry.slug)
  const measured = new Set(data.results.filter((r) => slugs.includes(r.testSlug) && r.score != null).map((r) => r.testSlug))
  const resultCount = data.results.filter((r) => slugs.includes(r.testSlug) && r.score != null).length
  return (
    <li>
      <Link to={`/sport/${sport.id}`} className={cn('panel flex min-h-[7.5rem] flex-col justify-between px-4 py-3 transition-colors hover:bg-accent-quiet', isMain && 'panel-ticked')}>
        <div>
          <span className="label-tag">{isMain ? t('sport.isMain') : t('sport.isAdditional')}</span>
          <span className="mt-0.5 block font-display text-[20px] leading-tight font-bold">{sport.name[locale]}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-secondary">
          <span>
            {t('diag.testCount', { count: slugs.length })} · {t('diag.resultCount', { count: resultCount })} ·{' '}
            {t('diag.openCount', { count: slugs.length - measured.size })}
          </span>
          <span className="label-tag text-accent-text">{t('diag.openSport')} →</span>
        </div>
      </Link>
    </li>
  )
}
