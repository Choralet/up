import type { Branch, DayType } from './types'

/** A movement pattern inside a branch. Each track has its own current exercise and levels up on its own. */
export interface Track {
  id: string
  name: string
  branch: Branch
}

/** In the order Find your level asks and a day's workout lists them. */
export const TRACKS: Track[] = [
  { id: 'push-h', name: 'Push-ups', branch: 'push' },
  { id: 'push-v', name: 'Pike & handstand', branch: 'push' },
  { id: 'push-d', name: 'Dips', branch: 'push' },
  { id: 'pull-v', name: 'Pull-ups', branch: 'pull' },
  { id: 'pull-r', name: 'Rows', branch: 'pull' },
  { id: 'legs-s', name: 'Squats', branch: 'legs' },
  { id: 'legs-h', name: 'Hinge', branch: 'legs' },
  { id: 'core-a', name: 'Plank & hollow', branch: 'core' },
  { id: 'core-l', name: 'Leg raises', branch: 'core' },
]

/** Tracks trained on each day type, in order (Short length takes the first two). */
export const DAY_TRACKS: Record<DayType, string[]> = {
  push: ['push-h', 'push-v', 'push-d'],
  pull: ['pull-v', 'pull-r'],
  legs: ['legs-s', 'legs-h', 'core-a', 'core-l'],
  rest: [],
}

/** Core finisher on Push and Pull days. */
export const FINISHER_TRACK = 'core-a'

export const trackById = (id: string) => TRACKS.find((t) => t.id === id)
