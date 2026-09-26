import type { ExerciseNode } from '../data/types'
import {
  activateSkill, applyOverrides, deactivateSkill, editSet, finishOnboarding, firstStep,
  goalMet, initialProgress, isUnlocked, levelUp, logSet, newlyUnlockedSkills, nodeState,
  removeSet, restartOnboarding, sanitizeProgress, setDayType, setFocus, setGoalOverride,
  suggestNext, todaysValues,
  type Progress,
} from './progress'
import { DEFAULT_SCHEDULE } from '../data/schedule'

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

describe('removeSet / editSet (fixing a mis-tap)', () => {
  const logged = () => logSet(logSet(fresh(), 'a', 10, '2026-09-26', 1), 'a', 9, '2026-09-26', 2)

  it('removes only the set at that index', () => {
    expect(removeSet(logged(), 0).logs.map((l) => l.value)).toEqual([9])
    expect(removeSet(logged(), 1).logs.map((l) => l.value)).toEqual([10])
  })
  it('ignores an index that does not exist', () => {
    const p = logged()
    expect(removeSet(p, 5)).toBe(p)
    expect(removeSet(p, -1)).toBe(p)
    expect(removeSet(p, 0.5)).toBe(p)
  })
  it('edits a value with the same rules as logSet', () => {
    expect(editSet(logged(), 1, 12).logs[1].value).toBe(12)
    expect(editSet(logged(), 1, 12.8).logs[1].value).toBe(12)
    expect(editSet(logged(), 0, 12).logs[1].value).toBe(9)
  })
  it('ignores bad values and missing indexes when editing', () => {
    const p = logged()
    for (const bad of [0, -2, NaN, Infinity]) expect(editSet(p, 1, bad)).toBe(p)
    expect(editSet(p, 9, 5)).toBe(p)
  })
})

// skill fixture: strength a -> b; chain "sk": s1 -> s2 -> s3 (needs a); single-step chains "k2", "k3" (need a)
const S = (id: string, requires: string[], skill: string): ExerciseNode =>
  N(id, requires, { kind: 'skill', skill })
const g2 = [N('a'), N('b', ['a']), S('s1', ['a'], 'sk'), S('s2', ['s1'], 'sk'), S('s3', ['s2'], 'sk'), S('k2', ['a'], 'k2'), S('k3', ['a'], 'k3')]
const afterA = (): Progress => ({ ...initialProgress(g2), completed: ['a'], focus: { ...initialProgress(g2).focus, push: 'b' } })

describe('Progress v2 defaults', () => {
  it('starts with the default schedule, no skills, no overrides and not onboarded', () => {
    const p = initialProgress(g2)
    expect(p.schedule).toEqual(DEFAULT_SCHEDULE)
    expect(p.skillFocus).toEqual({})
    expect(p.goalOverrides).toEqual({})
    expect(p.onboarded).toBe(false)
  })
})

describe('skill chains stay out of the branch focus', () => {
  it('level-up never moves branch focus onto a skill step', () => {
    expect(levelUp(g2, initialProgress(g2), 'a', null).focus.push).toBe('b')
  })
  it('suggestNext lists strength options only, and lists the chain steps for a skill', () => {
    expect(suggestNext(g2, initialProgress(g2), 'a').map((s) => s.node.id)).toEqual(['b'])
    const p: Progress = { ...afterA(), skillFocus: { sk: 's1' } }
    expect(suggestNext(g2, p, 's1').map((s) => s.node.id)).toEqual(['s2'])
  })
  it('newlyUnlockedSkills reports skill steps that finishing a node opens', () => {
    expect(newlyUnlockedSkills(g2, initialProgress(g2), 'a').map((n) => n.id)).toEqual(['s1', 'k2', 'k3'])
    expect(newlyUnlockedSkills(g2, afterA(), 'b')).toEqual([])
  })
  it('setFocus refuses skill steps', () => {
    const p = afterA()
    expect(setFocus(g2, p, 's1')).toBe(p)
  })
})

