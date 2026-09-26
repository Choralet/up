import type { ExerciseNode, SkillChain } from '../data/types'
import { DEFAULT_SCHEDULE } from '../data/schedule'
import { initialProgress, logSet, type Progress } from './progress'
import { buildWorkout, nextTrainingDay, sessionSummary, stepperStart, workoutDone } from './workout'
import { NODES } from '../data/nodes'
import { SKILLS } from '../data/skills'
import { sanitizeProgress } from './progress'

const N = (id: string, branch: ExerciseNode['branch'], requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: id, branch, kind: 'strength', requires, col: 1,
  goal: { type: 'reps', sets: 2, target: 5 }, cue: 'cue', ...over,
})
const nodes = [
  N('push1', 'push'), N('pull1', 'pull'), N('legs1', 'legs'), N('core1', 'core'),
  N('hs1', 'push', ['push1'], { kind: 'skill', skill: 'handstand', goal: { type: 'hold', sets: 2, target: 10 } }),
  N('mu1', 'pull', ['pull1'], { kind: 'skill', skill: 'muscle-up' }),
]
const chains: SkillChain[] = [
  { id: 'handstand', name: 'Handstand', day: 'push' },
  { id: 'muscle-up', name: 'Muscle-up', day: 'pull' },
]
const p0 = (): Progress => ({ ...initialProgress(nodes), completed: ['push1', 'pull1'], focus: { push: 'push1', pull: 'pull1', legs: 'legs1', core: 'core1' } })

describe('buildWorkout', () => {
  it('push day: the push focus, plus active push skills only', () => {
    const p: Progress = { ...p0(), skillFocus: { handstand: 'hs1', 'muscle-up': 'mu1' } }
    const w = buildWorkout(nodes, p, 'push', chains)
    expect(w.skill.map((n) => n.id)).toEqual(['hs1'])
    expect(w.main).toEqual([{ branch: 'push', node: nodes[0] }])
  })
  it('legs day trains legs and core', () => {
    const w = buildWorkout(nodes, p0(), 'legs', chains)
    expect(w.main.map((m) => m.node?.id)).toEqual(['legs1', 'core1'])
    expect(w.skill).toEqual([])
  })
  it('a finished branch shows as null instead of crashing', () => {
    const p: Progress = { ...p0(), focus: { ...p0().focus, push: null } }
    expect(buildWorkout(nodes, p, 'push', chains).main).toEqual([{ branch: 'push', node: null }])
  })
  it('an active skill with no current step is left out', () => {
    const p: Progress = { ...p0(), skillFocus: { handstand: null } }
    expect(buildWorkout(nodes, p, 'push', chains).skill).toEqual([])
  })
  it('rest day is empty', () => {
    const w = buildWorkout(nodes, p0(), 'rest', chains)
    expect(w.skill).toEqual([])
    expect(w.main).toEqual([])
  })
})

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

describe('workoutDone', () => {
  it('is true only when every exercise met its goal today', () => {
    const w = buildWorkout(nodes, p0(), 'legs', chains)
    let p = p0()
    expect(workoutDone(w, p, '2026-09-21')).toBe(false)
    p = logSet(logSet(p, 'legs1', 5, '2026-09-21', 1), 'legs1', 5, '2026-09-21', 2)
    expect(workoutDone(w, p, '2026-09-21')).toBe(false)
    p = logSet(logSet(p, 'core1', 5, '2026-09-21', 3), 'core1', 5, '2026-09-21', 4)
    expect(workoutDone(w, p, '2026-09-21')).toBe(true)
    expect(workoutDone(w, p, '2026-09-22')).toBe(false)
  })
  it('an empty workout is never done', () => {
    expect(workoutDone(buildWorkout(nodes, p0(), 'rest', chains), p0(), '2026-09-21')).toBe(false)
  })
})

describe('extra exercises', () => {
  const real = (raw: object) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('push day: volume = the finished variation below the focus, plus a core finisher', () => {
    const w = buildWorkout(NODES, real({ completed: ['push-wall', 'push-incline', 'push-knee'] }), 'push', SKILLS)
    expect(w.extra.map((e) => [e.node.id, e.role])).toEqual([['push-knee', 'volume'], ['core-deadbug', 'core']])
    expect(w.extra[0].of).toBe('push-standard')
  })
  it('no volume below a branch root; legs day has no core finisher (core is main)', () => {
    expect(buildWorkout(NODES, real({}), 'pull', SKILLS).extra.map((e) => e.node.id)).toEqual(['core-deadbug'])
    expect(buildWorkout(NODES, real({}), 'legs', SKILLS).extra).toEqual([])
  })
  it('workoutDone counts logged sets, not the goal', () => {
    const p = real({ logs: [1, 2, 3].map((at) => ({ nodeId: 'legs-assisted', value: 2, date: '2026-09-25', at })).concat([1, 2, 3].map((at) => ({ nodeId: 'core-deadbug', value: 2, date: '2026-09-25', at }))) })
    expect(workoutDone(buildWorkout(NODES, p, 'legs', SKILLS), p, '2026-09-25')).toBe(true)
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
