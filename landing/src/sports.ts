import type { Dict } from './i18n/en'

/** Die Motive aus der App (src/assets/sport) mit Namen- und Kategorieschlüssel. */
export const SPORTS: { motif: string; name: keyof Dict; covers: keyof Dict }[] = [
  { motif: 'judo', name: 'sport.judo', covers: 'cat.combat' },
  { motif: 'boxen', name: 'sport.boxen', covers: 'cat.combat' },
  { motif: 'ringen', name: 'sport.ringen', covers: 'cat.combat' },
  { motif: 'bjj', name: 'sport.bjj', covers: 'cat.combat' },
  { motif: 'mma', name: 'sport.mma', covers: 'cat.combat' },
  { motif: 'karate', name: 'sport.karate', covers: 'cat.combat' },
  { motif: 'kickboxen', name: 'sport.kickboxen', covers: 'cat.combat' },
  { motif: 'taekwondo', name: 'sport.taekwondo', covers: 'cat.combat' },
  { motif: 'fechten', name: 'sport.fechten', covers: 'cat.combat' },
  { motif: 'laeufer', name: 'sport.laeufer', covers: 'cat.running' },
  { motif: 'rad', name: 'sport.rad', covers: 'cat.endurance' },
  { motif: 'schwimmen', name: 'sport.schwimmen', covers: 'cat.endurance' },
  { motif: 'triathlon', name: 'sport.triathlon', covers: 'cat.triathlon' },
  { motif: 'rudern', name: 'sport.rudern', covers: 'cat.hybrid' },
  { motif: 'schlitten', name: 'sport.schlitten', covers: 'cat.hybrid' },
  { motif: 'taktisch', name: 'sport.taktisch', covers: 'cat.tactical' },
]
