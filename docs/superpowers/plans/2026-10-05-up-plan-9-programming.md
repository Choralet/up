# Up: Plan 9: Programming that works for months

> **Status: decisions taken; awaiting the user's approval of the whole plan.** No code until approved (CLAUDE.md gate).
> Evidence: two simulated 12-week testers (a calisthenics coach and a beginner with a band + doorway bar), 2026-10-05. Their bug list is already fixed (commit "fix: tester findings").

**Goal:** Turn the day-by-day exercise picker into a real program: every muscle trained often enough, push and pull balanced, safe first steps, goals a beginner can hit, and no exercise that silently disappears.

## 1. What the testers found (only what this plan fixes)

| Problem | Seen by | Evidence |
|---|---|---|
| Each pattern and skill trained **once a week** | Coach | Quads ≈ 5 sets/week; Diamond push-up took 9 weeks to clear |
| **Push 2 : Pull 1**, core more than legs | Coach, Beginner | Weekly sets: push 19, pull 10, legs 9, core 17. Pull day = 2 exercises, about 5 min |
| Skipping for equipment **jumps too far** | Both | Band + bar: Dips start at Straight-bar dip (4 steps skipped); Split squat → Shrimp squat |
| **Goals too high to start** | Both | Vertical row 3×50, Pike push-up 3×12, Dead hang 1×60 s; the 60% start only applies after a level-up |
| **Ladders vanish** | Coach | Band + bar user: Rows and Hinge gone by week 9, Pull day = 1 exercise |
| Pull-ups stuck at level 0 | Beginner | Band-assisted pull-up sits behind a 60 s hang and scapular pulls |
| No rest or time guidance | Both | "Full ≈ 50 min" is really 75–90 min |

## 2. New week: Full body, 3 days (recommended default)

The structure of the r/bodyweightfitness Recommended Routine, which most of your data comes from: every session trains everything, in pairs (do one exercise, rest, do the other).

| Part | Session A (Mon, Fri) | Session B (Wed) | Time |
|---|---|---|---|
| Warm-up | General + wrist prep when a hand-balancing skill is active | same | 5 min |
| Skills | Your active skills (up to 2), **every session** | same | 5–10 min |
| Pair 1 | Pull-ups + Dips | Pull-ups + Overhead | 10 min |
| Pair 2 | Squats + Hinge | Squats + Hinge | 10 min |
| Pair 3 | Rows + Push-ups | Rows + Push-ups | 10 min |
| Core | One core track, rotating (Plank & hollow → Leg raises → Side plank) | next one | 5 min |

Weeks alternate A-B-A, then B-A-B, so Dips and Overhead get the same over two weeks.

| Per week | Now (Push/Pull/Legs) | Full body 3× |
|---|---|---|
| Pull-ups / Rows / Push-ups | 1× each | **3× each** |
| Squats / Hinge | 1× | **3×** |
| Push : Pull sets | 2 : 1 | **1 : 1** |
| Skills | 1× | **3×** |
| Session length (Standard) | 15–35 min, uneven | **45–55 min** |

- **Workout Length:** Short = Pair 1 + Pair 2 (≈ 30 min). Standard = all of the above. Full = + one accessory and one Volume variation (≈ 65 min, stated honestly).
- **Push / Pull / Legs stays** as a Settings option (Settings → Weekly Plan), now with a third Pull slot (Biceps or Rear delts accessory) and a rotating core finisher.
- **Days:** any 3 days; with 2 days you alternate A/B; with 4+ days, A/B keep alternating.

## 3. Safe equipment skipping

- **Rule:** a ladder may step over **one** exercise you can't do. If the next exercise you can do is two or more steps up, the track shows **"Dips need dip bars, parallettes or rings. Two sturdy chairs work as parallettes."** on Today instead of a too-hard move.
- **Level-up suggestions: gentlest first.** Options are sorted by how far up the ladder they are (Cossack squat before Shrimp squat), not new-first.
- Today names a missing track and what unlocks it, rather than leaving it out silently.

## 4. Goals you can hit

