import type { ExerciseNode } from '../data/types'
import {
  activateSkill, applyOverrides, completeSteps, deactivateSkill, editSet, finishOnboarding, firstStep,
  goalMet, initialProgress, isUnlocked, levelUp, logSet, newlyUnlockedSkills, nodeState,
  removeSet, restartOnboarding, sanitizeProgress, setDayType, setFocus, setGoalOverride,
  suggestNext, todaysValues, setDayPick, toggleWarm, todayState, effectiveGoal, advanceStage, applyStages, unlockedBy,
  passedFor, setEquipment, setPlan, assignDays, settleKeep, keepGoal, currentKeep,
  type Progress,
} from './progress'
import { DEFAULT_SCHEDULE } from '../data/schedule'
import { NODES } from '../data/nodes'

const N = (id: string, requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: id, branch: 'push', kind: 'strength', requires,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})
// a -> b -> d(skill);  a -> c
const graph = [N('a'), N('b', ['a']), N('c', ['a']), N('d', ['b'], { kind: 'skill' })]

const fresh = (): Progress => initialProgress(graph)

describe('initialProgress', () => {
  it('focuses the root of a branch and leaves empty branches null', () => {
    const p = fresh()
    expect(p.focus.push).toBe('a')
    expect(p.focus.pull).toBeUndefined() // no nodes in that track
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
    for (const raw of [undefined, null, 'x', 42]) {
      expect(sanitizeProgress(graph, raw)).toEqual(fresh())
    }
    // an object is treated as a saved progress: badges earned so far count as seen (null)
    for (const raw of [[], {}]) {
      expect(sanitizeProgress(graph, raw)).toEqual({ ...fresh(), seenAchievements: null })
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
    const p = setPlan(initialProgress(g2), 'ppl')
    expect(setDayType(p, 1, 'pull').schedule[1]).toBe('pull')
    const full = initialProgress(g2)
    expect(setDayType(full, 1, 'full').schedule[1]).toBe('full')
    expect(setDayType(full, 1, 'pull')).toBe(full) // not a day of the full-body plan
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

describe('sanitizeProgress, Plan 3 repairs', () => {
  it('floors stored fractional set values and drops ones below 1', () => {
    const p = sanitizeProgress(g2, {
      logs: [
        { nodeId: 'a', value: 9.7, date: '2026-09-26', at: 1 },
        { nodeId: 'a', value: 0.5, date: '2026-09-26', at: 2 },
      ],
    })
    expect(p.logs.map((l) => l.value)).toEqual([9])
  })
  it('moves a skill step stored as branch focus (Plan 1 save) into the active skills', () => {
    const p = sanitizeProgress(g2, { completed: ['a'], focus: { push: 's1' } })
    expect(p.focus.push).toBe('b')
    expect(p.skillFocus).toEqual({ sk: 's1' })
  })
  it('does not migrate a skill focus when two skills are already active', () => {
    const p = sanitizeProgress(g2, { completed: ['a'], focus: { push: 's1' }, skillFocus: { k2: 'k2', k3: 'k3' } })
    expect(p.skillFocus).toEqual({ k2: 'k2', k3: 'k3' })
  })
})

describe('completeSteps ("I can already do this")', () => {
  it('completes steps in order when their requirements are met, and repairs focus', () => {
    const p = completeSteps(g2, initialProgress(g2), ['a', 'b'])
    expect(p.completed).toEqual(['a', 'b'])
    expect(p.focus.push).toBeNull()
  })
  it('never completes a step whose requirement is missing', () => {
    const p = completeSteps(g2, initialProgress(g2), ['s1'])
    expect(p.completed).toEqual([])
  })
  it('frees the slot of a chain it finishes', () => {
    const on = activateSkill(g2, afterA(), 'sk')
    const p = completeSteps(g2, on, ['s1', 's2', 's3'])
    expect(p.skillFocus).toEqual({})
  })
  it('returns the same object when nothing changes', () => {
    const p = afterA()
    expect(completeSteps(g2, p, ['a'])).toBe(p)
  })
})

describe('today state (warm-up ticks and Train Anyway)', () => {
  it('stores a pick and ticks for a date and forgets them on another date', () => {
    let p = setDayPick(initialProgress(g2), '2026-09-26', 'pull')
    p = toggleWarm(p, '2026-09-26', 'pull:Arm circles')
    expect(todayState(p, '2026-09-26')).toEqual({ pick: 'pull', warm: ['pull:Arm circles'] })
    expect(todayState(p, '2026-09-27')).toEqual({ pick: null, warm: [] })
    p = toggleWarm(p, '2026-09-26', 'pull:Arm circles')
    expect(todayState(p, '2026-09-26').warm).toEqual([])
  })
  it('a new date starts fresh when written', () => {
    const p = toggleWarm(setDayPick(initialProgress(g2), '2026-09-26', 'pull'), '2026-09-27', 'push:Wrist circles')
    expect(todayState(p, '2026-09-27')).toEqual({ pick: null, warm: ['push:Wrist circles'] })
  })
  it('changing the schedule clears the pick', () => {
    const p = setDayType(setDayPick(initialProgress(g2), '2026-09-26', 'full'), 5, 'full')
    expect(todayState(p, '2026-09-26').pick).toBeNull()
  })
  it('sanitize keeps a well-formed day and settings, and defaults the rest', () => {
    const ok = sanitizeProgress(g2, { day: { date: '2026-09-26', pick: 'push', warm: ['a'] }, settings: { holdSound: false, lastExportAt: 5, plan: 'ppl', restTimer: false } })
    expect(ok.day).toEqual({ date: '2026-09-26', pick: 'push', warm: ['a'] })
    expect(ok.settings).toEqual({ holdSound: false, length: 'standard', lastExportAt: 5, plan: 'ppl', restTimer: false })
    const bad = sanitizeProgress(g2, { day: { date: 3, pick: 'yoga' }, settings: 'x' })
    expect(bad.day).toBeNull()
    expect(bad.settings).toEqual({ holdSound: true, length: 'standard', plan: 'full', restTimer: true })
    // a Push pick made under Push/Pull/Legs doesn't fit a full-body save
    expect(sanitizeProgress(g2, { day: { date: '2026-09-26', pick: 'push', warm: [] }, settings: { holdSound: true, plan: 'full' } }).day?.pick).toBeNull()
  })
})

describe('movement tracks (real data)', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('every track starts at its own first exercise', () => {
    const f = initialProgress(NODES).focus
    expect(f).toMatchObject({
      hpush: 'hpush:w', vpush: 'vpush:pk', dip: 'dip:sh', vpull: 'vpull:dh', hpull: 'hpull:vr',
      squat: 'squat:as', hinge: 'hinge:gb', antiext: 'antiext:db', compress: 'compress:llr', lateral: 'lateral:sp',
      calf: 'calf:c1', neck: 'neck:n1',
    })
    expect(Object.keys(f)).toHaveLength(21)
  })
  it('levelling up moves only that track', () => {
    const p = levelUp(NODES, real(), 'vpush:pk', null)
    expect(p.focus.vpush).toBe('vpush:epk')
    expect(p.focus.hpush).toBe('hpush:w')
  })
  it('suggestions stay in the same track and list every branch of it', () => {
    const p = real({ completed: ['hpush:w', 'hpush:i', 'hpush:k'], focus: { hpush: 'hpush:p' } })
    const ids = suggestNext(NODES, p, 'hpush:p').map((s) => s.node.id)
    expect(ids).toEqual(['hpush:d', 'hpush:dp', 'hpush:rp', 'hpush:wp'])
  })
  it('workout length setting defaults to standard and is kept when valid', () => {
    expect(initialProgress(NODES).settings.length).toBe('standard')
    expect(real({ settings: { holdSound: true, length: 'short' } }).settings.length).toBe('short')
    expect(real({ settings: { holdSound: true, length: 'huge' } }).settings.length).toBe('standard')
  })
})

describe('Plan 8: twins, ladder gates, equipment', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('finishing an exercise finishes its twin in the other tree, and that tree moves on', () => {
    const p = levelUp(NODES, real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'vpush:pk'], focus: { vpush: 'vpush:epk' } }), 'vpush:epk', null)
    expect(p.completed).toEqual(expect.arrayContaining(['vpush:epk', 'hspu:epk', 'hspu:pk']))
  })
  it('a twin finished elsewhere moves an active skill off that step', () => {
    let p = real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p'] })
    p = activateSkill(NODES, p, 'hspu')
    expect(p.skillFocus.hspu).toBe('hspu:pk')
    p = levelUp(NODES, p, 'vpush:pk', null)
    expect(p.skillFocus.hspu).toBe('hspu:epk')
  })
  it('a skill ladder opens only after its gate exercise', () => {
    const before = real()
    expect(activateSkill(NODES, before, 'planche')).toBe(before)
    const after = activateSkill(NODES, real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p'] }), 'planche')
    expect(after.skillFocus.planche).toBe('planche:ln')
  })
  it('equipment you lack is stepped over: the next exercise unlocks and training skips it', () => {
    let p = setEquipment(NODES, real(), ['band', 'bar', 'wall'])
    expect(p.settings.equipment).toEqual(['band', 'bar', 'wall'])
    expect(nodeState(NODES.find((n) => n.id === 'hpush:i')!, p, passedFor(NODES, p))).toBe('gear')
    p = levelUp(NODES, p, 'hpush:w', null)
    expect(p.focus.hpush).toBe('hpush:k') // Incline push-up needs a bench or a table
    expect(p.completed).not.toContain('hpush:i')
    expect(p.focus.vpull).toBe('vpull:dh')
    // every easier dip needs dip bars, rings or parallettes: Dips waits (Plan 9: never more than one step skipped)
    expect(p.focus.dip).toBeNull()
    expect(setEquipment(NODES, p, ['band']).focus.dip).toBeNull()
  })
  it('changing equipment moves training off what you can no longer do, and never removes progress', () => {
    let p = real({ completed: ['dip:sh'], focus: { dip: 'dip:nd' } })
    p = setEquipment(NODES, p, ['band'])
    expect(p.focus.dip).toBeNull()
    expect(p.completed).toContain('dip:sh')
    p = setEquipment(NODES, p, null)
    expect(p.settings.equipment).toBeUndefined()
    expect(p.focus.dip).toBe('dip:bd')
  })
  it('no equipment set = everything counts as owned; the floor is always there', () => {
    const p = real()
    expect(passedFor(NODES, p)).toEqual(new Set())
    expect(nodeState(NODES.find((n) => n.id === 'dip:sh')!, p, passedFor(NODES, p))).toBe('focus')
    expect(real({ settings: { holdSound: true, length: 'standard', equipment: ['floor', 'bar', 7] } }).settings.equipment).toEqual(['bar'])
  })
  it('a skill whose remaining steps all need missing equipment leaves the active list', () => {
    let p = real({ completed: ['vpush:pk', 'vpush:epk', 'vpush:whn', 'hspu:wh'], settings: { holdSound: true, length: 'standard', equipment: ['bar', 'pole'] } })
    p = activateSkill(NODES, p, 'flag')
    expect(p.skillFocus.flag).toBe('flag:vf')
    p = setEquipment(NODES, p, ['bar'])
    expect(p.skillFocus).toEqual({})
  })
})

describe('Plan 8 migration: saves from before the new trees keep their level', () => {
  const old = (raw: object) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('maps completed, focus (keyed by old tracks), logs, goals and stages to the new ids', () => {
    const p = old({
      completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'pull-hang', 'pull-scap'],
      focus: { 'push-h': 'push-diamond', 'pull-v': 'pull-negative', 'core-a': 'core-plank' },
      logs: [{ nodeId: 'push-standard', value: 8, date: '2026-09-28', at: 1 }, { nodeId: 'push-decline', value: 5, date: '2026-09-28', at: 2 }],
      goalOverrides: { 'push-diamond': { sets: 4, target: 6 } },
      goalStage: { 'push-diamond': 1 },
      stageRaisedOn: { 'push-diamond': '2026-09-28' },
    })
    expect(p.completed).toEqual(expect.arrayContaining(['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'vpull:dh', 'vpull:sp', 'grip:g1', 'scap:s3']))
    expect(p.focus).toMatchObject({ hpush: 'hpush:d', vpull: 'vpull:np', antiext: 'antiext:pl' })
    expect(p.logs).toEqual([{ nodeId: 'hpush:p', value: 8, date: '2026-09-28', at: 1 }]) // decline push-up logs are dropped
    expect(p.goalOverrides).toEqual({ 'hpush:d': { sets: 4, target: 6 } })
    expect(p.goalStage['hpush:d']).toBe(1) // kept; other current exercises start at 60% (Plan 9)
    expect(p.stageRaisedOn).toEqual({ 'hpush:d': '2026-09-28' })
  })
  it('easier exercises the new tree adds below your work count as done', () => {
    const rows = old({ completed: ['pull-row-high', 'pull-row'], focus: { 'pull-r': 'pull-row-elevated' } })
    expect(rows.completed).toEqual(expect.arrayContaining(['hpull:vr', 'hpull:ir', 'hpull:hr']))
    expect(rows.focus.hpull).toBe('hpull:fe')
    const negatives = old({ completed: ['pull-hang', 'pull-scap'], focus: { 'pull-v': 'pull-negative' } })
    expect(negatives.completed).toContain('vpull:ah') // the new Arch hang sits below Negative pull-up
    expect(negatives.focus.vpull).toBe('vpull:np')
  })
  it('an exercise with no exact match maps to the nearest easier one', () => {
    const p = old({ completed: ['push-hs-chest', 'push-hs-back'], skillFocus: { handstand: 'push-hs-back' } })
    expect(p.completed).toEqual(expect.arrayContaining(['hs:cw', 'hs:pk'])) // Wrist prep is a warm-up item since Plan 9
    expect(p.skillFocus).toEqual({ hs: 'hs:ku' })
  })
  it('the step you were training keeps its easier steps done (Freestanding handstand needs the new Wall heel pulls)', () => {
    const p = old({ completed: ['push-hs-chest', 'push-hs-back'], skillFocus: { handstand: 'push-hs-free' } })
    expect(p.completed).toContain('hs:hp')
    expect(p.skillFocus).toEqual({ hs: 'hs:fs' })
  })
  it('active skills keep their place under the new chain names', () => {
    const p = old({ completed: ['pull-pullup', 'pull-negative', 'pull-scap', 'pull-hang'], skillFocus: { 'front-lever': 'pull-fl-tuck', 'muscle-up': null } })
    expect(p.skillFocus).toEqual({ fl: 'fl:tf', bmu: 'bmu:cb' })
  })
  it('a One-arm push-up skill becomes the Push-ups track focus', () => {
    const p = old({ completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-diamond', 'push-archer'], skillFocus: { 'one-arm-push': 'push-oneam' } })
    expect(p.skillFocus).toEqual({})
    expect(p.completed).toContain('hpush:oai') // the new One-arm incline sits below it
    expect(p.focus.hpush).toBe('hpush:oa')
  })
  it('Roadmap moves now in the trees keep their progress; Roadmap-only ones keep their ids', () => {
    const p = old({ completed: ['pull-hang', 'rm-hollow-hang-1', 'rm-german-1', 'rm-german-2', 'rm-butcher'] })
    expect(p.completed).toEqual(expect.arrayContaining(['rm-hollow-hang-1', 'bl:gh', 'bl:stc', 'rm-butcher']))
  })
  it('is idempotent: loading a migrated save again changes nothing', () => {
    const once = old({ completed: ['push-standard', 'legs-pistol'], focus: { 'push-h': 'push-diamond' }, skillFocus: { pistol: 'legs-pistol' } })
    expect(sanitizeProgress(NODES, once)).toEqual(once)
  })
})

describe('smarter goals (goal ramp after a level-up)', () => {
  it('stages step 60% → 80% → 100% of the target, for reps and holds', () => {
    expect([0, 1, 2].map((st) => effectiveGoal({ type: 'reps', sets: 3, target: 10 }, st).target)).toEqual([6, 8, 10])
    expect([0, 1, 2].map((st) => effectiveGoal({ type: 'hold', sets: 3, target: 30 }, st).target)).toEqual([18, 24, 30])
    expect(effectiveGoal({ type: 'reps', sets: 3, target: 1 }, 0).target).toBe(1)
  })
  it('a node reached by level-up starts at stage 0 (and since Plan 9 so does the first exercise)', () => {
    const p = levelUp(g2, initialProgress(g2), 'a', 'b')
    expect(p.goalStage).toEqual({ b: 0 }) // a finished exercise drops its stage
    expect(applyStages(g2, p.goalStage).find((n) => n.id === 'b')!.goal.target).toBe(6)
    expect(applyStages(g2, p.goalStage).find((n) => n.id === 'a')!.goal.target).toBe(10)
  })
  it('advanceStage climbs to the full goal and stops there', () => {
    let p = levelUp(g2, initialProgress(g2), 'a', 'b')
    p = advanceStage(p, 'b'); expect(p.goalStage.b).toBe(1)
    p = advanceStage(p, 'b'); expect(p.goalStage.b).toBe(2)
    expect(advanceStage(p, 'b')).toBe(p)
  })
  it('sanitize keeps valid stages only', () => {
    expect(sanitizeProgress(g2, { goalStage: { b: 1, a: 7, ghost: 0, c: 'x' }, settings: { holdSound: true, plan: 'full' } }).goalStage).toEqual({ b: 1 })
  })
})

describe('unlockedBy (for the unlock moment)', () => {
  it('lists nodes that a change newly unlocked', () => {
    const before = initialProgress(g2)
    const after = levelUp(g2, before, 'a', 'b')
    expect(unlockedBy(g2, before, after).sort()).toEqual(['b', 'k2', 'k3', 's1'])
    expect(unlockedBy(g2, after, after)).toEqual([])
  })
})

describe('Plan 8 review fixes: linked exercises never open a locked ladder', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  it('a lying leg raise does not open Dragon flag before its Hanging knee raise gate', () => {
    const p = levelUp(NODES, real(), 'compress:llr', null)
    expect(p.completed).not.toContain('dflag:llr')
    expect(activateSkill(NODES, p, 'dflag')).toBe(p)
  })
  it('the linked step is finished as soon as its ladder opens', () => {
    let p = levelUp(NODES, real(), 'compress:llr', 'compress:hkr')
    expect(p.focus.compress).toBe('compress:hkr')
    p = levelUp(NODES, p, 'compress:hkr', null)
    expect(p.completed).toContain('dflag:llr')
    expect(activateSkill(NODES, p, 'dflag').skillFocus.dflag).toBe('dflag:tdf')
  })
  it('a false-grip hang does not open Ring muscle-up without pull-ups and dips; Crow pose does not skip planche leans', () => {
    const fg = real({ completed: ['vpull:dh', 'grip:g4'] })
    expect(fg.completed).not.toContain('rmu:fg')
    const crow = real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'elbow:cr'] })
    expect(crow.completed).not.toContain('planche:fr')
    expect(activateSkill(NODES, crow, 'planche').skillFocus.planche).toBe('planche:ln')
  })
})

describe('Plan 9: weekly plan', () => {
  const full = ['full', 'rest', 'full', 'rest', 'full', 'rest', 'rest']
  const ppl = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest']
  it('new users get full body on Monday, Wednesday and Friday, with the rest timer on', () => {
    const p = initialProgress(NODES)
    expect(p.schedule).toEqual(full)
    expect(p.settings).toMatchObject({ plan: 'full', restTimer: true })
  })
  it('an older save on the old Push/Pull/Legs default moves to full body', () => {
    const p = sanitizeProgress(NODES, { onboarded: true, schedule: ppl, settings: { holdSound: true } })
    expect(p.schedule).toEqual(full)
    expect(p.settings.plan).toBe('full')
    expect(p.settings.offerFullBody).toBeUndefined()
  })
  it('an older custom split keeps its days and is offered full body once', () => {
    const custom = ['legs', 'push', 'rest', 'pull', 'rest', 'rest', 'rest']
    const p = sanitizeProgress(NODES, { onboarded: true, schedule: custom, settings: { holdSound: true } })
    expect(p.schedule).toEqual(custom)
    expect(p.settings).toMatchObject({ plan: 'ppl', offerFullBody: true })
    expect(sanitizeProgress(NODES, p).settings.offerFullBody).toBe(true) // stays until answered
    expect(sanitizeProgress(NODES, { ...p, settings: { ...p.settings, offerFullBody: false } }).settings.offerFullBody).toBeUndefined()
  })
  it('a chosen Push/Pull/Legs on the old default days is kept', () => {
    expect(sanitizeProgress(NODES, { onboarded: true, schedule: ppl, settings: { holdSound: true, plan: 'ppl' } }).schedule).toEqual(ppl)
  })
  it('switching plans keeps your training days', () => {
    const custom = ['full', 'full', 'rest', 'rest', 'full', 'rest', 'full']
    const p = { ...initialProgress(NODES), schedule: custom as never }
    const split = setPlan(p, 'ppl')
    expect(split.schedule).toEqual(['push', 'pull', 'rest', 'rest', 'legs', 'rest', 'push'])
    expect(setPlan(split, 'full').schedule).toEqual(custom)
  })
  it('assignDays fills ticked days with the plan\'s day types', () => {
    const rest = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'] as never
    const ticks = [true, false, true, false, true, false, false]
    expect(assignDays(rest, ticks, 'full')).toEqual(full)
    expect(assignDays(rest, ticks, 'ppl')).toEqual(ppl)
  })
})

describe('Plan 9: safe skipping and gentle suggestions', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
  const kit = (equipment: string[]) => ({ settings: { holdSound: true, length: 'standard', plan: 'full', restTimer: true, equipment } })
  it('a ladder skips at most one exercise: no bench → Knee push-up, but no dip gear → nothing (not Straight-bar dip)', () => {
    let p = real({ completed: ['hpush:w'], ...kit(['band', 'bar', 'wall']) })
    expect(p.focus.hpush).toBe('hpush:k')
    expect(p.focus.dip).toBeNull()
    p = setEquipment(NODES, p, ['band', 'bar', 'wall', 'pt'])
    expect(p.focus.dip).toBe('dip:sh')
  })
  it('a skipped first exercise still counts as one step (no wall → Bodyweight squat)', () => {
    expect(real(kit(['band', 'bar'])).focus.squat).toBe('squat:s')
  })
  it('level-up suggestions list the gentlest option first', () => {
    const p = real({ completed: ['squat:as', 'squat:s'], focus: { squat: 'squat:ss' }, ...kit(['band', 'bar', 'wall']) })
    const ids = suggestNext(NODES, p, 'squat:ss').map((s) => s.node.id)
    expect(ids[0]).toBe('squat:cs') // Cossack squat before Beginner shrimp squat
    expect(ids.indexOf('squat:bsh')).toBeGreaterThan(ids.indexOf('squat:sis'))
  })
})

