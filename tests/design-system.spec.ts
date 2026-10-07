import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo, openGuest } from './helpers'

/**
 * Das Designsystem «Performance OS».
 *
 * Diese Fälle sichern die Festlegungen, die man beim Umbauen am leichtesten
 * verliert: dass die Farbwelt unverändert bleibt, dass der Orb eine
 * fehlende Referenz nicht als schlechte Leistung zeichnet, dass die
 * Referenzachse der Richtung des Tests folgt, und dass sich alles bei
 * `prefers-reduced-motion` beruhigt.
 */

const theme = () => readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf-8')

test.describe('Farbwelt bleibt', () => {
  test('die fünf Töne der Palette stehen unverändert im System', () => {
    const css = theme()
    // Mondlicht: Tinte, Jade, Moos, Nebelweiss — Mondstein: Nebel, tiefes Jade, kühle Tinte.
    // Angehoben am 16.09.2026: die frühere Silberfamilie war chromaarm und
    // las sich auf beiden Gründen als Grau. Hue gleich, Chroma höher.
    for (const hex of ['#0B1014', '#7FE5B5', '#5E9B57', '#F2F7F8', '#EAF1F0', '#1E7D63', '#101A18']) {
      expect(css, `${hex} fehlt`).toContain(hex)
    }
  })

  test('der Schatten trägt die Markenfarbe, keine neue', () => {
    // Die kühle Tinte als RGB: der Schatten ist eine Transparenz der
    // Palette, keine erfundene Grauabstufung.
    expect(theme()).toContain('--shadow-hue: 16 26 24')
  })
})

test.describe('Tiefe und Bewegung', () => {
  test('es gibt genau drei Elevationsstufen', () => {
    const css = theme()
    for (const step of ['--elev-1:', '--elev-2:', '--elev-3:']) {
      expect(css).toContain(step)
    }
    expect(css.includes('--elev-4:'), 'vier Stufen wären keine Ordnung mehr').toBe(false)
  })

  test('reduzierte Bewegung wird global respektiert', () => {
    expect(theme()).toContain('prefers-reduced-motion: reduce')
  })

  test('bei reduzierter Bewegung steht der Orb still und zeigt den Wert sofort', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await openDemo(page)
    await page.goto('/uebersicht', { waitUntil: 'domcontentloaded' })

    const orb = page.getByRole('img', { name: /Leistungsprofil als Form/ })
    await expect(orb).toBeVisible()
    // Zwei Messungen der Form im Abstand: ohne Bewegung sind sie gleich.
    const path = page.locator('svg path').first()
    const first = await path.getAttribute('d')
    await page.waitForTimeout(400)
    expect(await path.getAttribute('d'), 'die Atmung muss stillstehen').toBe(first)
    await context.close()
  })
})

test.describe('Performance Orb', () => {
  test('er trägt seine Abdeckung als Beschriftung, nicht nur die Zahl', async ({ page }) => {
    await openDemo(page)
    await page.goto('/uebersicht', { waitUntil: 'domcontentloaded' })
    const orb = page.getByRole('img', { name: /Leistungsprofil als Form/ })
    const label = await orb.getAttribute('aria-label')
    expect(label, 'sonst wäre die Zahl für Screenreader eine Behauptung').toMatch(
      /von \d+ Achsen mit belegter Referenz|belegte Achsen/,
    )
  })

  test('ohne Messungen erscheint er gar nicht — statt als leere Form', async ({ page }) => {
    await openGuest(page)
    await page.goto('/uebersicht', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('img', { name: /Leistungsprofil als Form/ })).toHaveCount(0)
  })

  /*
   * Die Zusage des Bauteils: «Der Abstand jedes Knotens vom Mittelpunkt IST
   * sein Wert.» Sie galt nicht: die Kurve lief über die MITTELPUNKTE
   * zwischen den Knoten, und bei einem Profil mit einer starken und vier
   * unbelegten Achsen — dem Regelfall am Anfang — erreichte sie den starken
   * Knoten nie. Der Punkt schwebte sichtbar neben der Fläche.
   */
  test('die Form läuft durch jeden Knoten, nicht daran vorbei', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await openDemo(page)
    await page.goto('/uebersicht', { waitUntil: 'domcontentloaded' })
    await page.getByRole('img', { name: /Leistungsprofil als Form/ }).waitFor()

    const offPath = await page.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]')!
      const path = svg.querySelector('path') as SVGPathElement
      return [...svg.querySelectorAll('[data-orb-node]')]
        .filter((node) => {
          const point = new DOMPoint(
            Number(node.getAttribute('cx')),
            Number(node.getAttribute('cy')),
          )
          return !path.isPointInStroke(point)
        })
        .map((node) => node.getAttribute('data-orb-node'))
    })
    expect(offPath, 'diese Knoten liegen nicht auf der Umrisslinie').toEqual([])
    await context.close()
  })

  /*
   * Die Beschriftungen hingen früher am Knoten und wanderten mit kleinem
   * Wert nach innen — dort schoben sie sich übereinander und über den Text
   * in der Mitte. Jetzt liegen sie auf einem festen Ring; dieser Fall hält
   * fest, dass sie einander nicht mehr berühren.
   */
  test('die Achsenbeschriftungen überlappen einander nicht', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await openDemo(page)
    await page.goto('/uebersicht', { waitUntil: 'domcontentloaded' })
    await page.getByRole('img', { name: /Leistungsprofil als Form/ }).waitFor()

    const collisions = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('[data-orb-label]')] as SVGTextElement[]
      const boxes = labels.map((el) => ({
        name: el.getAttribute('data-orb-label')!,
        box: el.getBBox(),
      }))
      const hits: string[] = []
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].box
          const b = boxes[j].box
          const overlaps =
            a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
          if (overlaps) hits.push(`${boxes[i].name} / ${boxes[j].name}`)
        }
      }
      return hits
    })
    expect(collisions, 'diese Beschriftungen liegen übereinander').toEqual([])
    await context.close()
  })
})

