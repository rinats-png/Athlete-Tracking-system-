import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import bodyAsset from '@/assets/body-figure.webp'
import { useLocale } from '@/features/shared/useLocale'
import { loadData } from '@/lib/store/localStore'
import { ratingContextOf } from '@/features/shared/profileContext'
import { introScenes, type IntroCallout } from '@/domain/introScenes'
import { formatResultValue } from '@/lib/resultView'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Die Intro-Sequenz beim Öffnen der App.
 *
 * Die Choreografie folgt der Vorlage: die Figur kommt unscharf herein und
 * zieht scharf (blurIn), die Messpunkte erscheinen versetzt, die Balken
 * laufen ein, dann geht die Szene wieder unscharf hinaus (blurOut). Am Ende
 * die Wortmarke mit dem Leitsatz.
 *
 * DREI ANPASSUNGEN GEGENÜBER DER VORLAGE, jede aus einem Grund:
 *
 * 1. DIE ZAHLEN SIND ECHT. Die Vorlage trägt erfundene Werte («Impakt
 *    1.240 N»). Wer die App öffnet, sähe Zahlen, die aussehen wie seine
 *    eigenen — das darf nicht sein. Die Callouts kommen deshalb aus dem
 *    Bestand; ohne Messungen zeigen sie, WAS gemessen wird, ohne Zahl.
 *
 * 2. DIE LÄNGE. Die Vorlage läuft rund 14 Sekunden und dann in einer
 *    Schleife weiter. Als Start einer App, die jemand zehnmal die Woche
 *    öffnet, um einen Wert einzutragen, wäre das eine Zumutung. Drei Szenen,
 *    zusammen gut fünf Sekunden, einmal je Sitzung — und jederzeit
 *    abbrechbar.
 *
 * 3. DIE FIGUR. Die fünf Posen der Vorlage (`assets/press-l.png` und so
 *    weiter) liegen nicht bei. Bis sie da sind, trägt die vorhandene
 *    Körperfigur die Szenen und wird je Szene anders angeschnitten — der
 *    Ausschnitt folgt der Körperregion, die der Callout misst. Sobald
 *    Bilder in `src/assets/intro/` liegen, treten sie an ihre Stelle,
 *    ohne dass hier etwas geändert werden muss (siehe das README dort).
 */

/** Zeiten der Vorlage, gekürzt. Summe je Szene: 1,43 s. */
const ENTER = 500
const HOLD = 550
const EXIT = 380
const GAP = 80
const FINALE_HOLD = 1400

/**
 * Bildausschnitt je Körperregion, in Prozent — dieselben Regionen, die auch
 * die Körperansicht benutzt. Damit «scannt» jede Szene eine andere Stelle.
 */
const FRAME: Record<PerformanceDimension, string> = {
  max_strength: '50% 22%',
  endurance: '50% 24%',
  relative_strength: '45% 32%',
  strength_endurance: '50% 34%',
  power: '50% 56%',
  agility: '50% 72%',
}

/**
 * Die Posenbilder der Vorlage, sofern sie im Projekt liegen.
 *
 * `import.meta.glob` mit `eager` löst das beim Bauen auf: liegt der Ordner
 * leer da, entsteht ein leeres Objekt und kein Fehler. Damit genügt es,
 * die Dateien abzulegen — Code ändert sich nicht. Sortiert wird nach
 * Dateiname, deshalb die Ziffern in `src/assets/intro/README.md`.
 */
