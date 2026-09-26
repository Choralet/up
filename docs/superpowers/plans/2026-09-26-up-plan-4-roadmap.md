# Up: Plan 4: Roadmap (STRIQfit skill order)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Roadmap view inside the Skills tab that lists the 50 skills of STRIQfit's Year 1/2/3 videos in order, each with prerequisites, trainable steps, status, "I can already do this", and a button that opens the video at that skill's chapter.

**Architecture:** New moves are skill-chain nodes in the existing graph, flagged `roadmapOnly` so the tree drawing, branch rings and "one root per branch" rule ignore them (they may require nodes of any branch). Roadmap items (`src/data/roadmap.json`) list their step node ids and video timestamp; status is a pure function (`src/engine/roadmap.ts`). Training reuses `activateSkill` / `setFocus`; "already can" uses a new pure `completeSteps` that re-runs `sanitizeProgress` to repair focus.

**Tech Stack:** unchanged.

**Spec:** `docs/ROADMAP.md` (tables are the data spec; "Decisions" section answers its open questions). Timestamps: the video chapters, listed in Task 1.

## Global Constraints

- The 50 items, their order, names, step goals and prerequisites are exactly `docs/ROADMAP.md`. Every roadmap-only step is `kind: "skill"` with a chain id; chains are trained on the day in the table.
- Roadmap-only nodes never appear in the tree, never count in branch rings, never lock an existing tree node.
- Three tree extensions are ordinary tree nodes: `pull-fl-straddle` (front-lever), `push-planche-oneleg` (planche), `core-dragon-full` (dragon-flag).
- Video link format: `https://www.youtube.com/watch?v=<id>&t=<seconds>s`, opened in a new tab (`target="_blank" rel="noopener noreferrer"`). Video ids: Year 1 `J2JHDavNZB4`, Year 2 `lWXMkzPBpWU`, Year 3 `XTuqnzVzGK4`.
- Source line shown on the Roadmap: "Order from STRIQfit's videos. Steps and prerequisites are standard progressions, not from the videos."
- Commit trailers: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R`.

## Review Focus

1. A roadmap item whose first step is locked by a node in **another branch** (e.g. L-sit pull-up needs L-sit): shows Locked with the right names, no crash in tree/layout code. *(Tasks 1, 2)*
2. "I can already do this" on a Ready item must never complete a step whose prerequisites are missing, and must leave valid focus / skill focus (a finished chain frees its slot). *(Task 2)*
3. Items that share one chain (Back lever Y1 vs Y2, Dragon squat Y2 vs Y3, Front lever, Planche, Handstand push-up): status depends on the item's own steps. *(Task 2)*
4. Train This with 2 skills already active: explained, nothing changes. *(Task 3)*
5. Existing saves keep working (new nodes are additive; branch-ring totals change only by the three tree extensions). *(Tasks 1, 3)*

---

### Task 1: Data: types, nodes, chains, roadmap items

**Files:** Modify `src/data/types.ts`, `src/data/nodes.json`, `src/data/skills.json`, `src/data/nodes.test.ts`, `src/engine/layout.ts`, `src/engine/stats.ts`, `src/App.test.tsx`. Create `src/data/roadmap.json`, `src/data/roadmap.ts`, `scripts/add-roadmap-data.py` (one-off generator, kept for the record).

**Interfaces:** `ExerciseNode.roadmapOnly?: boolean`; `SkillChain.roadmapOnly?: boolean`; `interface RoadmapItem { id: string; year: 1 | 2 | 3; name: string; steps: string[]; t: number }`; `ROADMAP: RoadmapItem[]`; `videoUrl(item): string`; `formatStamp(seconds): string` (`m:ss`); `layoutBranch` and `branchProgress` ignore `roadmapOnly` nodes.

- [ ] **Step 1: Failing data tests.** In `src/data/nodes.test.ts`:
  - change "every requirement exists and lives in the same branch" so the same-branch check (and "parent is not roadmapOnly") applies only to nodes without `roadmapOnly`; existence is checked for all;
  - "exactly one root per branch", "never draws two nodes in the same cell" and "every tree label fits" run over `NODES.filter((n) => !n.roadmapOnly)`;
  - add:

```ts
  it('roadmap: 50 items in 3 years, every step exists, no duplicates, video stamps valid', () => {
    const ids = new Set(NODES.map((n) => n.id))
    expect(ROADMAP).toHaveLength(50)
    expect(ROADMAP.filter((r) => r.year === 1)).toHaveLength(22)
    expect(ROADMAP.filter((r) => r.year === 2)).toHaveLength(18)
    expect(ROADMAP.filter((r) => r.year === 3)).toHaveLength(10)
    expect(new Set(ROADMAP.map((r) => r.id)).size).toBe(50)
    for (const r of ROADMAP) {
      expect(r.steps.length, r.id).toBeGreaterThan(0)
      for (const s of r.steps) expect(ids.has(s), `${r.id} -> ${s}`).toBe(true)
      expect(Number.isInteger(r.t) && r.t >= 0 && r.t < 1000, r.id).toBe(true)
    }
    const stepsPerYear = [1, 2, 3].map((y) => ROADMAP.filter((r) => r.year === y).map((r) => r.t))
    for (const ts of stepsPerYear) expect(ts).toEqual([...ts].sort((a, b) => a - b))
  })

  it('roadmap-only nodes are skill steps of roadmap-only chains; tree chains stay in the tree', () => {
    const chainById = new Map(SKILLS.map((c) => [c.id, c]))
    for (const n of NODES.filter((x) => x.roadmapOnly)) {
      expect(n.kind, n.id).toBe('skill')
      expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBe(true)
    }
    for (const n of NODES.filter((x) => !x.roadmapOnly && x.skill)) expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBeFalsy()
  })

  it('builds the video link at the chapter', () => {
    const first = ROADMAP[0]
    expect(videoUrl(first)).toBe('https://www.youtube.com/watch?v=J2JHDavNZB4&t=9s')
    expect(formatStamp(128)).toBe('2:08')
  })