- **Every first exercise starts at 60%** of its goal (Find your level placements and brand-new users too; reverses the Plan 7 rule that only level-ups ramp). Example: Pike push-up 3×12 starts at 3×7.
- **Working goals capped**: reps at 20, holds at 3 × 30 s or 1 × 60 s. Where the source's standard is higher, it stays in "Move on when". Changes: Vertical row 3×50 → 3×20, Incline row 3×30 → 3×20, Australian row 3×25 → 3×15 (RR 3×8 range), Tibialis 3×25 → 3×20, Band pull-apart 3×25 → 3×20.
- **Hollow hold and Side plank** start at the first step of the source's sequence (3 × 10 s), with the goal ramping by sequence step instead of 1 × 60 s.
- **Single-rep skills** stop using "top of range" for sets: One-arm pull-up 1 × 3 / side, Strict muscle-up 3 × 3.
- The rep stepper's first-ever value is the (ramped) goal, never a number 35 taps away.

## 5. Ladders never vanish

- When a track is finished, or the rest needs equipment you lack, its hardest finished exercise stays in the workout as **"Keep building"**: same exercise, goal +2 reps (or +5 s) each time you hit it, no level-up.
- **Band options** for a band + bar setup, added by Up (marked "Added by Up", not in your export):

| Track | Added exercise | Placed |
|---|---|---|
| Rows | Band row (door anchor) 3 × 15 | Root, beside Vertical row |
| Hinge | Band good morning 3 × 15 | Root, beside Bodyweight RDL |
| Pull-ups | Band-assisted pull-up opens after **Dead hang** (not after Scapular pull) | Moved one step down |

## 6. Rest and time

- **Rest timer** (decision needed: you chose "No rest timer" in round 1): after Log Set a small countdown appears (90 s strength, 2 min skills; paired exercises: rest after the pair). It never blocks logging; Settings switch.
- Today shows the session's estimated time ("About 50 min"), computed from sets, holds and rest.

## 7. Small items riding along

- Wrist prep becomes a warm-up item (not a ladder step that is "done" once), shown when Handstand, Planche or Elbow lever is active.
- "Move on when" also shows on the log screen.
- Below the goal: "3 sets done · +1 rep vs last time" instead of only "0 of 3 sets at goal". History shows total reps per session too.

## 8. Migration

- Your saved progress stays as it is (completed, logs, goals). Only the **schedule** changes: a save on the old default Mon/Wed/Fri Push/Pull/Legs moves to Full body; a custom schedule is kept and you get a one-time "Try Full body?" card.
- Goal ramp: exercises you are on today start at 60% of the new (capped) goal unless you already hit the full goal once.

## 9. Not in this plan (later)

Weighted exercises with a kg field; plateau help ("stuck 4 sessions: try an easier variation"); a "Swap for easier" button; demos for every exercise; voice cues for holds; two-session confirmation for straight-arm skills.

## 10. Tests to write first

1. Schedule: full-body A/B alternation by session count; 2-day and 4-day weeks; PPL option still builds today's days plus the third Pull slot.
2. Weekly volume: over a simulated week, push sets = pull sets ±1; every main track ≥ 2× a week.
3. Skipping limit: band + bar → Dips track blocked with its message; Push-ups still step over Incline; suggestions sorted gentlest first.
4. Goals: placements start at stage 0; caps applied; hollow/side-plank sequence ramp; single-rep skills.
5. Keep building: finished and blocked tracks keep their last exercise with a +2 goal; no level-up sheet.
6. Added band exercises: in the tree, marked, unlocked for band + bar.
7. Rest timer appears after Log Set and never blocks; switch off hides it. Today shows the estimate.
8. Migration: default PPL saves move to full body; custom schedules keep theirs and get the card.
9. Visual check of Today (A, B, PPL), the log screen with the timer, the tree with added exercises.

## 11. Tasks

| # | Task |
|---|---|
| 1 | Schedule types, A/B builder, Settings Weekly Plan, migration |
| 2 | Skipping limit, Today "needs" rows, gentlest-first suggestions |
| 3 | Goal start at 60%, caps, sequences, single-rep fixes |
| 4 | Keep building + added band exercises |
| 5 | Rest timer + time estimate |
| 6 | Small items (wrist prep, Move on when, below-goal text, History reps) |
| 7 | Visual check, docs, preview for you, then `main` when you say so |

## 12. Decisions (user, 2026-10-05)

| # | Question | Answer |
|---|---|---|
| Q1 | Default week | **Full body 3×**; Push/Pull/Legs stays as a Settings option |
| Q2 | Rest timer | **Add it, optional** (reverses the round-1 "No rest timer") |
| Q3 | Exercises added by Up | **Yes**, marked "Added by Up" |
| Q4 | Goal caps | **Yes**: reps ≤ 20, holds ≤ 3 × 30 s or 1 × 60 s; source standard stays as "Move on when" |
