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
      main: ['hpush:w', 'vpush:pk', 'dip:sh'], extra: ['core:antiext:db'],
    })
  })
  it('Short: the first two tracks only', () => {
    expect(ids(buildWorkout(NODES, real(), 'push', SKILLS, 'short'))).toEqual({ main: ['hpush:w', 'vpush:pk'], extra: [] })
  })
  it('Full: adds the finished variation for volume and one accessory', () => {
    const w = buildWorkout(NODES, real({ completed: ['hpush:w', 'hpush:i', 'hpush:k'] }), 'push', SKILLS, 'full')
    expect(ids(w).extra).toEqual(['volume:hpush:k', 'accessory:tri:x1', 'core:antiext:db'])
    expect(w.extra[0].of).toBe('hpush:p')
    expect(w.extra[1].track).toBe('tri')
  })
  it('the accessory changes week to week and stays the same within a week', () => {
    const acc = (date: string) => buildWorkout(NODES, real(), 'pull', SKILLS, 'full', date).extra.find((e) => e.role === 'accessory')!.track
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map(acc)
    expect(new Set(weeks.slice(0, 3))).toEqual(new Set(['bic', 'rear', 'grip']))
    expect(weeks[3]).toBe(weeks[0])
    expect(acc('2026-10-11')).toBe(weeks[0]) // Sunday of the same week
  })
  it('Legs + Core day trains both leg tracks and all three core tracks, no separate finisher', () => {
    expect(ids(buildWorkout(NODES, real(), 'legs', SKILLS, 'standard'))).toEqual({
      main: ['squat:as', 'hinge:gb', 'antiext:db', 'compress:llr', 'lateral:sp'], extra: [],
    })
  })
  it('only active skills of that day, and nothing on a rest day', () => {
    const p = real({ completed: ['antiext:db', 'antiext:pl'], skillFocus: { hs: 'hs:w' } })
    expect(buildWorkout(NODES, p, 'push', SKILLS, 'standard').skill.map((n) => n.id)).toEqual(['hs:w'])
    expect(buildWorkout(NODES, p, 'pull', SKILLS, 'standard').skill).toEqual([])
    const rest = buildWorkout(NODES, real(), 'rest', SKILLS, 'standard')
    expect([rest.main, rest.extra, rest.skill]).toEqual([[], [], []])
  })
  it('a track you have no equipment for is left out of the day', () => {
    const p = real({ settings: { holdSound: true, length: 'standard', equipment: ['band', 'wall'] } })
    expect(ids(buildWorkout(NODES, p, 'push', SKILLS, 'standard')).main).toEqual(['hpush:w', 'vpush:pk'])
    expect(ids(buildWorkout(NODES, p, 'pull', SKILLS, 'standard')).main).toEqual(['hpull:vr'])
  })
  it('workoutDone: logged sets count; a main and its Volume variation count as one', () => {
    const L = (nodeId: string, at: number) => ({ nodeId, value: 1, date: '2026-09-25', at })
    const logs = ['squat:as', 'hinge:gb', 'antiext:db', 'compress:llr', 'lateral:sp'].flatMap((id, i) => [1, 2, 3].map((k) => L(id, i * 10 + k)))
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
    const p = { ...base, logs: [L('hpush:w', 8, '2026-09-18'), L('hpush:w', 9, '2026-09-21', 1), L('hpush:w', 7, '2026-09-21', 2), L('antiext:db', 5, '2026-09-21', 3)] }
    expect(sessionSummary(byId, p, '2026-09-21')).toEqual([
      { node: byId.get('hpush:w'), sets: 2, best: 9, newBest: true },
      { node: byId.get('antiext:db'), sets: 1, best: 5, newBest: false },
    ])
  })
  it('starts from last session’s first set, else the last set today, else the goal', () => {
    const p = { ...base, logs: [L('hpush:w', 6, '2026-09-18', 1), L('hpush:w', 5, '2026-09-18', 2), L('hpush:w', 9, '2026-09-21', 3)] }
    expect(stepperStart(p, 'hpush:w', '2026-09-21', 10)).toEqual({ value: 6, lastSession: 6 })
    expect(stepperStart({ ...base, logs: [L('hpush:w', 9, '2026-09-21')] }, 'hpush:w', '2026-09-21', 10)).toEqual({ value: 9, lastSession: null })
    expect(stepperStart(base, 'hpush:w', '2026-09-21', 10)).toEqual({ value: 10, lastSession: null })
  })
})

describe('Plan 6 review fixes: workout', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  const ids = (w: ReturnType<typeof buildWorkout>) => ({ main: w.main.map((m) => m.node?.id ?? null), extra: w.extra.map((e) => `${e.role}:${e.node.id}`) })
  it('Short Legs + Core keeps core: squats and plank & hollow', () => {
    expect(ids(buildWorkout(NODES, real(), 'legs', SKILLS, 'short')).main).toEqual(['squat:as', 'antiext:db'])
  })
  it('the core finisher moves on to leg raises, then side plank, as each core track is finished', () => {
    const antiext = NODES.filter((n) => n.tree === 'antiext').map((n) => n.id)
    const compress = NODES.filter((n) => n.tree === 'compress').map((n) => n.id)
    expect(ids(buildWorkout(NODES, real({ completed: antiext }), 'push', SKILLS, 'standard')).extra).toEqual(['core:compress:llr'])
    expect(ids(buildWorkout(NODES, real({ completed: [...antiext, ...compress] }), 'pull', SKILLS, 'standard')).extra).toEqual(['core:lateral:sp'])
  })
  it('levelling up the core finisher mid-session still completes the day', () => {
    const L = (nodeId: string, at: number) => ({ nodeId, value: 1, date: '2026-09-21', at })
    const logs = ['hpush:w', 'vpush:pk', 'dip:sh', 'antiext:db'].flatMap((id, i) => [1, 2, 3].map((k) => L(id, i * 10 + k)))
    const p = real({ completed: ['antiext:db'], logs })
    expect(workoutDone(buildWorkout(NODES, p, 'push', SKILLS, 'standard'), p, '2026-09-21')).toBe(true)
  })
  it('a finished track shows null, a skill with no step is left out, an empty workout is never done', () => {
    const dips = NODES.filter((n) => n.tree === 'dip').map((n) => n.id)
    const p = real({ completed: dips, skillFocus: { hs: null } })
    const w = buildWorkout(NODES, p, 'push', SKILLS, 'standard')
    expect(w.main.find((m) => m.track === 'dip')?.node).toBeNull()
    expect(w.skill).toEqual([])
    expect(workoutDone(buildWorkout(NODES, real(), 'rest', SKILLS, 'standard'), real(), '2026-09-21')).toBe(false)
  })
})