```

(import `ROADMAP, videoUrl, formatStamp` from `'./roadmap'`). In `src/App.test.tsx` change `'Push: 2 of 18 steps'` → `'Push: 2 of 19 steps'` and `'Pull: 0 of 12 steps'` → `'Pull: 0 of 13 steps'` (one tree extension each). Add a layout test in `src/engine/layout.test.ts`:

```ts
  it('never draws roadmap-only nodes', () => {
    for (const b of ['push', 'pull', 'legs', 'core'] as const) {
      expect(layoutBranch(NODES, b).placed.some((p) => p.node.roadmapOnly)).toBe(false)
    }
  })
```

Run `npx vitest run` → FAIL (no roadmap module).

- [ ] **Step 2: Types.** `ExerciseNode`: add `/** new move from the Roadmap: not drawn in the tree, may require any branch */ roadmapOnly?: boolean`. `SkillChain`: add `roadmapOnly?: boolean`.

- [ ] **Step 3: Generate the nodes, chains and items** with `scripts/add-roadmap-data.py` (run once with `python3 scripts/add-roadmap-data.py`; it appends to `nodes.json` and `skills.json` and writes `roadmap.json`, and refuses to run twice):

```python
"""One-off: add the Roadmap (docs/ROADMAP.md) to the data files. Refuses to run twice."""
import json

NODES = 'src/data/nodes.json'
SKILLS = 'src/data/skills.json'
ROADMAP = 'src/data/roadmap.json'

def reps(sets, n): return {'type': 'reps', 'sets': sets, 'target': n}
def hold(sets, s): return {'type': 'hold', 'sets': sets, 'target': s}