const POSES: string[] = Object.entries(
  import.meta.glob<{ default: string }>('@/assets/intro/*.{webp,png}', { eager: true }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, module]) => module.default)

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const locale = useLocale()

  /**
   * Der Bestand wird hier DIREKT gelesen, nicht über den Datenanbieter.
   *
   * Der Grund: die Sequenz gehört an den Anfang — vor die Wahl zwischen
   * Gast und Demo und vor den Einstieg. Innerhalb des Anbieters lag sie
   * dahinter und lief beim allerersten Öffnen gar nicht. Ein Lesen aus dem
   * Gerätespeicher ist derselbe Vorgang, den die App beim Start ohnehin
   * macht, und die Sequenz schreibt nichts.
   */
  const scenes = useMemo(() => {
    const { data } = loadData()
    const athlete = data.athletes.find((a) => a.id === data.activeAthleteId) ?? data.athletes[0]
    return introScenes(athlete.results, ratingContextOf(athlete.profile), locale, (r) =>
      formatResultValue(r, locale, athlete.profile.unitSystem),
    )
  }, [locale])

  /** −1 = noch nichts, 0…n−1 = Szene, n = Finale. */
  const [index, setIndex] = useState(-1)
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const timers = useRef<number[]>([])
  const finished = useRef(false)

  const finish = () => {
    if (finished.current) return
    finished.current = true
    timers.current.forEach(clearTimeout)
    onDone()
  }

  useEffect(() => {
    // Wer reduzierte Bewegung eingestellt hat, will keine Sequenz. Der
    // Leitsatz erscheint kurz, dann ist die App da.
    if (prefersReducedMotion() || scenes.length === 0) {
      setIndex(scenes.length)
      timers.current.push(window.setTimeout(finish, 900))
      return () => timers.current.forEach(clearTimeout)
    }

    const later = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms))
    }

    const run = (i: number) => {
      if (i >= scenes.length) {
        setIndex(scenes.length)
        later(finish, FINALE_HOLD)
        return
      }
      setIndex(i)
      setPhase('enter')
      later(() => setPhase('hold'), ENTER)
      later(() => setPhase('exit'), ENTER + HOLD)
      later(() => run(i + 1), ENTER + HOLD + EXIT + GAP)
    }
    run(0)
    return () => timers.current.forEach(clearTimeout)
    // Einmal beim Montieren. Ein Neustart mitten in der Sequenz wäre ein
    // Sprung zurück auf Szene eins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Abbrechen: überall tippen, Escape, oder der Knopf. */
  useEffect(() => {
    const onKey = () => finish()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const atFinale = index >= scenes.length

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-plane"
      onPointerDown={finish}
      role="dialog"
      aria-label={t('intro.label')}
    >
      <div className="relative flex flex-1 items-center justify-center">
        {/* Die Messlinie der Vorlage: ein einzelner heller Strich, der die
            Szene als Messung markiert. */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-[8vw] bottom-[10vh] left-[8vw] h-px opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--line-strong), transparent)',
          }}
        />

        {scenes.map((scene, i) => (
          <div
            key={scene.key}
            aria-hidden={index !== i}
            className={cn(
              'absolute flex aspect-[2/3] h-[62vh] max-h-[80vw] items-center justify-center',
              index === i ? 'opacity-100' : 'pointer-events-none opacity-0',
              index === i && phase === 'enter' && 'intro-blur-in',
              index === i && phase === 'exit' && 'intro-blur-out',
            )}
          >
            <img
              src={POSES[i] ?? bodyAsset}
              alt=""
              aria-hidden
              className="h-full w-full object-contain opacity-90"
              style={
                // Der Ausschnitt gilt nur für die Ersatzfigur: ein Posenbild
                // ist schon der Ausschnitt und soll ganz zu sehen sein.
                POSES[i] ? undefined : { objectPosition: FRAME[scene.callouts[0].dimension] }
              }
            />
            {scene.callouts.map((callout, c) => (
              <Callout
                key={callout.label}
                callout={callout}
                side={c === 0 ? 'right' : 'left'}
                active={index === i && phase !== 'enter'}
                delay={c * 120}
                locale={locale}
              />
            ))}
          </div>
        ))}

        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center px-6 text-center',
            'transition-opacity duration-[900ms]',
            atFinale ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <p className="font-display text-[clamp(34px,9vw,84px)] leading-none font-extrabold tracking-[0.42em] indent-[0.42em] uppercase">
            BASE<span className="text-accent-text">LINE</span>
          </p>
          <p className="mt-4 text-[clamp(10px,2.6vw,14px)] tracking-[0.34em] indent-[0.34em] text-ink-muted uppercase">
            {t('intro.tagline')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={finish}
        className="mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] min-h-11 rounded-pill px-5 text-[12px] tracking-[0.14em] text-ink-muted uppercase"
      >
        {t('intro.skip')}
      </button>
    </div>
  )
}

function Callout({
  callout,
  side,
  active,
  delay,
  locale,
}: {
  callout: IntroCallout
  side: 'left' | 'right'
  active: boolean
  delay: number
  locale: 'de' | 'en'
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'absolute flex items-center gap-2.5 transition-[opacity,transform] duration-[450ms]',
        side === 'right' ? 'top-[18%] right-[2%] sm:right-[-9%]' : 'bottom-[16%] left-[2%] flex-row-reverse sm:left-[-7%]',
        active ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span aria-hidden className="size-[7px] shrink-0 rounded-pill bg-accent ring-3 ring-accent-quiet" />
      <span
        aria-hidden
        className="h-px w-3 shrink-0 sm:w-6"
        style={{
          background:
            side === 'right'
              ? 'linear-gradient(90deg, var(--line-strong), transparent)'
              : 'linear-gradient(90deg, transparent, var(--line-strong))',
        }}
      />
      <span className={cn('flex flex-col gap-0.5', side === 'left' && 'items-end text-right')}>
        <span className="text-[8.5px] tracking-[0.24em] whitespace-nowrap text-ink-muted uppercase sm:text-[10px]">
          {callout.label}
        </span>
        <span className="readout text-[15px] leading-none font-bold whitespace-nowrap text-accent-text sm:text-[19px]">
          {callout.value ?? (callout.unit ? `— ${callout.unit}` : t('intro.notMeasured'))}
        </span>
        <span
          aria-hidden
          className="h-[2px] w-12 overflow-hidden rounded-pill bg-accent-quiet sm:w-20"
        >
          <span
            className="block h-full rounded-pill bg-accent-glow transition-[width] duration-[800ms] ease-[var(--ease-out)]"
            style={{
              width: active && callout.fill != null ? `${Math.round(callout.fill)}%` : '0%',
              transitionDelay: `${delay + 250}ms`,
            }}
          />
        </span>
        {callout.fill != null && (
          <span className="sr-only">
            {t('result.percentile', { percentile: formatNumber(callout.fill, locale, 0) })}
          </span>
        )}
      </span>
    </span>
  )
}
