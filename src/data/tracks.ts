import { TREES } from './trees'
import type { Branch, DayType } from './types'

/** A main or muscle-specific tree. Each track has its own current exercise and levels up on its own. */
export interface Track {
  id: string
  name: string
  branch: Branch
  /** a muscle-specific tree: trained as the accessory in Full workouts, never asked in Find your level */
  accessory?: boolean
}

/** Main tracks first (the order Find your level asks them and a day lists them), then accessories. */
export const TRACKS: Track[] = TREES.filter((t) => t.category !== 'skill').map((t) =>
  t.category === 'supp' ? { id: t.id, name: t.name, branch: t.branch, accessory: true } : { id: t.id, name: t.name, branch: t.branch },
)

export const MAIN_TRACKS = TRACKS.filter((t) => !t.accessory)

/** Tracks trained on each day type, in order (Short length takes SHORT_TRACKS). */
export const DAY_TRACKS: Record<DayType, string[]> = {
  push: ['hpush', 'vpush', 'dip'],
  pull: ['vpull', 'hpull'],
  legs: ['squat', 'hinge', 'antiext', 'compress', 'lateral'],
  rest: [],
}

/** Short length: two tracks per day (Legs + Core keeps one core track). */
export const SHORT_TRACKS: Record<DayType, string[]> = {
  push: ['hpush', 'vpush'],
  pull: ['vpull', 'hpull'],
  legs: ['squat', 'antiext'],
  rest: [],
}

/** Core finisher on Push and Pull days: the first of these that still has an exercise. */
export const FINISHER_TRACKS = ['antiext', 'compress', 'lateral']

/** Full length adds one of these a day, a different one each week. */
export const ACCESSORY_TRACKS: Record<DayType, string[]> = {
  push: ['tri', 'scap', 'cuff'],
  pull: ['bic', 'rear', 'grip'],
  legs: ['calf', 'tib', 'hips', 'lowback', 'neck'],
  rest: [],
}

export const trackById = (id: string) => TRACKS.find((t) => t.id === id)
