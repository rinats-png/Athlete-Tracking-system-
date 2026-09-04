import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HaloField } from '@/components/signature/HaloField'
import { ParticleSphere } from '@/components/signature/ParticleSphere'
import { useLocale } from '@/features/shared/useLocale'
import { loadData } from '@/lib/store/localStore'
import { ratingContextOf } from '@/features/shared/profileContext'
import { introScenes, type IntroCallout } from '@/domain/introScenes'
import { formatResultValue } from '@/lib/resultView'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Die Intro-Sequenz beim Öffnen der App.
 *
 * Die Choreografie folgt der Vorlage: die Szene kommt unscharf herein und
 * zieht scharf (blurIn), die Messpunkte erscheinen versetzt, die Balken
 * laufen ein, dann geht sie wieder unscharf hinaus (blurOut). Darunter der
 * wechselnde Systemtext, darüber die Zählung der Szenen. Am Ende die
 * Wortmarke mit dem Leitsatz.
 *
 * KEINE FIGUR MEHR. Vorher stand hier eine gezeichnete Person, je Szene
 * anders angeschnitten. Sie behauptete einen Körper, der nicht der des
 * Betrachters ist, und stand als Bild vor Zahlen, die zu ihr nicht gehören.
 * An ihrer Stelle steht jetzt die Partikelsphäre der Vorlage.
 *
 * ZWEI ANPASSUNGEN GEGENÜBER DER VORLAGE, jede aus einem Grund:
 *
 * 1. DIE ZAHLEN SIND ECHT. Die Vorlage trägt erfundene Werte («Impakt
 *    1.240 N»). Wer die App öffnet, sähe Zahlen, die aussehen wie seine
 *    eigenen — das darf nicht sein. Die Callouts kommen deshalb aus dem
 *    Bestand; ohne Messungen zeigen sie, WAS gemessen wird, ohne Zahl.
 *    Aus demselben Grund fehlt der Ladezähler «000 % … 100 %»: es lädt
 *    nichts. Rechts oben steht stattdessen die Szene, bei der die Sequenz
 *    gerade ist — eine Zahl, die stimmt.
 *
 * 2. DIE LÄNGE. Die Vorlage läuft rund 14 Sekunden und dann in einer
 *    Schleife weiter. Als Start einer App, die jemand zehnmal die Woche
 *    öffnet, um einen Wert einzutragen, wäre das eine Zumutung. Drei Szenen,
 *    zusammen gut fünf Sekunden, einmal je Sitzung — und jederzeit
 *    abbrechbar.
 */

/** Zeiten der Vorlage, gekürzt. Summe je Szene: 1,43 s. */
const ENTER = 500
const HOLD = 550
const EXIT = 380
const GAP = 80
const FINALE_HOLD = 1400

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

  /**
   * Der wechselnde Systemtext unten. Er läuft schneller als die Szenen —
   * in der Vorlage alle 400 ms — und benennt, was die App tut.
   */
  const stages = t('intro.stages', { returnObjects: true }) as string[]
  const [stage, setStage] = useState(stages[0] ?? '')
  useEffect(() => {
    if (prefersReducedMotion()) return
    let at = 0
    const timer = window.setInterval(() => {
      at = (at + 1) % stages.length
      setStage(stages[at])
    }, 700)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    /*
     * Die Sequenz folgt dem Thema: auf Cream Paper läuft sie hell, auf Deep
     * Brown dunkel. Halo und Sphäre lesen ihre Farben aus denselben Rollen
     * wie die App, deshalb genügt hier der normale Grund.
     */
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-plane text-ink"
      onPointerDown={finish}
      role="dialog"
      aria-label={t('intro.label')}
    >
      <HaloField className="opacity-80" />

      {/* Kopfzeile der Vorlage. Rechts steht, bei welcher Szene die Sequenz
          ist — kein Ladebalken, sondern eine Zahl, die stimmt. */}
      <div className="relative flex items-start justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10">
        <span className="readout text-[10px] tracking-[0.4em] text-ink-muted uppercase">
          [ {t('intro.system')} ]
        </span>
        <span className="readout text-[10px] tracking-[0.4em] text-ink uppercase">
          {atFinale
            ? 'BASELINE'
            : `${String(Math.max(1, index + 1)).padStart(3, '0')} / ${String(scenes.length).padStart(3, '0')}`}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {/*
         * Die Sphäre steht EINMAL da und läuft durch. Vorher wurde sie je
         * Szene neu aufgebaut — dann fing sie jedes Mal wieder bei einem
         * Fünftel ihrer Grösse an und war während der Blende kaum zu sehen.
         * Sie ist der Körper der Sequenz; was wechselt, sind die Messpunkte.
         */}
        <ParticleSphere
          className={cn(
            'absolute aspect-square h-[52vh] max-h-[86vw] transition-opacity duration-500',
            atFinale ? 'opacity-0' : 'opacity-100',
          )}
        />
        {scenes.map((scene, i) => (
          <div
            key={scene.key}
            aria-hidden={index !== i}
            className={cn(
              'absolute flex aspect-square h-[52vh] max-h-[86vw] items-center justify-center',
              index === i ? 'opacity-100' : 'pointer-events-none opacity-0',
              index === i && phase === 'enter' && 'intro-blur-in',
              index === i && phase === 'exit' && 'intro-blur-out',
            )}
          >
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

      {/* Der wechselnde Systemtext der Vorlage — er benennt, was die App
          tut, nicht was sie gerade lädt. */}
      <p className="relative mb-3 text-center text-[11px] tracking-[0.5em] text-ink uppercase">
        / {stage}
      </p>

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
