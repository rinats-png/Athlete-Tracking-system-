import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { APP_LOCALES, LEGAL_LOCALES, toAppLocale } from '../src/i18n/locales'
import { pick } from '../src/i18n/pick'
import { blockFonts, readDict } from './helpers'
import { emptyData } from '../src/lib/store/schema'

/**
 * Acht Sprachen, eine Regel: keine Leerstelle, kein Schlüssel, keine
 * halbe Übersetzung. Die Wörterbücher werden gegen das deutsche Original
 * geprüft, die Inhaltstabellen gegen den englischen Export — und die
 * Oberfläche in jeder Sprache einmal geöffnet.
 */

const flatten = (o: Record<string, unknown>, prefix = '', out: Record<string, unknown> = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v as Record<string, unknown>, key, out)
    else out[key] = v
  }
  return out
}
const placeholders = (s: unknown) => (String(s).match(/\{\{[^}]+\}\}/g) ?? []).sort().join(' ')
const content = (lang: string) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/content/${lang}.json`, import.meta.url), 'utf-8')) as Record<string, unknown>

test.describe('Wörterbücher', () => {
  const reference = flatten(readDict('de'))

  for (const lang of APP_LOCALES.filter((l) => l !== 'de')) {
    test(`${lang}: dieselben Schlüssel, dieselben Platzhalter, keine Leerstelle`, () => {
      const dict = flatten(readDict(lang))
      const missing = Object.keys(reference).filter((k) => !(k in dict))
      const extra = Object.keys(dict).filter((k) => !(k in reference))
      expect(missing, 'fehlende Schlüssel').toEqual([])
      expect(extra, 'überzählige Schlüssel').toEqual([])
      const empty = Object.keys(reference).filter((k) => typeof dict[k] === 'string' && String(dict[k]).trim() === '' && String(reference[k]).trim() !== '')
      expect(empty, 'leere Zeilen').toEqual([])
      const placeholderMismatch = Object.keys(reference).filter((k) => placeholders(dict[k]) !== placeholders(reference[k]))
      expect(placeholderMismatch, 'Platzhalter weichen ab').toEqual([])
    })
  }
})

test.describe('Inhalte', () => {
  const source = content('en')

  for (const lang of APP_LOCALES.filter((l) => l !== 'de' && l !== 'en')) {
    test(`${lang}: jeder englische Inhalt hat eine Übersetzung`, () => {
      const table = content(lang) as Record<string, string>
      const missing = Object.keys(source).filter((en) => typeof table[en] !== 'string' || table[en].trim() === '')
      expect(missing.length, `${missing.length} fehlen, z. B. ${missing.slice(0, 3).join(' | ')}`).toBe(0)
      const unknown = Object.keys(table).filter((en) => !(en in source))
      expect(unknown, 'Schlüssel, die es im Export nicht gibt').toEqual([])
    })
  }

  test('pick() fällt auf Englisch zurück, nie ins Leere', () => {
    const text = { de: 'Griffkraft', en: 'Grip strength', fr: 'Force de préhension' }
    expect(pick(text, 'fr')).toBe('Force de préhension')
    expect(pick(text, 'sv')).toBe('Grip strength')
    expect(pick(text, 'de')).toBe('Griffkraft')
    expect(pick(undefined, 'nl')).toBeUndefined()
  })

  test('Browserkennungen werden auf die Sprachen der App abgebildet', () => {
    expect(toAppLocale('de-CH')).toBe('de')
    expect(toAppLocale('nb-NO')).toBe('nb')
    expect(toAppLocale('nn')).toBe('nb')
    expect(toAppLocale('no')).toBe('nb')
    expect(toAppLocale('pt-BR')).toBe('de')
    expect(toAppLocale(null)).toBe('de')
  })
})

/** Ein eingerichteter, leerer Bestand in einer bestimmten Sprache. */
async function openIn(page: import('@playwright/test').Page, lang: string) {
  await blockFonts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const seeded = emptyData()
  seeded.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
  await page.evaluate(
    ({ store, lang }) => {
      localStorage.clear()
      localStorage.setItem('baseline.theme', 'dark')
      localStorage.setItem('baseline.locale', lang)
      localStorage.setItem('baseline.intro', 'off')
      localStorage.setItem(
        'baseline.account.v1',
        JSON.stringify({ name: 'Prueflauf', email: 'pruef@baseline.test', role: 'athlete', planId: null, createdAt: '2026-01-01T00:00:00.000Z' }),
      )
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
      localStorage.setItem('baseline.mode', 'guest')
    },
    { store: seeded, lang },
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test.describe('In der Oberfläche', () => {
  for (const lang of APP_LOCALES.filter((l) => l !== 'de')) {
    test(`${lang}: Navigation, Testkatalog und Rechtsseite sprechen die Sprache`, async ({ page }) => {
      await openIn(page, lang)
      const dict = readDict(lang)
      // Die Navigation trägt das Wörterbuch …
      await expect(page.getByRole('button', { name: dict.nav.diagnostics }).first()).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', lang)

      // … der Katalog die ergänzten Inhalte: der Cooper-Test heisst in jeder
      // Sprache so, wie die Inhaltstabelle es sagt, nie nur deutsch.
      await page.goto('/tests', { waitUntil: 'domcontentloaded' })
      const cooperEn = 'Cooper Test (12 minutes)'
      const expected = lang === 'en' ? cooperEn : (content(lang) as Record<string, string>)[cooperEn]
      await expect(page.getByText(expected, { exact: true }).first()).toBeVisible()
      await expect(page.getByText('Cooper-Test (12 Minuten)', { exact: true })).toHaveCount(0)

      // Die Rechtsseiten gibt es nur deutsch und englisch — und sie sagen es.
      await page.goto('/datenschutz', { waitUntil: 'domcontentloaded' })
      const note = page.getByTestId('legal-language-note')
      if (LEGAL_LOCALES.includes(lang)) await expect(note).toHaveCount(0)
      else await expect(note).toBeVisible()
    })
  }

  test('die Sprachwahl im Profil führt alle acht Sprachen mit Eigennamen', async ({ page }) => {
    await openIn(page, 'de')
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const select = page.getByTestId('language-select')
    await expect(select.locator('option')).toHaveCount(APP_LOCALES.length)
    await expect(select.locator('option', { hasText: 'Svenska' })).toHaveCount(1)
    await select.selectOption('nl')
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(readDict('nl').profile.title)
    await expect(page.getByRole('button', { name: readDict('nl').nav.diagnostics }).first()).toBeVisible()
  })
})
