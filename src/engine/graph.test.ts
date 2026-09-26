import type { ExerciseNode } from '../data/types'
import { rootOf } from './graph'

const N = (id: string, over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: id, branch: 'push', kind: 'strength', requires: [], col: 1,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})

describe('rootOf', () => {
  it('never picks a skill step (e.g. a roadmap stretch with no requirements) as the beginner exercise', () => {
    const nodes = [N('stretch', { kind: 'skill', skill: 'mobility', roadmapOnly: true }), N('wall')]
    expect(rootOf(nodes, 'push')?.id).toBe('wall')
  })
})
