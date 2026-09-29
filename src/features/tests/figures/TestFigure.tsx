import { Suspense, lazy } from 'react'

/**
 * Skizze zu einem Test: schematisch, in den Farben der App, hell und dunkel.
 *
 * Die Skizzen liegen in einem eigenen, nachgeladenen Teil. Sie sind kein
 * Bestandteil des Startpakets, und ein Test ohne Skizze lädt sie nie.
 * Solange sie laden, hält ein leerer Rahmen den Platz frei — die Seite
 * springt nicht.
 */
const Library = lazy(() => import('./library'))

export function TestFigure({ id, alt }: { id: string; alt: string }) {
  return (
    <figure className="border-t border-line px-4 py-3">
      <Suspense fallback={<div aria-hidden className="aspect-[16/9] w-full rounded-md bg-[var(--surface-sunken)]" />}>
        <Library id={id} alt={alt} />
      </Suspense>
    </figure>
  )
}
