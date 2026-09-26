# Up: Plan 2 of 3: Workout Days, Skills and Find Your Level

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Up from "list of four exercises" into a real training app: a Monday/Wednesday/Friday (editable) workout per day with the skill block first, up to two active skills with their own timer, a "Find your level" first-run placement, editable goals, and a Progress screen.

**Architecture:** Extend the Plan 1 `Progress` object (still one object in IndexedDB) with `skillFocus`, `schedule`, `goalOverrides`, `onboarded`. Skill chains are groups of graph nodes (`node.skill`); branch focus becomes strength-only and each active skill chain has its own current step. All new rules are pure functions in `src/engine/` with Vitest tests. The provider exposes goal-overridden nodes so no screen needs to know about overrides.

**Tech Stack:** unchanged (Vite, React 19, TypeScript 7, Vitest + Testing Library, idb-keyval, vite-plugin-pwa, GitHub Pages).

**Spec:** `docs/PLAN.md` (sections 3, 4, 5, 6, 7), `docs/SKILLS.md`, `docs/DECISIONS.md` (rounds 5 and 6). Plan 1 for the existing code: `docs/superpowers/plans/2026-09-26-up-plan-1-foundation-and-core-loop.md`.

**Scope (Plan 2):** per-day workout with warm-up / skill / strength blocks and a rest-day view; skills chains, max 2 active, hold timer for hold-type steps; Skills tab; onboarding; Settings (schedule editor, redo placement); goal editing; Progress tab (own ring style, weekly streak, personal bests); data migration from Plan 1 saves. **Not in Plan 2:** backup export/import, GitHub backup, How-to demo button, accessibility polish, midnight re-render (Plan 3).

## Global Constraints

- App name **Up**; Vite base `/up/`; live at `https://choralet.github.io/up/`; repo `Choralet/up` (public, code and docs only). No backend, no account.
- Progress lives only in IndexedDB key `up.progress`; **saves from Plan 1 must keep working** (no data loss, no white screen).
- Weekday numbering is **Monday = 0 … Sunday = 6** everywhere (`schedule[0]` is Monday).
- **Default schedule is Mon = Push, Wed = Pull, Fri = Legs + Core, other days Rest** (`docs/DECISIONS.md` round 6). It is only a default: the user edits every day in Settings.
- Day types: `push` ("Push Day"), `pull` ("Pull Day"), `legs` ("Legs + Core Day": trains the `legs` and `core` branches), `rest` ("Rest Day").
- Goal rule unchanged: a goal is met when at least `goal.sets` sets today have `value >= goal.target`.
- **Max 2 active skills** at once. Skill steps keep the graph's hard `requires` (a locked step cannot be trained).
- Hold-type goals use the hold timer, rep-type goals use the rep stepper (applies to skills too).
- Quiet UI: no sounds, no confetti, no rest timer. Apple-like styling with the existing CSS variables; branch colours `--push --pull --legs --core`, skills `--skill`.
- Goal text format `3 × 10` / `3 × 30 s`. Goal overrides: sets 1–10, target 1–999, integers only.
- Every commit message ends with two trailers, added with extra `-m` flags: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R`.
- Work in `/Users/arch/Desktop/Calisthenic`. Commands: `npm test` (`vitest run`), `npm run build`. TypeScript 7 is strict (`noUnusedLocals`, `noUnusedParameters`).

## Review Focus

Behaviours the spec implies that a happy-path build would miss. Each is pinned by a test in the owning task:

1. **Old saves (Plan 1 shape)** with no new fields, or with a skill node stored as a branch focus, must load: schedule defaults, `onboarded` becomes true when progress exists, focus is repaired. *(Task 1)*
2. **A skill whose next step is locked, or whose steps are all done**: cannot be activated, and an already-active chain with no trainable step shows nothing and never crashes Today. *(Tasks 1, 4)*
3. **A schedule with no training days**: Today shows a Rest Day, the weekly streak needs only 1 logged day. *(Tasks 2, 4)*
4. **Week boundaries**: a Sunday log belongs to the week that started the previous Monday; the current unfinished week never breaks a streak. *(Task 2)*
5. **Bad goal overrides** (0, 11 sets, 1000 target, 2.5, NaN, unknown node id) are ignored on save and dropped on load. *(Task 1)*
6. **Third active skill** is refused; deactivating frees a slot. *(Tasks 1, 5)*
7. **Placement "Yes"** must never complete skill nodes or skip a prerequisite, and always ends with a valid focus. *(Tasks 1, 6)*
8. **Test isolation from the real clock**: every screen test pins the system date to a Monday so the suite passes on any weekday. *(Task 4)*

## File Structure

| File | Responsibility |
|---|---|
| `src/data/types.ts` | + `DayType`, `SkillChain`, `GoalOverride`, `ExerciseNode.skill?` |
| `src/data/nodes.json` | + `"skill"` chain id on the 16 skill nodes |
| `src/data/skills.json`, `skills.ts` | The 9 skill chains (`SKILLS`) |
| `src/data/schedule.ts` | Day labels, day to branches map, default schedule, weekday names, warm-up lists |
| `src/engine/progress.ts` | Progress v2 rules (rewritten in Task 1) |
| `src/engine/skills.ts` | `skillStatus`, chain helpers for the UI |
| `src/engine/workout.ts` | `buildWorkout`, `nextTrainingDay`, `workoutDone` |
| `src/engine/stats.ts` | `weeklyStreak`, `personalBests`, `branchProgress` |
| `src/lib/time.ts` | + `weekdayIndex`, `addDays`, `weekStart` |
| `src/store/ProgressContext.tsx` | + overrides applied to `nodes`, new actions |
| `src/ui/TabBar.tsx`, `App.tsx` | 4 tabs, Settings and Onboarding overlays |
| `src/ui/TodayScreen.tsx` | Rewritten: day workout |
| `src/ui/SkillsScreen.tsx` | Skills tab |
| `src/ui/NodeSheet.tsx`, `GoalEditor.tsx` | Skill activation button, goal editing |
| `src/ui/LevelUpSheet.tsx`, `LogScreen.tsx` | Unlocked-skill hint |
| `src/ui/Onboarding.tsx` | Find your level |
| `src/ui/SettingsScreen.tsx` | Schedule editor, redo placement |
| `src/ui/ProgressScreen.tsx`, `Ring.tsx` | Progress tab |
| `src/App.test.tsx` | Updated helpers, per-day tests, new flows |

---

### Task 1: Skill chains and Progress v2 engine

**Files:**
- Modify: `src/data/types.ts`, `src/data/nodes.json`, `src/data/nodes.test.ts`, `src/engine/progress.ts` (full replacement), `src/engine/progress.test.ts`
- Create: `src/data/skills.json`, `src/data/skills.ts`, `src/data/schedule.ts`

**Interfaces:**
- Consumes (Plan 1): `ExerciseNode`, `Goal`, `Branch`, `BRANCHES`, `indexNodes`, `rootOf`, `NODES`.
- Produces:
  - Types: `DayType = 'push' | 'pull' | 'legs' | 'rest'`; `SkillChain { id: string; name: string; day: Exclude<DayType, 'rest'> }`; `GoalOverride { sets: number; target: number }`; `ExerciseNode.skill?: string`.
  - Data: `SKILLS: SkillChain[]`; from `schedule.ts`: `DAY_TYPES`, `DAY_LABEL`, `DAY_BRANCHES`, `WEEKDAYS`, `DEFAULT_SCHEDULE`, `WARMUP`.
  - `Progress` gains `skillFocus: Record<string, string | null>`, `schedule: DayType[]` (7, Monday first), `goalOverrides: Record<string, GoalOverride>`, `onboarded: boolean`. `MAX_ACTIVE_SKILLS = 2`.
  - Functions (in `progress.ts`, all pure): `initialProgress`, `isUnlocked`, `nodeState`, `goalMet`, `todaysValues`, `logSet`, `removeSet`, `editSet`, `suggestNext`, `newlyUnlockedSkills(nodes, progress, fromId): ExerciseNode[]`, `firstStep(nodes, done: Set<string>, chain: string): string | null`, `levelUp`, `setFocus`, `activateSkill(nodes, progress, chainId)`, `deactivateSkill(progress, chainId)`, `setGoalOverride(progress, nodeId, goal: GoalOverride | null)`, `applyOverrides(nodes, overrides): ExerciseNode[]`, `setDayType(progress, weekday, type)`, `finishOnboarding(progress)`, `restartOnboarding(progress)`, `sanitizeProgress`.

- [ ] **Step 1: Types, schedule data, skills data**

Edit `src/data/types.ts`: add these declarations, and add `skill?: string` to `ExerciseNode` right after `kind` (with the comment `/** skill chain this step belongs to; only skill steps have one */`):

```ts
export type DayType = 'push' | 'pull' | 'legs' | 'rest'

export interface SkillChain {
  id: string
  name: string
  /** day type whose workout trains this skill */
  day: Exclude<DayType, 'rest'>
}

export interface GoalOverride {
  sets: number
  target: number
}
```

`src/data/schedule.ts`:

```ts
import type { Branch, DayType } from './types'

export const DAY_TYPES: DayType[] = ['rest', 'push', 'pull', 'legs']

export const DAY_LABEL: Record<DayType, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs + Core Day',
  rest: 'Rest Day',
}

/** Branches whose focus exercise is trained on each day type. */
export const DAY_BRANCHES: Record<DayType, Branch[]> = {
  push: ['push'],
  pull: ['pull'],
  legs: ['legs', 'core'],
  rest: [],
}

/** Monday first. */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Default only: Monday Push, Wednesday Pull, Friday Legs + Core. The user can change every day. */
export const DEFAULT_SCHEDULE: DayType[] = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest']

export const WARMUP: Record<Exclude<DayType, 'rest'>, string[]> = {
  push: ['Wrist circles', 'Arm circles', 'Scapular push-ups'],
  pull: ['Arm circles', 'Passive hang 20 s', 'Scapular pulls'],
  legs: ['Hip circles', 'Leg swings', 'Bodyweight squats'],
}
```

`src/data/skills.json`:

```json
[
  { "id": "handstand", "name": "Handstand", "day": "push" },
  { "id": "hspu", "name": "Handstand push-up", "day": "push" },
  { "id": "planche", "name": "Planche", "day": "push" },
  { "id": "one-arm-push", "name": "One-arm push-up", "day": "push" },
  { "id": "muscle-up", "name": "Muscle-up", "day": "pull" },
  { "id": "front-lever", "name": "Front lever", "day": "pull" },
  { "id": "pistol", "name": "Pistol squat", "day": "legs" },
  { "id": "l-sit", "name": "L-sit", "day": "legs" },
  { "id": "dragon-flag", "name": "Dragon flag", "day": "legs" }
]
```

`src/data/skills.ts`:

```ts
import raw from './skills.json'
import type { SkillChain } from './types'

