import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Erklärung eine Ebene tiefer: ein kleines ⓘ, das einen Satz aufklappt.
 * Der Text kommt erst nach dem Antippen ins Dokument; das ⓘ sagt über
 * `aria-expanded`, ob er offen ist.
 */
export function InfoNote({ text, className, testId }: { text: string; className?: string; testId?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={cn('block', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={t('look.info')}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        data-testid={testId}
        className={cn('-mx-3 inline-flex size-11 items-center justify-center rounded-pill', open ? 'text-accent-text' : 'text-ink-muted')}
      >
        <Info size={16} aria-hidden />
      </button>
      {open && (
        <span id={id} className="block max-w-[52ch] text-[12px] leading-relaxed text-ink-secondary">
          {text}
        </span>
      )}
    </span>
  )
}
