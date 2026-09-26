import { en, type Dict } from './en'
import { de } from './de'
import { fr } from './fr'
import { es } from './es'
import { sv } from './sv'
import { da } from './da'
import { nb } from './nb'
import { nl } from './nl'

/** Dieselben acht Sprachen wie in der App (src/i18n/locales.ts). */
export const LOCALES = ['de', 'en', 'fr', 'es', 'sv', 'da', 'nb', 'nl'] as const
export type Locale = (typeof LOCALES)[number]

export const DICTS: Record<Locale, Dict> = { de, en, fr, es, sv, da, nb, nl }

/** Derselbe Speicherschlüssel wie in der App. */
const KEY = 'kydon.locale'

function toLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null
  const base = tag.toLowerCase().split(/[-_]/)[0]
  if (base === 'no' || base === 'nn') return 'nb'
  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : null
}

/** Gespeicherte Wahl, sonst Browsersprache, sonst Englisch. */
export function initialLocale(): Locale {
  try {
    const stored = toLocale(localStorage.getItem(KEY))
    if (stored) return stored
  } catch {
    /* privat */
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const hit = toLocale(tag)
    if (hit) return hit
  }
  return 'en'
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale)
  } catch {
    /* privat: gilt nur für diese Sitzung */
  }
}

/** Alle markierten Stellen der Seite in einer Sprache setzen. */
export function applyLocale(locale: Locale): Dict {
  const t = DICTS[locale]
  document.documentElement.lang = locale
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t[el.dataset.i18n as keyof Dict]
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-html]')) el.innerHTML = t[el.dataset.i18nHtml as keyof Dict]
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) el.setAttribute('aria-label', t[el.dataset.i18nAria as keyof Dict])
  for (const el of document.querySelectorAll<HTMLImageElement>('[data-i18n-alt]')) el.alt = t[el.dataset.i18nAlt as keyof Dict]
  document.querySelector('meta[name="description"]')?.setAttribute('content', t['meta.description'])
  return t
}
