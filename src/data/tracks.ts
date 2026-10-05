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
  full: [],
  rest: [],
}

/**
 * Full-body sessions (Plan 9): pairs of tracks, done alternately (one exercise, rest, the other). Short = the first
 * two pairs. Sessions alternate A, B, A… so Dips and Overhead each come every other session.
 */
export const FULL_SESSIONS: Record<'A' | 'B', string[][]> = {
  A: [['vpull', 'dip'], ['squat', 'hinge'], ['hpull', 'hpush']],
  B: [['vpull', 'vpush'], ['squat', 'hinge'], ['hpull', 'hpush']],
}

/** Short length: two tracks per day (Legs + Core keeps one core track). */
export const SHORT_TRACKS: Record<DayType, string[]> = {
  push: ['hpush', 'vpush'],
  pull: ['vpull', 'hpull'],
  legs: ['squat', 'antiext'],
  full: [],
  rest: [],
}

/** Core tracks, taken in turn: one per full-body session, and the finisher on Push and Pull days. */
export const FINISHER_TRACKS = ['antiext', 'compress', 'lateral']

/** Full length adds one of these a day: a different one each week (Push/Pull/Legs) or each session (full body). */
export const ACCESSORY_TRACKS: Record<DayType, string[]> = {
  push: ['tri', 'scap', 'cuff'],
  pull: ['bic', 'rear', 'grip'],
  legs: ['calf', 'tib', 'hips', 'lowback', 'neck'],
  full: ['bic', 'tri', 'rear', 'calf', 'scap', 'hips', 'grip', 'cuff', 'tib', 'lowback', 'neck'],
  rest: [],
}

/** Push/Pull/Legs: Pull day's third exercise on every length but Short, so pulling matches pushing. */
export const PULL_THIRD = ['bic', 'rear']

export const trackById = (id: string) => TRACKS.find((t) => t.id === id)
