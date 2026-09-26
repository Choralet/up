import type { ExerciseNode } from '../data/types'
import {
  goalMet, initialProgress, isUnlocked, levelUp, logSet, nodeState,
  sanitizeProgress, setFocus, suggestNext, todaysValues,
  type Progress,
} from './progress'

const N = (id: string, requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: id, branch: 'push', kind: 'strength', requires, col: 1,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})
// a -> b -> d(skill);  a -> c
const graph = [N('a'), N('b', ['a']), N('c', ['a']), N('d', ['b'], { kind: 'skill' })]

const fresh = (): Progress => initialProgress(graph)

describe('initialProgress', () => {
  it('focuses the root of a branch and leaves empty branches null', () => {
    const p = fresh()
    expect(p.focus.push).toBe('a')
    expect(p.focus.pull).toBeNull()
    expect(p.completed).toEqual([])
    expect(p.logs).toEqual([])
  })
})

describe('isUnlocked / nodeState', () => {
  it('unlocks when all requirements are completed', () => {
    expect(isUnlocked(graph[1], new Set())).toBe(false)
    expect(isUnlocked(graph[1], new Set(['a']))).toBe(true)
    expect(isUnlocked(graph[0], new Set())).toBe(true)
  })
  it('derives state from progress', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    expect(nodeState(graph[0], p)).toBe('completed')
    expect(nodeState(graph[1], p)).toBe('focus')
    expect(nodeState(graph[2], p)).toBe('available')
    expect(nodeState(graph[3], p)).toBe('locked')
  })
})

describe('goalMet', () => {
  const reps = { type: 'reps' as const, sets: 3, target: 10 }
  const hold = { type: 'hold' as const, sets: 3, target: 30 }
  it('needs enough sets at or above the target', () => {
    expect(goalMet(reps, [10, 10, 10])).toBe(true)
    expect(goalMet(reps, [12, 10, 11, 3])).toBe(true)
    expect(goalMet(reps, [10, 10])).toBe(false)
    expect(goalMet(reps, [10, 10, 9])).toBe(false)
  })
  it('does not count short holds and counts full ones', () => {
    expect(goalMet(hold, [30, 30, 29])).toBe(false)
    expect(goalMet(hold, [30, 31, 45])).toBe(true)
  })
})

describe('logSet / todaysValues', () => {
  it('stores a floored value with its date', () => {
    const p = logSet(fresh(), 'a', 9.7, '2026-09-26', 1)
    expect(p.logs).toEqual([{ nodeId: 'a', value: 9, date: '2026-09-26', at: 1 }])
  })
  it('ignores zero, negative, NaN and Infinity, without mutating', () => {
    const base = fresh()
    for (const bad of [0, -3, NaN, Infinity, 0.4]) {
      expect(logSet(base, 'a', bad, '2026-09-26', 1)).toBe(base)
    }
    expect(base.logs).toHaveLength(0)
  })
  it('only counts sets from the given day (day rollover)', () => {
    let p = logSet(fresh(), 'a', 10, '2026-09-25', 1)
    p = logSet(p, 'a', 8, '2026-09-26', 2)
    p = logSet(p, 'b', 7, '2026-09-26', 3)
    expect(todaysValues(p, 'a', '2026-09-26')).toEqual([8])
    expect(todaysValues(p, 'a', '2026-09-27')).toEqual([])
  })
})

describe('suggestNext', () => {
  it('after completing a, suggests b and c as new; d stays out', () => {
    const s = suggestNext(graph, fresh(), 'a')
    expect(s.map((x) => x.node.id).sort()).toEqual(['b', 'c'])
    expect(s.every((x) => x.isNew)).toBe(true)
  })
  it('ranks strength before skill, and older availables before new skills', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    const s = suggestNext(graph, p, 'b')
    expect(s.map((x) => x.node.id)).toEqual(['c', 'd'])
    expect(s[0].isNew).toBe(false)
    expect(s[1].isNew).toBe(true)
  })
  it('returns nothing for an unknown node', () => {
    expect(suggestNext(graph, fresh(), 'zzz')).toEqual([])
  })
})

describe('levelUp', () => {
  it('completes the focus node and moves focus to the chosen next node', () => {
    const p = levelUp(graph, fresh(), 'a', 'b')
    expect(p.completed).toEqual(['a'])
    expect(p.focus.push).toBe('b')
  })
  it('does nothing if the node is not the current focus', () => {
    const base = fresh()
    expect(levelUp(graph, base, 'b', 'c')).toBe(base)
  })
  it('falls back to the first available node when the choice is locked or missing', () => {
    expect(levelUp(graph, fresh(), 'a', 'd').focus.push).toBe('b')
    expect(levelUp(graph, fresh(), 'a', null).focus.push).toBe('b')
  })
  it('reaching the top of a branch leaves focus null instead of crashing', () => {
    const p: Progress = { ...fresh(), completed: ['a', 'b', 'c'], focus: { ...fresh().focus, push: 'd' } }
    const done = levelUp(graph, p, 'd', null)
    expect(done.completed).toContain('d')
    expect(done.focus.push).toBeNull()
  })
  it('never lists a node twice in completed', () => {
    const p = levelUp(graph, fresh(), 'a', 'b')
    expect(new Set(p.completed).size).toBe(p.completed.length)
  })
})

describe('setFocus', () => {
  it('lets the user focus an available node but not a locked one', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    expect(setFocus(graph, p, 'c').focus.push).toBe('c')
    expect(setFocus(graph, p, 'd')).toBe(p)
    expect(setFocus(graph, p, 'a')).toBe(p)
  })
})

describe('sanitizeProgress', () => {
  it('turns garbage into initial progress', () => {
    for (const raw of [undefined, null, 'x', 42, [], {}]) {
      expect(sanitizeProgress(graph, raw)).toEqual(fresh())
    }
  })
  it('drops unknown ids and bad logs', () => {
    const p = sanitizeProgress(graph, {
      completed: ['a', 'ghost', 5, 'a'],
      focus: { push: 'b' },
      logs: [
        { nodeId: 'a', value: 10, date: '2026-09-26', at: 1 },
        { nodeId: 'ghost', value: 10, date: '2026-09-26', at: 2 },
        { nodeId: 'a', value: -1, date: '2026-09-26', at: 3 },
        null,
      ],
    })
    expect(p.completed).toEqual(['a'])
    expect(p.focus.push).toBe('b')
    expect(p.logs).toHaveLength(1)
  })
  it('repairs focus that points at a locked, completed or missing node', () => {
    expect(sanitizeProgress(graph, { completed: [], focus: { push: 'd' } }).focus.push).toBe('a')
    expect(sanitizeProgress(graph, { completed: ['a'], focus: { push: 'a' } }).focus.push).toBe('b')
    expect(sanitizeProgress(graph, { completed: [], focus: { push: 'nope' } }).focus.push).toBe('a')
  })
  it('gives a fully completed branch null focus', () => {
    const p = sanitizeProgress(graph, { completed: ['a', 'b', 'c', 'd'] })
    expect(p.focus.push).toBeNull()
  })
})