export const SKILLS = raw as unknown as SkillChain[]
```

Tag the skill nodes with their chain id (keeps file order and formatting):

```bash
python3 - <<'EOF'
import re
chains = {
  'push-hs-chest':'handstand','push-hs-back':'handstand','push-hs-free':'handstand',
  'push-wall-hspu':'hspu','push-hspu':'hspu',
  'push-tuck-planche':'planche','push-adv-tuck':'planche',
  'push-oneam':'one-arm-push',
  'pull-mu-neg':'muscle-up','pull-mu':'muscle-up',
  'pull-fl-tuck':'front-lever','pull-fl-adv':'front-lever',
  'legs-pistol':'pistol',
  'core-tuck-lsit':'l-sit','core-lsit':'l-sit','core-dragon':'dragon-flag',
}
p='src/data/nodes.json'
s=open(p).read()
for node, chain in chains.items():
    pat=re.compile(r'("id": "%s",.*?"kind": "skill",)' % re.escape(node))
    assert pat.search(s), node
    s=pat.sub(lambda m: m.group(1)+' "skill": "%s",' % chain, s, 1)
open(p,'w').write(s)
import json; json.loads(s); print(len(chains),'nodes tagged')
EOF
```

Expected: `16 nodes tagged`.

- [ ] **Step 2: Write failing data tests**

Append to `src/data/nodes.test.ts` (inside the existing `describe('exercise graph', ...)` block, before its closing `})`; add the two imports at the top):

```ts
import { SKILLS } from './skills'
import { DAY_BRANCHES } from './schedule'
```

```ts
  it('skill steps belong to a known chain and only skill steps have one', () => {
    const chainIds = new Set(SKILLS.map((s) => s.id))
    for (const n of NODES) {
      expect(!!n.skill, `${n.id}: kind ${n.kind} vs skill ${n.skill}`).toBe(n.kind === 'skill')
      if (n.skill) expect(chainIds.has(n.skill), `${n.id} chain ${n.skill}`).toBe(true)
    }
  })

  it('every chain has steps, is trained on a day that covers its branch, and lists steps in order', () => {
    const index = new Map(NODES.map((n, i) => [n.id, i]))
    for (const chain of SKILLS) {
      const steps = NODES.filter((n) => n.skill === chain.id)
      expect(steps.length, `${chain.id} steps`).toBeGreaterThan(0)
      expect(steps.some((s) => DAY_BRANCHES[chain.day].includes(s.branch)), `${chain.id} day`).toBe(true)
      for (const s of steps) {
        for (const r of s.requires) {
          const parent = NODES.find((n) => n.id === r)!
          if (parent.skill === chain.id) expect(index.get(r)!, `${s.id} before ${r}`).toBeLessThan(index.get(s.id)!)
        }
      }
    }
  })
```

Run: `npx vitest run src/data/nodes.test.ts`
Expected: PASS for both new tests (the data was added in Step 1; these tests protect it). If a test fails, fix the data, not the test.

- [ ] **Step 3: Write the failing engine tests**

Replace the top import block of `src/engine/progress.test.ts` and add a second fixture, then append the describes below. New import block:

```ts
import type { ExerciseNode } from '../data/types'
import {
  activateSkill, applyOverrides, deactivateSkill, editSet, finishOnboarding, firstStep,
  goalMet, initialProgress, isUnlocked, levelUp, logSet, newlyUnlockedSkills, nodeState,
  removeSet, restartOnboarding, sanitizeProgress, setDayType, setFocus, setGoalOverride,
  suggestNext, todaysValues,
  type Progress,
} from './progress'
import { DEFAULT_SCHEDULE } from '../data/schedule'
```

Append after the existing tests:

```ts
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
    expect(p.skillFocus.sk).toBeNull()
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
```

Note: the `setGoalOverride(p, 'ghost', ..., g2)` call passes the node list as an optional 4th argument (see the implementation). Run:

`npx vitest run src/engine/progress.test.ts`
Expected: FAIL (new exports missing; TypeScript errors are not enforced by vitest, so it fails at runtime with `is not a function`).

- [ ] **Step 4: Replace `src/engine/progress.ts`**

```ts
import type { Branch, DayType, ExerciseNode, Goal, GoalOverride } from '../data/types'
import { DAY_TYPES, DEFAULT_SCHEDULE } from '../data/schedule'
import { BRANCHES, indexNodes, rootOf } from './graph'

export type NodeState = 'locked' | 'available' | 'focus' | 'completed'

export interface SetLog {
  nodeId: string
  value: number
  /** local day, YYYY-MM-DD */
  date: string
  /** epoch ms */
  at: number
}

export const MAX_ACTIVE_SKILLS = 2

export interface Progress {
  completed: string[]
  /** strength exercise being trained per branch (never a skill step) */
  focus: Record<Branch, string | null>
  /** active skill chains (max 2) and the step each one is on; null = no trainable step */
  skillFocus: Record<string, string | null>
  logs: SetLog[]
  /** 7 entries, Monday first */
  schedule: DayType[]
  goalOverrides: Record<string, GoalOverride>
  onboarded: boolean
}

export interface Suggestion {
  node: ExerciseNode
  isNew: boolean
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus = {} as Record<Branch, string | null>
  for (const b of BRANCHES) focus[b] = rootOf(nodes, b)?.id ?? null
  return { completed: [], focus, skillFocus: {}, logs: [], schedule: [...DEFAULT_SCHEDULE], goalOverrides: {}, onboarded: false }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export function nodeState(node: ExerciseNode, progress: Progress): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (progress.focus[node.branch] === node.id || Object.values(progress.skillFocus).includes(node.id)) return 'focus'
  return isUnlocked(node, new Set(progress.completed)) ? 'available' : 'locked'
}

export function goalMet(goal: Goal, values: number[]): boolean {
  return values.filter((v) => v >= goal.target).length >= goal.sets
}

export function todaysValues(progress: Progress, nodeId: string, date: string): number[] {
  return progress.logs.filter((l) => l.nodeId === nodeId && l.date === date).map((l) => l.value)
}

export function logSet(progress: Progress, nodeId: string, value: number, date: string, at: number): Progress {
  const v = Math.floor(value)
  if (!Number.isFinite(v) || v < 1) return progress
  return { ...progress, logs: [...progress.logs, { nodeId, value: v, date, at }] }
}

const validIndex = (progress: Progress, index: number) =>
  Number.isInteger(index) && index >= 0 && index < progress.logs.length

/** Delete one logged set (for a mis-tap). Ignores an index that does not exist. */
export function removeSet(progress: Progress, index: number): Progress {
  if (!validIndex(progress, index)) return progress
  return { ...progress, logs: progress.logs.filter((_, i) => i !== index) }
}

/** Change the value of one logged set, with the same rules as `logSet`. */
export function editSet(progress: Progress, index: number, value: number): Progress {
  const v = Math.floor(value)
  if (!validIndex(progress, index) || !Number.isFinite(v) || v < 1) return progress
  return { ...progress, logs: progress.logs.map((l, i) => (i === index ? { ...l, value: v } : l)) }
}

/** Strength before skill; the sort is stable so JSON order breaks ties. */
const kindRank = (n: ExerciseNode) => (n.kind === 'skill' ? 1 : 0)

/**
 * Options for the next focus once `fromId` is done. For a strength exercise: strength nodes of its branch.
 * For a skill step: the other steps of the same chain. New unlocks first among equals.
 */
export function suggestNext(nodes: ExerciseNode[], progress: Progress, fromId: string): Suggestion[] {
  const from = indexNodes(nodes).get(fromId)
  if (!from) return []
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  const score = (s: Suggestion) => kindRank(s.node) * 2 + (s.isNew ? 0 : 1)
  return nodes
    .filter((n) => !after.has(n.id) && isUnlocked(n, after) && (from.skill ? n.skill === from.skill : n.branch === from.branch && !n.skill))
    .map((n) => ({ node: n, isNew: !isUnlocked(n, before) }))
    .sort((a, b) => score(a) - score(b))
}

/** Skill steps that completing `fromId` newly opens (so the app can point at the Skills tab). */
export function newlyUnlockedSkills(nodes: ExerciseNode[], progress: Progress, fromId: string): ExerciseNode[] {
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  return nodes.filter((n) => n.skill && !after.has(n.id) && isUnlocked(n, after) && !isUnlocked(n, before))
}

/** First step of a chain that is not done and whose requirements are done, or null. */
export function firstStep(nodes: ExerciseNode[], done: Set<string>, chain: string): string | null {
  return nodes.find((n) => n.skill === chain && !done.has(n.id) && isUnlocked(n, done))?.id ?? null
}

function pickFocus(nodes: ExerciseNode[], done: Set<string>, branch: Branch): string | null {
  const open = nodes.filter((n) => n.branch === branch && !n.skill && !done.has(n.id) && isUnlocked(n, done))
  return [...open].sort((a, b) => kindRank(a) - kindRank(b))[0]?.id ?? null
}

function levelUpSkill(nodes: ExerciseNode[], progress: Progress, from: ExerciseNode, toId: string | null): Progress {
  const chain = from.skill!
  if (progress.skillFocus[chain] !== from.id) return progress
  const completed = [...new Set([...progress.completed, from.id])]
  const done = new Set(completed)
  const to = toId ? indexNodes(nodes).get(toId) : undefined
  const valid = !!to && to.skill === chain && !done.has(to.id) && isUnlocked(to, done)
  return { ...progress, completed, skillFocus: { ...progress.skillFocus, [chain]: valid ? to!.id : firstStep(nodes, done, chain) } }
}

/** Complete the current focus (branch or skill chain) and choose the next one. Returns the same object if `fromId` is not a focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from) return progress
  if (from.skill) return levelUpSkill(nodes, progress, from, toId)
  if (progress.focus[from.branch] !== fromId) return progress
  const completed = [...new Set([...progress.completed, fromId])]
  const done = new Set(completed)
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && to.branch === from.branch && !to.skill && !done.has(to.id) && isUnlocked(to, done)
  const focusId = valid ? to!.id : pickFocus(nodes, done, from.branch)
  return { ...progress, completed, focus: { ...progress.focus, [from.branch]: focusId } }
}

/** Make an available strength exercise the branch's focus. Skill steps are started with `activateSkill`. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node || node.skill) return progress
  if (nodeState(node, progress) !== 'available') return progress
  return { ...progress, focus: { ...progress.focus, [node.branch]: nodeId } }
}

/** Start training a skill chain at its first trainable step. Refuses unknown, active, locked, finished chains and a 3rd skill. */
export function activateSkill(nodes: ExerciseNode[], progress: Progress, chainId: string): Progress {
  if (chainId in progress.skillFocus) return progress
  if (Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS) return progress
  const step = firstStep(nodes, new Set(progress.completed), chainId)
  if (!step) return progress
  return { ...progress, skillFocus: { ...progress.skillFocus, [chainId]: step } }
}

