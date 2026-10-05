import { DEFAULT_SCHEDULE } from '../data/schedule'

import { buildWorkout, estimateMinutes, nextTrainingDay, sessionIndex, sessionSummary, stepperStart, workoutDone } from './workout'
import { NODES } from '../data/nodes'
import { SKILLS } from '../data/skills'
import { sanitizeProgress } from './progress'


describe('nextTrainingDay', () => {
  it('finds the next non-rest day after today, wrapping into next week', () => {
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 0)).toEqual({ daysAhead: 2, day: 'full' }) // Monday -> Wednesday
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 4)).toEqual({ daysAhead: 3, day: 'full' }) // Friday -> Monday
    expect(nextTrainingDay(DEFAULT_SCHEDULE, 5)).toEqual({ daysAhead: 2, day: 'full' }) // Saturday -> Monday
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
    const acc = (date: string) => buildWorkout(NODES, real(), 'push', SKILLS, 'full', date).extra.find((e) => e.role === 'accessory')!.track
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map(acc)
    expect(new Set(weeks.slice(0, 3))).toEqual(new Set(['tri', 'scap', 'cuff']))
    expect(weeks[3]).toBe(weeks[0])
    expect(acc('2026-10-11')).toBe(weeks[0]) // Sunday of the same week
  })
  it('Pull day gets a third pull exercise (Biceps or Rear delts, by week) so pulling matches pushing', () => {
    const third = (date: string, length: 'short' | 'standard' | 'full' = 'standard') =>
      buildWorkout(NODES, real(), 'pull', SKILLS, length, date).extra.filter((e) => e.role === 'accessory').map((e) => e.track)
    expect([third('2026-10-05')[0], third('2026-10-12')[0]].sort()).toEqual(['bic', 'rear'])
    expect(third('2026-10-05', 'short')).toEqual([])
    const full = third('2026-10-05', 'full')
    expect(full).toHaveLength(2)
    expect(new Set(full).size).toBe(2)
  })
  it('Legs + Core day trains both leg tracks and all three core tracks, no separate finisher', () => {
    expect(ids(buildWorkout(NODES, real(), 'legs', SKILLS, 'standard'))).toEqual({
      main: ['squat:as', 'hinge:gb', 'antiext:db', 'compress:llr', 'lateral:sp'], extra: [],
    })
  })
  it('only active skills of that day, and nothing on a rest day', () => {
    const p = real({ completed: ['antiext:db', 'antiext:pl'], skillFocus: { hs: 'hs:pk' } })
    expect(buildWorkout(NODES, p, 'push', SKILLS, 'standard').skill.map((n) => n.id)).toEqual(['hs:pk'])
    expect(buildWorkout(NODES, p, 'pull', SKILLS, 'standard').skill).toEqual([])
    const rest = buildWorkout(NODES, real(), 'rest', SKILLS, 'standard')
    expect([rest.main, rest.extra, rest.skill]).toEqual([[], [], []])
  })
  it('a track you have no equipment for is left out of the day', () => {
    const p = real({ settings: { holdSound: true, length: 'standard', equipment: ['band', 'wall'] } })
    const push = buildWorkout(NODES, p, 'push', SKILLS, 'standard')
    expect(ids(push).main).toEqual(['hpush:w', 'vpush:pk', null])
    expect(push.main[2]).toMatchObject({ track: 'dip', needs: [['dip'], ['rings'], ['pt']] }) // says what Dips need
    const pull = buildWorkout(NODES, p, 'pull', SKILLS, 'standard')
    expect(ids(pull).main).toEqual([null, 'hpull:vr'])
    expect(pull.main[0].needs).toEqual([['bar'], ['rings']])
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
    const core = (w: ReturnType<typeof buildWorkout>) => ids(w).extra.filter((e) => e.startsWith('core:'))
    expect(core(buildWorkout(NODES, real({ completed: antiext }), 'push', SKILLS, 'standard'))).toEqual(['core:compress:llr'])
    expect(core(buildWorkout(NODES, real({ completed: [...antiext, ...compress] }), 'pull', SKILLS, 'standard'))).toEqual(['core:lateral:sp'])
  })
  it('levelling up the core finisher mid-session still completes the day', () => {
    const L = (nodeId: string, at: number) => ({ nodeId, value: 1, date: '2026-09-21', at })
    const logs = ['hpush:w', 'vpush:pk', 'dip:sh', 'antiext:db'].flatMap((id, i) => [1, 2, 3].map((k) => L(id, i * 10 + k)))
    const p = real({ completed: ['antiext:db'], logs })
    expect(workoutDone(buildWorkout(NODES, p, 'push', SKILLS, 'standard'), p, '2026-09-21')).toBe(true)
  })
  it('a finished track keeps building its hardest exercise, a skill with no step is left out, an empty workout is never done', () => {
    const dips = NODES.filter((n) => n.tree === 'dip').map((n) => n.id)
    const p = real({ completed: dips, skillFocus: { hs: null } })
    const w = buildWorkout(NODES, p, 'push', SKILLS, 'standard')
    expect(w.main.find((m) => m.track === 'dip')).toMatchObject({ keep: true, node: { id: 'dip:krd' } })
    expect(w.skill).toEqual([])
    expect(workoutDone(buildWorkout(NODES, real(), 'rest', SKILLS, 'standard'), real(), '2026-09-21')).toBe(false)
  })
})