/**
 * Die schwebende Leiste ist der Weg auf Touch-Geräten. Ab `lg` übernimmt die
 * Kopfzeile — dort gibt es sie bewusst nicht, und diese Fälle überspringen
 * sich selbst, statt eine Leiste zu verlangen, die es nicht geben soll.
 */
async function floatingNav(page: import('@playwright/test').Page) {
  // Kopfzeile und Leiste tragen dieselbe Beschriftung. Unterschieden wird
  // über das, was die schwebende Leiste ausmacht: sie ist `fixed`. Nach
  // Sichtbarkeit allein zu gehen griff auf dem Desktop die Kopfzeile ab.
  const navs = page.getByRole('navigation', { name: 'Hauptnavigation' })
  for (let i = 0; i < (await navs.count()); i++) {
    const candidate = navs.nth(i)
    if (!(await candidate.isVisible())) continue
    const fixed = await candidate.evaluate((el) => getComputedStyle(el).position === 'fixed')
    if (fixed) return candidate
  }
  return null
}

test.describe('Schwebende Navigation', () => {
  test('Lupen-Dock: alle zwölf Bereiche, der aktive steht vergrößert in der Mitte, Antippen holt ihn dorthin', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')

    const buttons = nav!.getByRole('button')
    await expect(buttons).toHaveCount(12)
    // Treffflächen mindestens 44 px und überlappungsfrei (die Lupe vergrößert nur das Bild).
    const boxes = await buttons.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.right, r.width, r.height] }))
    for (const [, , w, h] of boxes) expect(Math.min(w, h)).toBeGreaterThanOrEqual(43.5)
    for (let i = 1; i < boxes.length; i++) expect(boxes[i][0] + 0.5).toBeGreaterThanOrEqual(boxes[i - 1][1])

    const centred = async () =>
      nav!.evaluate((el) => {
        const dock = el.querySelector('[data-testid="nav-dock"]')!.getBoundingClientRect()
        const mid = dock.left + dock.width / 2
        const btn = [...el.querySelectorAll('button')].find((b) => { const r = b.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - mid) < 4 })
        return btn ? { label: btn.querySelector('.sr-only')!.textContent, size: btn.querySelector('.nav-dot')!.getBoundingClientRect().width } : null
      })
    await expect.poll(async () => (await centred())?.label).toBe('Heute')
    const big = (await centred())!.size
    const small = await buttons.nth(5).evaluate((el) => el.querySelector('.nav-dot')!.getBoundingClientRect().width)
    expect(big, 'die Mitte ist vergrößert').toBeGreaterThan(small + 8)

    // Ein Bereich jenseits des Rands: antippen wählt ihn und holt ihn in die Mitte.
    await nav!.getByRole('button', { name: 'Tagebuch' }).click()
    await expect(page).toHaveURL(/tagebuch/)
    await expect.poll(async () => (await centred())?.label).toBe('Tagebuch')
    await expect(nav!.getByRole('button', { name: 'Tagebuch' })).toHaveAttribute('aria-current', 'page')
  })

  test('Wischen: was in der Mitte einrastet, ist gewählt; programmatisches Scrollen wählt nicht', async ({ page }) => {
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')
    const dock = page.getByTestId('nav-dock')
    // Ohne Berührung: Scrollen allein wechselt die Seite nicht.
    await dock.evaluate((el) => el.scrollTo({ left: 56 * 2 }))
    await page.waitForTimeout(400)
    expect(page.url()).not.toMatch(/plan/)
    // Mit Berührung (Wischen): Fuel rastet ein und wird gewählt.
    await dock.dispatchEvent('pointerdown')
    await dock.evaluate((el) => el.scrollTo({ left: 56 * 4 + 10 }))
    await expect(page).toHaveURL(/\/fuel$/)
  })

  test('bei «Bewegung reduzieren» wählt Antippen sofort, ohne Vergrößerung', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')
    await nav!.getByRole('button', { name: 'Leistung' }).click()
    await expect(page).toHaveURL(/performance/, { timeout: 300 })
    const sizes = await nav!.getByRole('button').evaluateAll((els) => els.map((el) => el.querySelector('.nav-dot')!.getBoundingClientRect().width))
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1)
  })

  test('Ton: standardmäßig an, unter Mehr abschaltbar, bleibt nach dem Neuladen aus', async ({ page }) => {
    await openDemo(page)
    await page.goto('/mehr', { waitUntil: 'domcontentloaded' })
    const sw = page.getByTestId('nav-sound')
    await expect(sw).toBeChecked()
    await sw.click()
    await expect(sw).not.toBeChecked()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('nav-sound')).not.toBeChecked()
    expect(await page.evaluate(() => localStorage.getItem('kydon.navSound'))).toBe('off')
  })
})

