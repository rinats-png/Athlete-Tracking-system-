import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { newId } from '@/lib/store/localStore'
import { axisLabel } from '@/data/profileAxes'
import { radarProfile } from '@/lib/scoring'
import { formatDate, formatNumber } from '@/lib/format'
import {
  FOCUS_NOTE_MAX,
  FOCUS_PRIORITIES,
  MAX_ACTIVE_FOCUSES,
  activeFocuses,
  canAddFocus,
  closedFocuses,
  focusOutcome,
  hasOpenFocusFor,
  reviewDue,
  type FocusPriority,
} from '@/domain/trainingFocus'
import type { AppLocale } from '@/types/domain'
import type { StoredFocus } from '@/lib/store/localStore'

/**
 * Trainingsschwerpunkte (§74).
 *
 * WAS HIER STEHT UND WAS NICHT
 *
 * Ein Schwerpunkt verbindet einen Befund aus der Diagnostik mit einer
 * Priorität und einem Satz des Trainers. Es gibt hier keine Übungen, keine
 * Sätze und Wiederholungen, keine Videos und keinen Trainingsplan — BASELINE
 * misst und ordnet ein, sie trainiert nicht.
 *
 * DIE ZEILEN KOMMEN AUS DER DIAGNOSTIK, NICHT AUS EINEM LEEREN BLATT. Zur
 * Auswahl stehen die Profilachsen dieses Athleten, die schwächsten zuerst.
 * Damit ist jeder Schwerpunkt an eine Messung gebunden — das ist die Grenze
 * zwischen Diagnostik und Trainingsplan. Eine Achse ohne Messung lässt sich
 * wählen, wird aber als solche gekennzeichnet: eine fehlende Messung ist
 * keine schwache Leistung, und der Trainer soll den Unterschied sehen.
 *
 * DIE APP SCHREIBT KEINEN TEXT. Das Feld ist leer, bis der Trainer etwas
 * hineinschreibt, und wird nie ausgewertet.
 *
 * DER KREIS SCHLIESST SICH ÜBER DIE NÄCHSTE MESSUNG. Neben jedem Schwerpunkt
 * steht die gemessene Veränderung mit dem typischen Fehler dieses Athleten —
 * kein Häkchen, keine Punkte, keine Serie.
 */
export function TrainingFocuses({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const { data, focuses, saveFocus, closeFocus, deleteFocus } = useAppData()
  const [adding, setAdding] = useState(false)

  const axes = useMemo(
    () => radarProfile(data.results, 'population', new Date(), data.profile.disciplineId),
    [data.results, data.profile.disciplineId],
  )
  // Schwächste zuerst; ungemessene ans Ende, weil sie kein Befund sind.
  const ranked = useMemo(
    () =>
      [...axes].sort((a, b) => {
        if (a.score == null && b.score == null) return 0
        if (a.score == null) return 1
        if (b.score == null) return -1
        return a.score - b.score
      }),
    [axes],
  )

  const open = activeFocuses(focuses)
  const closed = closedFocuses(focuses)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Panel>
      <PanelHeader title={t('focus.title')} subtitle={t('focus.hint')} />
      <div className="px-4 py-4">
        {open.length === 0 && !adding && (
          <p className="text-[13px] leading-relaxed text-ink-muted">{t('focus.empty')}</p>
        )}

        {open.length > 0 && (
          <ul className="divide-y divide-line">
            {open.map((focus) => (
              <FocusRow
                key={focus.id}
                focus={focus}
                locale={locale}
                due={reviewDue(focus, today)}
                onClose={() => closeFocus(focus.id, true)}
                onDelete={() => deleteFocus(focus.id)}
              />
            ))}
          </ul>
        )}

        {adding ? (
          <FocusForm
            axes={ranked}
            locale={locale}
            taken={(axisId) => hasOpenFocusFor(focuses, axisId)}
            onCancel={() => setAdding(false)}
            onSave={(focus) => {
              saveFocus(focus)
              setAdding(false)
            }}
          />
        ) : (
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canAddFocus(focuses)}
              onClick={() => setAdding(true)}
            >
              <Plus size={14} aria-hidden />
              {t('focus.add')}
            </Button>
            {!canAddFocus(focuses) && (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                {t('focus.limit', { count: MAX_ACTIVE_FOCUSES })}
              </p>
            )}
          </div>
        )}

        {closed.length > 0 && (
          <details className="mt-4 border-t border-line pt-3">
            <summary className="label-tag cursor-pointer">
              {t('focus.closed', { count: closed.length })}
            </summary>
            <ul className="mt-2 divide-y divide-line">
              {closed.map((focus) => (
                <FocusRow
                  key={focus.id}
                  focus={focus}
                  locale={locale}
                  due={false}
                  onReopen={() => closeFocus(focus.id, false)}
                  onDelete={() => deleteFocus(focus.id)}
                />
              ))}
            </ul>
          </details>
        )}

        <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
          {t('focus.notATrainingPlan')}
        </p>
      </div>
    </Panel>
  )
}

