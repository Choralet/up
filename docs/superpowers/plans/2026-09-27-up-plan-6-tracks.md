# Up: Plan 6: Movement tracks + workout length (Options A + C)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Behaviour + tests are exact; code is written test-first during execution (same deliberate deviation as Plan 5).

**Goal:** Several exercises per day. Each branch splits into movement **tracks**, each with its own focus and level-up; Settings gets **Workout length** (Short / Standard / Full).

**Spec:** `docs/WORKOUT-VOLUME.md` options A + C (user: "A plus C"). Details decided by the agent (recorded in DECISIONS.md).

## Tracks (data: `src/data/tracks.ts`, `track` on every strength node)

| Track id | Name | Branch | Nodes (in order; **new** in bold) |
|---|---|---|---|
| push-h | Push-ups | push | wall, incline, knee, standard, diamond, decline, archer, pseudo |
| push-v | Pike & handstand | push | **push-pike-hold** "Pike hold" 3×20 s (root, col 2), pike (now requires pike-hold), elevated pike |
| push-d | Dips | push | **push-bench-dip** "Bench dip" 3×10 (root, col 0), **push-dip-neg** "Negative dip" 3×5, `rm-dip` converted to tree strength node "Dip" 3×8 (id kept for saves; requires dip-neg; col 0) |
| pull-v | Pull-ups | pull | hang, scap, negative (requires scap **and** row), pull-up, chin, archer, explosive |
| pull-r | Rows | pull | **pull-row-high** "High incline row" 3×10 (root, col 0), row (now requires row-high; col 0), **pull-row-elevated** "Feet-elevated row" 3×10, **pull-row-archer** "Archer row" 3×6 /side |
| legs-s | Squats | legs | assisted, squat, split, bulgarian, shrimp, assisted pistol |
| legs-h | Hinge | legs | **legs-bridge** "Glute bridge" 3×15 (root, col 3), **legs-sl-bridge** "Single-leg glute bridge" 3×10 /side, **legs-nordic-neg** "Nordic curl negative" 3×5 |
| core-a | Plank & hollow | core | dead bug, plank, hollow |
| core-l | Leg raises | core | **core-lying-raise** "Lying leg raise" 3×10 (root, col 0), knee raise (now requires lying raise; col 0), leg raise |

Skill steps keep no track. Roadmap chain `bulgarian-dip` becomes just `rm-bulgarian` (its item still lists `rm-dip`, `rm-bulgarian`).

## Engine

- `Progress.focus: Record<trackId, string | null>`; `pickFocus` works per track (first ready strength node of that track, JSON order).
- `nodeState`: focus if the node is any track's focus or an active skill step.
- `levelUp` / `setFocus` / `suggestNext` work per **track** (suggestions stay in the same track).
- `sanitizeProgress` migrates old saves: a legacy focus keyed by branch (`focus.push = 'push-incline'`) moves to that node's track; every other track gets `pickFocus`.
- `roadmapStatus` training check uses the node's track.
- `settings.length: 'short' | 'standard' | 'full'` (default standard); `setSettings` already exists.
- `buildWorkout(nodes, progress, day, chains, length)`:
  - day tracks: push → push-h, push-v, push-d; pull → pull-v, pull-r; legs → legs-s, legs-h, core-a, core-l.
  - **Short**: first 2 tracks of the day. **Standard**: all day tracks + core finisher (core-a focus) on push/pull days. **Full**: Standard + a Volume variation for each main (as now).
  - `main: { track, node | null }[]`.
- Onboarding asks per track in the table order (skipping finished tracks).

## UI

- Today: Strength rows per track (track name as the small tag); "Track complete" for a finished track.
- Settings: **Workout Length** segmented control (Short / Standard / Full) with a one-line description.
- Tree unchanged in look (several focus nodes glow per branch).
- Find your level: "Push-ups · 1 of 9", etc.

## Tests to write first (and older tests to update with a ruling)

1. Data: every strength node has a known track of its branch; every track has exactly one root; new nodes placed without cell overlap; label fit.
2. Engine: initial focus per track; legacy branch-key focus migrates; levelUp moves within the track; suggestNext stays in the track; roadmap training via track; buildWorkout per length for push/pull/legs.
3. App: Monday Standard shows Wall push-up, Pike hold, Bench dip + Dead bug finisher; Short shows 2; Full adds Volume; Settings length switch changes Today; Find your level covers 9 tracks.
4. Update older tests that assumed one exercise per branch (Workout complete, counts, onboarding loops, ring totals).

## Tasks

### Task 1: Data + data tests
Tracks table above, test list item 1.

### Task 2: Engine
Engine section, test list item 2.

### Task 3: UI
UI section, test list items 3 and 4.

### Task 4: Verify, docs, deploy, review
Browser check, docs, deploy, fresh final review, fixes.
