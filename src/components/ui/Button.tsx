import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const button = cva(
    // Pillenform und eine spürbare Antwort auf die Berührung: der Knopf sinkt
  // kurz ein. Ohne diese Rückmeldung wirkt eine schwebende Oberfläche
  // unbeteiligt — man tippt und weiss nicht, ob es angekommen ist.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-display font-semibold uppercase tracking-[0.1em] transition-[background-color,color,border-color,transform] duration-[var(--motion-fast)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent/85',
        outline: 'border border-line-strong text-ink hover:bg-accent-quiet hover:border-accent',
        ghost: 'text-ink-secondary hover:text-ink hover:bg-accent-quiet',
      },
      // Alle Grössen halten die 44-px-Untergrenze für Trefferflächen ein.
      // Ein optisch kleinerer Knopf mit unsichtbar vergrösserter Fläche wäre
      // für Tastatur und Screenreader nicht dasselbe.
      size: {
        sm: 'h-11 px-3 text-[11px]',
        md: 'h-11 px-4 text-xs',
        lg: 'h-12 px-5 text-[13px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(button({ variant, size }), className)} {...props} />
}