# chain id, name, branch, day, [ (node id, name, goal, requires, cue) ]
CHAINS = [
 ('hollow-hang', 'Hollow body hang', 'pull', 'pull', [
   ('rm-hollow-hang-1', 'Hollow body hang', hold(3, 20), ['pull-hang'], 'Hang with arms straight, ribs down, legs together slightly in front: a hollow shape on the bar.'),
   ('rm-hollow-hang-2', 'Hollow body hang, 30 s', hold(3, 30), ['rm-hollow-hang-1'], 'Same hollow shape, longer. No swinging.')]),
 ('frog-stand', 'Frog stand', 'push', 'push', [
   ('rm-frog-1', 'Frog stand, toes touching', hold(3, 10), ['push-knee'], 'Hands shoulder-width, knees on the backs of your arms, lean forward; keep toes lightly on the floor.'),
   ('rm-frog-2', 'Frog stand', hold(3, 30), ['rm-frog-1'], 'Lean until the feet float. Look slightly forward, fingers grip the floor.')]),
 ('planche-lean', 'Pseudo planche lean', 'push', 'push', [
   ('rm-lean-1', 'Planche lean', hold(3, 15), ['push-standard'], 'Push-up position, fingers turned out, lean shoulders forward over the hands, arms straight.'),
   ('rm-lean-2', 'Deep planche lean', hold(3, 30), ['rm-lean-1'], 'Shoulders well past the hands, protract the shoulder blades, body hollow.')]),
 ('elbow-lever', 'Elbow lever', 'push', 'push', [
   ('rm-elbow-1', 'Elbow lever, one leg down', hold(3, 10), ['rm-frog-2'], 'Elbows into the hips, lean forward until the body is level; one foot still touches.'),
   ('rm-elbow-2', 'Elbow lever', hold(3, 10), ['rm-elbow-1'], 'Whole body level, balanced on the elbows at your hips.')]),
 ('german-hang', 'German hang', 'pull', 'pull', [
   ('rm-german-1', 'Skin the cat', reps(3, 3), ['pull-hang'], 'From a hang, tuck and rotate backwards through your arms, then return. Slow and controlled.'),
   ('rm-german-2', 'German hang', hold(3, 15), ['rm-german-1'], 'Hang with the arms behind you and the shoulders fully extended. Go only as deep as is comfortable.')]),
 ('butchers-block', "Butcher's block", 'push', 'push', [
   ('rm-butcher', "Butcher's block stretch", hold(3, 45), [], 'Kneel with elbows on a bench, hold a stick behind your head, sink the chest down. Opens the shoulders for handstands. Needs a bench and a stick.')]),
 ('back-lever', 'Back lever', 'pull', 'pull', [
   ('rm-bl-tuck', 'Tuck back lever', hold(3, 10), ['rm-german-2'], 'From a German hang, lift the hips until the back is level, knees tucked.'),
   ('rm-bl-adv', 'Advanced tuck back lever', hold(3, 8), ['rm-bl-tuck'], 'Back flat, hips open to 90 degrees.'),
   ('rm-bl-straddle', 'Straddle back lever', hold(3, 5), ['rm-bl-adv'], 'Legs straight and wide, body level.'),
   ('rm-bl-full', 'Back lever', hold(3, 5), ['rm-bl-straddle'], 'Legs together, straight line from head to toes, level with the floor.')]),
 ('compression', 'Compact leg lifts', 'core', 'legs', [
   ('rm-compact', 'Compact leg lifts', reps(3, 10), ['core-hollow'], 'Sit with straight legs, hands beside the knees; lift both heels off the floor without leaning back.')]),
 ('reverse-nordic', 'Reverse Nordic', 'legs', 'legs', [
   ('rm-rn-1', 'Partial reverse Nordic', reps(3, 8), ['legs-squat'], 'Kneel tall, lean back in a straight line from knees to head, go only part way, come back up.'),
   ('rm-rn-2', 'Reverse Nordic', reps(3, 8), ['rm-rn-1'], 'Full range lean back, hips stay straight, then return.')]),
 ('straddle-sit', 'Straddle sit', 'core', 'legs', [
   ('rm-straddle-sit', 'Straddle sit', hold(3, 45), [], 'Sit with legs wide and straight, back tall, walk the chest forward. Flexibility for presses.')]),
 ('shoulder-stand', 'Shoulder stand', 'core', 'legs', [
   ('rm-shoulder-stand', 'Shoulder stand', hold(3, 30), ['core-hollow'], 'Lie back, lift the hips and legs straight up, support the hips with the hands, body straight.')]),
 ('one-arm-hang', 'Single-arm hang', 'pull', 'pull', [
   ('rm-oah-1', 'One-arm hang, towel assisted', hold(3, 10), ['pull-pullup'], 'Hang from one hand, the other holds a towel over the bar for a little help. Count each side.'),
   ('rm-oah-2', 'One-arm hang', hold(3, 15), ['rm-oah-1'], 'One hand only, shoulder active, no swinging. Count each side.')]),
 ('v-sit', 'V-sit', 'core', 'legs', [
   ('rm-vsit-1', 'High L-sit', hold(3, 10), ['core-lsit'], 'From an L-sit, lift the legs above hip height, push the shoulders down hard.'),
   ('rm-vsit-2', 'V-sit', hold(3, 5), ['rm-vsit-1'], 'Hands behind the hips, legs up high in a V.')]),
 ('sissy-squat', 'Sissy squat', 'legs', 'legs', [
   ('rm-sissy-1', 'Assisted sissy squat', reps(3, 8), ['legs-squat'], 'Hold a post, rise on the toes, knees travel forward while hips stay straight.'),
   ('rm-sissy-2', 'Sissy squat', reps(3, 8), ['rm-sissy-1'], 'No support. Knees forward, body in a straight line from knees to head.')]),
 ('swing', 'Gymnastics swing', 'pull', 'pull', [
   ('rm-swing', 'Gymnastics swing', reps(3, 10), ['rm-hollow-hang-2'], 'On the bar, move between hollow and arch with straight arms to build a controlled swing.')]),
 ('sl-rdl', 'Single-leg Romanian deadlift', 'legs', 'legs', [
   ('rm-rdl', 'Single-leg Romanian deadlift', reps(3, 10), ['legs-split'], 'Stand on one leg, hinge at the hip with a flat back, free leg goes back. Count each side.')]),
 ('kip-up', 'Kip-up', 'core', 'legs', [
   ('rm-kip-1', 'Roll-back rocks', reps(3, 8), ['rm-shoulder-stand'], 'Roll back onto the shoulders with hands by the ears, then rock forward fast.'),
   ('rm-kip-2', 'Kip-up', reps(3, 3), ['rm-kip-1'], 'Roll back, push through the hands and kick the legs out to land on your feet. Use a soft surface.')]),
 ('dragon-squat', 'Dragon squat', 'legs', 'legs', [
   ('rm-dragon-sq-1', 'Half dragon squat', reps(3, 5), ['legs-pistol'], 'Squat on one leg while the other leg passes behind it; hold something for balance. Count each side.'),
   ('rm-dragon-sq-2', 'Dragon squat', reps(3, 3), ['rm-dragon-sq-1'], 'Full depth, free leg behind and off the floor, no support. Count each side.')]),
 ('back-bridge', 'Back bridge', 'core', 'legs', [
   ('rm-bridge-1', 'Table-top bridge', hold(3, 20), [], 'Hands behind you, lift the hips until the body is flat like a table.'),
   ('rm-bridge-2', 'Back bridge', hold(3, 20), ['rm-bridge-1'], 'From lying down, push up with hands by the ears into an arch; push the shoulders over the hands.')]),
 ('bulgarian-dip', 'Bulgarian dip', 'push', 'push', [
   ('rm-dip', 'Parallel bar dip', reps(3, 10), ['push-standard'], 'On parallel bars, lower until the shoulders are below the elbows, press back up.'),
   ('rm-bulgarian', 'Bulgarian dip', reps(3, 6), ['rm-dip'], 'On rings, turn the rings out and let the hands go wide at the bottom. Needs rings.')]),
 ('lsit-pullup', 'L-sit pull-up', 'pull', 'pull', [
   ('rm-lsit-pullup', 'L-sit pull-up', reps(3, 5), ['pull-pullup', 'core-lsit'], 'Hold the legs straight out in an L and pull up without swinging.')]),
 ('false-grip', 'False-grip pull-up', 'pull', 'pull', [
   ('rm-fg-hang', 'False-grip hang', hold(3, 20), ['pull-pullup'], 'Wrists over the bar (or rings), palms sitting on top: the grip used for muscle-ups.'),
   ('rm-fg-pullup', 'False-grip pull-up', reps(3, 5), ['rm-fg-hang'], 'Keep the false grip all the way up and down.')]),
 ('lsit-handstand', 'L-sit to handstand', 'push', 'push', [
   ('rm-lsit-hs-1', 'Tuck L-sit to wall handstand', reps(3, 3), ['core-lsit', 'push-hs-back'], 'From a tuck L-sit, lean forward and lift the hips until the feet reach the wall.'),
   ('rm-lsit-hs-2', 'L-sit to handstand', reps(3, 1), ['rm-lsit-hs-1'], 'Press from L-sit into a freestanding handstand with straight arms.')]),
 ('ninety-hold', '90-degree hold', 'push', 'push', [
   ('rm-90-1', '90-degree hold, feet on the wall', hold(3, 5), ['rm-elbow-2', 'push-wall-hspu'], 'Bent arms at 90 degrees, body level, feet resting on a wall behind you.'),
   ('rm-90-2', '90-degree hold', hold(3, 5), ['rm-90-1'], 'Same position without the wall.')]),
 ('straddle-press', 'Straddle press', 'push', 'push', [
   ('rm-press-1', 'Straddle press from a box', reps(3, 3), ['push-hs-free', 'rm-straddle-sit'], 'Hands on the floor, feet on a box, lean forward and lift the straddled legs into a handstand.'),
   ('rm-press-2', 'Straddle press', reps(3, 1), ['rm-press-1'], 'From standing in a straddle, press to handstand with straight arms.')]),
 ('pelican', 'Pelican push-up', 'push', 'push', [
   ('rm-pelican', 'Pelican push-up', reps(3, 3), ['rm-bulgarian', 'rm-90-2'], 'An advanced deep push-up with the hands far back by the hips. Watch the video chapter for the exact form before trying.')]),
 ('ring-muscle-up', 'Ring muscle-up', 'pull', 'pull', [
   ('rm-ring-mu-1', 'Low-ring muscle-up transition', reps(3, 3), ['pull-mu', 'rm-fg-pullup'], 'On low rings with feet on the floor, practise turning over the rings with a false grip. Needs rings.'),
   ('rm-ring-mu-2', 'Ring muscle-up', reps(3, 2), ['rm-ring-mu-1'], 'From a false-grip hang, pull, turn over the rings and press to support.')]),
 ('straddle-planche', 'Straddle planche', 'push', 'push', [
   ('rm-sp-1', 'Straddle planche', hold(3, 3), ['push-planche-oneleg'], 'Straight arms, legs wide and straight, body level.'),
   ('rm-sp-2', 'Straddle planche push-up', reps(3, 1), ['rm-sp-1'], 'Lower and press while holding the straddle planche.')]),
 ('hs-kip', 'Handstand to kip-up', 'core', 'legs', [
   ('rm-hs-kip', 'Handstand to kip-up', reps(3, 1), ['push-hs-free', 'rm-kip-2'], 'From a handstand, tuck the chin and roll down, then kip up to your feet in one flow. Use a soft surface.')]),
]

