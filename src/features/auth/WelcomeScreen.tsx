import { useTranslation } from 'react-i18next'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { HaloField } from '@/components/signature/HaloField'
import { SplitText } from '@/components/signature/SplitText'
import { useReveal } from '@/features/shared/useReveal'
import { useLocale } from '@/features/shared/useLocale'
import { DISCIPLINES } from '@/data/sportProfiles'
import karteMessung from '@/assets/landing/karte-messung.webp'
import karteAnalyse from '@/assets/landing/karte-analyse.webp'
import karteNorm from '@/assets/landing/karte-norm.webp'
import { cn } from '@/lib/utils'

/**
 * Der Einstieg — nach der Vorlage «Baseline Halo».
 *
 * Der erste Bildschirm ist kein Formular, sondern eine Seite: der leuchtende
 * Ring als Grund, eine grosse Versalzeile, die zeichenweise scharf zieht,
 * drei Karten mit Eckklammern und ein Laufband. Er verkauft; gefragt wird
 * erst danach.
 *
 * ZWEI ENTSCHEIDUNGEN, DIE HIER ZÄHLEN:
 *
 * 1. DER GRUND IST IMMER DUNKEL (`ink-scope`), auch wenn jemand hell
 *    eingestellt hat. Der Halo lebt vom dunklen Grund. Der Bereich endet an
 *    diesem Bildschirm — in der App selbst, wo Messwerte abgelesen werden,
 *    gilt weiter die Einstellung des Menschen.
 *
 * 2. DAS LAUFBAND TRÄGT KEINE VEREINSNAMEN. Die Vorlage lässt dort
 *    «Judo Bund», «Olympia-Stützpunkt» und «Sportklinik» vorbeilaufen. Das
 *    sind Referenzen, die es nicht gibt — auf einer Startseite gelesen sind
 *    sie eine Behauptung über Partner (§81). Vorbei laufen deshalb die
 *    Sportarten, für die tatsächlich ein Testprofil hinterlegt ist.
 */