test.describe('Action Orb', () => {
  test('er öffnet einen Fächer mit beschrifteten Aktionen und schliesst auf Escape', async ({
    page,
  }) => {
    await openDemo(page)
    const orb = page.getByRole('button', { name: 'Schnellaktionen öffnen' })
    await expect(orb).toBeVisible()
    await orb.click()

    // Beschriftet, nicht nur Symbol: ein Symbolfächer ist beim ersten Mal
    // ein Rätsel.
    await expect(page.getByRole('button', { name: 'Test durchführen' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aus Tabelle übernehmen' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Test durchführen' })).toBeHidden()
  })

  test('er verdeckt die Navigation nicht', async ({ page }) => {
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')

    const orbBox = await page.getByRole('button', { name: 'Schnellaktionen öffnen' }).boundingBox()
    const navBox = await nav!.boundingBox()
    expect(orbBox).toBeTruthy()
    expect(navBox).toBeTruthy()
    expect(
      orbBox!.y + orbBox!.height,
      'der Orb sitzt über der Leiste, nicht darauf',
    ).toBeLessThanOrEqual(navBox!.y + 2)
  })
})

test.describe('Performance Journey', () => {
  test('sie zeigt Ereignisse, nicht jede Messung', async () => {
    const { journey, MAX_NODES } = await import('../src/domain/journey')
    const base = {
      testSlug: 'grip_strength',
      values: {},
      metrics: {},
      bodyWeightKg: null,
      ageYears: null,
      sex: null,
      assessmentId: null,
      attempts: [],
      attemptSelection: null,
      context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
      photo: null,
    }
    // Zwanzig Messungen, jede besser als die vorige: zwanzig Bestwerte.
    const results = Array.from({ length: 20 }, (_, i) => ({
      ...base,
      id: `r${i}`,
      performedAt: new Date(Date.UTC(2026, 0, 5 + i * 14)).toISOString(),
      score: 40 + i,
      createdAt: '2026-01-01T00:00:00.000Z',
    }))
    const nodes = journey(results as never, [])
    expect(nodes.length, 'eine Achse mit zwanzig Punkten ist eine Liste').toBeLessThanOrEqual(
      MAX_NODES,
    )
    expect(nodes[0].kind, 'der Anfang bleibt immer stehen').toBe('start')
    expect(nodes[nodes.length - 1].kind).toBe('now')
  })

  test('die allererste Messung ist ein Anfang, kein Bestwert', async () => {
    const { journey } = await import('../src/domain/journey')
    const one = [
      {
        id: 'r0',
        testSlug: 'grip_strength',
        performedAt: '2026-02-01T10:00:00.000Z',
        values: {},
        metrics: {},
        score: 50,
        bodyWeightKg: null,
        ageYears: null,
        sex: null,
        assessmentId: null,
        attempts: [],
        attemptSelection: null,
        context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
        photo: null,
        createdAt: '2026-02-01T10:00:00.000Z',
      },
    ]
    const nodes = journey(one as never, [])
    expect(nodes.filter((n) => n.kind === 'personal_best')).toHaveLength(0)
  })

  test('ohne Messungen gibt es keine Journey statt einer leeren Achse', async () => {
    const { journey } = await import('../src/domain/journey')
    expect(journey([], [])).toHaveLength(0)
  })

  test('im Verlauf steht sie vor den Zahlen', async ({ page }) => {
    await openDemo(page)
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Deine Journey')).toBeVisible()
    await expect(page.locator('main').getByText('Heute').first()).toBeVisible()
  })
})

test('Leiste: jeder Eintrag führt auf seine eigene Adresse, für Athlet und Trainer', async () => {
  const { dockItemsFor, pathForNavKey } = await import('../src/features/dashboard/BottomNav')
  for (const role of ['solo', 'coach'] as const) {
    const items = dockItemsFor(role)
    for (const item of items) expect(pathForNavKey(item.key), `${role} ${item.key}`).toBe(item.path)
    expect(new Set(items.map((i) => i.path)).size, `${role}: keine Adresse doppelt`).toBe(items.length)
    expect(items.at(-1)!.path).toBe('/mehr')
  }
})