TREE_EXT = [
 {'id': 'pull-fl-straddle', 'name': 'Straddle front lever', 'short': 'Straddle lever', 'branch': 'pull', 'kind': 'skill', 'skill': 'front-lever', 'requires': ['pull-fl-adv'], 'col': 1, 'goal': hold(3, 5), 'cue': 'Legs straight and wide, body level under the bar, arms straight.'},
 {'id': 'push-planche-oneleg', 'name': 'One-leg planche', 'branch': 'push', 'kind': 'skill', 'skill': 'planche', 'requires': ['push-adv-tuck'], 'col': 1, 'goal': hold(3, 5), 'cue': 'From advanced tuck, extend one leg straight back; hips stay level.'},
 {'id': 'core-dragon-full', 'name': 'Dragon flag', 'branch': 'core', 'kind': 'skill', 'skill': 'dragon-flag', 'requires': ['core-dragon'], 'col': 0, 'goal': reps(3, 3), 'cue': 'Straight body from shoulders to toes, lower slowly with control.'},
]

VID = {1: [9,49,126,169,219,249,280,323,350,385,435,463,538,588,620,649,679,728,762,783,846,915],
       2: [8,26,90,142,181,205,250,285,321,340,390,414,434,471,498,540,577,629],
       3: [5,63,127,174,216,231,253,271,282,298]}
ITEMS = {
 1: [('hollow-hang','Hollow body hang',['rm-hollow-hang-1','rm-hollow-hang-2']), ('frog-stand','Frog stand',['rm-frog-1','rm-frog-2']),
     ('hollow-hold','Hollow body hold',['core-hollow']), ('planche-lean','Pseudo planche lean',['rm-lean-1','rm-lean-2']),
     ('pseudo-pushup','Pseudo planche push-up',['push-pseudo']), ('tuck-front-lever','Tuck front lever',['pull-fl-tuck']),
     ('elbow-lever','Elbow lever',['rm-elbow-1','rm-elbow-2']), ('german-hang','German hang',['rm-german-1','rm-german-2']),
     ('butchers-block',"Butcher's block",['rm-butcher']), ('pistol','Pistol squat',['legs-pistol']),
     ('tuck-back-lever','Tuck back lever',['rm-bl-tuck']), ('compact-leg-lifts','Compact leg lifts',['rm-compact']),
     ('pike-pushup','Pike push-ups',['push-pike']), ('l-sit','L-sit',['core-tuck-lsit','core-lsit']),
     ('archer-pushup','Archer push-up',['push-archer']), ('tuck-planche','Tuck planche',['push-tuck-planche']),
     ('reverse-nordic','Reverse Nordic',['rm-rn-1','rm-rn-2']), ('straddle-sit','Straddle sit',['rm-straddle-sit']),
     ('shoulder-stand','Shoulder stand',['rm-shoulder-stand']), ('muscle-up','Muscle-up',['pull-mu-neg','pull-mu']),
     ('handstand','Handstand',['push-hs-chest','push-hs-back','push-hs-free']), ('wall-hspu','Handstand push-up',['push-wall-hspu'])],
 2: [('one-arm-hang','Single-arm hang',['rm-oah-1','rm-oah-2']), ('hanging-leg-raise','Hanging leg raises',['core-leg-raise']),
     ('v-sit','V-sit',['rm-vsit-1','rm-vsit-2']), ('sissy-squat','Sissy squat',['rm-sissy-1','rm-sissy-2']),
     ('swing','Gymnastics swing',['rm-swing']), ('sl-rdl','Bodyweight deadlift (single-leg)',['rm-rdl']),
     ('kip-up','Kip-up',['rm-kip-1','rm-kip-2']), ('back-lever','Back lever',['rm-bl-adv','rm-bl-straddle','rm-bl-full']),
     ('adv-front-lever','Advanced tuck front lever',['pull-fl-adv']), ('half-dragon-squat','Half dragon squat',['rm-dragon-sq-1']),
     ('adv-planche','Advanced tuck planche',['push-adv-tuck']), ('back-bridge','Back bridge',['rm-bridge-1','rm-bridge-2']),
     ('bulgarian-dip','Bulgarian dip',['rm-dip','rm-bulgarian']), ('lsit-pullup','L-sit pull-up',['rm-lsit-pullup']),
     ('false-grip','Wrist (false-grip) pull-ups',['rm-fg-hang','rm-fg-pullup']), ('archer-pullup','Archer pull-up',['pull-archer']),
     ('dragon-flag','Dragon flag',['core-dragon','core-dragon-full']), ('lsit-handstand','L-sit to handstand',['rm-lsit-hs-1','rm-lsit-hs-2'])],
 3: [('ninety-hold','The 90 hold',['rm-90-1','rm-90-2']), ('straddle-press','Straddle press',['rm-press-1','rm-press-2']),
     ('pelican','Pelican push-up',['rm-pelican']), ('dragon-squat','Almighty dragon squat',['rm-dragon-sq-2']),
     ('straddle-front-lever','Straddle front lever',['pull-fl-straddle']), ('ring-muscle-up','Ring muscle-up',['rm-ring-mu-1','rm-ring-mu-2']),
     ('freestanding-hspu','Freestanding handstand push-up',['push-hspu']), ('one-leg-planche','One-leg planche',['push-planche-oneleg']),
     ('straddle-planche','Straddle (planche) push-up',['rm-sp-1','rm-sp-2']), ('hs-kip','Handstand to kip-up',['rm-hs-kip'])],
}

