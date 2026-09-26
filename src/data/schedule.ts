import type { Branch, DayType } from './types'

export const DAY_TYPES: DayType[] = ['rest', 'push', 'pull', 'legs']

export const DAY_LABEL: Record<DayType, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs + Core Day',
  rest: 'Rest Day',
}

/** Branches whose focus exercise is trained on each day type. */
export const DAY_BRANCHES: Record<DayType, Branch[]> = {
  push: ['push'],
  pull: ['pull'],
  legs: ['legs', 'core'],
  rest: [],
}

/** Monday first. */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Default only: Monday Push, Wednesday Pull, Friday Legs + Core. The user can change every day. */
export const DEFAULT_SCHEDULE: DayType[] = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest']

export const WARMUP: Record<Exclude<DayType, 'rest'>, { name: string; amount: string }[]> = {
  push: [{ name: 'Wrist circles', amount: '10 each way' }, { name: 'Arm circles', amount: '10 each way' }, { name: 'Scapular push-ups', amount: '10' }],
  pull: [{ name: 'Arm circles', amount: '10 each way' }, { name: 'Passive hang', amount: '20 s' }, { name: 'Scapular pulls', amount: '10' }],
  legs: [{ name: 'Hip circles', amount: '10 each way' }, { name: 'Leg swings', amount: '10 each leg' }, { name: 'Bodyweight squats', amount: '10' }],
}
