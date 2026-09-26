import type { ExerciseNode, SkillChain } from '../data/types'
import { DEFAULT_SCHEDULE } from '../data/schedule'
import { initialProgress, logSet, type Progress } from './progress'
import { buildWorkout, nextTrainingDay, workoutDone } from './workout'

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