describe('activateSkill / deactivateSkill', () => {
  it('starts a chain at its first trainable step', () => {
    expect(activateSkill(g2, afterA(), 'sk').skillFocus).toEqual({ sk: 's1' })
  })
  it('refuses a locked chain, an unknown chain and a chain that is already active', () => {
    const locked = initialProgress(g2)
    expect(activateSkill(g2, locked, 'sk')).toBe(locked)
    expect(activateSkill(g2, afterA(), 'nope')).toEqual(afterA())
    const on = activateSkill(g2, afterA(), 'sk')
    expect(activateSkill(g2, on, 'sk')).toBe(on)
  })
  it('refuses a finished chain', () => {
    const p: Progress = { ...afterA(), completed: ['a', 's1', 's2', 's3'] }
    expect(activateSkill(g2, p, 'sk')).toBe(p)
  })
  it('allows at most two active skills, and deactivating frees a slot', () => {
    let p = activateSkill(g2, afterA(), 'sk')
    p = activateSkill(g2, p, 'k2')
    const full = activateSkill(g2, p, 'k3')
    expect(full).toBe(p)
    expect(Object.keys(full.skillFocus)).toEqual(['sk', 'k2'])
    const freed = deactivateSkill(p, 'sk')
    expect(Object.keys(freed.skillFocus)).toEqual(['k2'])
    expect(Object.keys(activateSkill(g2, freed, 'k3').skillFocus)).toEqual(['k2', 'k3'])
  })
  it('deactivating an inactive chain changes nothing', () => {
    const p = afterA()
    expect(deactivateSkill(p, 'sk')).toBe(p)
  })
})

describe('skill state and level-up', () => {
  const active = (): Progress => activateSkill(g2, afterA(), 'sk')
  it('marks the current step of an active chain as focus', () => {
    const p = active()
    expect(nodeState(g2[2], p)).toBe('focus')
    expect(nodeState(g2[3], p)).toBe('locked')
    expect(nodeState(g2[5], p)).toBe('available')
  })
  it('completing a step moves the chain to the next step; the last step leaves it null', () => {
    let p = levelUp(g2, active(), 's1', null)
    expect(p.completed).toContain('s1')
    expect(p.skillFocus.sk).toBe('s2')
    p = levelUp(g2, levelUp(g2, p, 's2', null), 's3', null)
    expect(p.skillFocus).not.toHaveProperty('sk') // a finished chain frees its slot
    expect(p.completed).toEqual(expect.arrayContaining(['s1', 's2', 's3']))
  })
  it('does nothing when the skill step is not the chain focus', () => {
    const p = active()
    expect(levelUp(g2, p, 's2', null)).toBe(p)
  })
  it('firstStep skips completed steps and locked ones', () => {
    expect(firstStep(g2, new Set(['a']), 'sk')).toBe('s1')
    expect(firstStep(g2, new Set(['a', 's1']), 'sk')).toBe('s2')
    expect(firstStep(g2, new Set(), 'sk')).toBeNull()
    expect(firstStep(g2, new Set(['a', 's1', 's2', 's3']), 'sk')).toBeNull()
  })
})

describe('goal overrides', () => {
  it('stores a valid override and clears it with null', () => {
    const p = setGoalOverride(initialProgress(g2), 'a', { sets: 4, target: 12 })
    expect(p.goalOverrides).toEqual({ a: { sets: 4, target: 12 } })
    expect(setGoalOverride(p, 'a', null).goalOverrides).toEqual({})
  })
  it('ignores invalid overrides and unknown nodes', () => {
    const p = initialProgress(g2)
    for (const bad of [{ sets: 0, target: 10 }, { sets: 11, target: 10 }, { sets: 3, target: 0 }, { sets: 3, target: 1000 }, { sets: 2.5, target: 10 }, { sets: NaN, target: 10 }]) {
      expect(setGoalOverride(p, 'a', bad), JSON.stringify(bad)).toBe(p)
    }
    expect(setGoalOverride(p, 'ghost', { sets: 3, target: 10 }, g2)).toBe(p)
  })
  it('applyOverrides swaps only sets and target and keeps the goal type', () => {
    const hold = [N('h', [], { goal: { type: 'hold', sets: 3, target: 30 } })]
    const out = applyOverrides(hold, { h: { sets: 4, target: 45 } })
    expect(out[0].goal).toEqual({ type: 'hold', sets: 4, target: 45 })
    expect(applyOverrides(hold, {})).toBe(hold)
  })
})

describe('schedule and onboarding flag', () => {
  it('sets a day type for a valid weekday and rejects bad input', () => {
    const p = initialProgress(g2)
    expect(setDayType(p, 1, 'pull').schedule[1]).toBe('pull')
    expect(setDayType(p, 7, 'pull')).toBe(p)
    expect(setDayType(p, -1, 'pull')).toBe(p)
    expect(setDayType(p, 1.5, 'pull')).toBe(p)
    expect(setDayType(p, 1, 'yoga' as never)).toBe(p)
  })
  it('finishes and restarts onboarding', () => {
    expect(finishOnboarding(initialProgress(g2)).onboarded).toBe(true)
    expect(restartOnboarding(finishOnboarding(initialProgress(g2))).onboarded).toBe(false)
  })
})