text = open(NODES).read()
assert '"rm-' not in text, 'already applied'
nodes = []
for _, _, branch, _, steps in CHAINS:
    for nid, name, goal, req, cue in steps:
        nodes.append({'id': nid, 'name': name, 'branch': branch, 'kind': 'skill', 'skill': None, 'requires': req, 'col': 0, 'goal': goal, 'cue': cue, 'roadmapOnly': True})
# fill chain ids
i = 0
for cid, _, _, _, steps in CHAINS:
    for _ in steps:
        nodes[i]['skill'] = cid
        i += 1
lines = ',\n'.join('  ' + json.dumps(n, ensure_ascii=False) for n in TREE_EXT + nodes)
end = text.rstrip().rstrip(']').rstrip()
open(NODES, 'w').write(end + ',\n\n' + lines + '\n]\n')

skills = json.load(open(SKILLS))
skills += [{'id': cid, 'name': name, 'day': day, 'roadmapOnly': True} for cid, name, _, day, _ in CHAINS]
open(SKILLS, 'w').write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in skills) + '\n]\n')

items = []
for year in (1, 2, 3):
    assert len(ITEMS[year]) == len(VID[year])
    for (iid, name, steps), t in zip(ITEMS[year], VID[year]):
        items.append({'id': f'y{year}-{iid}', 'year': year, 'name': name, 'steps': steps, 't': t})
open(ROADMAP, 'w').write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in items) + '\n]\n')
print(len(nodes) + len(TREE_EXT), 'nodes,', len(CHAINS), 'chains,', len(items), 'items')
```

Expected output: `58 nodes, 29 chains, 50 items`.

`src/data/roadmap.ts`:

```ts
import raw from './roadmap.json'

export interface RoadmapItem {
  id: string
  year: 1 | 2 | 3
  name: string
  /** node ids, in order; the item is done when all are completed */
  steps: string[]
  /** seconds into that year's video where this skill's chapter starts */
  t: number
}

export const ROADMAP = raw as unknown as RoadmapItem[]

export const VIDEOS: Record<1 | 2 | 3, { id: string; title: string }> = {
  1: { id: 'J2JHDavNZB4', title: 'Every Calisthenics Skill to Learn in Order for your First Year' },
  2: { id: 'lWXMkzPBpWU', title: 'Every Calisthenics Skill to Learn In Order for your Second Year' },
  3: { id: 'XTuqnzVzGK4', title: 'Every Calisthenics Skill to Learn in Order for your Third Year' },
}

export const videoUrl = (item: RoadmapItem) => `https://www.youtube.com/watch?v=${VIDEOS[item.year].id}&t=${item.t}s`

export const formatStamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
```

- [ ] **Step 4: Tree and rings ignore roadmap-only nodes.** `layout.ts` `layoutBranch`: `const inBranch = nodes.filter((n) => n.branch === branch && !n.roadmapOnly)`. `stats.ts` `branchProgress`: same filter.

- [ ] **Step 5: Verify and commit.** `npx vitest run && npx tsc --noEmit && npm run build` → PASS. Commit `feat(data): Roadmap skills, steps and video chapters from STRIQfit's Year 1-3 videos`.

---

### Task 2: Roadmap engine

**Files:** Create `src/engine/roadmap.ts`, `src/engine/roadmap.test.ts`. Modify `src/engine/progress.ts`, `src/engine/progress.test.ts`.

**Interfaces:**
- `completeSteps(nodes, progress, ids: string[]): Progress` (progress.ts): completes each id in order only if its requirements are met at that moment; returns the same object when nothing changes; otherwise returns `sanitizeProgress(nodes, {...progress, completed})` so focus and skill focus are repaired.
- `interface RoadmapStatus { status: 'done' | 'training' | 'ready' | 'locked'; next: ExerciseNode | null; needs: string[]; done: number }` and `roadmapStatus(byId: Map<string, ExerciseNode>, progress: Progress, item: RoadmapItem): RoadmapStatus`. `next` is the item's first unfinished step. Training: `next` is the branch focus or its chain's current step. Ready: `next` unlocked. Locked: `needs` = names of `next`'s unmet requirements.

- [ ] **Step 1: Failing tests.** Append to `src/engine/progress.test.ts`:

```ts
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
```

