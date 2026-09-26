import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { MetricMeta } from '@/features/shared/MetricMeta'
import { useLocale } from '@/features/shared/useLocale'
import { useExtraReady } from '@/features/shared/useExtraReady'
import { useAppData } from '@/lib/store/AppDataProvider'
import { toDay } from '@/domain/diary'
import { readinessContext, type ReadinessComponent } from '@/domain/readinessContext'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Tageskontext — die Readiness als Komponenten (Master-Spezifikation D5).
 *
 * Kopfzeile: wie viele Marker ausserhalb der EIGENEN Bandbreite liegen.
 * Darunter jede Komponente einzeln: heutiger Wert, der eigene Median der
 * letzten 28 Tage, und wo der Wert liegt. Keine Gesamtzahl, keine Ampel,
 * keine Freigabe — «2 Marker ausserhalb deiner Bandbreite» ist die ganze
 * Aussage.
 *
 * Komponenten ohne Bandbreite (zu wenig Vorlauf) stehen unten und sagen,
 * was fehlt — statt zu verschwinden (Spezifikation I2: Empty erklärt).
 */
export function ReadinessContextPanel({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary, observations } = useAppData()
  const today = toDay(new Date())
  const context = useMemo(() => readinessContext(diary, observations, today), [diary, observations, today])
  const ready = useExtraReady()

  const assessed = context.components.filter((c) => c.status === 'within' || c.status === 'below' || c.status === 'above')
  const pending = context.components.filter((c) => c.status === 'insufficient' || c.status === 'no_current')
  if (!ready || (compact && assessed.length === 0)) return null

  // «Alle im Rahmen» nur, wenn wirklich alle im Rahmen liegen — auch die
  // Belastung, die nicht als Marker zählt, aber sichtbar abweichen kann.
  const headline =
    assessed.length === 0
      ? t('readinessCtx.none')
      : context.markers > 0
        ? t('readinessCtx.markers', { count: context.markers, of: assessed.length })
        : assessed.every((c) => c.status === 'within')
          ? t('readinessCtx.allWithin', { count: assessed.length })
          : t('readinessCtx.noMarkers')

  return (
    <Panel className={className} data-testid="readiness-context">
      <PanelHeader title={t('readinessCtx.title')} subtitle={headline} />
      {assessed.length > 0 && (
        <ul className="divide-y divide-line">
          {(compact ? assessed.filter((c) => c.marker).concat(assessed.filter((c) => !c.marker)).slice(0, 4) : assessed).map((c) => (
            <ComponentRow key={c.key} c={c} locale={locale} />
          ))}
        </ul>
      )}
      {!compact && pending.length > 0 && (
        <p className="border-t border-line px-4 py-2 text-[12px] leading-relaxed text-ink-muted">
          {t('readinessCtx.pending', { list: pending.map((c) => t(`readinessCtx.component.${c.key}`)).join(', ') })}
        </p>
      )}
      <div className="border-t border-line px-4 py-2">
        <MetricMeta metric={context.metric} />
        {compact ? (
          <Link to="/tagebuch" className="mt-1 inline-flex min-h-11 items-center text-[12px] underline underline-offset-2">
            {t('readinessCtx.openDiary')}
          </Link>
        ) : (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            {t('readinessCtx.method')}{' '}
            <Link to="/beobachtung" className="underline underline-offset-2">
              {t('readinessCtx.addDevice')}
            </Link>
          </p>
        )}
      </div>
    </Panel>
  )
}

function ComponentRow({ c, locale }: { c: ReadinessComponent; locale: ReturnType<typeof useLocale> }) {
  const { t } = useTranslation()
  // Skalen 1–5 als «4/5» statt «4,0 1–5»; ganze Werte ohne Nachkommastelle.
  const scale = c.unit === '1–5'
  const value = (v: number | null) =>
    v == null ? '—' : formatNumber(v, locale, scale && Number.isInteger(v) ? 0 : c.digits) + (scale ? '/5' : '')
  const unit = scale ? '' : c.unit
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]" data-component={c.key} data-status={c.status}>
      <span>
        <span className="block">{t(`readinessCtx.component.${c.key}`)}</span>
        <span className="block text-[11px] text-ink-muted">
          {t('readinessCtx.usual', { median: value(c.baselineMedian), unit })}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="readout tabular-nums">
          {value(c.current)} {unit && <span className="text-[11px] text-ink-muted">{unit}</span>}
        </span>
        <span
          className={cn(
            'rounded-pill border px-2 py-0.5 text-[11px]',
            c.marker ? 'border-warning/60 bg-warning/10' : c.status === 'within' ? 'border-line text-ink-muted' : 'border-line-strong',
          )}
        >
          {t(`readinessCtx.status.${c.status}`)}
          {c.z != null && ` · ${c.z > 0 ? '+' : ''}${formatNumber(c.z, locale, 1)} σ`}
        </span>
      </span>
    </li>
  )
}