describe('Plan 8 review fixes: workout', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('the same exercise is never listed twice in a day (a skill step and its twin track exercise)', () => {
    const p = real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'vpush:pk', 'hspu:pk'], skillFocus: { hspu: 'hspu:epk' } })
    const w = buildWorkout(NODES, p, 'push', SKILLS, 'standard')
    const ids = [...w.skill, ...w.main.flatMap((m) => (m.node ? [m.node] : [])), ...w.extra.map((e) => e.node)].flatMap((n) => [n.id, ...(n.twins ?? [])])
    expect(ids.filter((id) => id === 'vpush:epk' || id === 'hspu:epk')).toHaveLength(2) // one exercise: itself + its twin
    expect(w.skill.map((n) => n.id)).toEqual(['hspu:epk'])
  })
})

describe('Plan 9: full body', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  const ids = (w: ReturnType<typeof buildWorkout>) => ({ main: w.main.map((m) => `${m.pair}:${m.node?.id ?? null}`), extra: w.extra.map((e) => `${e.role}:${e.node.id}`) })
  it('session A: pull-ups + dips, squats + hinge, rows + push-ups, then one core exercise', () => {
    const w = buildWorkout(NODES, real(), 'full', SKILLS, 'standard', '2026-10-12')
    expect(w.session).toBe('A')
    expect(ids(w)).toEqual({
      main: ['1:vpull:dh', '1:dip:sh', '2:squat:as', '2:hinge:gb', '3:hpull:vr', '3:hpush:w'],
      extra: [expect.stringMatching(/^core:/)],
    })
  })
  it('sessions alternate A-B-A, then B-A-B; session B swaps Dips for Overhead', () => {
    const letter = (date: string) => buildWorkout(NODES, real(), 'full', SKILLS, 'standard', date).session
    const letters = ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16'].map(letter)
    expect(letters.join('')).toMatch(/^(ABABAB|BABABA)$/) // one week A-B-A, the next B-A-B
    const b = buildWorkout(NODES, real(), 'full', SKILLS, 'standard', '2026-10-05')
    expect(b.session).toBe('B')
    expect(b.main.map((m) => m.track)).toEqual(['vpull', 'vpush', 'squat', 'hinge', 'hpull', 'hpush'])
  })
  it('the core exercise rotates through the three core tracks', () => {
    const coreOf = (date: string) => buildWorkout(NODES, real(), 'full', SKILLS, 'standard', date).extra.find((e) => e.role === 'core')!.node.track
    expect(new Set(['2026-10-05', '2026-10-07', '2026-10-09'].map(coreOf))).toEqual(new Set(['antiext', 'compress', 'lateral']))
  })
  it('Short is the first two pairs; Full adds Volume and one accessory', () => {
    expect(ids(buildWorkout(NODES, real(), 'full', SKILLS, 'short', '2026-10-12'))).toEqual({ main: ['1:vpull:dh', '1:dip:sh', '2:squat:as', '2:hinge:gb'], extra: [] })
    const full = buildWorkout(NODES, real({ completed: ['hpush:w'] }), 'full', SKILLS, 'full', '2026-10-12')
    expect(ids(full).extra).toEqual(expect.arrayContaining(['volume:hpush:w', expect.stringMatching(/^accessory:/), expect.stringMatching(/^core:/)]))
  })
  it('skills come every session, whatever their Push/Pull/Legs day', () => {
    const p = real({ completed: ['antiext:db', 'antiext:pl', 'vpull:dh', 'vpull:sp', 'vpull:ah', 'vpull:np', 'vpull:pu'], skillFocus: { hs: 'hs:pk', fl: 'fl:tf' } })
    expect(buildWorkout(NODES, p, 'full', SKILLS, 'standard', '2026-10-07').skill.map((n) => n.id)).toEqual(['hs:pk', 'fl:tf'])
  })
  it('pull and push sets are balanced over a week (within one exercise)', () => {
    const week = ['2026-10-05', '2026-10-07', '2026-10-09'].map((d) => buildWorkout(NODES, real(), 'full', SKILLS, 'standard', d))
    const count = (b: string) => week.flatMap((w) => w.main).filter((m) => m.node?.branch === b).length
    expect(Math.abs(count('pull') - count('push'))).toBeLessThanOrEqual(1)
    expect(count('legs')).toBe(6)
  })
  it('estimates the time: 45–60 minutes for a Standard session, about 30 for Short', () => {
    const p = real()
    const std = estimateMinutes(buildWorkout(NODES, p, 'full', SKILLS, 'standard', '2026-10-05'))
    expect(std).toBeGreaterThanOrEqual(35)
    expect(std).toBeLessThanOrEqual(60)
    expect(estimateMinutes(buildWorkout(NODES, p, 'full', SKILLS, 'short', '2026-10-05'))).toBeLessThan(std)
    expect(sessionIndex(DEFAULT_SCHEDULE, '2026-10-06')).toBe(sessionIndex(DEFAULT_SCHEDULE, '2026-10-07')) // a rest day takes the next session
  })
})
