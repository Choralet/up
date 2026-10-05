# Up: Plan 8: New tree data (34 trees, 229 exercises)

> **Status: approved 2026-10-05 ("Do what you think is the best") and built on branch `claude/beautiful-carson-9h5eok`.** Not on `main` until the user has seen it. What changed while building: end of this file.
> Source: the user's export "Calisthenics Progression Trees — Data Export" (copied to `docs/data/calisthenics-trees.md`).

**Goal:** Replace the hand-made exercise graph (109 nodes) with the user's researched data: 10 main trees, 11 muscle-specific trees, 13 skill ladders. Every exercise gains equipment, muscles, a "move on when" rule, form cues, a source and how-to links. Nobody loses progress.

## 1. What changes for you (plain language)

| Today | After Plan 8 |
|---|---|
| 9 tracks, 109 exercises, 4 tree tabs each drawing a whole branch | 10 main trees + 11 muscle trees + 13 skill ladders, 229 exercises |
| Tree tab shows all of Push at once | Tree tab: pick a branch, then one **ladder** at a time (chips: Push-ups · Overhead · Dips · Handstand · …) |
| One short cue per exercise | Sheet shows: goal, **Move on when** (the source's rule), cues, **equipment**, **muscles**, **source**, **How-to links**, the tree's progression video, YouTube search |
| GIF demo for 19 exercises | Kept (re-pointed to the new ids), plus links for most of the 229 |
| Skill chains: handstand, HSPU, planche, one-arm push-up, muscle-up, front lever, pistol, L-sit, dragon flag | 13 ladders: + back lever, ring muscle-up, human flag, one-arm pull-up, elbow lever; **one-arm push-up becomes part of the Push-ups tree** |

## 2. How the source maps onto the app

| Source | App |
|---|---|
| Tree, `category: main` | A **track** (own focus + level-up). Track id = tree id (`hpush`, `vpull`, …) |
| Tree, `category: supp` | An **accessory** track: in the Tree, and one per day in **Full** workouts, rotating (Q1) |
| Tree, `category: skill` | A **skill chain** (max 2 active, as now). Chain id = tree id |
| Node `treeId:nodeId` | Node id, e.g. `hpush:oa` (old ids migrate, section 5) |
| `parent` | `requires: [parent]` (one parent; several roots per tree allowed) |
| `advance` text | Shown as-is ("Move on when"), **and** turned into a structured goal (section 3) |
| `equipment` (`a+b\|c`) | `equipment: string[][]` (any-of groups of all-of items) |
| `primary` / `secondary` | `muscles: { primary, secondary }` |
| `cues`, `source`, `how-to`, tree video | `cues`, `source`, `links[]`, tree `video` |

Branch for each tree (colours and tabs stay Push / Pull / Legs / Core):

| Branch | Main | Skill ladders (day) | Muscle trees |
|---|---|---|---|
| Push | hpush Push-ups, vpush Overhead, dip Dips | hs, hspu, planche, elbow (Push day) | tri, scap, cuff |
| Pull | vpull Pull-ups, hpull Rows | fl, bl, bmu, rmu, flag, oap (Pull day) | bic, rear, grip |
| Legs | squat Squats, hinge Hinge | pistol (Legs day) | calf, tib, hips |
| Core | antiext Plank & hollow, compress Leg raises, lateral Side plank (**new track**) | lsit, dflag (Legs + Core day) | lowback, neck |

Days: Push → hpush, vpush, dip. Pull → vpull, hpull. Legs + Core → squat, hinge, antiext, compress, lateral. Core finisher on Push/Pull days: antiext, then compress, then lateral.

## 3. Turning "advance" text into a goal

The app needs a number (sets × reps or seconds) to offer a Level Up. An importer reads it from the text; a small hand-written overlay fixes the rest.

| Text | Goal | Rule |
|---|---|---|
| `3×8 clean` | 3 × 8 | as written |
| `3×8–12`, `3×10–15 s` | 3 × 12, 3 × 15 s | **top of the range** (Q2) |
| `Hold 30–60 s`, `Accumulate 30–60 s` | 1 × 60 s | top of the range |
| `3×8 per side` | 3 × 8 **per side** | new `perSide` flag, shown in the goal text |
| `Sets of about 10 (THENX)` | 3 × 10 | 3 sets when unstated |
| `5–8 reps; add load…` (weighted) | 3 × 8 | 3 sets; "add load" stays in the text |
| No number (wrist prep, kick-up practice, "Elite", "Takes years", band-assisted branches) | Agent's default, listed for your review | ~12 nodes; all editable in the app |

Reps vs hold: a hold when the goal has seconds (`s`); else reps.

## 4. Exercises that appear in two trees

The source repeats some moves (Pike push-up in Overhead **and** HSPU; Chest-to-bar pull-up in Pull-ups **and** Bar muscle-up; Archer/Typewriter pull-up in Pull-ups **and** One-arm pull-up; Dead hang in Pull-ups **and** Grip; Cossack squat, Copenhagen plank, Reverse hyper, Diamond push-up, Lying leg raise, False-grip hang, Scapular pull, Straight-bar dip, Box pistol).

**Recommendation:** keep both nodes (each tree reads correctly) but **link them as twins**: finishing one finishes the other, and History shows both. Without this, you'd redo Pike push-up to start HSPU.

## 5. Keeping your progress (migration)

- A table maps every old id to its new id (e.g. `push-standard → hpush:p`, `push-pike → vpush:pk`, `pull-fl-tuck → fl:tf`). Applied to: completed, focus, active skills, logs, goal overrides, goal ramp stages, Roadmap. Old export files and the GitHub backup go through the same path on restore.
- Old exercises with no new match: Decline push-up, Pike hold, Back-to-wall handstand, One-leg planche. Rule: you never go backwards; their nearest easier match counts as done (e.g. One-leg planche done → Advanced tuck planche done, Straddle is next). Their logs are kept under the nearest match.
- Anything below a finished exercise in the same tree counts as done (so nobody restarts at a wall push-up).
- An active "One-arm push-up" skill becomes the Push-ups track's focus.
- Track focus keys move (`push-h → hpush`, …), like Plan 6's branch → track migration.
- Backup uploads once after the update (ids changed).

## 6. Roadmap (Plan 4) stays

Its items point to the new nodes where an equivalent exists (Frog stand → `planche:fr`, Tuck back lever → `bl:tb`, Pistol → `pistol:ps`, Hollow hold → `antiext:hh`, L-sit → `lsit:tl, lsit:fl`, Muscle-up → `bmu:amu, bmu:kmu, bmu:smu`, …). Roadmap-only moves with no equivalent (Butcher's block, Reverse Nordic, Kip-up, Pelican, …) stay as they are.

## 7. Skill ladder entry

The source starts every ladder at an open first rung and puts the entry standard in the notes. **Decided (Q4): keep a lock.** Each ladder's first rung requires one main exercise, chosen from the notes (agent's additions, not in the source; shown in the sheet as "Requires …"):

| Ladder | First rung needs | Ladder | First rung needs |
|---|---|---|---|
| Handstand | Plank (`antiext:pl`) | Bar muscle-up | Pull-up (`vpull:pu`) |
| HSPU | Push-up (`hpush:p`) | Ring muscle-up | Pull-up + Parallel bar dip |
| Planche | Push-up | Human flag | Wall HSPU negative (`vpush:whn`) |
| Elbow lever | Knee push-up (`hpush:k`) | One-arm pull-up | Pull-up (Archer rung); Weighted pull-up root: Pull-up |
| Front lever | Pull-up | Pistol | Bodyweight squat (`squat:s`) |
| Back lever | Negative pull-up (`vpull:np`) | L-sit | Plank |
| | | Dragon flag | Hanging knee raise (`compress:hkr`) |

The notes text is also shown as "Before you start".

## 8. Screens

- **Tree:** branch tabs (as now) + a row of ladder chips; one ladder drawn at a time with **automatic layout** (columns from the tree shape, no hand-set `col`). Wide ladders (Pull-ups: 7 leaves) use the existing zoom/scroll. Long names get a `short` label.
- **Exercise sheet:** sections Goal · Move on when · Cues · Equipment chips · Muscles (primary bold) · Source · How-to (Fitloop / Hybrid Calisthenics / StrengthLog / Caliverse / source video, then the tree video, then "Search YouTube"). Links open in Safari.
- **Today / Find your level:** unchanged shape; 10 tracks instead of 9 (+ Side plank). Find your level walks each tree's main line (first-listed child).
- **Branch level badge:** "exercises done / total" now counts more exercises, so the bar will look emptier after the update (e.g. Push 4/23 → 4/~60). Recommendation: count main + skill trees only, not muscle trees.
- **Equipment:** "My equipment" filter (Q3), section 8b.

## 8b. My equipment (Q3)

- **Where you set it:** Find your level starts with "What do you have?" (13 chips: Floor and Wall pre-ticked); Settings gets a **My Equipment** row to change it later. Saved as `Progress.equipment` (older saves: not set = everything counts as owned, so nothing changes until you choose).
- **Rule:** an exercise is doable when you own **all** items of **any one** option (`rings+box | low+box`).
- **Tree:** exercises you can't do are greyed with "Needs Rings" (or the cheapest missing option). You can still open them.
- **Stepping over:** a greyed exercise in the middle of a ladder does not block you: the next one unlocks when the one before the greyed one is done (e.g. no bench → Incline push-up is stepped over, Knee push-up unlocks after Wall push-up).
- **Workouts and suggestions:** focus and Level Up only offer doable exercises. A track with nothing doable (e.g. Pull-ups without a bar) shows "Needs a pull-up bar" and is left out of Today. Skill ladders you can't do can't be started (Human flag without a pole).
- **Find your level** only asks about doable exercises.
- Changing equipment never removes progress; it only changes what is offered next.

## 9. Build approach

1. Copy the export to `docs/data/calisthenics-trees.md`. A re-runnable importer (`scripts/import-trees.mjs`) parses it → `src/data/trees.json`. A hand-written `src/data/overlay.json` holds app-only fields (goal fixes, short labels, twins, entry gates). If you send an updated export later, re-run the importer; overlays survive.
2. Types: `ExerciseNode` gains `tree`, `equipment`, `muscles`, `advance`, `cues`, `source`, `links`, `perSide`; drops `col`. New `TreeMeta` (id, name, category, branch, day, notes, video).
3. Engine: tracks and chains come from tree metadata (replaces `tracks.ts` / `skills.json`); twins; migration in `sanitizeProgress`; auto layout in `layout.ts`.
4. UI: tree chips + per-ladder drawing, richer sheet, achievements and demos re-pointed.
5. Tests first throughout. ~150 test lines that name old ids get rewritten to new ids.

## 10. Tests to write first

1. **Importer:** 34 trees, 229 nodes; every parent exists in its tree; every equipment code, muscle and source key is in its table; every node gets a valid goal (overlay covers the rest); escaped `\|` handled.
2. **Graph:** no cycles; twins point both ways; every track/chain id has a tree; layout of every tree has no overlapping nodes or labels.
3. **Migration:** a real-shaped old save (completed, focus, skills, logs, overrides, stages, Roadmap "I can already do this") maps with nothing lost; dropped exercises map to the nearest easier one; an old export file restores.
4. **Engine:** focus per new track; level-up stays in its tree; twin completion; workouts per day and length; finisher order.
5. **Equipment:** doable rule (any-of / all-of); stepping over; focus skips undoable; track with nothing doable left out of Today; unset = everything.
6. **Accessories:** Full length adds one accessory per day, rotating by week; Short/Standard unchanged.
7. **App:** Monday workout shows Wall push-up, Pike push-up, Support hold + Dead bug; Tree chips switch ladders; sheet shows equipment, muscles, links; Find your level covers 10 tracks.
8. **Visual check** (AGENTS.md): every ladder at 390×844, dark + light, large text; sheet with all sections.

## 11. Tasks

| # | Task | Result |
|---|---|---|
| 1 | Import + data tests | `trees.json`, `overlay.json`, importer tests green |
| 2 | Types + graph + twins | engine reads trees; old tests moved to new ids |
| 3 | Migration | old saves and backups load with progress intact |
| 4 | Workouts, Find your level, achievements, demos, Roadmap re-pointed | Today matches section 2 |
| 5 | Tree: chips + auto layout | each ladder drawn alone |
| 6 | Exercise sheet details + links | section 8 |
| 7 | Accessory tracks in Full workouts (Q1) + My equipment (Q3) | sections 2, 8b |
| 8 | Visual check, docs (DECISIONS, PLAN, AGENTS status, SKILLS.md) | screenshots reviewed |

Pushes go to the work branch only; `main` (your phone) only when you say so.

## 12. Decisions (user, 2026-10-05)

| # | Question | Answer |
|---|---|---|
| Q1 | Muscle trees | In the Tree **and** one per day in Full workouts, rotating |
| Q2 | Ranges | **Top** of the range |
| Q3 | Equipment | **My equipment** filter (section 8b) |
| Q4 | Skill entry | **Keep a lock** on each ladder's first rung (section 7) |

Agent recommendations you can still overrule at approval: one ladder at a time in the Tree (section 8); twins share completion (section 4); branch level counts main + skill trees only (section 8); range rule also applies to "Hold 30–60 s" (→ 60 s).

## 13. Built (2026-10-05): what changed from the plan

- **Tree layout:** packed columns, row by row; an exercise only sits straight above one it builds on (Pull-ups fits 5 columns instead of 7).
- **Names:** a tree skill ladder keeps its own name in Skills (Planche, not its first rung's Roadmap name); Roadmap-only skills keep Roadmap names.
- **Goals with no number** (22, agent defaults, all editable): Chin-up 3×8, Box pistol 3×8/leg, Bodyweight RDL 3×8, Hollow rocks 3×15, Ring Pallof 3×12, Wrist prep 1×180 s (Grip and Handstand), Scapular pull 3×8, Kick-up practice 3×5, Heel pulls 3×5, Press to handstand 3×3, Freestanding HSPU 3×5, 90° push-up 3×3, Band planche 3×10 s, Planche push-ups 3×8, Full planche 3×5 s, Band front lever 3×10 s, Weighted muscle-up 3×3, Band flag 3×10 s, Manna 3×5 s, Weighted pull-up (one-arm ladder) 3×5. "Up to" sequences use the last target (Plank, Hollow hold, Side plank, Superman 1×60 s).
- **Roadmap:** Frog stand → Crow pose (`elbow:cr`, twin of the planche Frog/crow stand); One-leg planche stays a Roadmap-only move (`rm-planche-oneleg`, no match in the new ladder).
- **History** shows a twin's sets too.
- **Find your level** asks equipment first (Wall pre-ticked), then only tracks you can do.
- **Trade-off to watch:** with a bar but no dip bars, rings or parallettes, every easier dip is stepped over, so Dips starts at the Straight-bar dip.
