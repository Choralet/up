import type { Branch, DayType, WeekPlan } from './types'

export const DAY_TYPES: DayType[] = ['rest', 'push', 'pull', 'legs', 'full']

/** Training day types of each weekly plan (Settings offers these plus Rest). */
export const PLAN_DAYS: Record<WeekPlan, DayType[]> = { full: ['full'], ppl: ['push', 'pull', 'legs'] }
export const PLAN_LABEL: Record<WeekPlan, string> = { full: 'Full Body', ppl: 'Push / Pull / Legs' }

export const DAY_LABEL: Record<DayType, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs + Core Day',
  full: 'Full Body Day',
  rest: 'Rest Day',
}

/** Branches whose focus exercise is trained on each day type. */
export const DAY_BRANCHES: Record<DayType, Branch[]> = {
  push: ['push'],
  pull: ['pull'],
  legs: ['legs', 'core'],
  full: ['push', 'pull', 'legs', 'core'],
  rest: [],
}

/** Monday first. */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Default only: full body on Monday, Wednesday and Friday (Plan 9). The user can change every day and the plan. */
export const DEFAULT_SCHEDULE: DayType[] = ['full', 'rest', 'full', 'rest', 'full', 'rest', 'rest']

/** The default before Plan 9 (Push / Pull / Legs + Core). An older save still on it moves to the new default. */
export const OLD_DEFAULT_SCHEDULE: DayType[] = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest']

export const WARMUP: Record<Exclude<DayType, 'rest'>, { name: string; amount: string }[]> = {
  push: [{ name: 'Wrist circles', amount: '10 each way' }, { name: 'Arm circles', amount: '10 each way' }, { name: 'Scapular push-ups', amount: '10' }],
  pull: [{ name: 'Arm circles', amount: '10 each way' }, { name: 'Passive hang', amount: '20 s' }, { name: 'Scapular pulls', amount: '10' }],
  legs: [{ name: 'Hip circles', amount: '10 each way' }, { name: 'Leg swings', amount: '10 each leg' }, { name: 'Bodyweight squats', amount: '10' }],
  full: [{ name: 'Arm circles', amount: '10 each way' }, { name: 'Scapular pulls', amount: '10' }, { name: 'Hip circles', amount: '10 each way' }, { name: 'Bodyweight squats', amount: '10' }],
}

/** Added to the warm-up while a hand-balancing skill (Handstand, Planche, Elbow lever) is active. */
export const WRIST_PREP = { name: 'Wrist prep', amount: '3 min' }
export const HAND_BALANCE_SKILLS = ['hs', 'planche', 'elbow']
