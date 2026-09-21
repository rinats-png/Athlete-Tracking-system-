import { cn } from '@/lib/utils'

/**
 * Eine Skala zum Antippen: 1 bis N, ein Feld je Stufe.
 *
 * WARUM KEIN SCHIEBEREGLER: eine Selbstauskunft von 1 bis 5 hat fünf
 * Antworten, nicht hundert. Ein Regler suggeriert, 3,4 sei etwas anderes als
 * 3,6 — das ist Scheingenauigkeit. Fünf Felder, eines gedrückt, das ist die
 * Wahrheit der Skala. Und auf dem Telefon trifft man ein 44-px-Feld beim
 * Zähneputzen; einen Reglerknopf nicht.
 *
 * Als Radiogruppe ausgezeichnet: Tastatur und Screenreader lesen sie als
 * EINE Auswahl. Ein zweites Tippen auf die gewählte Stufe hebt sie auf —
 * «nicht erfasst» muss erreichbar bleiben, sonst wäre der Wert nie leer.
 *
 * Bewusst KEINE Farbe je Stufe. Rot bei «Stress 5» hiesse, hoher Stress sei
 * ein Fehler des Menschen. Er ist ein Wert.
 */
export function TapScale({
  label,
  value,
  onChange,
  max = 5,
  min = 1,
  lowLabel,
  highLabel,
  className,
}: {
  label: string
  value: number | null
  onChange: (next: number | null) => void
  max?: number
  min?: number
  /** Ein Wort für das untere Ende, z. B. «leer». */
  lowLabel?: string
  /** Ein Wort für das obere Ende, z. B. «voll». */
  highLabel?: string
  className?: string
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className={className}>
      <span className="label-tag">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step) => {
          const selected = value === step
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label}: ${step}`}
              onClick={() => onChange(selected ? null : step)}
              className={cn(
                'readout min-h-11 border text-[15px] transition-colors duration-[var(--motion-fast)]',
                selected
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface-sunken text-ink-secondary hover:border-accent',
              )}
            >
              {step}
            </button>
          )
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-[10px] tracking-wide text-ink-muted uppercase">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}