describe('sanitizeProgress with Progress v2 fields', () => {
  it('migrates a Plan 1 save: defaults new fields and marks a used app as onboarded', () => {
    const old = { completed: ['a'], focus: { push: 'b' }, logs: [{ nodeId: 'a', value: 10, date: '2026-09-25', at: 1 }] }
    const p = sanitizeProgress(g2, old)
    expect(p.onboarded).toBe(true)
    expect(p.schedule).toEqual(DEFAULT_SCHEDULE)
    expect(p.skillFocus).toEqual({})
    expect(p.goalOverrides).toEqual({})
    expect(p.focus.push).toBe('b')
  })
  it('leaves a brand-new empty save not onboarded, and honours an explicit flag', () => {
    expect(sanitizeProgress(g2, {}).onboarded).toBe(false)
    expect(sanitizeProgress(g2, { onboarded: true }).onboarded).toBe(true)
    expect(sanitizeProgress(g2, { onboarded: false, completed: ['a'] }).onboarded).toBe(false)
  })
  it('repairs a skill step stored as branch focus', () => {
    const p = sanitizeProgress(g2, { completed: ['a'], focus: { push: 's1' } })
    expect(p.focus.push).toBe('b')
  })
  it('keeps a valid schedule and replaces a malformed one', () => {
    const custom = ['pull', 'rest', 'rest', 'rest', 'rest', 'rest', 'push']
    expect(sanitizeProgress(g2, { schedule: custom }).schedule).toEqual(custom)
    for (const bad of [['push'], 'x', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], null]) {
      expect(sanitizeProgress(g2, { schedule: bad }).schedule).toEqual(DEFAULT_SCHEDULE)
    }
  })
  it('repairs skill focus, drops unknown chains and caps active skills at two', () => {
    const p = sanitizeProgress(g2, {
      completed: ['a'],
      skillFocus: { sk: 's3', ghost: 'x', k2: 'k2', k3: 'k3' },
    })
    expect(p.skillFocus).toEqual({ sk: 's1', k2: 'k2' })
  })
  it('drops invalid goal overrides and overrides for unknown nodes', () => {
    const p = sanitizeProgress(g2, {
      goalOverrides: { a: { sets: 4, target: 12 }, b: { sets: 0, target: 5 }, ghost: { sets: 3, target: 10 }, s1: 'x' },
    })
    expect(p.goalOverrides).toEqual({ a: { sets: 4, target: 12 } })
  })
})

describe('finished skills free their slot; the level-up hint ignores the chain you are on', () => {
  it('a finished chain leaves the active list so another skill can start', () => {
    let p = activateSkill(g2, afterA(), 'k2')
    p = activateSkill(g2, p, 'sk')
    expect(activateSkill(g2, p, 'k3')).toBe(p) // both slots used
    p = levelUp(g2, p, 'k2', null) // k2 has a single step, so it is finished
    expect(Object.keys(p.skillFocus)).toEqual(['sk'])
    expect(Object.keys(activateSkill(g2, p, 'k3').skillFocus)).toEqual(['sk', 'k3'])
  })
  it('a chain whose next step is only blocked by a strength exercise stays active', () => {
    const g3 = [N('a'), N('x', ['a']), S('c1', ['a'], 'ck'), S('c2', ['c1', 'x'], 'ck')]
    const p: Progress = { ...initialProgress(g3), completed: ['a'], focus: { ...initialProgress(g3).focus, push: 'x' } }
    const on = activateSkill(g3, p, 'ck')
    const after = levelUp(g3, on, 'c1', null)
    expect(after.skillFocus).toEqual({ ck: null })
  })
  it('newlyUnlockedSkills leaves out the next step of the chain being completed', () => {
    const p: Progress = { ...afterA(), skillFocus: { sk: 's1' } }
    expect(newlyUnlockedSkills(g2, p, 's1')).toEqual([])
  })
  it('sanitize drops an active chain whose steps are all done', () => {
    const p = sanitizeProgress(g2, { completed: ['a', 's1', 's2', 's3'], skillFocus: { sk: 's3', k2: 'k2' } })
    expect(p.skillFocus).toEqual({ k2: 'k2' })
  })
})