describe('Plan 9: every first exercise starts easier', () => {
  const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, settings: { holdSound: true, plan: 'full' }, ...raw })
  it('a new user starts every track at 60% of its goal', () => {
    const p = initialProgress(NODES)
    expect(p.goalStage['hpush:w']).toBe(0)
    expect(p.goalStage['vpull:dh']).toBe(0)
    expect(effectiveGoal(NODES.find((n) => n.id === 'vpush:pk')!.goal, p.goalStage['vpush:pk'])).toMatchObject({ sets: 3, target: 7 })
  })
  it('placements (Find your level, "I can already do this") and a chosen focus start easier too', () => {
    const placed = completeSteps(NODES, real(), ['hpush:w', 'hpush:i'])
    expect(placed.focus.hpush).toBe('hpush:k')
    expect(placed.goalStage['hpush:k']).toBe(0)
    const chosen = setFocus(NODES, real({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p'] }), 'hpush:dp')
    expect(chosen.goalStage['hpush:dp']).toBe(0)
    const skill = activateSkill(NODES, real({ completed: ['antiext:db', 'antiext:pl'] }), 'hs')
    expect(skill.goalStage['hs:pk']).toBe(0)
  })
  it('an older save starts what it is on at 60%, unless it already hit that goal once', () => {
    const met = [1, 2, 3].map((at) => ({ nodeId: 'hpush:k', value: 8, date: '2026-09-21', at }))
    const p = sanitizeProgress(NODES, { onboarded: true, completed: ['hpush:w', 'hpush:i'], logs: met, settings: { holdSound: true } })
    expect(p.goalStage['hpush:k']).toBeUndefined()
    expect(p.goalStage['vpush:pk']).toBe(0)
    // a save from Plan 9 on keeps exactly the stages it has
    expect(real({ completed: ['hpush:w'] }).goalStage).toEqual({})
  })
  it("plank and hollow holds build up through the source's own steps", () => {
    const plank = NODES.find((n) => n.id === 'antiext:pl')!
    expect(plank.goal).toEqual({ type: 'hold', sets: 1, target: 60 })
    expect([0, 1, 2, 3, 4].map((st) => effectiveGoal(plank.goal, st, plank.steps))).toEqual([
      { type: 'hold', sets: 3, target: 10 }, { type: 'hold', sets: 3, target: 20 }, { type: 'hold', sets: 3, target: 30 }, { type: 'hold', sets: 2, target: 45 }, { type: 'hold', sets: 1, target: 60 },
    ])
    let p = levelUp(NODES, real(), 'antiext:db', null)
    expect(p.focus.antiext).toBe('antiext:pl')
    for (let i = 0; i < 4; i++) p = advanceStage(p, 'antiext:pl', plank.steps)
    expect(p.goalStage['antiext:pl']).toBe(4)
    expect(advanceStage(p, 'antiext:pl', plank.steps)).toBe(p)
  })
})

describe('Plan 9: keep building a finished exercise', () => {
  const done3 = (nodeId: string, value: number, date: string) => [1, 2, 3].map((at) => ({ nodeId, value, date, at }))
  const base = () => sanitizeProgress(NODES, { onboarded: true, completed: ['hpull:vr'], settings: { holdSound: true, plan: 'full' } })
  const final = NODES.find((n) => n.id === 'hpull:vr')!.goal // 3 × 20 (capped)
  it('hitting the goal of a finished exercise raises it by 2 reps for next time, once a day', () => {
    let p = { ...base(), logs: done3('hpull:vr', 20, '2026-10-05') }
    p = settleKeep(p, 'hpull:vr', final, '2026-10-05')
    expect(p.keepStep['hpull:vr']).toBe(1)
    expect(keepGoal(final, currentKeep(p, '2026-10-05')['hpull:vr'] ?? 0).target).toBe(20) // today stays
    expect(keepGoal(final, currentKeep(p, '2026-10-06')['hpull:vr']).target).toBe(22) // next time
    expect(settleKeep(p, 'hpull:vr', final, '2026-10-05')).toBe(p) // once a day
  })
  it('removing the set that earned it undoes the raise; holds go up 5 s', () => {
    let p = { ...base(), logs: done3('hpull:vr', 20, '2026-10-05') }
    p = settleKeep(p, 'hpull:vr', final, '2026-10-05')
    p = settleKeep({ ...p, logs: p.logs.slice(0, 2) }, 'hpull:vr', final, '2026-10-05')
    expect(p.keepStep['hpull:vr'] ?? 0).toBe(0)
    expect(keepGoal({ type: 'hold', sets: 3, target: 30 }, 2).target).toBe(40)
  })
  it('an exercise you are still working towards is never raised this way', () => {
    const p = { ...base(), logs: done3('hpull:ir', 20, '2026-10-05') }
    expect(settleKeep(p, 'hpull:ir', NODES.find((n) => n.id === 'hpull:ir')!.goal, '2026-10-05')).toBe(p)
  })
  it('older saves load with no keep steps; bad entries are dropped', () => {
    expect(base().keepStep).toEqual({})
    const p = sanitizeProgress(NODES, { keepStep: { 'hpull:vr': 2, ghost: 1, 'hpush:w': -1 }, keepRaisedOn: { 'hpull:vr': '2026-10-05', 'hpush:w': 'x' } })
    expect(p.keepStep).toEqual({ 'hpull:vr': 2 })
    expect(p.keepRaisedOn).toEqual({ 'hpull:vr': '2026-10-05' })
  })
})