export function WelcomeScreen({ onEnter }: { onEnter: (mode: 'guest' | 'demo') => void }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const page = useReveal<HTMLDivElement>()

  const headline = t('welcome.halo.lines', { returnObjects: true }) as string[]
  const cards = [
    { image: karteMessung, key: 'protocol' },
    { image: karteAnalyse, key: 'dimensions' },
    { image: karteNorm, key: 'reference' },
  ] as const

  return (
    <div ref={page} className="ink-scope relative min-h-dvh overflow-x-hidden bg-plane text-ink">
      {/* Der Ring liegt fest hinter allem und scrollt nicht mit. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <HaloField />
      </div>

      <div className="relative z-10">
        {/* --- Kopf ------------------------------------------------------ */}
        <header className="flex items-start justify-between px-6 py-6 sm:px-10">
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-[22px] leading-none font-bold tracking-[0.12em] uppercase sm:text-[26px]">
              Baseline
            </span>
            <span className="readout text-[10px] tracking-[0.2em] text-ink-muted uppercase">
              [ {t('welcome.halo.version')} ]
            </span>
          </div>
          <nav aria-label={t('welcome.halo.navLabel')} className="flex flex-col items-end gap-1.5">
            {(['what', 'how', 'privacy'] as const).map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex min-h-11 items-center gap-1 text-[11px] font-medium tracking-[0.1em] text-ink-secondary uppercase transition-colors hover:text-ink"
              >
                {t(`welcome.halo.nav.${id}`)}
                <ArrowUpRight size={12} strokeWidth={2} aria-hidden />
              </a>
            ))}
          </nav>
        </header>

        {/* --- Hero ------------------------------------------------------ */}
        {/* Auf dem Telefon KEINE Bildschirmhöhe erzwingen: sonst stehen die
            beiden Knöpfe unter der Kante, und der Einstieg beginnt mit einer
            Wischbewegung. Am Rechner ist Platz dafür. */}
        <section className="grid items-center gap-8 px-6 pt-6 pb-16 sm:px-10 lg:min-h-[86vh] lg:grid-cols-12 lg:gap-10 lg:pt-10 lg:pb-24">
          <div className="lg:col-span-8">
            <p
              data-reveal
              className="readout mb-5 text-[10px] tracking-[0.2em] text-ink uppercase sm:text-[11px]"
            >
              [ {t('welcome.eyebrow')} ]
            </p>
            <h1 className="font-display text-[12vw] leading-[0.9] font-bold tracking-[-0.025em] uppercase lg:text-[6vw]">
              <span className="mask-r block [filter:drop-shadow(0_0_15px_rgba(238,241,234,0.2))]">
                <SplitText>{headline[0]}</SplitText>
              </span>
              <span className="block [filter:drop-shadow(0_0_20px_rgba(238,241,234,0.3))]">
                <DiamondStar />
                <SplitText delay={0.5}>{headline[1]}</SplitText>
              </span>
              <span className="mask-l block [filter:drop-shadow(0_0_15px_rgba(238,241,234,0.2))]">
                <SplitText delay={1}>{headline[2]}</SplitText>
              </span>
            </h1>
          </div>

          <div className="flex flex-col justify-end gap-6 pb-4 lg:col-span-4">
            <div data-reveal className="flex items-center justify-between">
              <span className="text-[30px] leading-none font-light tracking-[-0.05em]">
                ( <span className="readout font-bold">B</span> )
              </span>
              <span className="readout text-[10px] tracking-[0.2em] text-ink-secondary uppercase">
                [ {t('welcome.halo.since')} ]
              </span>
            </div>
            <p data-reveal className="max-w-[34ch] text-[13px] leading-relaxed text-ink-secondary">
              {t('welcome.body')}
            </p>
            <div data-reveal className="flex flex-wrap items-center gap-4">
              <BracketButton onClick={() => onEnter('guest')}>
                {t('welcome.startLocal')}
              </BracketButton>
              <button
                type="button"
                onClick={() => onEnter('demo')}
                className="min-h-11 text-[13px] font-medium transition-opacity hover:opacity-70"
              >
                {t('welcome.viewDemo')}
              </button>
            </div>
          </div>
        </section>

        {/* --- Was gemessen wird ----------------------------------------- */}
        <section
          id="what"
          className="border-t border-line/60 px-6 py-20 backdrop-blur-2xl sm:px-10"
          style={{ background: 'color-mix(in oklab, var(--plane) 40%, transparent)' }}
        >
          <div className="mb-14 grid gap-8 lg:grid-cols-12">
            <p className="readout text-[11px] tracking-[0.2em] text-ink-muted uppercase lg:col-span-4">
              / {t('welcome.halo.aboutLabel')}
            </p>
            <div className="lg:col-span-8">
              <h2 className="font-display max-w-[24ch] text-[26px] leading-tight font-semibold tracking-[-0.025em] sm:text-[40px]">
                <SplitText by="word">{t('welcome.halo.aboutHeadline')}</SplitText>
              </h2>
              <p
                data-reveal
                className="mt-6 max-w-[52ch] text-[14px] leading-relaxed font-light text-ink-secondary sm:text-[16px]"
              >
                {t('welcome.halo.aboutBody')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card, i) => (
              <article
                key={card.key}
                data-reveal="card"
                className="corner-brackets relative aspect-4/5 overflow-hidden rounded-md border border-line/50 bg-surface/20"
              >
                <img
                  src={card.image}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-700 hover:opacity-90"
                />
                <span className="readout absolute top-4 left-4 z-20 text-[10px] tracking-[0.1em] text-ink-muted">
                  [{i + 1}]
                </span>
                <div className="absolute inset-x-0 bottom-0 z-10 flex h-1/2 flex-col justify-end p-6 bg-gradient-to-t from-plane via-plane/20 to-transparent">
                  <h3 className="font-display text-[22px] font-semibold tracking-[-0.025em]">
                    {t(`welcome.halo.cards.${card.key}.title`)}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed font-light text-ink-secondary">
                    {t(`welcome.halo.cards.${card.key}.body`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* --- Haltung ---------------------------------------------------- */}
        <section id="how" className="border-t border-line/60 bg-plane">
          <div className="grid border-b border-line/60 md:grid-cols-4">
            <div className="flex min-h-[200px] flex-col justify-between border-b border-line/60 p-8 md:border-b-0">
              <span className="font-display text-[20px] font-bold tracking-[0.08em] uppercase opacity-80">
                Baseline
              </span>
              <span className="readout text-[9px] tracking-[0.3em] text-ink-muted uppercase">
                [ {t('welcome.halo.claim')} ]
              </span>
            </div>
            <div className="p-8 md:col-span-3 lg:p-12">
              <p className="readout mb-4 text-[10px] tracking-[0.4em] text-ink-muted uppercase">
                / {t('welcome.halo.missionLabel')}
              </p>
              <h3 className="font-display text-[12vw] leading-[0.9] font-bold tracking-[-0.025em] uppercase md:text-[6vw]">
                <SplitText>{t('welcome.halo.missionA')}</SplitText>{' '}
                {/* Wort und Stern zusammen: sonst rutscht der Stern allein in
                    die nächste Zeile und steht dort ohne Bezug. */}
                <span className="inline-block whitespace-nowrap">
                  <span className="mask-r inline-block [filter:drop-shadow(0_0_15px_rgba(238,241,234,0.2))]">
                    <SplitText delay={0.5}>{t('welcome.halo.missionB')}</SplitText>
                  </span>
                  <DiamondStar />
                </span>
              </h3>
            </div>
          </div>

          <div className="grid md:grid-cols-4">
            <div className="hidden md:block" />
            <div className="flex flex-col gap-6 border-b border-line/60 p-8 md:border-b-0">
              <span className="flex size-8 items-center justify-center rounded-[2px] border border-line/60 bg-ink/5">
                <span className="soft-pulse size-1 rounded-pill bg-ink" aria-hidden />
              </span>
              <p className="readout text-[10px] tracking-[0.2em] text-ink-muted uppercase">
                {t('welcome.halo.systemNote')}
              </p>
            </div>
            <div className="p-8 md:col-span-2 lg:p-12">
              <p className="max-w-[46ch] text-[14px] leading-relaxed font-light text-ink-secondary sm:text-[16px]">
                {t('welcome.halo.missionBody')}
              </p>
              <p
                id="privacy"
                className="mt-8 flex max-w-[46ch] items-start gap-2 text-[13px] leading-relaxed text-ink-secondary"
              >
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
                {t('welcome.privacy')}
              </p>
            </div>
          </div>

          {/* Laufband: echte Sportarten mit hinterlegtem Testprofil. */}
          <div className="marquee w-full overflow-hidden border-t border-line/60 py-12 md:py-20">
            <div className="marquee-track">
              {[0, 1].map((run) => (
                <span key={run} aria-hidden={run === 1}>
                  {DISCIPLINES.map((discipline) => (
                    <span
                      key={discipline.id}
                      className="mx-8 inline-block text-[28px] font-bold tracking-[-0.05em] text-ink/20 transition-colors md:mx-16 md:text-[42px]"
                    >
                      {discipline.name[locale]}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* --- Fuss ------------------------------------------------------- */}
        <footer className="relative bg-plane px-6 pt-16 pb-10 sm:px-10">
          {/*
            * Hier steht der Einstiegsknopf NICHT ein zweites Mal. Auf einer
            * Landingpage ist das üblich; hier wären es zwei Schaltflächen mit
            * demselben Namen auf einer Seite — für einen Bildschirmleser
            * nicht unterscheidbar. Die Seite ist kurz genug für einen Knopf.
            */}
          <p className="mx-auto max-w-[46ch] text-center text-[11px] leading-relaxed text-ink-muted">
            {t('welcome.legal')}
          </p>
          <p
            aria-hidden
            className="font-display mt-10 text-center text-[13.5vw] leading-none font-bold tracking-[0.06em] whitespace-nowrap text-ink/15 uppercase select-none"
          >
            Baseline
          </p>
        </footer>
      </div>
    </div>
  )
}

/**
 * Der Knopf der Vorlage: keine gefüllte Fläche, sondern ein Feld mit zwei
 * Eckklammern. Die Trefferfläche bleibt bei 44 px — der Rahmen ist Zierde,
 * die Grösse nicht.
 */
function BracketButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'corner-brackets relative min-h-11 overflow-hidden rounded-[2px] px-6 py-3',
        'border border-ink/30 bg-plane/60 text-[12px] font-medium tracking-[0.1em] uppercase backdrop-blur-2xl',
        'transition-colors hover:bg-plane/85 sm:px-8 sm:text-[14px]',
      )}
    >
      {children}
    </button>
  )
}

/** Der Diamantstern der Vorlage, um die eigene Achse. */
function DiamondStar() {
  return (
    <span
      aria-hidden
      className="star-spin mr-[0.22em] inline-block size-[0.8em] align-[-0.06em]"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
        <path d="M50 0C50 35 65 50 100 50C65 50 50 65 50 100C50 65 35 50 0 50C35 50 50 35 50 0Z" />
      </svg>
    </span>
  )
}
