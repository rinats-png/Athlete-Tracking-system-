import '@fontsource/saira-condensed/latin-600.css'
import '@fontsource/saira-condensed/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import './style.css'
import { SPORTS } from './sports'
import { applyLocale, initialLocale, storeLocale, type Locale } from './i18n'
import type { Dict } from './i18n/en'

type Theme = 'light' | 'dark'

/** Wohin die beiden Türen führen. Über Umgebungsvariablen beim Bauen änderbar. */
const APP_URL = import.meta.env.VITE_APP_URL || 'https://kydon.app'
const MERCH_URL = import.meta.env.VITE_MERCH_URL || ''

const root = document.documentElement
root.classList.remove('no-js')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function currentTheme(): Theme {
  const set = root.getAttribute('data-theme')
  if (set === 'light' || set === 'dark') return set
  return systemDark.matches ? 'dark' : 'light'
}

// --- Links ------------------------------------------------------------------
for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-app-link]')) a.href = APP_URL
for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-app-path]')) a.href = APP_URL.replace(/\/$/, '') + a.dataset.appPath
for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-merch-link]')) {
  if (MERCH_URL) a.href = MERCH_URL
  else
    a.addEventListener('click', (e) => {
      e.preventDefault()
      a.classList.add('is-soon')
      a.setAttribute('data-soon', dict['doors.merch.soon'])
    })
}

// --- App-Aufnahmen ------------------------------------------------------------
/**
 * Echte Bildschirme der App: deutsch auf der deutschen Seite, sonst englisch;
 * hell oder dunkel nach dem Erscheinungsbild. Bilder im immer dunklen
 * Trainingsbereich (`data-shot-theme="dark"`) bleiben dunkel.
 */
function renderShots(locale: Locale) {
  const lang = locale === 'de' ? 'de' : 'en'
  const theme = currentTheme()
  for (const img of document.querySelectorAll<HTMLImageElement>('img[data-shot]')) {
    const t = img.dataset.shotTheme ?? theme
    const src = `app/${lang}/${img.dataset.shot}-${t}.webp`
    if (img.getAttribute('src') !== src) img.setAttribute('src', src)
  }
}

// --- Sportarten -----------------------------------------------------------------
const grid = document.querySelector<HTMLUListElement>('[data-sports]')
function renderSports(t: Dict) {
  if (!grid) return
  const shown = grid.children.length > 0
  grid.innerHTML = SPORTS.map(
    (s) => `<li class="sport photo-card reveal${shown ? ' is-in' : ''}">
      <img class="photo-card__img shot--light" src="sport/${s.motif}-hell.webp" alt="" loading="lazy" decoding="async" width="400" height="400" />
      <img class="photo-card__img shot--dark" src="sport/${s.motif}-dunkel.webp" alt="" loading="lazy" decoding="async" width="400" height="400" />
      <span class="label-tag">${t[s.covers]}</span>
      <span class="sport__name">${t[s.name]}</span>
    </li>`,
  ).join('')
  if (!shown) grid.querySelectorAll('.reveal').forEach((el) => io.observe(el))
}

// --- Erklärfilm (nur Deutsch) ------------------------------------------------------
const film = document.querySelector<HTMLVideoElement>('[data-film]')
const filmSrc = document.querySelector<HTMLSourceElement>('[data-film-src]')
function setFilmSource() {
  if (!film || !filmSrc) return
  // Bei reduzierter Bewegung die ruhige Fassung: gleiche Abfolge, nichts wandert.
  const want = reducedMotion.matches ? 'film/messschwankung-ruhig.mp4' : 'film/messschwankung.mp4'
  if (filmSrc.getAttribute('src') !== want) {
    filmSrc.setAttribute('src', want)
    if (film.readyState > 0) film.load()
  }
}
setFilmSource()
reducedMotion.addEventListener('change', setFilmSource)

function applyLocaleOnly(locale: Locale) {
  for (const el of document.querySelectorAll<HTMLElement>('[data-only-locale]')) {
    const on = el.dataset.onlyLocale === locale
    el.hidden = !on
    if (!on) el.querySelector('video')?.pause()
  }
}

// --- Einblenden beim Scrollen -------------------------------------------------------
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
)

// --- Sprache -------------------------------------------------------------------------
let locale: Locale = initialLocale()
let dict: Dict = applyLocale(locale)
renderSports(dict)
renderShots(locale)
applyLocaleOnly(locale)
const langSelect = document.querySelector<HTMLSelectElement>('[data-lang-select]')
if (langSelect) {
  langSelect.value = locale
  langSelect.addEventListener('change', () => {
    locale = langSelect.value as Locale
    storeLocale(locale)
    dict = applyLocale(locale)
    renderSports(dict)
    renderShots(locale)
    applyLocaleOnly(locale)
    for (const a of document.querySelectorAll('.is-soon')) a.setAttribute('data-soon', dict['doors.merch.soon'])
  })
}

document.querySelectorAll('.reveal').forEach((el, i) => {
  ;(el as HTMLElement).style.setProperty('--i', String(i % 4))
  io.observe(el)
})

// --- Kopfzeile ------------------------------------------------------------------------
const header = document.querySelector('.site-header')
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 24)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// --- Erscheinungsbild ------------------------------------------------------------------
function applyTheme(theme: Theme, store: boolean) {
  root.setAttribute('data-theme', theme)
  if (store) {
    try {
      localStorage.setItem('kydon.theme', theme)
    } catch {
      /* privat: gilt nur für diese Sitzung */
    }
  }
  renderShots(locale)
}
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true)
})
systemDark.addEventListener('change', () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('kydon.theme')
  } catch {
    /* */
  }
  if (!stored) {
    root.removeAttribute('data-theme')
    renderShots(locale)
  }
})