export function deactivateSkill(progress: Progress, chainId: string): Progress {
  if (!(chainId in progress.skillFocus)) return progress
  const skillFocus = { ...progress.skillFocus }
  delete skillFocus[chainId]
  return { ...progress, skillFocus }
}

const okOverride = (g: unknown): g is GoalOverride =>
  !!g && typeof g === 'object' &&
  Number.isInteger((g as GoalOverride).sets) && (g as GoalOverride).sets >= 1 && (g as GoalOverride).sets <= 10 &&
  Number.isInteger((g as GoalOverride).target) && (g as GoalOverride).target >= 1 && (g as GoalOverride).target <= 999

/**
 * Set (or with `null` clear) a personal goal for one exercise. Invalid values are ignored.
 * `nodes` is optional; when given, unknown node ids are ignored too.
 */
export function setGoalOverride(progress: Progress, nodeId: string, goal: GoalOverride | null, nodes?: ExerciseNode[]): Progress {
  if (nodes && !nodes.some((n) => n.id === nodeId)) return progress
  if (goal === null) {
    if (!(nodeId in progress.goalOverrides)) return progress
    const goalOverrides = { ...progress.goalOverrides }
    delete goalOverrides[nodeId]
    return { ...progress, goalOverrides }
  }
  if (!okOverride(goal)) return progress
  return { ...progress, goalOverrides: { ...progress.goalOverrides, [nodeId]: { sets: goal.sets, target: goal.target } } }
}

/** Nodes with personal goals applied. Returns the same array when there are no overrides. */
export function applyOverrides(nodes: ExerciseNode[], overrides: Record<string, GoalOverride>): ExerciseNode[] {
  if (Object.keys(overrides).length === 0) return nodes
  return nodes.map((n) => (overrides[n.id] ? { ...n, goal: { ...n.goal, sets: overrides[n.id].sets, target: overrides[n.id].target } } : n))
}

export function setDayType(progress: Progress, weekday: number, type: DayType): Progress {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !DAY_TYPES.includes(type)) return progress
  return { ...progress, schedule: progress.schedule.map((d, i) => (i === weekday ? type : d)) }
}

export const finishOnboarding = (progress: Progress): Progress => ({ ...progress, onboarded: true })
export const restartOnboarding = (progress: Progress): Progress => ({ ...progress, onboarded: false })

