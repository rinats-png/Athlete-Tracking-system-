import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { TapScale } from '@/components/ui/TapScale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { entryOn, hasCore, toDay } from '@/domain/diary'

/**
 * Der heutige Tag, direkt in der Übersicht.
 *
 * DER GANZE SINN VON SCHICHT S1 steckt in dieser Karte: Wer die App
 * öffnet, kann in zwei Tipps festhalten, wie der Tag war — ohne einen
 * Bildschirm zu wechseln. Ist der Tag schon erfasst, sagt die Karte das und
 * führt zum Tagebuch; sie fragt nicht zweimal.
 *
 * Nur die Energie steht hier, nicht Gewicht und Schlaf: eine Zahl zu tippen
 * braucht die Tastatur, eine Stufe zu tippen nicht. Die Karte soll der
 * leichteste Eintrag der App sein.
 */
export function DiaryTodayCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { t } = useTranslation()
  const { diary, saveDiaryEntry } = useAppData()
  const today = toDay(new Date())
  const entry = entryOn(diary, today)
  const done = entry != null && hasCore(entry)

  return (
    <Panel className={className} style={style} data-testid="diary-today">
      <PanelHeader title={t('diary.card.title')} subtitle={done ? t('diary.card.done') : t('diary.card.ask')} />
      <div className="px-4 py-3">
        <TapScale
          label={t('diary.fields.energy')}
          value={entry?.energy ?? null}
          onChange={(v) => saveDiaryEntry(today, { energy: v })}
          lowLabel={t('diary.scale.low')}
          highLabel={t('diary.scale.high')}
        />
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/tagebuch">
            {done ? t('diary.card.open') : t('diary.card.more')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
