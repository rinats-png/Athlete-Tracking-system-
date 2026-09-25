import { defineConfig } from 'vite'

/**
 * Relative Basis: die Seite wird auch von einem Unterpfad aus veröffentlicht
 * (Artifact-Vorschau), nicht nur von der Wurzel einer eigenen Domain. Mit
 * `base: './'` verweisen die von Vite erzeugten Skript- und Stylesheet-Pfade
 * relativ auf `assets/…`, egal unter welchem Pfad `index.html` am Ende liegt.
 */
export default defineConfig({
  base: './',
})
