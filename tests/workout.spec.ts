import { expect, test, type Page } from '@playwright/test'
import { openDemo } from './helpers'

/**
 * Training starten und Zähler (Entscheidung 13.10.2026, Mockups A und C):
 * Uhrenmotor, Lauf mit Standort, Wiederholungen aus Körperpunkten, laufende
 * Einheit, Zusammenfassung gegen den Messfehler — und die Wege in der App:
 * Startkarte auf «Heute», Bereich «Training», Kraft frei mit Pausenring,
 * Rundenuhr, Lauf, Kamera, Leiste «Training läuft».
 */

test.describe('Fachlogik', () => {
  test('Uhr: Phasen, Restzeit, Vorwarnung, Ende; EMOM und AMRAP ohne Pause', async () => {
    const { clockAt, clockPhases, clockTotalS, CLOCK_PRESETS, normalizeClock } = await import('../src/domain/workoutClock')
    const boxing = CLOCK_PRESETS.boxing
    const phases = clockPhases(boxing)
    expect(phases[0]).toMatchObject({ kind: 'prep', durationS: 10 })
    expect(phases.filter((p) => p.kind === 'work')).toHaveLength(12)
    expect(phases.filter((p) => p.kind === 'rest')).toHaveLength(11)
    expect(clockTotalS(boxing)).toBe(10 + 12 * 180 + 11 * 60)
    expect(clockAt(boxing, 5)).toMatchObject({ round: 0, warn: false, done: false })
    expect(clockAt(boxing, 10 + 100)).toMatchObject({ round: 1, remainingS: 80, warn: false })
    expect(clockAt(boxing, 10 + 175)).toMatchObject({ round: 1, warn: true })
    expect(clockAt(boxing, 10 + 185).phase?.kind).toBe('rest')
    expect(clockAt(boxing, 10 + 245)).toMatchObject({ round: 2 })
    expect(clockAt(boxing, 1e6)).toMatchObject({ done: true, remainingS: 0 })
    expect(clockPhases(CLOCK_PRESETS.emom).some((p) => p.kind === 'rest')).toBe(false)
    expect(normalizeClock({ ...CLOCK_PRESETS.amrap, rounds: 9, restS: 30 })).toMatchObject({ rounds: 1, restS: 0 })
    expect(normalizeClock({ kind: 'rounds', workS: 1, restS: -4, rounds: 500, warnS: 99, prepS: 5 })).toEqual({ kind: 'rounds', workS: 5, restS: 0, rounds: 99, warnS: 2, prepS: 5 })
  })

  test('Uhr: Signale beim Wechsel — Phase, Vorwarnung, 3-2-1, Ende — je nur einmal', async () => {
    const { clockAt, clockCues, CLOCK_PRESETS } = await import('../src/domain/workoutClock')
    const spec = CLOCK_PRESETS.tabata
    const at = (s: number) => clockAt(spec, s)
    expect(clockCues(at(9.5), at(10.1))).toEqual([{ kind: 'phase', phase: 'work', round: 1 }])
    expect(clockCues(at(26.9), at(27.1))).toEqual([{ kind: 'warn' }, { kind: 'count', n: 3 }])
    expect(clockCues(at(27.1), at(27.4))).toEqual([])
    expect(clockCues(at(27.9), at(28.1))).toEqual([{ kind: 'count', n: 2 }])
    expect(clockCues(at(1000), at(1001))).toEqual([])
    const total = 10 + 8 * 20 + 7 * 10
    expect(clockCues(at(total - 0.2), at(total + 1))).toEqual([{ kind: 'done' }])
  })

  test('Lauf: Strecke, ungenaue und unmögliche Punkte verworfen, Intervalle nach Strecke', async () => {
    const { advanceRun, haversineM, lapRun, paceSPerKm, startRun, tickRun } = await import('../src/domain/runTrack')
    expect(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeGreaterThan(111_000)
    expect(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeLessThan(111_400)
    const step = 100 / 111_195 // ~100 m nach Norden
    const spec = { reps: 2, workM: 200, restS: 60 }
    let s = startRun(spec)
    s = advanceRun(s, { t: 0, lat: 48, lon: 11, accuracyM: 5 }, spec)
    s = advanceRun(s, { t: 25, lat: 48 + step, lon: 11, accuracyM: 5 }, spec)
    s = advanceRun(s, { t: 26, lat: 48 + step * 20, lon: 11, accuracyM: 5 }, spec) // Sprung: verworfen
    s = advanceRun(s, { t: 30, lat: 48 + step * 1.5, lon: 11, accuracyM: 80 }, spec) // ungenau: verworfen
    expect(s.rejected).toBe(2)
    expect(s.phase).toBe('work')
    s = advanceRun(s, { t: 50, lat: 48 + step * 2.2, lon: 11, accuracyM: 5 }, spec)
    expect(s.phase).toBe('rest')
    expect(s.splits[0]).toMatchObject({ kind: 'work', index: 1, distanceM: 200 })
    expect(s.splits[0].seconds).toBeGreaterThan(44)
    expect(s.splits[0].seconds).toBeLessThan(50)
    s = tickRun(s, s.segStartT + 59, spec)
    expect(s.phase).toBe('rest')
    s = tickRun(s, s.segStartT + 61, spec)
    expect(s).toMatchObject({ phase: 'work', rep: 2 })
    let free = startRun(null)
    free = advanceRun(free, { t: 0, lat: 48, lon: 11, accuracyM: 5 }, null)
    free = advanceRun(free, { t: 30, lat: 48 + step, lon: 11, accuracyM: 5 }, null)
    free = lapRun(free, 31)
    expect(free.splits[0]).toMatchObject({ kind: 'lap', index: 1 })
    expect(paceSPerKm(1000, 300)).toBe(300)
    expect(paceSPerKm(20, 300)).toBeNull()
  })

  test('Wiederholungen: oben → unten → oben zählt; Zittern nicht; Tempoverlust relativ', async () => {
    const { startReps, stepReps, velocityLossPercent, patternForExercise, jointAngle } = await import('../src/domain/repCounter')
    expect(Math.round(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }))).toBe(90)
    let s = startReps()
    let t = 0
    const feed = (angles: number[], dt = 0.1) => { for (const a of angles) s = stepReps(s, (t += dt), a) }
    feed([170, 168, 171, 165, 169]) // Zittern
    expect(s.reps).toHaveLength(0)
    for (const up of [0.1, 0.12, 0.16]) {
      feed([150, 120, 95, 90])
      feed([110, 140, 165, 170], up)
    }
    expect(s.reps).toHaveLength(3)
    expect(s.reps[0].speed).toBeGreaterThan(s.reps[2].speed)
    expect(velocityLossPercent(s.reps)).toBeGreaterThan(0)
    expect(velocityLossPercent(s.reps.slice(0, 1))).toBeNull()
    feed([null as unknown as number, 160])
    expect(s.reps).toHaveLength(3)
    expect(patternForExercise(['SQUAT_KNEE_DOMINANT'])).toBe('squat')
    expect(patternForExercise(['VERTICAL_PULL'])).toBe('pull')
    expect(patternForExercise(['CARRY'])).toBeNull()
  })

  test('laufende Einheit: Prüfung der gespeicherten Form, Pausen, gemessene Minuten', async () => {
    const { parseActiveWorkout, startWorkout, pauseWorkout, resumeWorkout, workoutElapsedS, measuredMinutes } = await import('../src/domain/activeWorkout')
    const w = startWorkout({ kind: 'clock', title: 'Tabata', path: '/plan/uhr', now: 0 })
    expect(parseActiveWorkout(JSON.parse(JSON.stringify(w)))).toEqual(w)
    expect(parseActiveWorkout({ ...w, path: 'https://fremd.example/' })).toBeNull()
    expect(parseActiveWorkout({ ...w, kind: 'x' })).toBeNull()
    expect(parseActiveWorkout('kaputt')).toBeNull()
    const p = resumeWorkout(pauseWorkout(w, 60_000), 120_000)
    expect(workoutElapsedS(p, 180_000)).toBe(120)
    expect(measuredMinutes(p, 180_000)).toBe(2)
    expect(measuredMinutes(w, 10)).toBe(1)
  })

  test('Zusammenfassung: Vergleich mit dem letzten Mal, Urteil erst ab vier Einheiten', async () => {
    const { summarizeSession } = await import('../src/domain/workoutSummary')
    const legacyOf = (id: string) => (id === 'EX_SQ' ? 'squat' : undefined)
    const workout = (day: string, kg: number) => ({ id: day, day, title: '', exercises: [{ id: 'e', exerciseKey: 'squat', customName: '', sets: [{ id: 's', weightKg: kg, reps: 5, rir: null }] }], durationMin: null, rpe: null, diarySessionId: null, note: '', createdAt: `${day}T10:00:00Z`, updatedAt: `${day}T10:00:00Z` })
    const set = (kg: number) => ({ part: 0, exerciseId: 'EX_SQ', name: 'Kniebeuge', set: 1, reps: 5, weightKg: kg, rir: null, rpe: null, durationS: null, distanceM: null })
    const first = summarizeSession([set(80)], [], legacyOf)
    expect(first.exercises[0]).toMatchObject({ metric: 'e1rm', previous: null, verdict: null })
    const two = summarizeSession([set(82.5)], [workout('2026-10-01', 80)], legacyOf)
    expect(two.exercises[0]).toMatchObject({ verdict: 'unknown_error', changePercent: 3.2 })
    const history = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d, i) => workout(d, [80, 81, 80, 81][i]))
    const judged = summarizeSession([set(90)], history as never, legacyOf)
    expect(judged.exercises[0].verdict).toBe('better')
    const same = summarizeSession([set(81)], history as never, legacyOf)
    expect(same.exercises[0].verdict).toBe('within_noise')
    const bodyweight = summarizeSession([{ ...set(0), weightKg: null, exerciseId: null, name: 'Klimmzug', reps: 7 }], [], legacyOf)
    expect(bodyweight.exercises[0]).toMatchObject({ metric: 'reps', value: 7 })
  })

  test('Schläge: Schwelle aus der Probe, Ruhezeit verhindert Doppelzählung', async () => {
    const { calibrate, startOnsets, stepOnsets } = await import('../src/domain/punchCounter')
    expect(calibrate([0.3, 0.4], 0.01)).toBeNull()
    const th = calibrate([0.3, 0.35, 0.4, 0.32, 0.38, 0.36], 0.01) as number
    expect(th).toBeCloseTo(0.216, 2)
    let s = startOnsets(th)
    for (const [t, l] of [[0, 0.01], [0.1, 0.3], [0.15, 0.32], [0.2, 0.05], [0.21, 0.3], [0.6, 0.02], [0.7, 0.35]] as const) s = stepOnsets(s, t, l)
    expect(s.count).toBe(2)
  })

  test('Messfehler einer Reihe: dieselbe Rechnung wie bei Tests', async () => {
    const { typicalErrorOfSeries, MIN_POINTS_FOR_ERROR } = await import('../src/domain/change')
    expect(typicalErrorOfSeries([1, 2, 3])).toBeNull()
    expect(MIN_POINTS_FOR_ERROR).toBe(4)
    expect(typicalErrorOfSeries([100, 102, 100, 102])).toBeGreaterThan(0)
  })
})

