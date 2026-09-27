import { DEFAULT_SCHEDULE } from '../data/schedule'

import { buildWorkout, nextTrainingDay, sessionSummary, stepperStart, workoutDone } from './workout'
import { NODES } from '../data/nodes'
import { SKILLS } from '../data/skills'
import { sanitizeProgress } from './progress'


describe('nextTrainingDay', () => {
  it('finds the next non-rest day after today, wrapping into next week', () => {
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 0)).toEqual({ daysAhead: 2, day: 'pull' }) // Monday -> Wednesday
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 4)).toEqual({ daysAhead: 3, day: 'push' }) // Friday -> Monday
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 5)).toEqual({ daysAhead: 2, day: 'push' }) // Saturday -> Monday
  })
  it('returns null when every day is rest', () => {
    expect(nextTrainingDay(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'], 3)).toBeNull()
  })
  it('counts a full week if today is the only training day', () => {
    expect(nextTrainingDay(['push', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'], 0)).toEqual({ daysAhead: 7, day: 'push' })
  })
})

describe('workout by tracks and length', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  const ids = (w: ReturnType<typeof buildWorkout>) => ({ main: w.main.map((m) => m.node?.id ?? null), extra: w.extra.map((e) => `${e.role}:${e.node.id}`) })
  it('Standard push day: every push track plus a core finisher', () => {
    expect(ids(buildWorkout(NODES, real(), 'push', SKILLS, 'standard'))).toEqual({
      main: ['push-wall', 'push-pike-hold', 'push-bench-dip'], extra: ['core:core-deadbug'],
    })
  })
  it('Short: the first two tracks only', () => {
    expect(ids(buildWorkout(NODES, real(), 'push', SKILLS, 'short'))).toEqual({ main: ['push-wall', 'push-pike-hold'], extra: [] })
  })
  it('Full: adds the finished variation for volume', () => {
    const w = buildWorkout(NODES, real({ completed: ['push-wall', 'push-incline', 'push-knee'] }), 'push', SKILLS, 'full')
    expect(ids(w).extra).toEqual(['volume:push-knee', 'core:core-deadbug'])
    expect(w.extra[0].of).toBe('push-standard')
  })
  it('Legs + Core day trains both leg and both core tracks, no separate finisher', () => {
    expect(ids(buildWorkout(NODES, real(), 'legs', SKILLS, 'standard'))).toEqual({
      main: ['legs-assisted', 'legs-bridge', 'core-deadbug', 'core-lying-raise'], extra: [],
    })
  })
  it('only active skills of that day, and nothing on a rest day', () => {
    const p = real({ completed: ['push-pike-hold'], skillFocus: { handstand: 'push-hs-chest' } })
    expect(buildWorkout(NODES, p, 'push', SKILLS, 'standard').skill.map((n) => n.id)).toEqual([])
    const rest = buildWorkout(NODES, real(), 'rest', SKILLS, 'standard')
    expect([rest.main, rest.extra, rest.skill]).toEqual([[], [], []])
  })
  it('workoutDone: logged sets count; a main and its Volume variation count as one', () => {
    const L = (nodeId: string, at: number) => ({ nodeId, value: 1, date: '2026-09-25', at })
    const logs = ['legs-assisted', 'legs-bridge', 'core-deadbug', 'core-lying-raise'].flatMap((id, i) => [1, 2, 3].map((k) => L(id, i * 10 + k)))
    const p = real({ logs })
    expect(workoutDone(buildWorkout(NODES, p, 'legs', SKILLS, 'standard'), p, '2026-09-25')).toBe(true)
    expect(workoutDone(buildWorkout(NODES, p, 'legs', SKILLS, 'standard'), real(), '2026-09-25')).toBe(false)
  })
})

describe('sessionSummary / stepperStart', () => {
  const byId = new Map(NODES.map((n) => [n.id, n]))
  const L = (nodeId: string, value: number, date: string, at = 0) => ({ nodeId, value, date, at })
  const base = sanitizeProgress(NODES, { onboarded: true })
  it('lists today’s exercises with sets, best and new bests (only when beaten)', () => {
    const p = { ...base, logs: [L('push-wall', 8, '2026-09-18'), L('push-wall', 9, '2026-09-21', 1), L('push-wall', 7, '2026-09-21', 2), L('core-deadbug', 5, '2026-09-21', 3)] }
    expect(sessionSummary(byId, p, '2026-09-21')).toEqual([
      { node: byId.get('push-wall'), sets: 2, best: 9, newBest: true },
      { node: byId.get('core-deadbug'), sets: 1, best: 5, newBest: false },
    ])
  })
  it('starts from last session’s first set, else the last set today, else the goal', () => {
    const p = { ...base, logs: [L('push-wall', 6, '2026-09-18', 1), L('push-wall', 5, '2026-09-18', 2), L('push-wall', 9, '2026-09-21', 3)] }
    expect(stepperStart(p, 'push-wall', '2026-09-21', 10)).toEqual({ value: 6, lastSession: 6 })
    expect(stepperStart({ ...base, logs: [L('push-wall', 9, '2026-09-21')] }, 'push-wall', '2026-09-21', 10)).toEqual({ value: 9, lastSession: null })
    expect(stepperStart(base, 'push-wall', '2026-09-21', 10)).toEqual({ value: 10, lastSession: null })
  })
})
