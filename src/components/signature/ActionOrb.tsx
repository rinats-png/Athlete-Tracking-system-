import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, Table, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Der Action Orb — die eine Schnellaktion, überall erreichbar.
 *
 * Beim Antippen fächern die Aktionen nach oben auf und ziehen sich beim
 * Schliessen in den Orb zurück. Die Bewegung ist die Aussage: die Aktionen
 * KOMMEN aus diesem Knopf, sie erscheinen nicht daneben.
 *
 * Bewusst vier Einträge und keine acht. Ein Fächer, den man lesen muss,
 * ist kein Schnellzugriff mehr — und alles, was hier fehlt, steht ohnehin
 * einen Tipp weiter in der Diagnostik.
 *
 * ZUR BEDIENBARKEIT: der Fächer ist ein Menü mit echtem Fokus, schliesst
 * auf Escape und bei einem Klick daneben, und jede Aktion ist ein Knopf mit
 * sichtbarer Beschriftung — nicht nur ein Symbol. Ein Symbolfächer ohne
 * Text ist für den, der ihn zum ersten Mal sieht, ein Rätsel.
 */
export function ActionOrb() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const actions = [
    { key: 'test', icon: ClipboardList, to: '/diagnostik' },
    { key: 'result', icon: Target, to: '/tests' },
    { key: 'import', icon: Table, to: '/profil/import' },
    { key: 'session', icon: Plus, to: '/diagnostik/neu' },
  ] as const

  return (
    <div
      ref={root}
      className={cn(
        'fixed right-4 z-50',
        // Über der schwebenden Leiste, nicht darauf: die Leiste ist
        // 60 px hoch und schwebt selbst 10 px über dem sicheren Bereich.
        'bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+22px)]',
        'lg:bottom-[calc(env(safe-area-inset-bottom)+22px)]',
      )}
    >
      <ul
        id={menuId}
        hidden={!open}
        className="mb-3 flex flex-col items-end gap-2"
      >
        {actions.map((action, i) => (
          <li
            key={action.key}
            style={{
              // Gestaffelt, von unten nach oben: der Fächer öffnet sich aus
              // dem Orb heraus, statt als Block zu erscheinen.
              animation: `rise var(--motion-base) var(--ease-out) backwards`,
              animationDelay: `${(actions.length - 1 - i) * 45}ms`,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(action.to)
              }}
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-pill border border-line px-4 py-2',
                'bg-glass-strong text-[14px] shadow-elev-2 backdrop-blur-xl',
                'transition-transform duration-[var(--motion-fast)] active:scale-[0.97]',
              )}
            >
              <action.icon size={16} className="text-accent-text" aria-hidden />
              {t(`actionOrb.${action.key}`)}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? t('actionOrb.close') : t('actionOrb.open')}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-14 items-center justify-center rounded-pill',
          'bg-accent text-accent-ink shadow-elev-3',
          'transition-transform duration-[var(--motion-base)] ease-[var(--ease-out)]',
          'active:scale-95',
          open && 'rotate-45',
        )}
      >
        <Plus size={24} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  )
}
