import type { ExerciseNode } from '../data/types'
import { initialProgress, type Progress, type SetLog } from './progress'
import { branchProgress, personalBests, weeklyStreak } from './stats'

const L = (date: string, nodeId = 'a', value = 10, at = 0): SetLog => ({ nodeId, value, date, at })
const three = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'] as const
const sched = [...three]
// today = Saturday 2026-09-26; this week starts Monday 2026-09-21

describe('weeklyStreak', () => {
  it('is 0 with no logs', () => {
    expect(weeklyStreak([], sched, '2026-09-26')).toBe(0)
  })
  it('counts the current week once it has 2 logged days (with 3 planned days)', () => {
    expect(weeklyStreak([L('2026-09-21')], sched, '2026-09-26')).toBe(0)
    expect(weeklyStreak([L('2026-09-21'), L('2026-09-23')], sched, '2026-09-26')).toBe(1)
  })
  it('does not count several sets on one day as several days', () => {
    expect(weeklyStreak([L('2026-09-21'), L('2026-09-21'), L('2026-09-21')], sched, '2026-09-26')).toBe(0)
  })
  it('an unfinished current week does not break a streak from earlier weeks', () => {
    const logs = [L('2026-09-14'), L('2026-09-16'), L('2026-09-07'), L('2026-09-09')]
    expect(weeklyStreak(logs, sched, '2026-09-21')).toBe(2)
    expect(weeklyStreak(logs, sched, '2026-09-26')).toBe(2)
  })
  it('a missed week resets the streak', () => {
    const logs = [L('2026-09-21'), L('2026-09-23'), L('2026-09-07'), L('2026-09-09')]
    expect(weeklyStreak(logs, sched, '2026-09-26')).toBe(1)
  })
  it('a Sunday log belongs to the week that started the previous Monday', () => {
    const logs = [L('2026-09-14'), L('2026-09-20')] // Monday and Sunday of the same week
    expect(weeklyStreak(logs, sched, '2026-09-26')).toBe(1)
  })
  it('with no planned training days, one logged day is enough', () => {
    const rest = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'] as const
    expect(weeklyStreak([L('2026-09-22')], [...rest], '2026-09-26')).toBe(1)
  })
})

const N = (id: string, over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: `Name ${id}`, branch: 'push', kind: 'strength', requires: [], col: 1,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})
const byId = new Map([N('a'), N('b'), N('c')].map((n) => [n.id, n]))

describe('personalBests', () => {
  it('returns the best value per exercise, most recently trained first', () => {
    const logs = [L('2026-09-20', 'a', 8, 1), L('2026-09-21', 'a', 12, 5), L('2026-09-22', 'b', 6, 9), L('2026-09-19', 'c', 4, 0)]
    const out = personalBests(logs, byId, 2)
    expect(out.map((b) => [b.node.id, b.best])).toEqual([['b', 6], ['a', 12]])
  })
  it('skips logs whose node is unknown', () => {
    expect(personalBests([L('2026-09-20', 'ghost', 9, 1)], byId)).toEqual([])
  })
})

describe('branchProgress', () => {
  const nodes = [N('a'), N('b', { requires: ['a'] }), N('c', { branch: 'pull' })]
  it('counts completed nodes against the branch total', () => {
    const p: Progress = { ...initialProgress(nodes), completed: ['a'] }
    expect(branchProgress(nodes, p, 'push')).toEqual({ done: 1, total: 2 })
    expect(branchProgress(nodes, p, 'pull')).toEqual({ done: 0, total: 1 })
    expect(branchProgress(nodes, p, 'legs')).toEqual({ done: 0, total: 0 })
  })
})