test.describe('Bildschirme', () => {
  const athlete = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('kydon.data.v1') as string).athletes[0])

  test('Heute: Startkarte und vier Schnellstarts; Training-Bereich startet mit einem Tipp', async ({ page }) => {
    await openDemo(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('quick-starts')).toBeVisible()
    for (const k of ['strength', 'run', 'clock', 'camera']) await expect(page.getByTestId(`quick-${k}`)).toBeVisible()
    await page.goto('/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('hub-start-card')).toBeVisible()
    await expect(page.getByTestId('hub-go')).toBeVisible()
  })

  test('Kraft frei: Fokus, ±, «Satz fertig», Pausenring, Fortsetzen nach Neuladen, Leiste, Zusammenfassung', async ({ page }) => {
    await openDemo(page)
    await page.goto('/plan/frei/neu', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('free-name')).not.toHaveValue('')
    await page.getByTestId('free-search').fill('Goblet')
    await page.getByTestId('free-add-EX_KB_082_GOBLET_SQUAT').click()
    await page.getByTestId('free-build-start').click()
    await expect(page.getByTestId('player-elapsed')).toBeVisible()
    await expect(page.getByTestId('setlog-focus-set')).toContainText('1')
    await page.getByTestId('setlog-focus-plus-reps').click()
    await page.getByTestId('setlog-focus-plus-reps').click()
    await expect(page.getByTestId('setlog-focus-reps')).toHaveValue('2')
    await page.getByTestId('setlog-focus-reps').fill('10')
    await page.getByTestId('setlog-done-set').click()
    await expect(page.getByTestId('setlog-rest')).toBeVisible()
    await page.getByTestId('rest-plus').click()
    await expect(page.getByTestId('rest-next')).toContainText('2')
    await page.getByTestId('setlog-rest-skip').click()
    await expect(page.getByTestId('setlog-count')).toContainText('1')
    // Neuladen: der Satz ist noch da, die Uhr läuft weiter.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('setlog-count')).toContainText('1')
    await expect(page.getByTestId('setlog-focus-set')).toContainText('2')
    // Woanders hin: die Leiste «Training läuft» führt zurück.
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('active-workout-bar')).toBeVisible()
    await page.getByTestId('active-workout-back').click()
    await expect(page.getByTestId('free-player')).toBeVisible()
    await page.getByTestId('free-rpe-7').click()
    await page.getByTestId('free-save').click()
    await expect(page).toHaveURL(/\/plan\/fertig$/)
    await expect(page.getByTestId('workout-summary')).toBeVisible()
    await expect(page.getByTestId('summary-sets')).toContainText('1')
    await expect(page.getByTestId('summary-row')).toHaveAttribute('data-verdict', 'first')
    const a = await athlete(page)
    expect(a.workouts.some((w: { exercises: { sets: { reps: number }[] }[] }) => w.exercises[0]?.sets[0]?.reps === 10)).toBe(true)
    expect(await page.evaluate(() => localStorage.getItem('kydon.workout.active.v1'))).toBeNull()
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('active-workout-bar')).toHaveCount(0)
  })

  test('Rundenuhr: Vorlage, Vorlauf, Pause, Beenden mit RPE → Zusammenfassung mit Runden', async ({ page }) => {
    await openDemo(page)
    await page.goto('/plan/uhr', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('clock-preset-tabata').click()
    await expect(page.getByTestId('clock-rounds')).toHaveValue('8')
    await page.getByTestId('clock-start').click()
    await expect(page.getByTestId('clock-run')).toHaveAttribute('data-phase', 'prep')
    await page.getByTestId('clock-skip').click()
    await expect(page.getByTestId('clock-run')).toHaveAttribute('data-phase', /work|warn/)
    await expect(page.getByTestId('clock-phase')).toContainText('1')
    await page.getByTestId('clock-pause').click()
    await expect(page.getByTestId('clock-paused')).toBeVisible()
    await page.getByTestId('clock-finish').click()
    await page.getByTestId('finish-rpe-8').click()
    await page.getByTestId('finish-save').click()
    await expect(page.getByTestId('workout-summary')).toBeVisible()
    await expect(page.getByTestId('summary-rounds')).toBeVisible()
    const a = await athlete(page)
    const today = new Date().toISOString().slice(0, 10)
    expect(a.diary.find((d: { day: string }) => d.day === today).sessions).toContainEqual(expect.objectContaining({ rpe: 8, kind: 'endurance' }))
  })

  test('Lauf: Standort, Strecke, Beenden → Tagebuch und «Läufe»', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 48.1, longitude: 11.5, accuracy: 5 })
    await openDemo(page)
    await page.goto('/plan/lauf', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('run-start').click()
    await expect(page.getByTestId('run-active')).toBeVisible()
    await expect(page.getByTestId('run-gps')).toContainText(/gut|good/i)
    // 20 m in gut drei Sekunden: ein glaubwürdiger Schritt (schneller wäre ein Sprung im Signal).
    await page.waitForTimeout(3200)
    await context.setGeolocation({ latitude: 48.1 + 20 / 111_195, longitude: 11.5, accuracy: 5 })
    await expect(page.getByTestId('run-distance')).toContainText(/0[,.]02/)
    await page.getByTestId('run-pause').click()
    await page.getByTestId('run-finish').click()
    await page.getByTestId('finish-rpe-5').click()
    await page.getByTestId('finish-save').click()
    await expect(page.getByTestId('summary-distance')).toBeVisible()
    const a = await athlete(page)
    expect(a.activities.some((x: { sport: string; source: string }) => x.sport === 'run' && x.source === 'other')).toBe(true)
  })

  test('Kamera: Übungsauswahl nur mit zählbarem Muster; ohne Kamera ein klarer Ausweg', async ({ page }) => {
    await openDemo(page)
    await page.goto('/plan/kamera', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('camera-search').fill('Kniebeuge')
    const first = page.locator('[data-testid^="camera-ex-"]').first()
    await expect(first).toBeVisible()
    await first.click()
    await expect(page.getByTestId('camera-counter')).toBeVisible()
    // Im Prüfbrowser gibt es keine Kamera: der Zähler sagt das und führt zurück.
    await expect(page.getByTestId('camera-unavailable')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('camera-unavailable').getByRole('button').click()
    await expect(page.getByTestId('setlog-focus')).toBeVisible()
  })
})
