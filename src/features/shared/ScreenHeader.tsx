import { cn } from '@/lib/utils'

/** Kopf eines Bereichs: Kennung, Titel, ein Satz Einleitung, optional Aktionen. */
export function ScreenHeader({
  eyebrow,
  title,
  intro,
  action,
  className,
}: {
  eyebrow: string
  title: string
  intro?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <span className="label-tag">{eyebrow}</span>
        <h1 className="mt-1 font-display text-[30px] leading-none font-bold sm:text-[38px]">{title}</h1>
        {intro && <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-ink-secondary">{intro}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </header>
  )
}
