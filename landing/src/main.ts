import '@fontsource/saira-condensed/latin-500.css'
import '@fontsource/saira-condensed/latin-600.css'
import '@fontsource/saira-condensed/latin-700.css'
import '@fontsource/ibm-plex-sans/latin-300.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import './style.css'
import { SPORTS } from './sports'
import type { Theme, WordInk } from './scene/wordInk'

/** Wohin die beiden Türen führen. Über Umgebungsvariablen beim Bauen änderbar. */
const APP_URL = import.meta.env.VITE_APP_URL || 'https://kydon.app'
const MERCH_URL = import.meta.env.VITE_MERCH_URL || ''

const root = document.documentElement
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
  else a.addEventListener('click', (e) => {
    e.preventDefault()
    a.classList.add('is-soon')
    a.setAttribute('data-soon', 'Coming soon')
  })
}

// --- Sportarten ---------------------------------------------------------------
const grid = document.querySelector<HTMLUListElement>('[data-sports]')
if (grid) {
  grid.innerHTML = SPORTS.map(
    (s) => `<li class="sport reveal">
      <img class="shot--light" src="/sport/${s.motif}-hell.webp" alt="" loading="lazy" width="400" height="400" />
      <img class="shot--dark" src="/sport/${s.motif}-dunkel.webp" alt="" loading="lazy" width="400" height="400" />
      <span class="sport__name">${s.name}</span>
      <span class="sport__more">${s.covers}</span>
    </li>`,
  ).join('')
}

// --- Einblenden beim Scrollen -------------------------------------------------
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
document.querySelectorAll('.reveal').forEach((el, i) => {
  ;(el as HTMLElement).style.setProperty('--i', String(i % 4))
  io.observe(el)
})

// --- Kopfzeile ------------------------------------------------------------------
const header = document.querySelector('.site-header')
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 24)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// --- Szene ------------------------------------------------------------------------
let scene: WordInk | null = null
const canvas = document.querySelector<HTMLCanvasElement>('.hero__scene')

async function startScene() {
  if (!canvas) return
  try {
    // Die Buchstaben werden aus der Schrift abgetastet — sie muss geladen sein.
    await document.fonts.load('700 200px "Saira Condensed"')
  } catch {
    /* Ausweichschrift genügt */
  }
  const { WordInk } = await import('./scene/wordInk')
  try {
    scene = new WordInk(canvas, currentTheme())
  } catch {
    canvas.remove() // kein WebGL: die Seite bleibt vollständig ohne Szene
    root.classList.add('no-webgl')
    return
  }
  const s = scene
  let lastW = 0
  let lastH = 0
  const size = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.round(r.width)
    const h = Math.round(r.height)
    if (w === lastW && h === lastH) return
    lastW = w
    lastH = h
    s.setSize(w, h)
  }
  size()
  new ResizeObserver(size).observe(canvas)

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const r = canvas.getBoundingClientRect()
        if (r.bottom < 0) return
        s.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      },
      { passive: true },
    )
    root.addEventListener('mouseleave', () => s.clearPointer())
  }

  const loop = () => {
    const r = canvas.getBoundingClientRect()
    if (r.bottom > 0 && r.top < window.innerHeight) s.render(reducedMotion.matches)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  root.classList.add('scene-ready')
}
void startScene()

// --- Theme ---------------------------------------------------------------------------
function applyTheme(theme: Theme, store: boolean) {
  root.setAttribute('data-theme', theme)
  if (store) {
    try {
      localStorage.setItem('kydon.theme', theme)
    } catch {
      /* privat: gilt nur für diese Sitzung */
    }
  }
  scene?.setTheme(theme)
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
    scene?.setTheme(currentTheme())
  }
})
