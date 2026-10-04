import { existsSync, readdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { EXERCISE_IMAGE_KEYS, exerciseImageUrl } from '../src/data/exerciseImages'
import { EXERCISES } from '../src/data/exercises'

/** Etappe 8b: Übungsbilder — Liste und Dateien im Gleichlauf, ohne Bild wie bisher. */

test('jeder Schlüssel der Liste ist eine Übung und hat seine Datei', () => {
  const keys = new Set(EXERCISES.map((e) => e.key))
  for (const k of EXERCISE_IMAGE_KEYS) {
    expect(keys.has(k), `${k} ist keine Übung`).toBe(true)
    expect(existsSync(new URL(`../public/testbilder/U_${k}.jpg`, import.meta.url)), `U_${k}.jpg fehlt`).toBe(true)
  }
})

test('jede gelieferte Datei U_<key>.jpg steht in der Liste', () => {
  const files = readdirSync(new URL('../public/testbilder/', import.meta.url)).filter((f) => /^U_.+\.jpg$/.test(f))
  for (const f of files) expect(EXERCISE_IMAGE_KEYS.has(f.slice(2, -4)), `${f} fehlt in exerciseImages.ts`).toBe(true)
})

test('ohne Bild: null, keine Anfrage', () => {
  expect(exerciseImageUrl('nicht_vorhanden')).toBeNull()
  expect(exerciseImageUrl('custom')).toBeNull()
})

test('alle 72 Übungen haben ein Bild', () => {
  expect(EXERCISE_IMAGE_KEYS.size).toBe(EXERCISES.filter((e) => e.key !== 'custom').length)
})