/** Turn anything read from storage (including Plan 1 saves) into valid progress for the current graph. */
export function sanitizeProgress(nodes: ExerciseNode[], raw: unknown): Progress {
  const base = initialProgress(nodes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const byId = indexNodes(nodes)

  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((x): x is string => typeof x === 'string' && byId.has(x)))]
    : []
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs.filter(
        (l): l is SetLog =>
          !!l && typeof l === 'object' &&
          typeof (l as SetLog).nodeId === 'string' && byId.has((l as SetLog).nodeId) &&
          Number.isFinite((l as SetLog).value) && (l as SetLog).value >= 1 &&
          typeof (l as SetLog).date === 'string' && typeof (l as SetLog).at === 'number',
      )
    : []
  const done = new Set(completed)

  const rawFocus = r.focus && typeof r.focus === 'object' ? (r.focus as Record<string, unknown>) : {}
  const focus = { ...base.focus }
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    focus[b] = n && n.branch === b && !n.skill && !done.has(n.id) && isUnlocked(n, done) ? n.id : pickFocus(nodes, done, b)
  }

  const rawSkill = r.skillFocus && typeof r.skillFocus === 'object' ? (r.skillFocus as Record<string, unknown>) : {}
  const skillFocus: Record<string, string | null> = {}
  for (const chain of Object.keys(rawSkill)) {
    if (Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) break
    if (!nodes.some((n) => n.skill === chain)) continue
    const stored = typeof rawSkill[chain] === 'string' ? byId.get(rawSkill[chain] as string) : undefined
    const ok = !!stored && stored.skill === chain && !done.has(stored.id) && isUnlocked(stored, done)
    skillFocus[chain] = ok ? stored!.id : firstStep(nodes, done, chain)
  }

  const schedule =
    Array.isArray(r.schedule) && r.schedule.length === 7 && r.schedule.every((d) => DAY_TYPES.includes(d as DayType))
      ? ([...r.schedule] as DayType[])
      : base.schedule

  const goalOverrides: Record<string, GoalOverride> = {}
  if (r.goalOverrides && typeof r.goalOverrides === 'object') {
    for (const [id, g] of Object.entries(r.goalOverrides as Record<string, unknown>)) {
      if (byId.has(id) && okOverride(g)) goalOverrides[id] = { sets: g.sets, target: g.target }
    }
  }

  const onboarded = typeof r.onboarded === 'boolean' ? r.onboarded : completed.length > 0 || logs.length > 0
  return { completed, focus, skillFocus, logs, schedule, goalOverrides, onboarded }
}
```

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: everything PASSES, including every Plan 1 UI test (the old Today screen and Log flow still work because the new `Progress` fields are additive and `focus` still holds the four strength exercises), and `tsc` is clean. If a Plan 1 test fails, fix the code, not the test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): skill chains and Progress v2 (skill focus, schedule, goal overrides, onboarding flag)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 2: Workout builder, stats and date helpers

**Files:**
- Modify: `src/lib/time.ts`, `src/lib/lib.test.ts`
- Create: `src/engine/skills.ts`, `src/engine/workout.ts`, `src/engine/stats.ts`, `src/engine/workout.test.ts`, `src/engine/stats.test.ts`, `src/engine/skills.test.ts`

**Interfaces:**
- Consumes: `Progress`, `firstStep`, `goalMet`, `todaysValues`, `nodeState` (Task 1); `DAY_BRANCHES`, `SKILLS`, `DayType`, `SkillChain`, `Branch`, `BRANCHES`, `indexNodes`.
- Produces:
  - `time.ts`: `weekdayIndex(d?: Date): number` (Monday = 0), `addDays(date: string, n: number): string`, `weekStart(date: string): string` (Monday of that week, `YYYY-MM-DD`).
  - `skills.ts`: `interface SkillStatus { status: 'active' | 'finished' | 'available' | 'locked'; done: number; total: number; currentId: string | null; needs: string[] }` and `skillStatus(nodes, progress, chainId): SkillStatus` (`needs` = names of unmet requirements of the first unfinished step).
  - `workout.ts`: `interface Workout { day: DayType; skill: ExerciseNode[]; main: { branch: Branch; node: ExerciseNode | null }[] }`; `buildWorkout(nodes, progress, day, chains): Workout`; `nextTrainingDay(schedule: DayType[], weekday: number): { daysAhead: number; day: DayType } | null`; `workoutDone(workout, progress, date): boolean`.
  - `stats.ts`: `weeklyStreak(logs, schedule, today): number`; `interface Best { node: ExerciseNode; best: number }` and `personalBests(logs, byId, limit?): Best[]`; `branchProgress(nodes, progress, branch): { done: number; total: number }`.

- [ ] **Step 1: Write failing date-helper tests**

In `src/lib/lib.test.ts`, extend the import to `import { addDays, formatClock, localDate, weekdayIndex, weekStart } from './time'` and append:

```ts
describe('week helpers (Monday is day 0)', () => {
  it('numbers weekdays from Monday', () => {
    expect(weekdayIndex(new Date(2026, 8, 21))).toBe(0) // Monday
    expect(weekdayIndex(new Date(2026, 8, 26))).toBe(5) // Saturday
    expect(weekdayIndex(new Date(2026, 8, 27))).toBe(6) // Sunday
  })
  it('adds days across month ends', () => {
    expect(addDays('2026-09-28', 3)).toBe('2026-10-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds the Monday of the week, including for a Sunday', () => {
    expect(weekStart('2026-09-21')).toBe('2026-09-21')
    expect(weekStart('2026-09-23')).toBe('2026-09-21')
    expect(weekStart('2026-09-27')).toBe('2026-09-21')
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
  })
})
```

Run: `npx vitest run src/lib/lib.test.ts`
Expected: FAIL (`weekdayIndex is not a function`).

- [ ] **Step 2: Implement the date helpers**

Append to `src/lib/time.ts`:

```ts
/** Monday = 0 … Sunday = 6, in local time. */
export function weekdayIndex(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return localDate(d)
}

/** The Monday of the week containing `date`. */
export function weekStart(date: string): string {
  return addDays(date, -weekdayIndex(parseDate(date)))
}
```

Run: `npx vitest run src/lib/lib.test.ts` → Expected: PASS.

- [ ] **Step 3: Write failing tests for skills, workout and stats**

`src/engine/skills.test.ts`:

```ts
import type { ExerciseNode } from '../data/types'
import { initialProgress, type Progress } from './progress'
import { skillStatus } from './skills'

const N = (id: string, requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: `Name ${id}`, branch: 'push', kind: 'strength', requires, col: 1,
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
```

`src/engine/workout.test.ts`:

```ts
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
```

`src/engine/stats.test.ts`:

```ts
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
```

Run: `npx vitest run src/engine`
Expected: FAIL (modules `./skills`, `./workout`, `./stats` not found).

- [ ] **Step 4: Implement the three engine modules**

`src/engine/skills.ts`:

```ts
import type { ExerciseNode } from '../data/types'
import { indexNodes } from './graph'
import { firstStep, type Progress } from './progress'

export interface SkillStatus {
  status: 'active' | 'finished' | 'available' | 'locked'
  done: number
  total: number
  currentId: string | null
  /** names of the unmet requirements of the first unfinished step (for the locked message) */
  needs: string[]
}

export function skillStatus(nodes: ExerciseNode[], progress: Progress, chainId: string): SkillStatus {
  const steps = nodes.filter((n) => n.skill === chainId)
  const doneSet = new Set(progress.completed)
  const done = steps.filter((s) => doneSet.has(s.id)).length
  const first = steps.find((s) => !doneSet.has(s.id))
  const byId = indexNodes(nodes)
  const needs = first && firstStep(nodes, doneSet, chainId) === null
    ? first.requires.filter((r) => !doneSet.has(r)).map((r) => byId.get(r)?.name ?? r)
    : []
  const base = { done, total: steps.length, needs }
  if (chainId in progress.skillFocus) return { ...base, status: 'active', currentId: progress.skillFocus[chainId] }
  if (!first) return { ...base, status: 'finished', currentId: null }
  return { ...base, status: needs.length === 0 ? 'available' : 'locked', currentId: null }
}
```

`src/engine/workout.ts`:

```ts
import type { Branch, DayType, ExerciseNode, SkillChain } from '../data/types'
import { DAY_BRANCHES } from '../data/schedule'
import { indexNodes } from './graph'
import { goalMet, todaysValues, type Progress } from './progress'

export interface Workout {
  day: DayType
  /** current step of each active skill trained on this day type */
  skill: ExerciseNode[]
  /** focus exercise of each branch trained on this day type; null = branch finished */
  main: { branch: Branch; node: ExerciseNode | null }[]
}

export function buildWorkout(nodes: ExerciseNode[], progress: Progress, day: DayType, chains: SkillChain[]): Workout {
  const byId = indexNodes(nodes)
  const skill = Object.entries(progress.skillFocus).flatMap(([chain, id]) => {
    const node = id ? byId.get(id) : undefined
    return node && chains.find((c) => c.id === chain)?.day === day ? [node] : []
  })
  const main = DAY_BRANCHES[day].map((branch) => {
    const id = progress.focus[branch]
    return { branch, node: id ? byId.get(id) ?? null : null }
  })
  return { day, skill, main }
}

/** The next non-rest day after today (weekday 0 = Monday), wrapping into next week. `daysAhead` is 1 to 7. */
export function nextTrainingDay(schedule: DayType[], weekday: number): { daysAhead: number; day: DayType } | null {
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = schedule[(weekday + ahead) % 7]
    if (day !== 'rest') return { daysAhead: ahead, day }
  }
  return null
}

/** True when the workout has exercises and every one of them met its goal on `date`. */
export function workoutDone(workout: Workout, progress: Progress, date: string): boolean {
  const items = [...workout.skill, ...workout.main.flatMap((m) => (m.node ? [m.node] : []))]
  return items.length > 0 && items.every((n) => goalMet(n.goal, todaysValues(progress, n.id, date)))
}
```

`src/engine/stats.ts`:

```ts
import type { Branch, DayType, ExerciseNode } from '../data/types'
import type { Progress, SetLog } from './progress'
import { addDays, weekStart } from '../lib/time'

/**
 * Consecutive weeks (Monday to Sunday) in which you trained on enough days.
 * "Enough" is 2 logged days, or fewer if fewer are planned (at least 1). The current unfinished week never breaks a streak.
 */
export function weeklyStreak(logs: SetLog[], schedule: DayType[], today: string): number {
  const planned = schedule.filter((d) => d !== 'rest').length
  const need = Math.max(1, Math.min(2, planned))
  const daysByWeek = new Map<string, Set<string>>()
  for (const l of logs) {
    const w = weekStart(l.date)
    if (!daysByWeek.has(w)) daysByWeek.set(w, new Set())
    daysByWeek.get(w)!.add(l.date)
  }
  const counted = (w: string) => (daysByWeek.get(w)?.size ?? 0) >= need
  let week = weekStart(today)
  let streak = counted(week) ? 1 : 0
  week = addDays(week, -7)
  while (counted(week)) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}

export interface Best {
  node: ExerciseNode
  best: number
}

/** Best logged value per exercise, most recently trained first. */
export function personalBests(logs: SetLog[], byId: Map<string, ExerciseNode>, limit = 5): Best[] {
  const acc = new Map<string, { best: number; last: number }>()
  for (const l of logs) {
    if (!byId.has(l.nodeId)) continue
    const cur = acc.get(l.nodeId)
    acc.set(l.nodeId, { best: Math.max(cur?.best ?? 0, l.value), last: Math.max(cur?.last ?? 0, l.at) })
  }
  return [...acc.entries()]
    .sort((a, b) => b[1].last - a[1].last)
    .slice(0, limit)
    .map(([id, v]) => ({ node: byId.get(id)!, best: v.best }))
}

export function branchProgress(nodes: ExerciseNode[], progress: Progress, branch: Branch): { done: number; total: number } {
  const inBranch = nodes.filter((n) => n.branch === branch)
  const done = inBranch.filter((n) => progress.completed.includes(n.id)).length
  return { done, total: inBranch.length }
}
```

- [ ] **Step 5: Run everything**

Run: `npx vitest run src/engine src/lib && npx tsc --noEmit`
Expected: everything PASSES and `tsc` is clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): workout builder, skill status, weekly streak, bests and week helpers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 3: Provider with goal overrides and new actions

**Files:**
- Modify: `src/store/ProgressContext.tsx`, `src/store/ProgressContext.test.tsx`

**Interfaces:**
- Consumes: `applyOverrides`, `activateSkill`, `deactivateSkill`, `setDayType`, `setGoalOverride`, `finishOnboarding`, `restartOnboarding`, `indexNodes` (Tasks 1).
- Produces: `ProgressValue` gains
  - `nodes` = nodes **with the user's goal overrides applied**; `byId` indexes those; new `defaults: Map<string, ExerciseNode>` indexes the original nodes.
  - Actions: `activateSkill(chainId: string): void`, `deactivateSkill(chainId: string): void`, `setDayType(weekday: number, type: DayType): void`, `setGoal(nodeId: string, goal: GoalOverride | null): void`, `finishOnboarding(): void`, `restartOnboarding(): void`.

- [ ] **Step 1: Write failing tests**

Append to `src/store/ProgressContext.test.tsx` (add `import type { DayType } from '../data/types'` only if needed; the probes below use plain strings):

```tsx
function Actions() {
  const { nodes, defaults, progress, setGoal, setDayType, activateSkill, deactivateSkill, finishOnboarding, restartOnboarding } = useProgress()
  const wall = nodes.find((n) => n.id === 'push-wall')!
  return (
    <div>
      <div data-testid="goal">{`${wall.goal.sets}x${wall.goal.target} default:${defaults.get('push-wall')!.goal.target}`}</div>
      <div data-testid="monday">{progress.schedule[0]}</div>
      <div data-testid="skills">{Object.keys(progress.skillFocus).join(',')}</div>
      <div data-testid="onboarded">{String(progress.onboarded)}</div>
      <button onClick={() => setGoal('push-wall', { sets: 4, target: 12 })}>goal</button>
      <button onClick={() => setGoal('push-wall', null)}>reset</button>
      <button onClick={() => setDayType(0, 'pull')}>monday-pull</button>
      <button onClick={() => activateSkill('handstand')}>start</button>
      <button onClick={() => deactivateSkill('handstand')}>stop</button>
      <button onClick={finishOnboarding}>finish</button>
      <button onClick={restartOnboarding}>restart</button>
    </div>
  )
}

describe('ProgressProvider actions (Plan 2)', () => {
  const mount = (raw?: unknown) =>
    render(<ProgressProvider storage={memoryStorage(raw)} nodes={NODES}><Actions /></ProgressProvider>)

  it('applies goal overrides to nodes and keeps the defaults', async () => {
    const user = userEvent.setup()
    mount()
    expect(await screen.findByTestId('goal')).toHaveTextContent('3x10 default:10')
    await user.click(screen.getByText('goal'))
    expect(screen.getByTestId('goal')).toHaveTextContent('4x12 default:10')
    await user.click(screen.getByText('reset'))
    expect(screen.getByTestId('goal')).toHaveTextContent('3x10 default:10')
  })

  it('changes the schedule', async () => {
    const user = userEvent.setup()
    mount()
    expect(await screen.findByTestId('monday')).toHaveTextContent('push')
    await user.click(screen.getByText('monday-pull'))
    expect(screen.getByTestId('monday')).toHaveTextContent('pull')
  })

  it('activates and deactivates a skill once its requirement is done', async () => {
    const user = userEvent.setup()
    mount({ completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike'] })
    await screen.findByTestId('skills')
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
    await user.click(screen.getByText('start'))
    expect(screen.getByTestId('skills')).toHaveTextContent('handstand')
    await user.click(screen.getByText('stop'))
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
  })

  it('refuses to start a skill whose requirement is not done', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('skills')
    await user.click(screen.getByText('start'))
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
  })

  it('finishes and restarts onboarding', async () => {
    const user = userEvent.setup()
    mount()
    expect(await screen.findByTestId('onboarded')).toHaveTextContent('false')
    await user.click(screen.getByText('finish'))
    expect(screen.getByTestId('onboarded')).toHaveTextContent('true')
    await user.click(screen.getByText('restart'))
    expect(screen.getByTestId('onboarded')).toHaveTextContent('false')
  })
})
```

Run: `npx vitest run src/store`
Expected: FAIL (`setGoal is not a function` / missing actions).

- [ ] **Step 2: Update the provider**

In `src/store/ProgressContext.tsx`:

1. Replace the engine import with:

```tsx
import type { DayType, ExerciseNode, GoalOverride } from '../data/types'
import { indexNodes } from '../engine/graph'
import {
  activateSkill as activateSkillRule, applyOverrides, deactivateSkill as deactivateSkillRule,
  editSet as editSetRule, finishOnboarding as finishOnboardingRule, initialProgress,
  levelUp as levelUpRule, logSet, removeSet as removeSetRule, restartOnboarding as restartOnboardingRule,
  sanitizeProgress, setDayType as setDayTypeRule, setFocus as setFocusRule, setGoalOverride,
  type Progress,
} from '../engine/progress'
```

(and remove the old `import type { ExerciseNode } from '../data/types'` line so it is not imported twice).

2. Extend `ProgressValue`:

```tsx
export interface ProgressValue {
  /** nodes with the user's personal goals applied */
  nodes: ExerciseNode[]
  /** the original nodes, for default goals */
  defaults: Map<string, ExerciseNode>
  byId: Map<string, ExerciseNode>
  progress: Progress
  log(nodeId: string, value: number): void
  levelUp(fromId: string, toId: string | null): void
  setFocus(nodeId: string): void
  /** `index` is the position in `progress.logs` */
  removeSet(index: number): void
  editSet(index: number, value: number): void
  activateSkill(chainId: string): void
  deactivateSkill(chainId: string): void
  setDayType(weekday: number, type: DayType): void
  setGoal(nodeId: string, goal: GoalOverride | null): void
  finishOnboarding(): void
  restartOnboarding(): void
}
```

3. Inside `ProgressProvider`, replace the `byId` line and everything from `if (!progress) return null` to the end of `value` with:

```tsx
  const defaults = useMemo(() => indexNodes(nodes), [nodes])
  const overrides = progress?.goalOverrides
  const effective = useMemo(() => (overrides ? applyOverrides(nodes, overrides) : nodes), [nodes, overrides])
  const byId = useMemo(() => indexNodes(effective), [effective])
```

placed **before** the first `useEffect` (all hooks stay above the early return), and

```tsx
  if (!progress) return null

  const update = (fn: (p: Progress) => Progress) => setProgress((p) => (p ? fn(p) : p))
  const value: ProgressValue = {
    nodes: effective,
    defaults,
    byId,
    progress,
    log: (nodeId, v) => update((p) => logSet(p, nodeId, v, localDate(), Date.now())),
    levelUp: (fromId, toId) => update((p) => levelUpRule(nodes, p, fromId, toId)),
    setFocus: (nodeId) => update((p) => setFocusRule(nodes, p, nodeId)),
    removeSet: (index) => update((p) => removeSetRule(p, index)),
    editSet: (index, v) => update((p) => editSetRule(p, index, v)),
    activateSkill: (chainId) => update((p) => activateSkillRule(nodes, p, chainId)),
    deactivateSkill: (chainId) => update((p) => deactivateSkillRule(p, chainId)),
    setDayType: (weekday, type) => update((p) => setDayTypeRule(p, weekday, type)),
    setGoal: (nodeId, goal) => update((p) => setGoalOverride(p, nodeId, goal, nodes)),
    finishOnboarding: () => update(finishOnboardingRule),
    restartOnboarding: () => update(restartOnboardingRule),
  }
```

Keep the existing `return ( <Ctx.Provider ...> ... )` block and the `useProgress` hook unchanged. Delete the now-unused old `const byId = useMemo(() => indexNodes(nodes), [nodes])` line.

- [ ] **Step 3: Run tests and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: the new store tests PASS and every earlier test still passes; `tsc` is clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(store): expose goal-overridden nodes and Plan 2 actions" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 4: Today becomes the day's workout

**Files:**
- Modify: `src/ui/TodayScreen.tsx` (rewrite), `src/App.tsx`, `src/ui/TabBar.tsx`, `src/App.test.tsx`, `src/styles.css`
- Create: `src/ui/SkillsScreen.tsx` (stub here), `src/ui/ProgressScreen.tsx` (stub here), `src/ui/SettingsScreen.tsx` (stub here), `src/ui/Onboarding.tsx` (stub here)

**Interfaces:**
- Consumes: `buildWorkout`, `nextTrainingDay`, `workoutDone`, `SKILLS`, `DAY_LABEL`, `WEEKDAYS`, `WARMUP`, `weekdayIndex`, `localDate`, `goalMet`, `todaysValues`, `goalText`, `useProgress`.
- Produces: `<TodayScreen onOpen(nodeId) onSettings()>`; `Tab = 'today' | 'tree' | 'skills' | 'progress'`; stubs with the final prop shapes: `<SkillsScreen onLog(nodeId)>`, `<ProgressScreen />`, `<SettingsScreen onClose()>`, `<Onboarding />`.

- [ ] **Step 1: Update the test helpers and write the failing Today tests**

`src/App.test.tsx` runs against the real clock today. Make it deterministic:

1. Replace every `memoryStorage(` call in the file with `seed(` (the import line does not contain `memoryStorage(`, so it is untouched):

```bash
sed -i '' 's/memoryStorage(/seed(/g' src/App.test.tsx
```

2. Below the imports add the helpers (the file already imports `render`, `screen`, `userEvent`, `App`, `NODES`, `memoryStorage`; add `import { WEEKDAYS } from './data/schedule'` only if you use it):

```tsx
/** A save that has finished onboarding, so tests start on the Today screen. */
const seed = (extra: Record<string, unknown> = {}) => memoryStorage({ onboarded: true, ...extra })

/** Pin the clock. Month is 0-based. 2026-09-21 is a Monday. */
const MONDAY = new Date(2026, 8, 21, 12)
const WEDNESDAY = new Date(2026, 8, 23, 12)
const FRIDAY = new Date(2026, 8, 25, 12)
const SATURDAY = new Date(2026, 8, 26, 12)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MONDAY)
})
afterEach(() => vi.useRealTimers())
```

3. Replace the whole `describe('Today screen', ...)` block with:

```tsx
describe('Today screen (default schedule: Mon Push, Wed Pull, Fri Legs + Core)', () => {
  it('Monday is Push Day with the push focus exercise', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
    expect(screen.queryByRole('button', { name: /Dead hang/ })).not.toBeInTheDocument()
  })

  it('Wednesday is Pull Day', async () => {
    vi.setSystemTime(WEDNESDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toHaveTextContent('3 × 30 s')
  })

  it('Friday is Legs + Core Day with both exercises', async () => {
    vi.setSystemTime(FRIDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Legs + Core Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Assisted squat/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead bug/ })).toBeInTheDocument()
  })

  it('shows the warm-up for the day', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('checkbox', { name: 'Wrist circles' })).toBeInTheDocument()
  })

  it('ticks off a warm-up item', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    const box = await screen.findByRole('checkbox', { name: 'Wrist circles' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('Saturday is a Rest Day that points at the next training day and lets you train anyway', async () => {
    vi.setSystemTime(SATURDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
    expect(screen.getByText(/Next: Monday · Push Day/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Train Pull anyway' }))
    expect(screen.getByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to rest day' }))
    expect(screen.getByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
  })

  it('a schedule with no training days is just a Rest Day', async () => {
    const rest = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']
    render(<App storage={seed({ schedule: rest })} />)
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
  })

  it('shows "Branch complete" when every push exercise is done', async () => {
    const allPush = NODES.filter((n) => n.branch === 'push').map((n) => n.id)
    render(<App storage={seed({ completed: allPush })} />)
    expect(await screen.findByText('Branch complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })

  it('shows an active skill first and opens its hold timer', async () => {
    const user = userEvent.setup()
    const done = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
    render(<App storage={seed({ completed: done, skillFocus: { handstand: 'push-hs-chest' } })} />)
    const skill = await screen.findByRole('button', { name: /Chest-to-wall handstand hold/ })
    expect(skill).toHaveTextContent('SKILL')
    expect(skill).toHaveTextContent('4 × 20 s')
    await user.click(skill)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('says the workout is done once every goal is met', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('Workout complete')).toBeInTheDocument()
  })
})
```

4. In the existing test `'uses a hold timer for hold goals'`, add `vi.setSystemTime(WEDNESDAY)` as its first line (Dead hang is a Wednesday exercise).

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (Today still lists four branches; no `Push Day` heading).

- [ ] **Step 2: Stubs for the screens built later, tab bar, styles**

`src/ui/SkillsScreen.tsx`:

```tsx
export function SkillsScreen(_props: { onLog: (nodeId: string) => void }) {
  return <div className="screen"><h1 className="large">Skills</h1></div>
}
```

`src/ui/ProgressScreen.tsx`:

```tsx
export function ProgressScreen() {
  return <div className="screen"><h1 className="large">Progress</h1></div>
}
```

`src/ui/SettingsScreen.tsx`:

```tsx
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="log">
      <div className="screen">
        <button className="close" onClick={onClose}>Done</button>
        <h1 className="large">Settings</h1>
      </div>
    </div>
  )
}
```

`src/ui/Onboarding.tsx`:

```tsx
export function Onboarding() {
  return null
}
```

`src/ui/TabBar.tsx`: change the type and list to four tabs:

```tsx
export type Tab = 'today' | 'tree' | 'skills' | 'progress'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tree', label: 'Tree' },
  { id: 'skills', label: 'Skills' },
  { id: 'progress', label: 'Progress' },
]
```

(keep the component body). In `src/styles.css` change `.tabbar` `gap: 32px` to `gap: 12px` so four tabs fit, and append:

```css
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.gear { min-width: 44px; min-height: 44px; border-radius: 50%; background: var(--fill); font-size: 20px; }
.card { background: var(--card); border-radius: 14px; padding: 14px; margin: 16px 0; }
.check { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; text-align: left; min-height: 48px; }
.check + .check { border-top: 0.5px solid var(--sep); }
.check .box { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--label3); flex: none; display: grid; place-items: center; font-size: 13px; color: #fff; }
.check[aria-checked='true'] .box { background: var(--legs); border-color: var(--legs); }
.check[aria-checked='true'] .lbl { color: var(--label2); text-decoration: line-through; }
.hdr { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--label2); margin: 16px 4px -8px; }
.pillbtn { display: inline-block; padding: 8px 14px; border-radius: 999px; background: var(--fill); color: var(--blue); font-weight: 600; font-size: 14px; margin: 4px 6px 0 0; min-height: 36px; }
.done-banner { text-align: center; color: var(--legs); font-weight: 700; margin: 8px 0; }
.row .tick { color: var(--legs); font-weight: 700; }
```

- [ ] **Step 3: Rewrite `src/ui/TodayScreen.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { DAY_LABEL, WARMUP, WEEKDAYS } from '../data/schedule'
import { SKILLS } from '../data/skills'
import type { DayType, ExerciseNode } from '../data/types'
import { goalMet, todaysValues } from '../engine/progress'
import { buildWorkout, nextTrainingDay, workoutDone } from '../engine/workout'
import { goalText } from '../lib/format'
import { localDate, weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

const TRAIN_ANYWAY: Exclude<DayType, 'rest'>[] = ['push', 'pull', 'legs']
const ANYWAY_LABEL = { push: 'Push', pull: 'Pull', legs: 'Legs + Core' } as const

export function TodayScreen({ onOpen, onSettings }: { onOpen: (nodeId: string) => void; onSettings: () => void }) {
  const { nodes, progress } = useProgress()
  const [pick, setPick] = useState<DayType | null>(null)
  const [warm, setWarm] = useState<Record<string, boolean>>({})

  const now = new Date()
  const today = localDate(now)
  const weekday = weekdayIndex(now)
  const day = pick ?? progress.schedule[weekday]
  const workout = useMemo(() => buildWorkout(nodes, progress, day, SKILLS), [nodes, progress, day])
  const next = nextTrainingDay(progress.schedule, weekday)
  const heading = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const row = (node: ExerciseNode) => {
    const values = todaysValues(progress, node.id, today)
    const atGoal = values.filter((v) => v >= node.goal.target).length
    const meta = BRANCH_META[node.branch]
    return (
      <button className="row" key={node.id} onClick={() => onOpen(node.id)}>
        <span className="dot" style={{ background: node.kind === 'skill' ? 'var(--skill)' : meta.color }}>{meta.short}</span>
        <span className="t">
          {node.kind === 'skill' && <span className="tag">SKILL</span>}
          <b>{node.name}</b>
          <span>{goalText(node.goal)} · {atGoal} of {node.goal.sets} sets today</span>
        </span>
        {goalMet(node.goal, values) ? <span className="tick" aria-label="Goal reached">✓</span> : <span className="chev" aria-hidden="true">›</span>}
      </button>
    )
  }

  return (
    <div className="screen">
      <div className="head">
        <div>
          <div className="sub" style={{ fontWeight: 600 }}>{heading}</div>
          <h1 className="large">{DAY_LABEL[day]}</h1>
        </div>
        <button className="gear" aria-label="Settings" onClick={onSettings}>⚙</button>
      </div>

      {day === 'rest' ? (
        <>
          <div className="card">
            <b>Recovery is part of the plan.</b>
            <div className="sub" style={{ marginTop: 4 }}>
              {next ? `Next: ${WEEKDAYS[(weekday + next.daysAhead) % 7]} · ${DAY_LABEL[next.day]}` : 'No training days are scheduled. Set some in Settings.'}
            </div>
          </div>
          <div className="hdr">Feeling fresh?</div>
          <div style={{ marginTop: 16 }}>
            {TRAIN_ANYWAY.map((d) => (
              <button key={d} className="pillbtn" aria-label={`Train ${ANYWAY_LABEL[d]} anyway`} onClick={() => setPick(d)}>
                Train {ANYWAY_LABEL[d]} anyway
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {pick && (
            <button className="pillbtn" onClick={() => setPick(null)}>Back to {DAY_LABEL[progress.schedule[weekday]].toLowerCase()}</button>
          )}
          <div className="hdr">Warm-up</div>
          <div className="group">
            {WARMUP[day].map((item) => {
              const key = `${day}:${item}`
              const on = !!warm[key]
              return (
                <button key={key} className="check" role="checkbox" aria-checked={on} aria-label={item} onClick={() => setWarm((w) => ({ ...w, [key]: !on }))}>
                  <span className="box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="lbl">{item}</span>
                </button>
              )
            })}
          </div>

          {workout.skill.length > 0 && (
            <>
              <div className="hdr">Skill</div>
              <div className="group">{workout.skill.map(row)}</div>
            </>
          )}

          <div className="hdr">Strength</div>
          <div className="group">
            {workout.main.map(({ branch, node }) =>
              node ? row(node) : (
                <div className="row" key={branch}>
                  <span className="dot" style={{ background: BRANCH_META[branch].color }}>{BRANCH_META[branch].short}</span>
                  <span className="t"><b>{BRANCH_META[branch].label}</b><span>Branch complete</span></span>
                </div>
              ),
            )}
          </div>
          {workoutDone(workout, progress, today) && <div className="done-banner">Workout complete</div>}
        </>
      )}
    </div>
  )
}
```

Note: the rest-day "Back to rest day" button text comes from `Back to ${DAY_LABEL[...].toLowerCase()}` = "Back to rest day" when the scheduled day is rest. The test asserts exactly that name.

- [ ] **Step 4: Update `src/App.tsx`**

```tsx
import { useState } from 'react'
import { NODES } from './data/nodes'
import { ProgressProvider, useProgress } from './store/ProgressContext'
import { idbStorage, type ProgressStorage } from './store/storage'
import { LogScreen } from './ui/LogScreen'
import { Onboarding } from './ui/Onboarding'
import { ProgressScreen } from './ui/ProgressScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { SkillsScreen } from './ui/SkillsScreen'
import { TabBar, type Tab } from './ui/TabBar'
import { TodayScreen } from './ui/TodayScreen'
import { TreeScreen } from './ui/TreeScreen'

function Shell() {
  const { progress } = useProgress()
  const [tab, setTab] = useState<Tab>('today')
  const [logId, setLogId] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  return (
    <div className="app">
      {tab === 'today' && <TodayScreen onOpen={setLogId} onSettings={() => setSettings(true)} />}
      {tab === 'tree' && <TreeScreen onLog={setLogId} />}
      {tab === 'skills' && <SkillsScreen onLog={setLogId} />}
      {tab === 'progress' && <ProgressScreen />}
      <TabBar tab={tab} onChange={setTab} />
      {logId && <LogScreen nodeId={logId} onClose={() => setLogId(null)} />}
      {settings && <SettingsScreen onClose={() => setSettings(false)} />}
      {!progress.onboarded && <Onboarding />}
    </div>
  )
}

export default function App({ storage = idbStorage }: { storage?: ProgressStorage }) {
  return (
    <ProgressProvider storage={storage} nodes={NODES}>
      <Shell />
    </ProgressProvider>
  )
}
```

- [ ] **Step 5: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all tests PASS (including every unchanged Plan 1 test, now running with a pinned Monday and `seed()`), type check and build OK. If a Plan 1 test fails because it needs a non-Monday exercise, pin the right day inside that test rather than changing app code.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): Today shows the day's workout with warm-up, skill block, rest day and four tabs" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 5: Skills tab, skill activation, goal editing, unlocked-skill hint

**Files:**
- Modify: `src/ui/SkillsScreen.tsx` (replace stub), `src/ui/NodeSheet.tsx`, `src/ui/LevelUpSheet.tsx`, `src/ui/LogScreen.tsx`, `src/styles.css`, `src/App.test.tsx`
- Create: `src/ui/GoalEditor.tsx`

**Interfaces:**
- Consumes: `SKILLS`, `skillStatus`, `DAY_LABEL`, `useProgress` (`activateSkill`, `deactivateSkill`, `setGoal`, `defaults`, `byId`, `progress`, `nodes`), `newlyUnlockedSkills`, `MAX_ACTIVE_SKILLS`.
- Produces: `<SkillsScreen onLog(nodeId)>`; `<GoalEditor node def onSave(goal) onReset() onCancel()>`; `LevelUpSheet` gets an optional `unlockedSkills?: ExerciseNode[]` prop.

- [ ] **Step 1: Write failing tests**

Append to `src/App.test.tsx`:

```tsx
describe('Skills tab', () => {
  const pikeDone = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
  const openSkills = async (extra: Record<string, unknown>) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    return user
  }

  it('offers Start on an available skill and says what a locked skill needs', async () => {
    await openSkills({ completed: pikeDone })
    expect(screen.getByRole('button', { name: 'Start Handstand' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Start Planche' })).toBeDisabled()
    expect(screen.getByText(/Needs: Pseudo planche push-up/)).toBeInTheDocument()
  })

  it("starting a skill makes it active and puts it in that day's workout", async () => {
    const user = await openSkills({ completed: pikeDone })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    expect(screen.getByRole('button', { name: 'Stop Handstand' })).toBeInTheDocument()
    expect(screen.getByText(/Chest-to-wall handstand hold/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Chest-to-wall handstand hold/ })).toBeInTheDocument()
  })

  it('a third skill is refused until one is stopped', async () => {
    const user = await openSkills({ completed: [...pikeDone, 'push-diamond', 'push-archer', 'push-elevated-pike'] })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Start One-arm push-up' }))
    expect(screen.getByRole('button', { name: 'Start Handstand push-up' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Stop Handstand' }))
    expect(screen.getByRole('button', { name: 'Start Handstand push-up' })).toBeEnabled()
  })
})
```

Also add tests for the node sheet and level-up hint:

```tsx
describe('Node sheet and level-up for skills and goals', () => {
  it('a skill step in the tree offers Train This Skill, which starts the chain', async () => {
    const user = userEvent.setup()
    const pikeDone = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
    render(<App storage={seed({ completed: pikeDone })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, available' }))
    await user.click(screen.getByRole('button', { name: 'Train This Skill' }))
    expect(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, focus' })).toBeInTheDocument()
  })

  it('lets you edit a goal, see it on Today, and reset it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, focus' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Save Goal' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 12')
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, focus' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Reset to Default' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
  })

  it('the level-up sheet points at skills a new exercise unlocks', async () => {
    const user = userEvent.setup()
    const done = ['push-wall', 'push-incline', 'push-knee', 'push-standard']
    render(<App storage={seed({ completed: done, focus: { push: 'push-pike' } })} />)
    await user.click(await screen.findByRole('button', { name: /Pike push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' }) // the stepper starts at the goal, 8 reps
    await user.click(log); await user.click(log); await user.click(log)
    expect(await screen.findByText(/Unlocks a skill: Chest-to-wall handstand hold/)).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (Skills tab is a stub, no Train This Skill / Edit Goal / hint).

- [ ] **Step 2: Implement `SkillsScreen`**

```tsx
import { DAY_LABEL } from '../data/schedule'
import { SKILLS } from '../data/skills'
import { MAX_ACTIVE_SKILLS } from '../engine/progress'
import { skillStatus } from '../engine/skills'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'

export function SkillsScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const { nodes, byId, progress, activateSkill, deactivateSkill } = useProgress()
  const activeCount = Object.keys(progress.skillFocus).length
  const rows = SKILLS.map((chain) => ({ chain, s: skillStatus(nodes, progress, chain.id) }))
  const active = rows.filter((r) => r.s.status === 'active')
  const library = rows.filter((r) => r.s.status !== 'active')

  return (
    <div className="screen">
      <h1 className="large">Skills</h1>
      <div className="sub">Active skills train inside your daily plan. Up to {MAX_ACTIVE_SKILLS} at a time.</div>

      <div className="hdr">Active · {activeCount} of {MAX_ACTIVE_SKILLS}</div>
      <ul className="group list">
        {active.length === 0 && <li className="row"><span className="t"><span>No active skill yet. Start one below.</span></span></li>}
        {active.map(({ chain, s }) => {
          const step = s.currentId ? byId.get(s.currentId) : undefined
          return (
            <li className="row skillrow" key={chain.id}>
              <span className="t">
                <b>{chain.name}</b>
                <span>{DAY_LABEL[chain.day]} · step {Math.min(s.done + 1, s.total)} of {s.total}</span>
                {step ? (
                  <button className="linkbtn" onClick={() => onLog(step.id)}>
                    {step.name} · {goalText(step.goal)}
                  </button>
                ) : (
                  <span>No trainable step right now</span>
                )}
              </span>
              <button className="pillbtn" aria-label={`Stop ${chain.name}`} onClick={() => deactivateSkill(chain.id)}>Stop</button>
            </li>
          )
        })}
      </ul>

      <div className="hdr">Library</div>
      <ul className="group list">
        {library.map(({ chain, s }) => (
          <li className="row skillrow" key={chain.id}>
            <span className="t">
              <b>{chain.name}</b>
              <span>
                {DAY_LABEL[chain.day]} · {s.done} of {s.total} steps
                {s.status === 'finished' && ' · Complete'}
                {s.status === 'locked' && ` · Needs: ${s.needs.join(', ')}`}
              </span>
            </span>
            {s.status !== 'finished' && (
              <button
                className="pillbtn"
                aria-label={`Start ${chain.name}`}
                disabled={s.status === 'locked' || activeCount >= MAX_ACTIVE_SKILLS}
                onClick={() => activateSkill(chain.id)}
              >
                Start
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Append to `src/styles.css`:

```css
.list { list-style: none; padding: 0; }
.skillrow { align-items: flex-start; }
.linkbtn { display: block; text-align: left; color: var(--blue); font-weight: 600; font-size: 14px; padding: 6px 0; min-height: 32px; }
.pillbtn:disabled { opacity: 0.4; }
.goaled .steps { margin: 10px 0; }
.goaled .field { display: flex; align-items: center; justify-content: space-between; margin: 6px 0; }
.goaled .field b { font-size: 24px; font-variant-numeric: tabular-nums; min-width: 56px; text-align: center; }
.goaled .field .steps { margin: 0; gap: 12px; }
.goaled .field .steps button { width: 44px; height: 44px; font-size: 24px; }
```

- [ ] **Step 3: Implement `GoalEditor`**

```tsx
import { useState } from 'react'
import type { ExerciseNode, GoalOverride } from '../data/types'

interface Props {
  node: ExerciseNode
  def: ExerciseNode
  onSave: (goal: GoalOverride) => void
  onReset: () => void
  onCancel: () => void
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function GoalEditor({ node, def, onSave, onReset, onCancel }: Props) {
  const [sets, setSets] = useState(node.goal.sets)
  const [target, setTarget] = useState(node.goal.target)
  const unit = node.goal.type === 'hold' ? 'seconds per hold' : 'reps per set'
  const changed = node.goal.sets !== def.goal.sets || node.goal.target !== def.goal.target

  return (
    <div className="goaled">
      <p className="sub" style={{ margin: '4px 0' }}>Default: {def.goal.sets} sets × {def.goal.target} {unit}</p>
      <div className="field">
        <span>Sets</span>
        <span className="steps">
          <button aria-label="Decrease sets" onClick={() => setSets((v) => clamp(v - 1, 1, 10))}>−</button>
          <b>{sets}</b>
          <button aria-label="Increase sets" onClick={() => setSets((v) => clamp(v + 1, 1, 10))}>+</button>
        </span>
      </div>
      <div className="field">
        <span>{node.goal.type === 'hold' ? 'Seconds' : 'Reps'}</span>
        <span className="steps">
          <button aria-label="Decrease target" onClick={() => setTarget((v) => clamp(v - 1, 1, 999))}>−</button>
          <b>{target}</b>
          <button aria-label="Increase target" onClick={() => setTarget((v) => clamp(v + 1, 1, 999))}>+</button>
        </span>
      </div>
      <button className="cta" onClick={() => onSave({ sets, target })}>Save Goal</button>
      {changed && <button className="cta sec" onClick={onReset}>Reset to Default</button>}
      <button className="cta sec" onClick={onCancel}>Cancel</button>
    </div>
  )
}
```

- [ ] **Step 4: Update `NodeSheet`, `LevelUpSheet`, `LogScreen`**

`src/ui/NodeSheet.tsx`: import `useState` and `GoalEditor`; get `activateSkill, setGoal, defaults, progress, byId, setFocus` from `useProgress()` (no other new imports); add `const [editing, setEditing] = useState(false)` and `const chainActive = node.skill ? node.skill in progress.skillFocus : false`, `const slotsFull = Object.keys(progress.skillFocus).length >= 2`. Replace the two conditional buttons and the close button with:

```tsx
        {editing ? (
          <GoalEditor
            node={node}
            def={defaults.get(node.id)!}
            onSave={(g) => { setGoal(node.id, g); setEditing(false) }}
            onReset={() => { setGoal(node.id, null); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {state === 'available' && !node.skill && (
              <button className="cta" onClick={() => { setFocus(node.id); onClose() }}>Make This My Focus</button>
            )}
            {state === 'available' && node.skill && !chainActive && (
              <button className="cta" disabled={slotsFull} onClick={() => { activateSkill(node.skill!); onClose() }}>Train This Skill</button>
            )}
            {state === 'available' && node.skill && !chainActive && slotsFull && (
              <p className="sub">Two skills are already active. Stop one in the Skills tab first.</p>
            )}
            {state === 'focus' && (
              <button className="cta" onClick={() => { onLog(node.id); onClose() }}>Log This Exercise</button>
            )}
            {state !== 'completed' && (
              <button className="cta sec" onClick={() => setEditing(true)}>Edit Goal</button>
            )}
            <button className="cta sec" onClick={onClose}>Close</button>
          </>
        )}
```

Also destructure `setGoal` from `useProgress()`. The existing Plan 1 tests still hold: locked nodes show no focus button; available strength nodes show "Make This My Focus".

`src/ui/LevelUpSheet.tsx`: add `unlockedSkills?: ExerciseNode[]` to `Props`, destructure it (`unlockedSkills = []`), and render below the suggestions list, above the primary button:

```tsx
        {unlockedSkills.length > 0 && (
          <p className="sub">Unlocks a skill: {unlockedSkills.map((n) => n.name).join(', ')}. Start it in the Skills tab.</p>
        )}
```

`src/ui/LogScreen.tsx`: import `newlyUnlockedSkills` from `'../engine/progress'` and pass to the sheet:

```tsx
        <LevelUpSheet
          node={node}
          suggestions={suggestNext(nodes, progress, nodeId)}
          unlockedSkills={newlyUnlockedSkills(nodes, progress, nodeId)}
          ...
```

- [ ] **Step 5: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS. In the "unlocks a skill" test, finishing Pike push-up must show `Unlocks a skill: Chest-to-wall handstand hold`; if the level-up sheet does not appear, check that the test logs three sets of 8.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): Skills tab, skill activation, goal editing and unlocked-skill hint" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 6: Find your level (onboarding)

**Files:**
- Modify: `src/ui/Onboarding.tsx` (replace stub), `src/styles.css`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useProgress` (`progress`, `byId`, `levelUp`, `finishOnboarding`), `BRANCHES`, `BRANCH_META`, `goalText`.
- Produces: `<Onboarding />` (renders only while `!progress.onboarded`; the shell controls that).

Design: intro → four branch questions in order Push, Pull, Legs, Core → summary. For each branch the question is about that branch's current focus exercise ("Can you do 3 × 10 clean Wall push-ups?"). **Yes** completes it (`levelUp(id, null)`), which moves focus to the next strength exercise and asks again. **Not yet** ends that branch. When a branch has no focus left, it is skipped. Skill steps are never asked or completed.

- [ ] **Step 1: Write failing tests**

Append to `src/App.test.tsx`:

```tsx
describe('Find your level', () => {
  it('walks up each branch until the first "Not yet", then starts training there', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText(/Can you do 3 × 10 clean/)).toHaveTextContent('Wall push-up')
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText(/Can you do 3 × 10 clean/)).toHaveTextContent('Incline push-up')
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // push done
    expect(screen.getByText(/Can you do 3 × 30 s clean/)).toHaveTextContent('Dead hang')
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // pull done
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // legs done
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // core done
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument()
    expect(screen.getByText(/Push: Incline push-up/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    expect(screen.queryByRole('heading', { name: 'Find your level' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
  })

  it('can be skipped, keeping the beginner exercises', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toBeInTheDocument()
  })

  it('never completes a skill step and ends with a valid focus when everything is a Yes', async () => {
    const user = userEvent.setup()
    const store = memoryStorage()
    render(<App storage={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    for (let i = 0; i < 60 && screen.queryByRole('button', { name: 'Yes' }); i++) {
      await user.click(screen.getByRole('button', { name: 'Yes' }))
    }
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    const saved = (await store.load()) as { completed: string[]; skillFocus: object }
    const skillIds = NODES.filter((n) => n.skill).map((n) => n.id)
    expect(saved.completed.some((id) => skillIds.includes(id))).toBe(false)
    expect(saved.completed).toContain('push-wall')
  })

  it('does not show for a returning user', async () => {
    render(<App storage={seed()} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    expect(screen.queryByRole('heading', { name: 'Find your level' })).not.toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (`Onboarding` renders nothing).

- [ ] **Step 2: Implement `Onboarding`**

```tsx
import { useEffect, useState } from 'react'
import { BRANCHES } from '../engine/graph'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

/** step -1 = intro, 0..3 = one branch each, 4 = summary */
export function Onboarding() {
  const { progress, byId, levelUp, finishOnboarding } = useProgress()
  const [step, setStep] = useState(-1)

  const branch = step >= 0 && step < BRANCHES.length ? BRANCHES[step] : null
  const focusId = branch ? progress.focus[branch] : null
  const node = focusId ? byId.get(focusId) : undefined

  // a branch with nothing left to ask about is skipped
  useEffect(() => {
    if (branch && !node) setStep((s) => s + 1)
  }, [branch, node])

  let body
  if (step === -1) {
    body = (
      <>
        <h1 className="large">Find your level</h1>
        <p className="sub" style={{ margin: '8px 0 24px' }}>
          Answer a few quick questions so Up starts each muscle group at the right exercise. It takes about a minute.
        </p>
        <button className="cta" onClick={() => setStep(0)}>Start</button>
        <button className="cta sec" onClick={finishOnboarding}>Skip for now</button>
      </>
    )
  } else if (branch && node) {
    body = (
      <>
        <div className="eyebrow">{BRANCH_META[branch].label} · {step + 1} of {BRANCHES.length}</div>
        <h1 className="large" style={{ fontSize: 26, margin: '8px 0' }}>{node.name}</h1>
        <p style={{ fontSize: 17, margin: '8px 0' }}>Can you do {goalText(node.goal)} clean {node.name}?</p>
        <p className="sub">{node.cue}</p>
        <button className="cta" style={{ marginTop: 24 }} onClick={() => levelUp(node.id, null)}>Yes</button>
        <button className="cta sec" onClick={() => setStep(step + 1)}>Not yet</button>
      </>
    )
  } else if (step >= BRANCHES.length) {
    body = (
      <>
        <h1 className="large">You're set</h1>
        <div className="group">
          {BRANCHES.map((b) => {
            const id = progress.focus[b]
            return (
              <div className="row" key={b}>
                <span className="t"><b>{BRANCH_META[b].label}: {id ? byId.get(id)!.name : 'Complete'}</b></span>
              </div>
            )
          })}
        </div>
        <button className="cta" onClick={finishOnboarding}>Start Training</button>
      </>
    )
  } else {
    body = null
  }

  return (
    <div className="log onboarding" role="dialog" aria-modal="true" aria-label="Find your level">
      <div className="screen" style={{ textAlign: 'left' }}>{body}</div>
    </div>
  )
}
```

Note: the summary lists `Push: Incline push-up` through `<b>{BRANCH_META[b].label}: {name}</b>`, which the test matches. Add to `src/styles.css`: `.onboarding { z-index: 40; }`.

The dialog `aria-label` is "Find your level" and the intro heading is also "Find your level"; the tests query the heading by role `heading`, which is unambiguous.

- [ ] **Step 3: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS. (The "everything is a Yes" test relies on `levelUp` never focusing a skill step and on branch focus becoming `null` after the last strength node.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Find your level onboarding" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 7: Settings (schedule editor, redo placement)

**Files:**
- Modify: `src/ui/SettingsScreen.tsx` (replace stub), `src/styles.css`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useProgress` (`progress`, `setDayType`, `restartOnboarding`), `DAY_TYPES`, `DAY_LABEL`, `WEEKDAYS`.
- Produces: `<SettingsScreen onClose()>`.

- [ ] **Step 1: Write failing tests**

```tsx
describe('Settings', () => {
  const openSettings = async (storage = seed()) => {
    const user = userEvent.setup()
    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    return user
  }

  it('shows the schedule with the Monday / Wednesday / Friday default', async () => {
    await openSettings()
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveValue('push')
    expect(screen.getByRole('combobox', { name: 'Tuesday' })).toHaveValue('rest')
    expect(screen.getByRole('combobox', { name: 'Wednesday' })).toHaveValue('pull')
    expect(screen.getByRole('combobox', { name: 'Friday' })).toHaveValue('legs')
  })

  it('changing a day changes what Today shows', async () => {
    const user = await openSettings()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Monday' }), 'pull')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toBeInTheDocument()
  })

  it('every day can be set to rest', async () => {
    const user = await openSettings()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Monday' }), 'rest')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
  })

  it('lets you redo Find your level', async () => {
    const user = await openSettings()
    await user.click(screen.getByRole('button', { name: 'Find your level again' }))
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx` → Expected: FAIL (Settings is a stub).

- [ ] **Step 2: Implement**

```tsx
import { DAY_LABEL, DAY_TYPES, WEEKDAYS } from '../data/schedule'
import type { DayType } from '../data/types'
import { useProgress } from '../store/ProgressContext'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { progress, setDayType, restartOnboarding } = useProgress()
  return (
    <div className="log">
      <div className="screen" style={{ textAlign: 'left' }}>
        <button className="close" onClick={onClose}>Done</button>
        <h1 className="large">Settings</h1>

        <div className="hdr">Weekly schedule</div>
        <div className="group">
          {WEEKDAYS.map((name, i) => (
            <label className="row selrow" key={name}>
              <span className="t"><b>{name}</b></span>
              <select aria-label={name} value={progress.schedule[i]} onChange={(e) => setDayType(i, e.target.value as DayType)}>
                {DAY_TYPES.map((t) => <option key={t} value={t}>{DAY_LABEL[t].replace(' Day', '')}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="sub">Default is Monday Push, Wednesday Pull, Friday Legs + Core. Change any day you like.</p>

        <div className="hdr">Level</div>
        <button className="cta sec" onClick={() => { restartOnboarding(); onClose() }}>Find your level again</button>
      </div>
    </div>
  )
}
```

Append to `src/styles.css`:

```css
.selrow select { font: inherit; color: var(--blue); background: var(--fill); border: 0; border-radius: 8px; padding: 6px 10px; min-height: 36px; }
```

`DAY_LABEL[t].replace(' Day', '')` gives options "Rest", "Push", "Pull", "Legs + Core". `user.selectOptions(..., 'pull')` selects by option `value`.

- [ ] **Step 3: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Settings with editable weekly schedule and redo placement" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 8: Progress tab

**Files:**
- Modify: `src/ui/ProgressScreen.tsx` (replace stub), `src/styles.css`, `src/App.test.tsx`
- Create: `src/ui/Ring.tsx`

**Interfaces:**
- Consumes: `useProgress`, `branchProgress`, `weeklyStreak`, `personalBests`, `BRANCHES`, `BRANCH_META`, `goalText`, `localDate`.
- Produces: `<Ring value color label sub />`, `<ProgressScreen />`.

- [ ] **Step 1: Write failing tests**

```tsx
describe('Progress tab', () => {
  const log = (date: string, nodeId: string, value: number, at: number) => ({ nodeId, value, date, at })

  it('shows a ring per branch, the weekly streak and personal bests', async () => {
    const user = userEvent.setup()
    const logs = [
      log('2026-09-14', 'push-wall', 10, 1), log('2026-09-16', 'push-wall', 12, 2),
      log('2026-09-07', 'push-wall', 9, 0), log('2026-09-09', 'push-wall', 8, 0),
    ]
    render(<App storage={seed({ completed: ['push-wall', 'push-incline'], logs })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('2 week streak')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Push: 2 of 18 steps' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pull: 0 of 12 steps' })).toBeInTheDocument()
    expect(screen.getByText('Wall push-up')).toBeInTheDocument()
    expect(screen.getByText('12 reps')).toBeInTheDocument()
  })

  it('shows a friendly empty state with no history', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('No streak yet')).toBeInTheDocument()
    expect(screen.getByText('Log a set to see your bests here.')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx` → Expected: FAIL (stub).

- [ ] **Step 2: Implement**

`src/ui/Ring.tsx`:

```tsx
import type { CSSProperties } from 'react'

const R = 32
const C = 2 * Math.PI * R

/** Our own quiet ring (not Apple's Activity rings). `value` is 0 to 1. */
export function Ring({ value, color, label }: { value: number; color: string; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <svg viewBox="0 0 80 80" width="76" height="76" role="img" aria-label={label} style={{ '--ring': color } as CSSProperties}>
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--fill)" strokeWidth="10" />
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--ring)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - v)} transform="rotate(-90 40 40)" />
    </svg>
  )
}
```

`src/ui/ProgressScreen.tsx`:

```tsx
import { BRANCHES } from '../engine/graph'
import { branchProgress, personalBests, weeklyStreak } from '../engine/stats'
import { goalText } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { Ring } from './Ring'

export function ProgressScreen() {
  const { nodes, byId, progress } = useProgress()
  const streak = weeklyStreak(progress.logs, progress.schedule, localDate())
  const bests = personalBests(progress.logs, byId, 5)

  return (
    <div className="screen">
      <h1 className="large">Progress</h1>
      <div className="card" style={{ marginTop: 12 }}>
        <b>{streak > 0 ? `${streak} week streak` : 'No streak yet'}</b>
        <div className="sub" style={{ marginTop: 4 }}>
          Train on 2 days in a week to keep it going. Rest weeks are fine, and an unfinished week never breaks it.
        </div>
      </div>

      <div className="rings">
        {BRANCHES.map((b) => {
          const { done, total } = branchProgress(nodes, progress, b)
          return (
            <div className="ringcard" key={b}>
              <Ring value={total ? done / total : 0} color={BRANCH_META[b].color} label={`${BRANCH_META[b].label}: ${done} of ${total} steps`} />
              <b>{BRANCH_META[b].label}</b>
              <span className="sub">{done} of {total} steps</span>
            </div>
          )
        })}
      </div>

      <div className="hdr">Personal bests</div>
      <div className="group">
        {bests.length === 0 && <div className="row"><span className="t"><span>Log a set to see your bests here.</span></span></div>}
        {bests.map(({ node, best }) => (
          <div className="row" key={node.id}>
            <span className="t"><b>{node.name}</b><span>Goal {goalText(node.goal)}</span></span>
            <span className="sub">{best}{node.goal.type === 'hold' ? ' s' : ' reps'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Append to `src/styles.css`:

```css
.rings { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.ringcard { background: var(--card); border-radius: 16px; padding: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
```

Note: the test expects `Pull: 0 of 12 steps` and `Push: 2 of 18 steps`, which are the real branch totals in `nodes.json` (push 18, pull 12, legs 7, core 8). If `nodes.json` changes, update the test numbers.

- [ ] **Step 3: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS. The streak test pins Monday 2026-09-21: the current week has no logs (not counted), and the two previous weeks each have 2 logged days, so the streak is 2.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Progress tab with branch rings, weekly streak and personal bests" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 9: Real-browser check, migration check, docs, deploy

**Files:**
- Modify: `AGENTS.md`, `docs/DECISIONS.md`, `docs/PLAN.md` (status lines only)

**Interfaces:** none.

- [ ] **Step 1: Full test and build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all green.

- [ ] **Step 2: Look at it in a phone-sized browser**

The browser extension may not be available; use the Chrome DevTools driver pattern from Plan 1 Task 9 (a Node script using `WebSocket` against `--remote-debugging-port`, device metrics 390×844 mobile). Start `npx vite preview --port 4173`, then drive and screenshot: Today (Saturday rest view and a training day), the Skills tab with one active skill, the Tree, Progress, Settings, and Onboarding on an empty store. To force a weekday, evaluate `Date`-override JS before load with `Page.addScriptToEvaluateOnNewDocument` (e.g. replace `Date` with a subclass that starts at 2026-09-21T12:00). Check: no horizontal scroll (`scrollWidth === clientWidth`), no clipped text in the tab bar with four tabs, and no console errors.

- [ ] **Step 3: Migration check with a Plan 1 save**

In the driver, before the app loads, write a Plan 1-shaped record into IndexedDB (`keyval-store` / `keyval`, key `up.progress`) such as `{ completed: ["push-wall"], focus: { push: "push-incline", pull: "pull-hang", legs: "legs-assisted", core: "core-deadbug" }, logs: [{ nodeId: "push-wall", value: 10, date: "2026-09-25", at: 1 }] }`, then load the app. Expected: no onboarding screen (used app), Push Day shows Incline push-up on Monday, no console errors, and the stored record afterwards contains `schedule`, `skillFocus`, `goalOverrides` and `onboarded: true`.

- [ ] **Step 4: Update the docs**

`AGENTS.md`: replace the "Current status" paragraph so it says Plan 2 is built and deployed (workout days with Mon/Wed/Fri default and editable schedule, skills with hold timer, Find your level, Settings, goal editing, Progress tab), and that **Plan 3** (backup export/import, GitHub backup, How-to demo button, accessibility and midnight/stale-day polish, the deferred minors in `docs/DECISIONS.md`) is next. Update the code map (`src/ui` now has Skills, Progress, Settings, Onboarding; `src/engine` has skills, workout, stats). `docs/PLAN.md`: mark milestone 5 (Skills, onboarding, customizing) as **Done (Plan 2)**. `docs/DECISIONS.md`: add "Plan 2 built" and remove nothing.

- [ ] **Step 5: Commit and deploy**

```bash
git add -A
git commit -m "docs: mark Plan 2 done; verified in browser incl. Plan 1 save migration" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
git push
```

Wait for the workflow (`gh run watch <id> --exit-status`, using the id of the run for the pushed commit), then check that the live bundle name equals the local `dist/assets/index-*.js` name and `curl -sI https://choralet.github.io/up/` returns 200.

- [ ] **Step 6: Hand over to the user**

Tell the user: open Up from the home screen (it updates itself the next time it opens online; if it looks unchanged, close it fully and reopen). Because they already used Plan 1, there is **no onboarding** for them; to try it, Today, gear icon, "Find your level again". Ask them to try: a Monday/Wednesday/Friday workout, starting a skill from the Skills tab, and changing a day in Settings. Remind them Plan 3 is next.
