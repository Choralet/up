# More exercises per day: research and options

**Status: A + C built (Plan 6, 2026-09-27).** Tracks: Push-ups · Pike & handstand · Dips | Pull-ups · Rows | Squats · Hinge | Plank & hollow · Leg raises (`src/data/tracks.ts`). Settings → Workout Length: Short (first two tracks), Standard (all + core finisher on Push/Pull days, default), Full (+ Volume variations). D (circuit) not built.

Researched 2026-09-27 from YouTube (video chapters) and the channels' written routines. Today Up gives a Push day **one main exercise** (plus a Volume variation and a core finisher since Plan 5). Real routines do much more.

## What the videos do

| Source | Length | Exercises | Shape |
|---|---|---|---|
| [STRIQfit · Push Day follow-along](https://www.youtube.com/watch?v=yNAerFjBU2Y) | 52 min | ~12 | Warm-up (arm circles, squat-to-pike) → **skills** (explosive push-ups, pseudo planche lean, frog stand) → **strength** (pike push-ups, pseudo planche push-ups, dips, archer push-ups) → **core** (hollow hold, compact leg lifts) → wall handstand |
| [STRIQfit · The Perfect Push Day](https://www.youtube.com/watch?v=zPkLxs19TSc) | 5 min summary | ~13 | Wrist prep → explosive push-ups 2×8–12 → pseudo planche lean 3×10 s → frog stand, elbow lever, tuck planche → pseudo planche push-ups 3×5 → pike push-ups, dips, archer push-ups → boat hold, side crunches 3×15, elevated pike hold 3×20 s |
| [Calisthenics Family · Push for Beginners](https://www.youtube.com/watch?v=5iKEshOW6yw) | 17 min | 12 | Scapula push-ups, incline push-ups, pike shoulder taps, diamond push-ups, pike push-ups, frog stand, pike scapula push-ups, push-ups, plank-to-pike walks, bench dips, pike hold, push-up hold |
| [Calisthenics Family · Push routine (article)](https://calisthenics-family.com/articles/calisthenics-push-workout-routine/) | — | 9 | **Skill** (HSPU, L-sit to handstand, planche hold) → **one heavy strength move** (dips 3×4–6) → **circuit ×4** (wall HSPU, negative muscle-ups, Russian dips, diamond push-ups, triceps extension) |
| [Summerfunfitness · Push Day](https://www.youtube.com/watch?v=ulVXZ-3O2S4) | 13 min | ~7 | Warm-up → core → scapular push-ups → dips → tuck planche → shoulder press → bridge |
| Written PPL guides ([Fitness Phantom](https://thefitnessphantom.com/6-day-calisthenics-push-pull-legs-split-with-pdf), [Calisthenics Corner](https://www.calisthenics-corner.com/programs/push-pull-legs-calisthenics/)) | — | 4–6 | "4–6 exercises of 3–5 sets" per session; 3 days/week to start |
| Reddit r/bodyweightfitness Recommended Routine (see RESEARCH.md) | ~60 min | 9 | Full body in pairs: pull-up + squat, dip + hinge, row + push-up, then a core triplet |

## The pattern they share

1. **Skill first, fresh** (1–3 moves, short sets). Up already does this.
2. **Several movement patterns per day**, each at its own level:
   - Push day: **horizontal push** (push-up line), **vertical push** (pike → handstand push-up), **dips**.
   - Pull day: **vertical pull** (pull-up line), **horizontal pull** (rows), **hang/grip or scapula**.
   - Legs day: **squat** (two legs → one leg), **hinge / back of legs** (bridge, Romanian deadlift, Nordic), **single-leg**.
   - Core: **anti-extension** (plank, hollow), **compression / leg raise**.
3. **Accessory or circuit** to finish (diamond push-ups, holds), then core.
4. **Total** about 5–7 exercises, 3 sets each, 35–50 min for most; beginners shorter.

**Why Up feels thin:** each tree branch mixes these patterns (the Push tree holds both push-ups and pike/handstand work) but only one exercise per branch is "in focus". So a Push day trains one pattern.

## Options

### A. Movement tracks: several focus exercises per day (recommended)
Split each branch into 2–3 **tracks** (the patterns above). Each track has its own current exercise and its own level-up, all inside the same tree.
- Beginner Push day: Frog stand (skill) → Knee push-up (horizontal) → Pike hold → pike push-up (vertical, new easier start) → Bench dip (dips, new chain) → Plank (core). 5–6 exercises, ~35 min.
- Needs: a few new starter moves (bench dip → dip → ring dip; incline/elevated row start; glute bridge → hinge chain; single-leg start) and "focus per track" in the data.
- **Pros:** matches every video; every exercise still levels up like a game. **Cons:** the biggest change (data model, Find your level asks per track, Tree shows several glowing nodes per branch).

### B. Accessories picked from the tree (lighter)
Keep one focus per branch, and add 2–3 **accessory** exercises chosen automatically from the other columns of the same tree: the hardest completed or ready move in each other column (e.g. Push-up focus + Pike push-up + Diamond push-up).
- **Pros:** small change, uses existing exercises. **Cons:** accessories never level up on their own; no dips or rows lines unless added.

### C. Workout length setting (on top of A or B)
Settings → Workout length: **Short** (~20 min: skill + 2–3 exercises), **Standard** (~35 min: 4–5), **Full** (~50 min: 6–7 + circuit).
- **Pros:** fits busy days; the user controls it. **Cons:** needs A or B to have enough exercises to choose from.

### D. Optional circuit finisher
A final 3–4 round circuit of easy moves you've mastered (like the Calisthenics Family routine), logged as one block.

## Recommendation

**A + C**: movement tracks so every day covers 2–3 patterns plus core, with a length setting (Standard by default). Add D later if wanted.

Suggested build order: (1) data: tracks, new starter chains (dips, rows, hinge); (2) Today builds the day from tracks and length; (3) Find your level per track; (4) Tree shows each track's focus; (5) Progress rings per track or per branch.
