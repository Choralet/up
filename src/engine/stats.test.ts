import type { ExerciseNode } from '../data/types'
import { initialProgress, type Progress, type SetLog } from './progress'
import { afterLevel, branchLevel, branchProgress, history, personalBests, recentSessions, sessionMinutes, streakDaysNeeded, weekStrip, weeklyGain, weeklyStreak } from './stats'

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
  id, name: `Name ${id}`, branch: 'push', kind: 'strength', requires: [],
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

describe('streakDaysNeeded', () => {
  it('is 2 with two or more planned days, otherwise 1', () => {
    expect(streakDaysNeeded(['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'])).toBe(2)
    expect(streakDaysNeeded(['push', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'])).toBe(1)
    expect(streakDaysNeeded(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'])).toBe(1)
  })
})

describe('week strip, sessions, weekly gain', () => {
  const sched = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'] as const
  it('marks this week’s days as trained, planned or rest', () => {
    const strip = weekStrip([L('2026-09-21'), L('2026-09-23', 'b')], [...sched], '2026-09-24')
    expect(strip.map((d) => [d.date, d.planned, d.trained, d.isToday])).toEqual([
      ['2026-09-21', 'push', true, false], ['2026-09-22', 'rest', false, false], ['2026-09-23', 'pull', true, false],
      ['2026-09-24', 'rest', false, true], ['2026-09-25', 'legs', false, false], ['2026-09-26', 'rest', false, false], ['2026-09-27', 'rest', false, false],
    ])
  })
  it('lists recent sessions newest first with exercises and sets', () => {
    const logs = [L('2026-09-21', 'a', 5, 1), L('2026-09-21', 'a', 6, 2), L('2026-09-21', 'b', 3, 3), L('2026-09-23', 'a', 7, 4)]
    expect(recentSessions(logs, 5)).toEqual([
      { date: '2026-09-23', exercises: 1, sets: 1 },
      { date: '2026-09-21', exercises: 2, sets: 3 },
    ])
  })
  it('weekly gain: this week’s best minus last week’s, only when it went up', () => {
    const logs = [L('2026-09-15', 'a', 8), L('2026-09-22', 'a', 10), L('2026-09-15', 'b', 9), L('2026-09-22', 'b', 7)]
    expect(weeklyGain(logs, 'a', '2026-09-24')).toBe(2)
    expect(weeklyGain(logs, 'b', '2026-09-24')).toBeNull()
    expect(weeklyGain(logs, 'c', '2026-09-24')).toBeNull()
  })
})

describe('history', () => {
  it('groups one exercise by session, oldest first, with best and sets', () => {
    const logs = [L('2026-09-21', 'a', 6, 1), L('2026-09-14', 'a', 5, 0), L('2026-09-21', 'a', 8, 2), L('2026-09-21', 'b', 9, 3)]
    expect(history(logs, 'a')).toEqual([
      { date: '2026-09-14', best: 5, sets: 1 },
      { date: '2026-09-21', best: 8, sets: 2 },
    ])
    expect(history(logs, 'zzz')).toEqual([])
  })
})

describe('branchLevel', () => {
  const nodes = [N('a'), N('b', { requires: ['a'] }), N('c', { branch: 'pull' })]
  it('level is the number of finished exercises; the bar is finished over total', () => {
    const p: Progress = { ...initialProgress(nodes), completed: ['a'] }
    expect(branchLevel(nodes, p, 'push')).toEqual({ level: 1, done: 1, total: 2, ratio: 0.5 })
  })
  it('an empty branch has level 0 and an empty bar (never NaN)', () => {
    expect(branchLevel(nodes, initialProgress(nodes), 'legs')).toEqual({ level: 0, done: 0, total: 0, ratio: 0 })
  })
})

describe('afterLevel', () => {
  it('adds one finished exercise', () => {
    expect(afterLevel({ level: 1, done: 1, total: 4, ratio: 0.25 })).toEqual({ level: 2, done: 2, total: 4, ratio: 0.5 })
  })
  it('never passes the total or a full bar', () => {
    expect(afterLevel({ level: 4, done: 4, total: 4, ratio: 1 })).toEqual({ level: 4, done: 4, total: 4, ratio: 1 })
    expect(afterLevel({ level: 0, done: 0, total: 0, ratio: 0 })).toEqual({ level: 0, done: 0, total: 0, ratio: 0 })
  })
})

describe('sessionMinutes', () => {
  it('is the whole minutes from the first to the last set of that day', () => {
    const logs = [L('2026-09-21', 'a', 10, 1_000_000), L('2026-09-21', 'b', 10, 1_000_000 + 14.6 * 60_000), L('2026-09-20', 'a', 10, 0)]
    expect(sessionMinutes(logs, '2026-09-21')).toBe(15)
  })
  it('is 0 with one set or none', () => {
    expect(sessionMinutes([L('2026-09-21')], '2026-09-21')).toBe(0)
    expect(sessionMinutes([], '2026-09-21')).toBe(0)
  })
})