(add `completeSteps` to the import). `src/engine/roadmap.test.ts`:

```ts
import { NODES } from '../data/nodes'
import { ROADMAP } from '../data/roadmap'
import { indexNodes } from './graph'
import { activateSkill, sanitizeProgress, type Progress } from './progress'
import { roadmapStatus } from './roadmap'

const byId = indexNodes(NODES)
const item = (id: string) => ROADMAP.find((r) => r.id === id)!
const save = (raw: object): Progress => sanitizeProgress(NODES, { onboarded: true, ...raw })

describe('roadmapStatus', () => {
  it('a fresh user: Hollow body hang is locked behind Dead hang', () => {
    const s = roadmapStatus(byId, save({}), item('y1-hollow-hang'))
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['Dead hang'])
  })
  it('ready once the requirement is done, with the first step as next', () => {
    const s = roadmapStatus(byId, save({ completed: ['pull-hang'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('ready')
    expect(s.next?.id).toBe('rm-hollow-hang-1')
  })
  it('training when the chain is on this item\'s step', () => {
    const p = activateSkill(NODES, save({ completed: ['pull-hang'] }), 'hollow-hang')
    expect(roadmapStatus(byId, p, item('y1-hollow-hang')).status).toBe('training')
  })
  it('training for a linked strength exercise that is the branch focus', () => {
    const s = roadmapStatus(byId, save({ completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard'], focus: { push: 'push-pike' } }), item('y1-pike-pushup'))
    expect(s.status).toBe('training')
  })
  it('done when every step is completed', () => {
    const s = roadmapStatus(byId, save({ completed: ['pull-hang', 'rm-hollow-hang-1', 'rm-hollow-hang-2'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('done')
    expect(s.next).toBeNull()
    expect(s.done).toBe(2)
  })
  it('lists cross-branch requirements by name', () => {
    const s = roadmapStatus(byId, save({ completed: ['pull-hang', 'pull-scap', 'pull-row', 'pull-negative', 'pull-pullup'] }), item('y2-lsit-pullup'))
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['L-sit'])
  })
  it('items sharing a chain judge their own steps (Back lever Y1 done, Y2 ready)', () => {
    const p = save({ completed: ['pull-hang', 'rm-german-1', 'rm-german-2', 'rm-bl-tuck'] })
    expect(roadmapStatus(byId, p, item('y1-tuck-back-lever')).status).toBe('done')
    expect(roadmapStatus(byId, p, item('y2-back-lever')).status).toBe('ready')
  })
})
```

Run → FAIL.

- [ ] **Step 2: Implement.** `progress.ts`, after `setFocus`:

```ts
/** "I can already do this": complete the steps in order, each only if its requirements are met by then. */
export function completeSteps(nodes: ExerciseNode[], progress: Progress, ids: string[]): Progress {
  const byId = indexNodes(nodes)
  const done = new Set(progress.completed)
  for (const id of ids) {
    const n = byId.get(id)
    if (n && !done.has(id) && isUnlocked(n, done)) done.add(id)
  }
  if (done.size === progress.completed.length) return progress
  return sanitizeProgress(nodes, { ...progress, completed: [...done] })
}
```

`src/engine/roadmap.ts`:

```ts
import type { RoadmapItem } from '../data/roadmap'
import type { ExerciseNode } from '../data/types'
import { isUnlocked, type Progress } from './progress'

export interface RoadmapStatus {
  status: 'done' | 'training' | 'ready' | 'locked'
  /** the item's first unfinished step */
  next: ExerciseNode | null
  /** names of next's unmet requirements (locked only) */
  needs: string[]
  /** steps of this item already completed */
  done: number
}

export function roadmapStatus(byId: Map<string, ExerciseNode>, progress: Progress, item: RoadmapItem): RoadmapStatus {
  const completed = new Set(progress.completed)
  const steps = item.steps.map((id) => byId.get(id)).filter((n): n is ExerciseNode => !!n)
  const done = steps.filter((s) => completed.has(s.id)).length
  const next = steps.find((s) => !completed.has(s.id)) ?? null
  if (!next) return { status: 'done', next: null, needs: [], done }
  const training = next.skill ? progress.skillFocus[next.skill] === next.id : progress.focus[next.branch] === next.id
  if (training) return { status: 'training', next, needs: [], done }
  if (isUnlocked(next, completed)) return { status: 'ready', next, needs: [], done }
  const needs = next.requires.filter((r) => !completed.has(r)).map((r) => byId.get(r)?.name ?? r)
  return { status: 'locked', next, needs, done }
}
```

- [ ] **Step 3: Verify and commit.** `npx vitest run && npx tsc --noEmit` → PASS. Commit `feat(engine): roadmap status and "already can" completion`.

---

### Task 3: Roadmap UI in the Skills tab

**Files:** Create `src/ui/RoadmapView.tsx`, `src/ui/RoadmapSheet.tsx`. Modify `src/store/ProgressContext.tsx` (+`completeSteps(ids)`), `src/ui/SkillsScreen.tsx`, `src/ui/LevelUpSheet.tsx`, `src/styles.css`, `src/App.test.tsx`.

**Interfaces:** `ProgressValue.completeSteps(ids: string[]): void`; `<RoadmapView onLog(nodeId) />`; `<RoadmapSheet item onClose onLog />`. SkillsScreen: segmented `My Skills | Roadmap` (role tablist, aria-label "Skills view"); the My Skills library lists only chains without `roadmapOnly`; Active lists every active chain.

- [ ] **Step 1: Failing tests.** Append to `src/App.test.tsx`:

```tsx
describe('Roadmap', () => {
  const openRoadmap = async (extra: Record<string, unknown> = {}) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    return user
  }

  it('lists Year 1 to 3 in the video order with the source note', async () => {
    await openRoadmap()
    expect(screen.getByRole('heading', { name: /Year 1/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Year 3/ })).toBeInTheDocument()
    const names = screen.getAllByRole('button', { name: /^\d+\. / }).map((b) => b.getAttribute('aria-label'))
    expect(names[0]).toMatch(/^1\. Hollow body hang/)
    expect(names[1]).toMatch(/^2\. Frog stand/)
    expect(names).toHaveLength(50)
    expect(screen.getByText(/Order from STRIQfit's videos/)).toBeInTheDocument()
  })

  it('opens a skill with needs, steps and a video link at its chapter', async () => {
    const user = await openRoadmap()
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand/ }))
    const dialog = screen.getByRole('dialog', { name: 'Frog stand' })
    expect(dialog).toHaveTextContent('Needs')
    expect(dialog).toHaveTextContent('Knee push-up')
    expect(dialog).toHaveTextContent('Frog stand, toes touching')
    const link = within(dialog).getByRole('link', { name: /Watch in video/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=J2JHDavNZB4&t=49s')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('Train This starts a ready skill and it shows in that day\'s workout', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'Train This' }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, training/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Frog stand, toes touching/ })).toBeInTheDocument()
  })

  it('"I can already do this" marks it done after confirming', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'I Can Already Do This' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Mark Frog stand as done?' })).getByRole('button', { name: 'Mark Done' }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, done/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Year 1 · 1 of 22 done/ })).toBeInTheDocument()
  })

  it('a locked skill says what it needs and cannot be trained', async () => {
    const user = await openRoadmap()
    await user.click(screen.getByRole('button', { name: /^7\. Elbow lever, locked/ }))
    const dialog = screen.getByRole('dialog', { name: 'Elbow lever' })
    expect(dialog).toHaveTextContent('Frog stand')
    expect(within(dialog).queryByRole('button', { name: 'Train This' })).not.toBeInTheDocument()
  })

  it('explains when two skills are already active', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee', 'pull-hang'], skillFocus: { 'hollow-hang': 'rm-hollow-hang-1', 'butchers-block': 'rm-butcher' } })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    expect(screen.getByRole('button', { name: 'Train This' })).toBeDisabled()
    expect(screen.getByText('Two skills are already active. Stop one in My Skills first.')).toBeInTheDocument()
  })

  it('My Skills keeps its library to the tree skills, and roadmap skills do not appear in the tree', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.queryByRole('button', { name: 'Start Frog stand' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    expect(screen.queryByRole('button', { name: /Frog stand/ })).not.toBeInTheDocument()
  })
})
```

Run → FAIL.

- [ ] **Step 2: Provider.** `ProgressValue`: `completeSteps(ids: string[]): void`; value: `completeSteps: (ids) => update((p) => completeStepsRule(nodes, p, ids))` (import `completeSteps as completeStepsRule`).

- [ ] **Step 3: RoadmapSheet.**

```tsx
import { useState } from 'react'
import { formatStamp, videoUrl, type RoadmapItem } from '../data/roadmap'
import { MAX_ACTIVE_SKILLS } from '../engine/progress'
import { roadmapStatus } from '../engine/roadmap'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { ConfirmSheet } from './ConfirmSheet'

const LABEL = { done: 'Done', training: 'Training', ready: 'Ready', locked: 'Locked' } as const

export function RoadmapSheet({ item, onClose, onLog }: { item: RoadmapItem; onClose: () => void; onLog: (id: string) => void }) {
  const { byId, progress, activateSkill, setFocus, completeSteps } = useProgress()
  const [confirm, setConfirm] = useState(false)
  const s = roadmapStatus(byId, progress, item)
  const next = s.next
  const full = Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS
  const completed = new Set(progress.completed)

  const train = () => {
    if (!next) return
    if (next.skill) activateSkill(next.skill)
    else setFocus(next.id)
    onClose()
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet roadmap-sheet" role="dialog" aria-modal="true" aria-label={item.name}>
        <div className="eyebrow">Year {item.year} · {LABEL[s.status]}</div>
        <h2>{item.name}</h2>
        {next && (
          <>
            <div className="hdr" style={{ margin: '12px 0 4px' }}>Needs</div>
            {next.requires.length === 0 && <div className="req">Nothing, start any time</div>}
            {next.requires.map((id) => {
              const ok = completed.has(id)
              return (
                <div className="req" key={id}>
                  <span className={ok ? 'ok' : 'nx'} aria-hidden="true">{ok ? '✓' : '…'}</span>
                  {byId.get(id)?.name ?? id}
                </div>
              )
            })}
          </>
        )}
        <div className="hdr" style={{ margin: '12px 0 4px' }}>Steps</div>
        <ol className="steplist">
          {item.steps.map((id) => {
            const n = byId.get(id)!
            return (
              <li key={id} className={completed.has(id) ? 'stepdone' : ''}>
                <b>{n.name}</b> <span className="sub">{goalText(n.goal)}</span>
              </li>
            )
          })}
        </ol>
        {next && <p className="cue sub">{next.cue}</p>}
        {s.status === 'training' && next && (
          <button className="cta" onClick={() => { onLog(next.id); onClose() }}>Log This</button>
        )}
        {s.status === 'ready' && (
          <>
            <button className="cta" disabled={!!next?.skill && full} onClick={train}>{next?.skill ? 'Train This' : 'Make This My Focus'}</button>
            {next?.skill && full && <p className="sub">Two skills are already active. Stop one in My Skills first.</p>}
            <button className="cta sec" onClick={() => setConfirm(true)}>I Can Already Do This</button>
          </>
        )}
        <a className="cta sec videolink" href={videoUrl(item)} target="_blank" rel="noopener noreferrer">
          Watch in video ({formatStamp(item.t)})
        </a>
        <button className="cta sec" onClick={onClose}>Close</button>
      </div>
      {confirm && (
        <ConfirmSheet
          title={`Mark ${item.name} as done?`}
          message="Only if you can already do every step cleanly. You can still train it later from the tree or Skills."
          actions={[{ label: 'Mark Done', tone: 'primary', onClick: () => { completeSteps(item.steps); setConfirm(false) } }]}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: RoadmapView.**

```tsx
import { useState } from 'react'
import { ROADMAP, VIDEOS, type RoadmapItem } from '../data/roadmap'
import { roadmapStatus } from '../engine/roadmap'
import { useProgress } from '../store/ProgressContext'
import { RoadmapSheet } from './RoadmapSheet'

