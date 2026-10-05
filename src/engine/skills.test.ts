import type { ExerciseNode } from '../data/types'
import { initialProgress, type Progress } from './progress'
import { skillStatus } from './skills'

const N = (id: string, requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: `Name ${id}`, branch: 'push', kind: 'strength', requires,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})
const nodes = [
  N('a'), N('b', ['a']),
  N('s1', ['b'], { kind: 'skill', skill: 'sk' }), N('s2', ['s1'], { kind: 'skill', skill: 'sk' }),
]
const p0 = (): Progress => initialProgress(nodes)

describe('skillStatus', () => {
  it('is locked and names what is missing', () => {
    const s = skillStatus(nodes, p0(), 'sk')
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['Name b'])
    expect(s.total).toBe(2)
    expect(s.done).toBe(0)
  })
  it('is available once the requirement is done', () => {
    const s = skillStatus(nodes, { ...p0(), completed: ['a', 'b'] }, 'sk')
    expect(s.status).toBe('available')
    expect(s.needs).toEqual([])
  })
  it('is active with its current step', () => {
    const s = skillStatus(nodes, { ...p0(), completed: ['a', 'b'], skillFocus: { sk: 's1' } }, 'sk')
    expect(s.status).toBe('active')
    expect(s.currentId).toBe('s1')
  })
  it('is finished when every step is completed', () => {
    const s = skillStatus(nodes, { ...p0(), completed: ['a', 'b', 's1', 's2'] }, 'sk')
    expect(s.status).toBe('finished')
    expect(s.done).toBe(2)
  })
  it('stays active with no current step when the chain has nothing trainable', () => {
    const s = skillStatus(nodes, { ...p0(), completed: ['a', 'b', 's1', 's2'], skillFocus: { sk: null } }, 'sk')
    expect(s.status).toBe('active')
    expect(s.currentId).toBeNull()
  })
})