function FocusRow({
  focus,
  locale,
  due,
  onClose,
  onReopen,
  onDelete,
}: {
  focus: StoredFocus
  locale: AppLocale
  due: boolean
  onClose?: () => void
  onReopen?: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const outcome = useMemo(() => focusOutcome(focus, data.results), [focus, data.results])

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="label-tag">{t(`focus.priority.${focus.priority}`)}</span>
        <span className="text-[15px] font-medium">
          {axisLabel(focus.axisId, t, locale)}
        </span>
        {focus.reviewAt && (
          <span
            className={`readout tabular-nums text-[12px] ${due ? 'text-warning' : 'text-ink-muted'}`}
          >
            {t('focus.reviewOn', { date: formatDate(focus.reviewAt, locale) })}
          </span>
        )}
      </div>

      {focus.note && (
        <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line">{focus.note}</p>
      )}

      <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
        <FocusChange focus={focus} outcome={outcome} locale={locale} />
      </p>

      <div className="mt-2 flex gap-2">
        {onClose && (
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            {t('focus.close')}
          </Button>
        )}
        {onReopen && (
          <Button type="button" size="sm" variant="ghost" onClick={onReopen}>
            {t('focus.reopen')}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={t('focus.delete')}
          onClick={onDelete}
        >
          <Trash2 size={14} aria-hidden />
        </Button>
      </div>
    </li>
  )
}

/**
 * Die gemessene Antwort auf den Schwerpunkt.
 *
 * Bewusst zurückhaltend formuliert und bewusst ohne Alarmfarbe: eine
 * Verschlechterung wird sachlich benannt. Sie kann ebenso gut an der
 * Belastung eines Aufbaublocks liegen wie an einer falschen Entscheidung,
 * und das kann die App nicht auseinanderhalten.
 */
function FocusChange({
  focus,
  outcome,
  locale,
}: {
  focus: StoredFocus
  outcome: ReturnType<typeof focusOutcome>
  locale: AppLocale
}) {
  const { t } = useTranslation()
  if (!focus.dimension) return <>{t('focus.noTests')}</>
  if (!outcome.result || !outcome.change) return <>{t('focus.notYetMeasured')}</>

  const { verdict, changePercent } = outcome.change
  const date = formatDate(outcome.result.performedAt, locale)
  if (changePercent == null || verdict === 'first') return <>{t('focus.firstMeasure', { date })}</>
  const amount = formatNumber(Math.abs(changePercent), locale, 1)
  return <>{t(`focus.verdict.${verdict}`, { amount, date })}</>
}

function FocusForm({
  axes,
  locale,
  taken,
  onSave,
  onCancel,
}: {
  axes: { axisId: string; dimension: StoredFocus['dimension']; score: number | null }[]
  locale: AppLocale
  taken: (axisId: string) => boolean
  onSave: (focus: StoredFocus) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const free = axes.filter((axis) => !taken(axis.axisId))
  const [axisId, setAxisId] = useState(free[0]?.axisId ?? '')
  const [priority, setPriority] = useState<FocusPriority>(1)
  const [note, setNote] = useState('')
  const [reviewAt, setReviewAt] = useState('')

  const chosen = free.find((axis) => axis.axisId === axisId)
  const field = 'w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]'

  if (free.length === 0) {
    return (
      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t('focus.allAxesTaken')}</p>
    )
  }

  return (
    <form
      className="mt-3 space-y-3 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({
          id: newId(),
          axisId,
          dimension: chosen?.dimension ?? null,
          priority,
          note: note.slice(0, FOCUS_NOTE_MAX),
          reviewAt: reviewAt || null,
          createdAt: new Date().toISOString(),
          closedAt: null,
        })
      }}
    >
      <label className="block">
        <span className="label-tag">{t('focus.axis')}</span>
        <select className={field} value={axisId} onChange={(e) => setAxisId(e.target.value)}>
          {free.map((axis) => (
            <option key={axis.axisId} value={axis.axisId}>
              {axisLabel(axis.axisId, t, locale)}
              {axis.score == null
                ? ` — ${t('focus.unmeasured')}`
                : ` — ${formatNumber(axis.score, locale, 0)}`}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="label-tag mb-1">{t('focus.priorityLabel')}</legend>
        <div className="flex gap-2">
          {FOCUS_PRIORITIES.map((level) => (
            <Button
              key={level}
              type="button"
              size="sm"
              variant={priority === level ? 'primary' : 'outline'}
              aria-pressed={priority === level}
              onClick={() => setPriority(level)}
            >
              {t(`focus.priority.${level}`)}
            </Button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label-tag">{t('focus.note')}</span>
        <textarea
          className={`${field} resize-y`}
          rows={3}
          maxLength={FOCUS_NOTE_MAX}
          placeholder={t('focus.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <span className="readout mt-1 block text-right text-[12px] tabular-nums text-ink-muted">
          {note.length} / {FOCUS_NOTE_MAX}
        </span>
      </label>

      <label className="block">
        <span className="label-tag">{t('focus.reviewAt')}</span>
        <input
          className={field}
          type="date"
          value={reviewAt}
          onChange={(e) => setReviewAt(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary">
          {t('focus.save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('focus.cancel')}
        </Button>
      </div>
    </form>
  )
}