const ICON = { done: '✓', training: '●', ready: '', locked: '🔒' } as const
const WORD = { done: 'done', training: 'training', ready: 'ready', locked: 'locked' } as const

export function RoadmapView({ onLog }: { onLog: (id: string) => void }) {
  const { byId, progress } = useProgress()
  const [open, setOpen] = useState<RoadmapItem | null>(null)

  return (
    <>
      <p className="sub" style={{ marginTop: 8 }}>
        Order from STRIQfit's videos. Steps and prerequisites are standard progressions, not from the videos.
      </p>
      {([1, 2, 3] as const).map((year) => {
        const items = ROADMAP.filter((r) => r.year === year)
        const rows = items.map((item) => ({ item, s: roadmapStatus(byId, progress, item) }))
        const doneCount = rows.filter((r) => r.s.status === 'done').length
        return (
          <section key={year}>
            <h2 className="hdr" style={{ marginBottom: 8 }}>Year {year} · {doneCount} of {items.length} done</h2>
            <div className="sub" style={{ margin: '0 4px 8px', fontSize: 12 }}>{VIDEOS[year].title}</div>
            <div className="group">
              {rows.map(({ item, s }, i) => (
                <button
                  key={item.id}
                  className={`row rmrow ${s.status}`}
                  aria-label={`${i + 1}. ${item.name}, ${WORD[s.status]}${s.status === 'locked' ? `, needs ${s.needs.join(', ')}` : ''}`}
                  onClick={() => setOpen(item)}
                >
                  <span className="rmnum">{i + 1}</span>
                  <span className="t">
                    <b>{item.name}</b>
                    <span>{s.status === 'locked' ? `Needs: ${s.needs.join(', ')}` : s.status === 'ready' ? 'Ready' : s.status === 'training' ? 'Training' : 'Done'}</span>
                  </span>
                  <span className="rmicon" aria-hidden="true">{ICON[s.status]}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {open && <RoadmapSheet item={open} onClose={() => setOpen(null)} onLog={onLog} />}
    </>
  )
}
```

- [ ] **Step 5: SkillsScreen switch, library filter, level-up hint cap, styles.**

`SkillsScreen`: add `const [view, setView] = useState<'mine' | 'roadmap'>('mine')`; under the title render

```tsx
      <div className="seg" role="tablist" aria-label="Skills view">
        <button role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>My Skills</button>
        <button role="tab" aria-selected={view === 'roadmap'} className={view === 'roadmap' ? 'on' : ''} onClick={() => setView('roadmap')}>Roadmap</button>
      </div>
```

and wrap the existing content after it in `{view === 'mine' ? (<>…existing…</>) : <RoadmapView onLog={onLog} />}`. Library rows: `rows.filter((r) => r.s.status !== 'active' && !r.chain.roadmapOnly)`.

`LevelUpSheet`: replace the unlocked-skill line with

```tsx
        {unlockedSkills.length > 0 && (
          <p className="sub">
            Unlocks {unlockedSkills.length === 1 ? 'a skill' : `${unlockedSkills.length} skills`}: {unlockedSkills.slice(0, 3).map((n) => n.name).join(', ')}
            {unlockedSkills.length > 3 ? ' and more' : ''}. Find {unlockedSkills.length === 1 ? 'it' : 'them'} in Skills.
          </p>
        )}
```

and update the existing test expectation `/Unlocks a skill: Chest-to-wall handstand hold/` → `/Unlocks .*Chest-to-wall handstand hold/` (finishing Pike push-up now unlocks more than one skill step).

`styles.css`, append:

```css
.rmrow .rmnum { width: 28px; flex: none; color: var(--label2); font-variant-numeric: tabular-nums; font-weight: 600; }
.rmrow.done b { color: var(--label2); }
.rmrow.locked b { color: var(--label2); }
.rmrow .rmicon { width: 22px; text-align: center; color: var(--legs); }
.rmrow.training .rmicon { color: var(--skill); }
.roadmap-sheet { max-height: 85dvh; overflow: auto; }
.steplist { margin: 4px 0 8px 20px; padding: 0; }
.steplist li { margin: 4px 0; }
.steplist li.stepdone b { text-decoration: line-through; color: var(--label2); }
.videolink { text-decoration: none; }
```

- [ ] **Step 6: Verify and commit.** `npx vitest run && npx tsc --noEmit && npm run build` → PASS. Commit `feat(ui): Roadmap in the Skills tab with status, steps, "already can" and video chapter links`.

---

### Task 4: Browser check, docs, deploy

- [ ] Phone-sized Chrome driver (as in Plans 1–3): Skills → Roadmap renders 50 rows without horizontal overflow; open Frog stand, check the link href; Train This on a ready item; Today shows it; the tree still looks the same (plus the three extensions); no console errors.
- [ ] `docs/ROADMAP.md`: status line → built; add a "Decisions" section with the seven answers (Archer push-up; single-leg RDL; false-grip; Pelican kept with a cautious cue and the video link; straddle planche push-up; roll-down kip; equipment moves kept with equipment in the cue) and the video button. `AGENTS.md` status: add Roadmap. `docs/DECISIONS.md`: "Plan 4 built".
- [ ] Commit, push, watch deploy, compare live bundle, then the final whole-branch review.
