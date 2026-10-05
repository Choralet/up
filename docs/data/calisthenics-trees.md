# Calisthenics Progression Trees — Data Export

Source data for the Calisthenics Skill Trees app. Covers every main exercise tree, muscle-specific tree and skill ladder, with equipment, muscles, progression criteria, form cues and how-to links. Training principles are not included.

## How to read this file

- **Tree**: one progression ladder. `category` is `main`, `supp` (muscle-specific) or `skill`.
- **Node**: one exercise. `id` is unique within its tree; the global key is `treeId:nodeId` (e.g. `hpush:oa`).
- **parent**: the easier exercise this one progresses from. Empty = a starting rung. A node with several children is a branch point (alternate paths).
- **rung**: depth in the tree (1 = root). Derived from `parent`; not stored separately in the source.
- **equipment**: codes from the Equipment table. `|` separates alternatives (any one option works); `+` joins items needed together. Example: `rings+box|low+box` = (rings AND box) OR (low bar AND box). Inside tables the `|` is escaped as `\|`; treat it as a plain `|`.
- **primary / secondary**: comma-separated muscle names from the Muscles list.
- **advance**: the criterion for moving to the next rung. **cues**: key form points.
- **source**: key into the Sources table (where the progression or criterion came from). `gen` = general coaching consensus.
- **how-to**: links to a form guide and/or demo video for that exercise, most useful first. Every node also gets an auto-generated YouTube search link in the app (pattern given below); it is not repeated per row.
- Rep notation: `3×8` = 3 sets of 8 reps; `3×10 s` = 3 holds of 10 seconds. Arrows `→` show a sequence.

## Equipment

| Code | Label |
|---|---|
| `floor` | Floor |
| `wall` | Wall |
| `bar` | Pull-up bar |
| `dip` | Dip bars |
| `pt` | Parallettes |
| `rings` | Rings |
| `band` | Bands |
| `wt` | Vest / dip belt |
| `anchor` | Nordic anchor |
| `slider` | Sliders / towel |
| `low` | Low bar / table |
| `box` | Bench / box |
| `pole` | Vertical pole |

## Muscles

`Abs`, `Adductors`, `Biceps`, `Brachialis`, `Calves`, `Chest`, `Forearms/grip`, `Front delts`, `Glute med`, `Glutes`, `Hamstrings`, `Hip flexors`, `Lats`, `Lower back`, `Neck`, `Obliques`, `Quads`, `Rear delts`, `Rotator cuff`, `Serratus`, `Side delts`, `Tibialis`, `Triceps`, `Upper back`, `Wrists`

## Sources

| Key | Title | URL |
|---|---|---|
| `rr` | r/bodyweightfitness Recommended Routine | https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine |
| `hc` | Hybrid Calisthenics: pull-up progressions and standards | https://www.hybridcalisthenics.com/pullups |
| `ffpl` | FitnessFAQs × Austin Dunham: NEW Planche Progressions (YouTube) | https://www.youtube.com/watch?v=3vKmcAN-iVw |
| `ffppu` | FitnessFAQs: How To Planche Push-Up, Best Progressions (YouTube) | https://www.youtube.com/watch?v=TZ63httkob4 |
| `ffpb` | FitnessFAQs: Planche For Beginners Made Easy (YouTube) | https://www.youtube.com/watch?v=bn-HZm7bpy0 |
| `ffpw` | FitnessFAQs: The Smartest Planche Workout Techniques (YouTube) | https://www.youtube.com/watch?v=ghNIgUG8_ZY |
| `thx` | THENX / Chris Heria: How To Handstand Push Up (YouTube) | https://www.youtube.com/watch?v=FaRge9WFzWg |
| `anths` | Antranik: Heel Pulls, the best drill to get off the wall (YouTube) | https://www.youtube.com/watch?v=q6Xcsw0O23I |
| `antp` | Antranik: Bodyweight Training routine | https://antranik.org/bodyweight-training/ |
| `antw` | Antranik: How to avoid wrist pain | https://antranik.org/avoid-wrist-pain/ |
| `cmfl` | Calisthenicmovement: Front Lever Tutorial (YouTube) | https://www.youtube.com/watch?v=vLrjlIofGZ0 |
| `cmmu` | Calimove: How to Do a Muscle Up, Complete Progression | https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/ |
| `soc` | School of Calisthenics: Pistol Squat Progressions (YouTube) | https://www.youtube.com/watch?v=DJ5Ukbfak7I |
| `sim` | Simonster Strength: weighted calisthenics | https://www.fitapp.app/calisthenics-evolution/ |
| `low` | Steven Low: Overcoming Tendonitis | https://stevenlow.org/overcoming-tendonitis/ |
| `flag` | Calisthenics Nerd: Human Flag progressions | https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/ |
| `tm` | Tom Merrick (Bodyweight Warrior) on YouTube | https://www.youtube.com/@BodyweightWarrior |
| `gen` | General coaching consensus (no single verified video) | — |

## How-to link providers

| Prefix | Provider | URL pattern | What it contains |
|---|---|---|---|
| `fl` | Fitloop | `https://www.fitloop.app/exercises/{slug}` | Demo video (most pages) + numbered form steps |
| `hc` | Hybrid Calisthenics | `https://www.hybridcalisthenics.com/{slug}` | Looping demo + step-by-step tutorial |
| `sl` | StrengthLog | `https://www.strengthlog.com/{slug}/` | Demo GIF + numbered steps |
| `cv` | Caliverse | `https://www.caliverse.app/exercises/{slug}` | Demo video + form steps |

Full progression videos attached to whole trees (shown on every node of that tree):

| Tree | Video | URL |
|---|---|---|
| `hpush` | Hybrid Calisthenics: push-up progression video | https://www.youtube.com/watch?v=zkU6Ok44_CI |
| `vpull` | Hybrid Calisthenics: pull-up progression video | https://www.youtube.com/watch?v=fO3dKSQayfg |
| `squat` | Hybrid Calisthenics: squat progression video | https://www.youtube.com/watch?v=z3XQ7T4-abQ |
| `fl` | Front Lever Training Tutorial: tuck → full (YouTube, via Antranik) | https://www.youtube.com/watch?v=ysqkaCxv2bI |
| `bl` | RingFrat: The Back Lever Tutorial, tuck → half-lay (YouTube) | https://www.youtube.com/watch?v=9DhXHwcI4L4 |
| `elbow` | Hybrid Calisthenics: elbow lever progression video | https://www.youtube.com/watch?v=yJqW3Xh253E |
| `pistol` | Hybrid Calisthenics: squat progression video | https://www.youtube.com/watch?v=z3XQ7T4-abQ |
| `oap` | Hybrid Calisthenics: pull-up progression video | https://www.youtube.com/watch?v=fO3dKSQayfg |

YouTube search fallback, added to every node: `https://www.youtube.com/results?search_query={exercise name without parentheses} calisthenics tutorial` (URL-encoded).

Note: no video timestamps are included. They could not be verified, so none were added.

## Summary

34 trees and 229 exercises: 10 main trees, 11 muscle-specific trees, 13 skill ladders.

## Main exercise trees (by movement pattern)

### Horizontal push

- tree id: `hpush`
- category: `main`
- notes: Push-up tree. Chest, front delts, triceps, with ring and one-arm branches.
- full progression video: [Hybrid Calisthenics: push-up progression video](https://www.youtube.com/watch?v=zkU6Ok44_CI)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `w` |  | 1 | Wall push-up | `wall` | Chest,Front delts,Triceps | Serratus,Abs | 3×8 clean (RR rule), then incline | Body rigid, hands at chest height, elbows about 45° | `rr` | [fl](https://www.fitloop.app/exercises/wall-pushup) [hc](https://www.hybridcalisthenics.com/wall-pushups) |
| `i` | `w` | 2 | Incline push-up | `box\|low` | Chest,Front delts,Triceps | Serratus,Abs | 3×8, then lower the surface or go to knee push-ups | Hips in line, chest to the edge | `rr` | [fl](https://www.fitloop.app/exercises/incline-pushup) [hc](https://www.hybridcalisthenics.com/incline-pushups) |
| `k` | `i` | 3 | Knee push-up | `floor` | Chest,Front delts,Triceps | Abs | 3×8, then full push-up | Straight line from knees to head | `rr` | [fl](https://www.fitloop.app/exercises/knee-push-up) [hc](https://www.hybridcalisthenics.com/knee-pushups) |
| `p` | `k` | 4 | Push-up | `floor` | Chest,Front delts,Triceps | Serratus,Abs | RR: 3×8. Many coaches want 3×15–20 before one-arm work | Elbows 30–45°, full lockout with a little protraction | `rr` | [fl](https://www.fitloop.app/exercises/pushup) [hc](https://www.hybridcalisthenics.com/full-pushups) [sl](https://www.strengthlog.com/push-up/) |
| `d` | `p` | 5 | Diamond / close push-up | `floor` | Triceps,Chest | Front delts | 3×8, then archer or pseudo-planche | Hands under the sternum, elbows brush the ribs | `rr` | [fl](https://www.fitloop.app/exercises/diamond-pushup) [hc](https://www.hybridcalisthenics.com/narrow-pushups) [sl](https://www.strengthlog.com/close-grip-push-up/) |
| `dp` | `p` | 5 | Deficit push-up | `pt\|box` | Chest,Front delts | Triceps | 3×8–12 at the deeper range | Chest drops below the hands; control the stretch | `gen` | search only |
| `a` | `d` | 6 | Archer push-up | `floor` | Chest,Triceps,Front delts | Obliques,Abs | 3×8 per side, then one-arm incline | Assisting arm straight, weight shifted over the working hand | `rr` | [fl](https://www.fitloop.app/exercises/archer-push-up) [hc](https://www.hybridcalisthenics.com/archer-pushups) |
| `oai` | `a` | 7 | One-arm incline push-up | `box\|low` | Chest,Triceps,Front delts | Obliques,Rotator cuff | 3×5–8 per side, lowering the incline over time | Feet wide, hips square, no twisting | `gen` | search only |
| `oa` | `oai` | 8 | One-arm push-up | `floor` | Chest,Triceps,Front delts | Obliques,Abs,Lats | 3×5 per side, then weighted or feet-elevated | Wide stance, elbow tucked, squeeze glutes | `gen` | [fl](https://www.fitloop.app/exercises/single-arm-push-up) [hc](https://www.hybridcalisthenics.com/onearm-pushups) |
| `pp` | `d` | 6 | Pseudo-planche push-up | `floor\|pt` | Front delts,Chest,Triceps | Serratus,Biceps,Wrists | 3×8 with hands at the waist, then increase the lean. Leads into the planche push-up ladder | Fingers out or back, protract, shoulders ahead of the hands | `ffppu` | [fl](https://www.fitloop.app/exercises/pseudo-planche-push-ups) [source video/guide](https://www.youtube.com/watch?v=TZ63httkob4) |
| `rp` | `p` | 5 | Ring push-up | `rings` | Chest,Front delts,Triceps | Serratus,Biceps,Rotator cuff | 3×8–12 steady, then RTO ring push-up | Rings close to the body, no shaking | `gen` | [fl](https://www.fitloop.app/exercises/rings-push-ups) |
| `rto` | `rp` | 6 | RTO ring push-up | `rings` | Chest,Triceps,Front delts | Biceps,Forearms/grip | 3×8, then ring archer or weighted | Turn the rings out at lockout | `gen` | [fl](https://www.fitloop.app/exercises/rings-turned-out-push-up) |
| `wp` | `p` | 5 | Weighted push-up | `floor+wt` | Chest,Front delts,Triceps | Serratus | Work in 5–12 reps; add 2.5–5 kg when every set hits the top | Same form standard as bodyweight | `sim` | search only |

### Vertical push

- tree id: `vpush`
- category: `main`
- notes: Overhead pressing for shoulders and triceps. Feeds the handstand push-up skill ladder.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `pk` |  | 1 | Pike push-up | `floor` | Front delts,Triceps | Side delts,Upper back,Serratus | 3×8–12, then elevate the feet | Head travels in front of the hands (tripod), elbows about 45° | `thx` | [fl](https://www.fitloop.app/exercises/pike-push-up) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `epk` | `pk` | 2 | Feet-elevated pike push-up | `box` | Front delts,Triceps | Side delts,Serratus | Sets of about 10 (THENX), then wall negatives | Hips stacked over shoulders | `thx` | [fl](https://www.fitloop.app/exercises/elevated-pike-push-up) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `dpk` | `epk` | 3 | Deficit elevated pike push-up | `box+pt` | Front delts,Triceps | Upper back | 3×8, then full wall HSPU | Head drops below hand level | `gen` | search only |
| `whn` | `epk` | 3 | Wall HSPU negative | `wall` | Front delts,Triceps | Upper back,Abs | Sets of about 5 slow 3–5 s lowers (THENX), then wall HSPU | Tripod head position, ribs down | `thx` | [fl](https://www.fitloop.app/exercises/wall-headstand-push-up-negatives) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `bp` | `pk` | 2 | Band overhead press | `band` | Front delts,Side delts,Triceps | Upper back | Hypertrophy add-on, 3×12–20 | Stand on the band, ribs down, press to lockout | `gen` | [fl](https://www.fitloop.app/exercises/shoulder-press-with-bands) |

### Dips

- tree id: `dip`
- category: `main`
- notes: Downward push for chest, triceps and front delts. Parallel bar, straight bar and ring branches.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `sh` |  | 1 | Support hold | `dip\|rings\|pt` | Triceps,Front delts | Chest,Serratus,Abs | Hold 30–60 s, then negative dips | Shoulders down, elbows locked, slight hollow | `rr` | [fl](https://www.fitloop.app/exercises/parallel-bar-support) |
| `bd` | `sh` | 2 | Bench dip (optional regression) | `box` | Triceps | Front delts,Chest | 3×12–15. Stop if the front of the shoulder hurts | Shoulders back, moderate depth | `gen` | [fl](https://www.fitloop.app/exercises/bench-dips) [hc](https://www.hybridcalisthenics.com/bench-dips) [sl](https://www.strengthlog.com/bench-dip/) |
| `nd` | `sh` | 2 | Negative dip | `dip` | Triceps,Chest,Front delts | Serratus | 3×5 slow 3–5 s lowers, then full dips | Lower until the shoulder is below the elbow | `rr` | [fl](https://www.fitloop.app/exercises/negative-dips) |
| `d` | `nd` | 3 | Parallel bar dip | `dip` | Chest,Triceps,Front delts | Serratus,Lats | RR: 3×8, then ring dips or weighted | Slight forward lean, full depth, lock out | `rr` | [fl](https://www.fitloop.app/exercises/parallel-bar-dips) [hc](https://www.hybridcalisthenics.com/parallel-dips) [sl](https://www.strengthlog.com/dip/) |
| `wd` | `d` | 4 | Weighted dip | `dip+wt` | Chest,Triceps,Front delts | Serratus | 5–8 reps; add load when all sets hit the top | Same depth as bodyweight | `sim` | [fl](https://www.fitloop.app/exercises/dip-parallel-bar-weighted) |
| `sbd` | `d` | 4 | Straight-bar dip | `bar` | Triceps,Chest,Front delts | Abs,Forearms/grip | 3×8–10. Calimove wants 5 deep reps before a clean bar muscle-up | Lean over the bar, elbows back | `cmmu` | [fl](https://www.fitloop.app/exercises/straight-bar-dips) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `krd` | `sbd` | 5 | Russian / Korean dip | `dip\|bar` | Front delts,Triceps | Chest,Biceps | Advanced, 3×5. Builds muscle-up transition strength | Needs shoulder extension mobility; ease in | `gen` | search only |
| `rs` | `sh` | 2 | Ring support hold, turned out | `rings` | Triceps,Front delts | Biceps,Chest,Serratus | 30 s turned out, then ring dips | Rings by the hips, arms locked | `rr` | [fl](https://www.fitloop.app/exercises/rings-turned-out-support-hold) |
| `rd` | `rs` | 3 | Ring dip | `rings` | Chest,Triceps,Front delts | Serratus,Biceps,Rotator cuff | RR's final dip step. 3×8, then weighted or ring muscle-up | Keep the rings close to the body | `rr` | [fl](https://www.fitloop.app/exercises/ring-dips) |

### Horizontal pull

- tree id: `hpull`
- category: `main`
- notes: Row tree for lats, mid and upper back, rear delts and biceps. Body angle is the main lever.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `vr` |  | 1 | Vertical row (pole or doorframe) | `wall\|rings\|low` | Lats,Upper back | Biceps,Rear delts | Hybrid Calisthenics standard: 3×50 | Lean back from something sturdy, squeeze the shoulder blades, 1 s pause | `hc` | [fl](https://www.fitloop.app/exercises/vertical-row) [hc](https://www.hybridcalisthenics.com/wall-pullups) |
| `ir` | `vr` | 2 | Incline row | `rings\|low` | Lats,Upper back,Rear delts | Biceps,Forearms/grip | HC sternum-height base 3×30 (RR: 3×8), then go lower | Body straight, pull chest to hands | `hc` | [fl](https://www.fitloop.app/exercises/incline-row) [hc](https://www.hybridcalisthenics.com/horizontal-pullups) |
| `hr` | `ir` | 3 | Horizontal (Australian) row | `rings\|low\|bar` | Lats,Upper back,Rear delts | Biceps,Brachialis,Forearms/grip | HC hip-height base 3×25; RR 3×8, then wide or archer | Chest touches the bar, 1 s pause | `hc` | [fl](https://www.fitloop.app/exercises/inverted-row) [hc](https://www.hybridcalisthenics.com/advanced-horizontal-pullups) [sl](https://www.strengthlog.com/inverted-row/) |
| `fe` | `hr` | 4 | Feet-elevated row | `rings+box\|low+box` | Lats,Upper back,Rear delts | Biceps,Glutes | 3×8–12, then archer | Body horizontal, no hip sag | `gen` | [fl](https://www.fitloop.app/exercises/feet-elevated-table-row) |
| `wr` | `hr` | 4 | Wide row | `rings\|low` | Upper back,Rear delts | Lats,Biceps | RR: 3×8, then archer | Elbows out 70–90° | `rr` | [fl](https://www.fitloop.app/exercises/wide-row) |
| `ar` | `wr` | 5 | Archer row | `rings\|low` | Lats,Upper back | Biceps,Rear delts,Obliques | RR: 3×8 per side, then one-arm row | Assisting arm stays straight | `rr` | [fl](https://www.fitloop.app/exercises/archer-row) |
| `oar` | `ar` | 6 | One-arm row | `rings\|low` | Lats,Upper back,Biceps | Obliques,Rear delts | 3×5–8 per side | Resist rotation, feet wide | `gen` | [fl](https://www.fitloop.app/exercises/one-arm-row) |
| `tflr` | `hr` | 4 | Tuck front-lever row | `bar\|rings` | Lats,Upper back | Abs,Biceps | 3×5, then the front lever ladder | Hips at hand height, back flat | `cmfl` | [fl](https://www.fitloop.app/exercises/tuck-front-lever-row) [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `wtr` | `hr` | 4 | Weighted inverted row | `low+wt\|rings+wt` | Lats,Upper back | Biceps,Rear delts | 5–12 reps; add load at the top of the range | Same full range | `sim` | [fl](https://www.fitloop.app/exercises/weighted-inverted-rows) |

### Vertical pull

- tree id: `vpull`
- category: `main`
- notes: Pull-up tree for lats, biceps, brachialis and grip. Two entry paths: RR and Hybrid Calisthenics.
- full progression video: [Hybrid Calisthenics: pull-up progression video](https://www.youtube.com/watch?v=fO3dKSQayfg)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `dh` |  | 1 | Dead hang | `bar\|rings` | Forearms/grip,Lats | Rotator cuff | Accumulate 30–60 s | Passive hang, then active (shoulders pulled down) | `gen` | [fl](https://www.fitloop.app/exercises/dead-hang) |
| `sp` | `dh` | 2 | Scapular pull | `bar\|rings` | Lats,Upper back | Serratus,Forearms/grip | RR step 1: 3×8, then arch hangs | Arms straight; pull shoulder blades down without bending elbows | `rr` | [fl](https://www.fitloop.app/exercises/scapular-pulls) |
| `ah` | `sp` | 3 | Arch hang | `bar\|rings` | Upper back,Lats | Lower back | RR step 2: 3×8, then negatives | Retract and depress, chest up | `rr` | [fl](https://www.fitloop.app/exercises/arch-hangs) |
| `jk` | `sp` | 3 | Jackknife pull-up | `bar+box\|low` | Lats,Biceps | Upper back,Quads | HC standard 3×20, then full pull-ups | Feet on a box, legs help only as needed | `hc` | [hc](https://www.hybridcalisthenics.com/jackknife-pullups) |
| `bap` | `sp` | 3 | Band-assisted pull-up | `bar+band` | Lats,Biceps | Upper back | 3×8 with progressively lighter bands | Bands help most at the bottom; pair with negatives | `gen` | [fl](https://www.fitloop.app/exercises/band-assisted-pull-up) |
| `np` | `ah` | 4 | Negative pull-up | `bar\|rings` | Lats,Biceps,Brachialis | Upper back,Forearms/grip | RR step 3: 3×5–8 slow 3–5 s lowers, then pull-up | Jump to the top, lower to a full dead hang | `rr` | [fl](https://www.fitloop.app/exercises/negative-pull-up) |
| `pu` | `np` | 5 | Pull-up | `bar\|rings` | Lats,Biceps,Brachialis | Upper back,Rear delts,Forearms/grip,Abs | RR: 3×8, then weighted. HC level: 3×12 | Dead hang to chin over bar, no kip, about shoulder-width grip | `hc` | [fl](https://www.fitloop.app/exercises/pull-up) [hc](https://www.hybridcalisthenics.com/full-pullups) [sl](https://www.strengthlog.com/pull-up/) |
| `cu` | `np` | 5 | Chin-up (underhand) | `bar\|rings` | Lats,Biceps | Brachialis,Forearms/grip | Same as pull-up | Underhand grip shifts more work to the biceps | `hc` | [fl](https://www.fitloop.app/exercises/chin-ups) [sl](https://www.strengthlog.com/chin-up/) |
| `lpu` | `pu` | 6 | L-sit pull-up | `bar\|rings` | Lats,Biceps,Hip flexors,Abs | Quads | 3×5–8 | Legs stay horizontal | `gen` | [fl](https://www.fitloop.app/exercises/l-sit-pull-up) |
| `cbp` | `pu` | 6 | Chest-to-bar pull-up | `bar` | Lats,Upper back | Biceps,Rear delts | 3×5, then explosive pull-ups or muscle-up | Pull the bar to the lower chest | `cmmu` | [fl](https://www.fitloop.app/exercises/chest-to-bar-pull-up) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `wpu` | `pu` | 6 | Weighted pull-up | `bar+wt` | Lats,Biceps | Upper back,Forearms/grip | RR step 5: 5–8 reps, add 1–2.5 kg when achieved | Belt or vest, same range | `rr` | [fl](https://www.fitloop.app/exercises/weighted-pull-ups) |
| `npu` | `pu` | 6 | Narrow pull-up | `bar\|rings` | Biceps,Lats,Brachialis | Forearms/grip | HC standard 3×9, then archer | Hands close; more arm work | `hc` | [hc](https://www.hybridcalisthenics.com/narrow-pullups) |
| `arp` | `npu` | 7 | Archer pull-up | `bar\|rings` | Lats,Biceps | Obliques | HC: 2×9 per side, then the one-arm ladder | Extended arm stays straight | `hc` | [fl](https://www.fitloop.app/exercises/archer-pull-up) [hc](https://www.hybridcalisthenics.com/archer-pullups) |
| `tw` | `arp` | 8 | Typewriter pull-up | `bar` | Lats,Biceps | Forearms/grip | 3×3–5 traverses | Stay at the top while sliding across | `gen` | [fl](https://www.fitloop.app/exercises/typewriter-pull-up) |

### Squat

- tree id: `squat`
- category: `main`
- notes: Knee-dominant work for quads and glutes, with shrimp, pistol, sissy and Cossack branches.
- full progression video: [Hybrid Calisthenics: squat progression video](https://www.youtube.com/watch?v=z3XQ7T4-abQ)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `as` |  | 1 | Assisted squat | `wall\|low\|rings` | Quads,Glutes | Adductors,Calves | RR step 1: 3×8, then bodyweight squat | Hold a pole or frame, sit hips back and down | `rr` | [fl](https://www.fitloop.app/exercises/assisted-bodyweight-squat) [hc](https://www.hybridcalisthenics.com/assisted-squats) |
| `s` | `as` | 2 | Bodyweight squat | `floor` | Quads,Glutes | Adductors,Hamstrings,Calves | RR: 3×8 (many go to 3×20), then split squat | Knees track the toes, full depth, heels down | `rr` | [fl](https://www.fitloop.app/exercises/bodyweight-squat) [hc](https://www.hybridcalisthenics.com/full-squats) |
| `ss` | `s` | 3 | Split squat | `floor` | Quads,Glutes | Adductors,Calves | RR: 3×8 per leg, then Bulgarian | Back knee to the floor | `rr` | [fl](https://www.fitloop.app/exercises/split-squat) |
| `bss` | `ss` | 4 | Bulgarian split squat | `box` | Quads,Glutes | Adductors,Hamstrings | RR: 3×8 per leg, then shrimp or weighted | Rear foot on a bench; lean forward for more glute | `rr` | [fl](https://www.fitloop.app/exercises/bulgarian-split-squats) [sl](https://www.strengthlog.com/bulgarian-split-squat/) |
| `bsh` | `bss` | 5 | Beginner shrimp squat | `floor` | Quads,Glutes | Calves,Adductors | RR: 3×8, then intermediate | Rear knee to floor, hands may assist | `rr` | [fl](https://www.fitloop.app/exercises/beginner-shrimp-squats) |
| `ish` | `bsh` | 6 | Intermediate shrimp squat | `floor` | Quads,Glutes | Calves | RR: 3×8, then advanced | Less assistance | `rr` | [fl](https://www.fitloop.app/exercises/intermediate-shrimp-squats) |
| `ash` | `ish` | 7 | Advanced shrimp squat | `floor` | Quads,Glutes | Calves,Hip flexors | RR: 3×8, then elevated or weighted | Hold the rear foot; knee touches, toes don't | `rr` | [fl](https://www.fitloop.app/exercises/advanced-shrimp-squats) |
| `wbs` | `bss` | 5 | Weighted Bulgarian / step-up | `box+wt` | Quads,Glutes | Adductors | 6–12 reps, add load at the top | Controlled descent | `sim` | [sl](https://www.strengthlog.com/step-up/) |
| `cs` | `s` | 3 | Cossack squat | `floor` | Adductors,Quads,Glutes | Hamstrings | 3×8 per side | Straight leg, toes up | `gen` | [fl](https://www.fitloop.app/exercises/cossack-squat) [sl](https://www.strengthlog.com/cossack-squat/) |
| `sis` | `s` | 3 | Assisted sissy squat | `wall\|low` | Quads | Abs | 3×10–15. Progress slowly: high knee tendon load | Hips extended, knees travel forward | `gen` | [fl](https://www.fitloop.app/exercises/sissy-squat) |
| `pis` | `s` | 3 | Box pistol (into the pistol ladder) | `box` | Quads,Glutes | Calves,Hip flexors | See the Pistol skill ladder | Sit to a lower box over time | `soc` | [hc](https://www.hybridcalisthenics.com/one-leg-chair-squats) [source video/guide](https://www.youtube.com/watch?v=DJ5Ukbfak7I) |
| `js` | `s` | 3 | Jump squat / split jumps | `floor` | Quads,Glutes,Calves | Hamstrings | Power: 3–5 sets of 3–6 explosive reps | Soft, quiet landing | `gen` | [fl](https://www.fitloop.app/exercises/squat-jumps) [sl](https://www.strengthlog.com/jump-squat/) |

### Hinge and posterior chain

- tree id: `hinge`
- category: `main`
- notes: Glutes and hamstrings at both the hip and the knee. The Nordic curl is the top rung.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `gb` |  | 1 | Glute bridge | `floor` | Glutes | Hamstrings,Lower back | 3×15–20, then single-leg | Tuck the pelvis, drive through the heels | `gen` | [hc](https://www.hybridcalisthenics.com/glute-bridges) [sl](https://www.strengthlog.com/glute-bridge/) |
| `sgb` | `gb` | 2 | Single-leg glute bridge | `floor` | Glutes | Hamstrings | 3×12 per leg, then elevated | Hips level | `gen` | [sl](https://www.strengthlog.com/one-legged-glute-bridge/) |
| `ht` | `sgb` | 3 | Single-leg hip thrust, shoulders elevated | `box` | Glutes | Hamstrings,Adductors | 3×12–15 per leg; add a vest | Ribs down, full lockout | `gen` | [sl](https://www.strengthlog.com/one-legged-hip-thrust/) |
| `slc` | `gb` | 2 | Slider / towel leg curl | `slider` | Hamstrings | Glutes,Calves | 3×10–12, then single-leg | Hips stay up throughout | `gen` | [fl](https://www.fitloop.app/exercises/hamstring-slide) |
| `slc1` | `slc` | 3 | Single-leg slider curl | `slider` | Hamstrings | Glutes | 3×8–10 per leg | No hip drop | `gen` | [fl](https://www.fitloop.app/exercises/eccentric-single-leg-sliding-hamstring-slide) |
| `rlc` | `gb` | 2 | Ring leg curl | `rings` | Hamstrings | Glutes | 3×8–12 | Heels in straps, hips extended | `gen` | search only |
| `rdl` |  | 1 | Bodyweight Romanian deadlift | `floor` | Hamstrings,Glutes | Lower back | RR hinge step 1, then single-leg | Hips back, neutral spine | `rr` | [fl](https://www.fitloop.app/exercises/romanian-deadlift) |
| `sld` | `rdl` | 2 | Single-leg RDL | `floor` | Hamstrings,Glutes | Glute med,Lower back | RR: 3×8 per leg, then banded Nordic | Hips square | `rr` | [fl](https://www.fitloop.app/exercises/single-legged-deadlift) |
| `bn` | `sld` | 3 | Banded Nordic curl | `anchor+band` | Hamstrings | Glutes,Calves | RR: 3×8, then a lighter band | Hips extended, lower slowly | `rr` | [fl](https://www.fitloop.app/exercises/banded-nordic-curl) |
| `nn` | `bn` | 4 | Nordic negative | `anchor` | Hamstrings | Glutes | 3×3–6 slow lowers, catch with your hands | Fight every degree | `gen` | [sl](https://www.strengthlog.com/nordic-hamstring-eccentric/) |
| `nc` | `nn` | 5 | Full Nordic curl | `anchor` | Hamstrings | Glutes,Calves | RR final step, 3×5. Programs with Nordics cut hamstring injuries by about 51% | Straight line from knees to head | `rr` | [fl](https://www.fitloop.app/exercises/nordic-curl) |
| `rh` | `rdl` | 2 | Reverse hyperextension | `box` | Glutes,Lower back | Hamstrings | RR extension progression, 3×8–12 | Lift legs to body line, no swinging | `rr` | [fl](https://www.fitloop.app/exercises/reverse-hyperextension) [sl](https://www.strengthlog.com/reverse-hyperextension/) |
| `ghr` | `rh` | 3 | Glute-ham raise / bench back extension | `box+anchor` | Hamstrings,Glutes,Lower back | Calves | RR extension step 2: 3×8 | Hinge, then curl up | `rr` | [fl](https://www.fitloop.app/exercises/glute-ham-raise) |

### Core: anti-extension

- tree id: `antiext`
- category: `main`
- notes: Abs and deep core. The bodyline that every skill depends on.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `db` |  | 1 | Dead bug | `floor` | Abs,Obliques | Hip flexors | RR warm-up 30 s, then plank | Low back stays down | `rr` | [fl](https://www.fitloop.app/exercises/dead-bugs) [sl](https://www.strengthlog.com/dead-bugs/) |
| `pl` | `db` | 2 | Plank | `floor` | Abs,Obliques | Front delts,Glutes | 3×10 s up to 1×60 s, then just maintain | Tuck the pelvis, squeeze glutes | `rr` | [fl](https://www.fitloop.app/exercises/plank) |
| `hh` | `pl` | 3 | Hollow hold (tuck → straddle → full) | `floor` | Abs | Hip flexors,Obliques | 3×10 s → 3×15 s → 3×20 s → 2×30 s → 2×45 s → 1×60 s | Low back pressed to the floor | `rr` | [fl](https://www.fitloop.app/exercises/hollow) [sl](https://www.strengthlog.com/hollow-hold/) |
| `hro` | `hh` | 4 | Hollow rocks | `floor` | Abs | Hip flexors | Prerequisite: 60 s hollow hold (Antranik) | Keep the shape while rocking | `antp` | [source video/guide](https://antranik.org/bodyweight-training/) |
| `bsw` | `pl` | 3 | Slider body saw | `slider` | Abs | Lats,Front delts | 3×8–12, then rollouts | Move from the shoulders, hips level | `gen` | search only |
| `rro` | `pl` | 3 | Ring ab rollout | `rings` | Abs,Lats | Front delts,Serratus | RR anti-extension step 2: 3×8–12; lower the rings to progress | Hollow body, no hip sag | `rr` | [fl](https://www.fitloop.app/exercises/ring-ab-rollout) |
| `sro` | `rro` | 4 | Standing / long-lever rollout | `rings\|slider` | Abs,Lats | Front delts,Serratus | 3×5–8 | Very advanced; full hollow | `gen` | [fl](https://www.fitloop.app/exercises/standing-ab-wheel-rollouts) |

### Core: compression

- tree id: `compress`
- category: `main`
- notes: Abs and hip flexors. Leads into the L-sit, V-sit and dragon flag.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `llr` |  | 1 | Lying leg raise | `floor` | Abs,Hip flexors | Obliques | 3×12–15, then hanging knee raise | Low back flat, slow lowering | `gen` | [hc](https://www.hybridcalisthenics.com/full-leg-raises) |
| `spl` | `llr` | 2 | Seated pike compression lifts | `floor` | Hip flexors,Abs | Quads | 3×10–15, then the L-sit ladder | Hands beside the knees, lift the heels | `antp` | [fl](https://www.fitloop.app/exercises/pike-compressions) [source video/guide](https://antranik.org/bodyweight-training/) |
| `hkr` | `llr` | 2 | Hanging knee raise | `bar\|rings` | Abs,Hip flexors | Forearms/grip,Lats | 3×10–12, then hanging leg raise | No swing; tilt the pelvis up at the top | `gen` | [fl](https://www.fitloop.app/exercises/tucked-hanging-leg-raises) [hc](https://www.hybridcalisthenics.com/hanging-knee-raises) [sl](https://www.strengthlog.com/hanging-knee-raise/) |
| `hlr` | `hkr` | 3 | Hanging leg raise | `bar\|rings` | Abs,Hip flexors | Forearms/grip,Lats | 3×8–12, then toes-to-bar | Straight legs, controlled | `gen` | [fl](https://www.fitloop.app/exercises/straight-hanging-leg-raises) [hc](https://www.hybridcalisthenics.com/hanging-leg-raises) [sl](https://www.strengthlog.com/hanging-leg-raise/) |
| `ttb` | `hlr` | 4 | Toes-to-bar | `bar` | Abs,Hip flexors,Lats | Forearms/grip | 3×8 strict | Press the bar down with straight arms | `gen` | [hc](https://www.hybridcalisthenics.com/toe-to-bars) |
| `ww` | `hlr` | 4 | Windshield wipers | `bar` | Obliques,Abs | Hip flexors,Lats | 3×6–10 per side | Legs vertical, rotate slowly | `gen` | [fl](https://www.fitloop.app/exercises/windshield-wiper) |

### Core: lateral and anti-rotation

- tree id: `lateral`
- category: `main`
- notes: Obliques, glute medius and adductors.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `sp` |  | 1 | Side plank | `floor` | Obliques | Glute med,Abs | 10 s up to 60 s per side (RR bodyline) | Straight line, hips high | `rr` | [fl](https://www.fitloop.app/exercises/side-plank) [sl](https://www.strengthlog.com/side-plank/) |
| `cp` | `sp` | 2 | Copenhagen plank (short, then long lever) | `box` | Adductors,Obliques | Glute med | 2–3×20–30 s per side | Top leg on a bench, lift the bottom leg | `gen` | [sl](https://www.strengthlog.com/copenhagen-plank/) [cv](https://www.caliverse.app/exercises/copenhagen-plank-135) |
| `sha` | `sp` | 2 | Side plank with hip abduction | `floor` | Obliques,Glute med | Glutes | 3×10 per side | Top leg straight, toes forward | `gen` | search only |
| `pal` | `sp` | 2 | Band Pallof press | `band` | Obliques,Abs | Glutes | RR anti-rotation step 1: 3×8–12 | Resist rotation, ribs down | `rr` | [fl](https://www.fitloop.app/exercises/banded-pallof-press) [sl](https://www.strengthlog.com/pallof-press/) |
| `rpal` | `pal` | 3 | Ring Pallof press | `rings` | Obliques,Abs | Front delts | RR anti-rotation step 2 | Lean further to progress | `rr` | [fl](https://www.fitloop.app/exercises/ring-pallof-press) |

## Muscle-specific trees (muscles the main trees under-load)

### Calves

- tree id: `calf`
- category: `supp`
- notes: Squats don't load the calves through full range. Train them directly.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `c1` |  | 1 | Calf raise, both legs | `floor` | Calves |  | 3×20, then on a step | Full stretch, 1–2 s pause at the top | `gen` | [sl](https://www.strengthlog.com/standing-calf-raise/) |
| `c2` | `c1` | 2 | Deficit calf raise on a step | `box` | Calves |  | 3×15–20, then single-leg | Heel well below the step | `gen` | [sl](https://www.strengthlog.com/standing-calf-raise/) |
| `c3` | `c2` | 3 | Single-leg deficit calf raise | `box` | Calves |  | 3×12–20 per leg, then weighted | Hold a wall lightly for balance | `gen` | search only |
| `c4` | `c3` | 4 | Weighted single-leg calf raise | `box+wt` | Calves |  | 8–15 reps | Same depth | `gen` | search only |
| `c5` | `c1` | 2 | Bent-knee calf raise (soleus) | `floor\|box` | Calves |  | 3×15–25 | Knees bent about 45° | `gen` | search only |

### Tibialis

- tree id: `tib`
- category: `supp`
- notes: Balances the calves and supports knees and ankles.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `t1` |  | 1 | Wall tibialis raise | `wall` | Tibialis |  | 3×15–25, then walk the feet farther out | Back on the wall, lift the toes high | `gen` | [sl](https://www.strengthlog.com/tibialis-raise/) [video](https://www.hybridcalisthenics.com/tibialis-exercises) |
| `t2` | `t1` | 2 | Wall tib raise, farther or single-leg | `wall` | Tibialis |  | 3×12–20 | Slow lowering | `gen` | [sl](https://www.strengthlog.com/tibialis-raise/) [video](https://www.hybridcalisthenics.com/tibialis-exercises) |
| `t3` |  | 1 | Band dorsiflexion | `band` | Tibialis |  | 3×15–20 | Band anchored in front of the foot | `gen` | [video](https://www.hybridcalisthenics.com/tibialis-exercises) |

### Forearms, grip and wrists

- tree id: `grip`
- category: `supp`
- notes: Hanging grip plus the wrist prep that hand-balancing needs.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `g1` |  | 1 | Dead hang | `bar\|rings` | Forearms/grip | Lats | Accumulate 60 s | Full grip, shoulders active | `gen` | [fl](https://www.fitloop.app/exercises/dead-hang) |
| `g2` | `g1` | 2 | Towel hang / towel pull-up | `bar+slider` | Forearms/grip | Lats,Biceps | Hang 20–40 s, then towel pull-ups | Towel over the bar, crush grip | `gen` | [fl](https://www.fitloop.app/exercises/towel-pull-up) |
| `g3` | `g1` | 2 | One-arm hang (assisted, then free) | `bar` | Forearms/grip | Lats,Rotator cuff | 10–30 s per arm | Active shoulder, no dangling | `gen` | [fl](https://www.fitloop.app/exercises/one-handed-hang) |
| `g4` | `g1` | 2 | False-grip hang | `rings` | Forearms/grip | Biceps | 20–30 s (muscle-up prep, Calimove) | Wrist over the ring, heel of hand on top | `cmmu` | [fl](https://www.fitloop.app/exercises/ring-false-grip-hold) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `g5` |  | 1 | Wrist prep: palm pulses, back-of-hand push-ups | `floor` | Wrists,Forearms/grip |  | Every hand-balancing session; progress from knees to full | Gentle, pain-free range | `antw` | [fl](https://www.fitloop.app/exercises/gmb-wrist-prep) [fl](https://www.fitloop.app/exercises/wrist-pushups) [source video/guide](https://antranik.org/avoid-wrist-pain/) |
| `g6` | `g5` | 2 | Fingertip plank / push-up | `floor` | Forearms/grip | Chest | 3×10–20 s holds, then reps | Start on knees | `gen` | search only |
| `g7` |  | 1 | Band wrist curls and extensions | `band` | Forearms/grip |  | 3×15–25 | Full range | `gen` | search only |

### Rear delts and upper back

- tree id: `rear`
- category: `supp`
- notes: Posture and shoulder balance against heavy pushing.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `r1` |  | 1 | Band pull-apart | `band` | Rear delts,Upper back | Rotator cuff | 3×15–25 | Straight arms, squeeze the shoulder blades | `gen` | [fl](https://www.fitloop.app/exercises/band-pull-apart) [sl](https://www.strengthlog.com/band-pull-apart/) |
| `r2` | `r1` | 2 | Band face pull | `band+bar` | Rear delts,Rotator cuff | Upper back | 3×12–20 | Pull to the forehead, rotate out | `gen` | [fl](https://www.fitloop.app/exercises/face-pull-resistance-bands) [sl](https://www.strengthlog.com/face-pull/) |
| `r3` |  | 1 | Prone Y-T-W raises | `floor` | Rear delts,Upper back | Rotator cuff | 3×8–12 per letter | Thumbs up, lift from the shoulder blades | `gen` | [fl](https://www.fitloop.app/exercises/prone-y-t-w) |
| `r4` | `r3` | 2 | Ring reverse fly | `rings` | Rear delts | Upper back | 3×10–15; steeper angle to progress | Soft elbows, arms wide | `gen` | search only |
| `r5` | `r4` | 3 | Ring face pull | `rings` | Rear delts,Rotator cuff | Biceps | 3×10–15 | Elbows high, hands by the ears | `gen` | [fl](https://www.fitloop.app/exercises/face-pull-rings) |

### Biceps and brachialis

- tree id: `bic`
- category: `supp`
- notes: Optional isolation for intermediates. Pull-ups and rows cover beginners.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `b1` |  | 1 | Band curl | `band` | Biceps | Forearms/grip | 3×12–20 | Elbows pinned | `gen` | search only |
| `b2` |  | 1 | Bodyweight ring / bar curl | `rings\|low` | Biceps | Brachialis,Forearms/grip | 3×8–12; walk the feet forward to progress | Elbows stay in front, body rigid | `gen` | [fl](https://www.fitloop.app/exercises/ring-curl) [fl](https://www.fitloop.app/exercises/bodyweight-bicep-curl) |
| `b3` | `b2` | 2 | Hammer-grip ring curl | `rings` | Brachialis,Biceps | Forearms/grip | 3×8–12 | Thumbs up | `gen` | search only |
| `b4` |  | 1 | Close-grip chin-up | `bar\|rings` | Biceps,Lats | Brachialis | 3×6–12 | Underhand, full range | `hc` | [fl](https://www.fitloop.app/exercises/close-grip-chin-up) |
| `b5` | `b4` | 2 | Chin-up slow negatives / top holds | `bar` | Biceps | Brachialis | 3×3–5 negatives of 5 s | Control to a dead hang | `gen` | [fl](https://www.fitloop.app/exercises/chin-up-hold) |

### Triceps

- tree id: `tri`
- category: `supp`
- notes: Long-head emphasis with arms overhead or in front.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `x1` |  | 1 | Band pushdown / overhead extension | `band` | Triceps |  | 3×12–20 | Elbows fixed | `gen` | search only |
| `x2` |  | 1 | Bodyweight triceps extension | `low\|rings\|box` | Triceps | Abs | 3×8–12; lower the bar to progress | Hinge at the elbows, body rigid | `gen` | [sl](https://www.strengthlog.com/triceps-bodyweight-extension/) |
| `x3` | `x2` | 2 | Ring triceps extension | `rings` | Triceps | Abs,Serratus | 3×8–12 | Rings close together | `gen` | [fl](https://www.fitloop.app/exercises/ring-tricep-extension) |
| `x4` | `x2` | 2 | Sphinx push-up (forearms to hands) | `floor` | Triceps | Front delts | 3×6–12; start from the knees | Elbows under the shoulders | `gen` | search only |
| `x5` |  | 1 | Diamond push-up | `floor` | Triceps | Chest | 3×8–15 | Elbows back | `rr` | [fl](https://www.fitloop.app/exercises/diamond-pushup) |

### Neck

- tree id: `neck`
- category: `supp`
- notes: Load it gently and gradually.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `n1` |  | 1 | Hand-resisted neck isometrics | `floor` | Neck |  | 3×10–20 s each direction | Light pressure, no pain | `gen` | search only |
| `n2` | `n1` | 2 | Lying neck flexion / extension | `box` | Neck | Upper back | 2–3×15–25 | Head off the bench, slow | `gen` | search only |
| `n3` | `n2` | 3 | Band neck work | `band` | Neck |  | 2–3×15–20 | Smooth and controlled; skip aggressive bridges | `gen` | search only |

### Glute medius and adductors

- tree id: `hips`
- category: `supp`
- notes: Hip stability for pistols, shrimps and healthy knees.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `m1` |  | 1 | Side-lying hip abduction | `floor` | Glute med |  | 3×15–20 | Toes forward, leg slightly behind | `gen` | search only |
| `m2` | `m1` | 2 | Band lateral walk / clamshell | `band` | Glute med | Glutes | 3×12–20 steps | Stay low, knees out | `gen` | [sl](https://www.strengthlog.com/clamshells/) |
| `m3` | `m1` | 2 | Side plank with hip abduction | `floor` | Glute med,Obliques |  | 3×10 per side | Hips high | `gen` | search only |
| `m4` |  | 1 | Side-lying adduction | `floor` | Adductors |  | 3×15–20 | Lift the bottom leg | `gen` | search only |
| `m5` | `m4` | 2 | Copenhagen plank | `box` | Adductors,Obliques | Glute med | 2–3×20–30 s | Short lever first | `gen` | [sl](https://www.strengthlog.com/copenhagen-plank/) [cv](https://www.caliverse.app/exercises/copenhagen-plank-135) |
| `m6` | `m4` | 2 | Cossack squat | `floor` | Adductors,Quads,Glutes | Hamstrings | 3×8 per side | Heel down on the bent leg | `gen` | [fl](https://www.fitloop.app/exercises/cossack-squat) |

### Rotator cuff

- tree id: `cuff`
- category: `supp`
- notes: Shoulder health for rings, handstands and levers.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `q1` |  | 1 | Side-lying external rotation | `floor` | Rotator cuff | Rear delts | 3×15–20 | Towel under the elbow | `gen` | [fl](https://www.fitloop.app/exercises/external-rotation) |
| `q2` | `q1` | 2 | Band external rotation | `band` | Rotator cuff |  | 3×12–20 | Elbow at your side | `gen` | [fl](https://www.fitloop.app/exercises/external-rotation-with-band) [sl](https://www.strengthlog.com/band-external-shoulder-rotation/) |
| `q3` | `q2` | 3 | Band W raise | `band` | Rotator cuff,Rear delts | Upper back | 3×12–15 | Squeeze the shoulder blades | `gen` | search only |
| `q4` |  | 1 | Shoulder dislocates | `band` | Rotator cuff | Front delts | RR warm-up, 5–10 reps | Wide grip, slow arc | `rr` | [fl](https://www.fitloop.app/exercises/band-dislocates) |

### Lower back

- tree id: `lowback`
- category: `supp`
- notes: Spinal erectors and extension strength.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `l1` |  | 1 | Bird dog | `floor` | Lower back,Glutes | Abs | 3×8 per side | Hips level, slow | `gen` | [fl](https://www.fitloop.app/exercises/bird-dog) |
| `l2` | `l1` | 2 | Arch (superman) hold | `floor` | Lower back,Glutes | Upper back | RR bodyline: 10 s up to 60 s | Squeeze glutes, neck neutral | `rr` | [fl](https://www.fitloop.app/exercises/arch-body-hold) [fl](https://www.fitloop.app/exercises/superman) |
| `l3` | `l2` | 3 | Reverse hyperextension | `box` | Glutes,Lower back | Hamstrings | RR extension progression, 3×8–12 | No swinging | `rr` | [fl](https://www.fitloop.app/exercises/reverse-hyperextension) |
| `l4` | `l3` | 4 | Bench back extension | `box+anchor` | Lower back | Glutes,Hamstrings | 3×10–15 | A partner or strap holds the legs | `gen` | [fl](https://www.fitloop.app/exercises/hyperextensions-with-no-hyperextension-bench) [sl](https://www.strengthlog.com/back-extension/) |

### Scapular control and serratus

- tree id: `scap`
- category: `supp`
- notes: The base for every push, pull and straight-arm skill.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `s1` |  | 1 | Scapular push-up | `floor` | Serratus | Chest | 2–3×10 as activation | Arms locked; protract, then retract | `gen` | [fl](https://www.fitloop.app/exercises/scapular-push-up) |
| `s2` | `s1` | 2 | Push-up plus | `floor` | Serratus,Chest | Triceps | 3×8–12 | Extra protraction at lockout | `gen` | search only |
| `s3` |  | 1 | Scapular pull | `bar\|rings` | Upper back,Lats | Serratus | RR pull-up step 1 | No elbow bend | `rr` | [fl](https://www.fitloop.app/exercises/scapular-pulls) |
| `s4` |  | 1 | Support shrug (scapular dip) | `dip\|rings` | Upper back,Serratus | Triceps | 3×10 | Rise and sink with locked arms | `gen` | search only |
| `s5` |  | 1 | Wall handstand shrug | `wall` | Serratus,Upper back | Front delts | 3×10 | Push tall through the shoulders | `gen` | search only |

## Skill ladders (trained separately, at the start of a session)

### Handstand

- tree id: `hs`
- category: `skill`
- notes: Entry: 30 s plank, then 60 s chest-to-wall handstand before balance drills. Needs shoulder flexion and wrist prep.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `w` |  | 1 | Wrist prep, 3–5 min | `floor` | Wrists,Forearms/grip |  | Every handstand session (Antranik) | Finger pulses, palm pulses, rotations, stretches | `antw` | [fl](https://www.fitloop.app/exercises/gmb-wrist-prep) [source video/guide](https://antranik.org/avoid-wrist-pain/) |
| `pk` | `w` | 2 | Plank / pike hold | `floor\|box` | Front delts,Serratus | Abs | Plank 30 s before handstand practice (RR) | Push the floor away | `rr` | [fl](https://www.fitloop.app/exercises/plank) [fl](https://www.fitloop.app/exercises/feet-elevated-pike-hold) |
| `cw` | `pk` | 3 | Chest-to-wall handstand | `wall` | Front delts,Serratus,Upper back | Abs,Triceps,Wrists | 60 s hold (Antranik), then balance drills | Hollow, stacked, push tall; walk in | `antp` | [fl](https://www.fitloop.app/exercises/stomach-to-wall-handstand-practice) [fl](https://www.fitloop.app/exercises/wall-handstand-hold) [source video/guide](https://antranik.org/bodyweight-training/) |
| `ku` | `cw` | 4 | Kick-up and bail practice | `floor` | Front delts,Serratus | Abs | Learn the cartwheel bail first | Turn out of the fall | `gen` | [fl](https://www.fitloop.app/exercises/wall-handstand-kick-up) |
| `hp` | `cw` | 4 | Wall heel pulls / toe taps | `wall` | Front delts,Serratus,Wrists | Abs | Prerequisite: comfortable wall handstand | Peel one heel, then both, off the wall | `anths` | [source video/guide](https://www.youtube.com/watch?v=q6Xcsw0O23I) |
| `fs` | `hp` | 5 | Freestanding handstand | `floor` | Front delts,Serratus,Upper back,Wrists | Abs,Forearms/grip | Accumulate time; goal 30–60 s consistently | Balance with fingers and heel of the hand | `antp` | [fl](https://www.fitloop.app/exercises/freestanding-handstand) [source video/guide](https://antranik.org/bodyweight-training/) |
| `ph` | `fs` | 6 | Press to handstand | `floor\|pt` | Front delts,Serratus,Hip flexors,Abs | Triceps | Needs pancake and pike compression | Shift shoulders forward, hips up | `tm` | [cv](https://www.caliverse.app/exercises/press-to-handstand-1388) [source video/guide](https://www.youtube.com/@BodyweightWarrior) |
| `oah` | `fs` | 6 | One-arm handstand | `floor` | Front delts,Serratus,Wrists | Obliques,Forearms/grip | Very advanced; solid 60 s two-arm first | Shift weight gradually | `gen` | search only |

### Handstand push-up

- tree id: `hspu`
- category: `skill`
- notes: Bent-arm overhead strength. A 3×5 wall HSPU is also Antranik's human flag prerequisite.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `pk` |  | 1 | Pike push-up | `floor` | Front delts,Triceps | Side delts,Serratus | 3×8–12 | Tripod head path | `thx` | [fl](https://www.fitloop.app/exercises/pike-push-up) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `epk` | `pk` | 2 | Elevated pike push-up | `box` | Front delts,Triceps | Serratus | Sets of about 10 (THENX) | Hips over the shoulders | `thx` | [fl](https://www.fitloop.app/exercises/elevated-pike-push-up) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `wn` | `epk` | 3 | Wall HSPU negatives | `wall` | Front delts,Triceps | Upper back | Sets of about 5 slow lowers (THENX) | 3–5 s down | `thx` | [fl](https://www.fitloop.app/exercises/wall-headstand-push-up-negatives) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `wh` | `wn` | 4 | Wall HSPU | `wall` | Front delts,Triceps | Upper back,Abs | Sets of about 8 (THENX) | Head to floor, press to lockout | `thx` | [fl](https://www.fitloop.app/exercises/wall-handstand-push-ups) [sl](https://www.strengthlog.com/handstand-push-up/) [source video/guide](https://www.youtube.com/watch?v=FaRge9WFzWg) |
| `dw` | `wh` | 5 | Deficit wall HSPU | `wall+pt` | Front delts,Triceps | Upper back | 3×5 at full depth | Head goes below the hands | `gen` | search only |
| `fhs` | `dw` | 6 | Freestanding HSPU | `floor\|pt` | Front delts,Triceps | Serratus,Abs | Requires a reliable freestanding handstand | Controlled, stacked | `gen` | [fl](https://www.fitloop.app/exercises/freestanding-handstand-push-ups) |
| `n90` | `fhs` | 7 | 90° push-up | `pt\|floor` | Front delts,Triceps | Abs,Wrists | Elite strength | Lower into a planche-like position and press back | `gen` | search only |

### Planche

- tree id: `planche`
- category: `skill`
- notes: Straight-arm push skill. Very slow tendon adaptation, so expect months per rung.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `ln` |  | 1 | Planche lean | `floor\|pt` | Front delts,Serratus,Wrists | Biceps,Abs | 3×15–30 s, increasing the lean | Protract, tuck the pelvis, elbows locked | `ffpb` | [fl](https://www.fitloop.app/exercises/planche-lean-hold) [source video/guide](https://www.youtube.com/watch?v=bn-HZm7bpy0) |
| `fr` | `ln` | 2 | Frog / crow stand | `floor\|pt` | Front delts,Triceps,Wrists | Abs | 20–30 s (Antranik's crow standard) | Knees on the triceps, eyes forward | `antp` | [fl](https://www.fitloop.app/exercises/crow-pose) [source video/guide](https://antranik.org/bodyweight-training/) |
| `tp` | `fr` | 3 | Tuck planche | `floor\|pt` | Front delts,Serratus,Biceps | Abs,Wrists | 3×10–15 s, then advanced tuck | Arms locked, round the back, hips at shoulder height | `ffpl` | [fl](https://www.fitloop.app/exercises/tuck-planche-hold) [source video/guide](https://www.youtube.com/watch?v=3vKmcAN-iVw) |
| `atp` | `tp` | 4 | Advanced tuck planche | `floor\|pt` | Front delts,Serratus,Biceps | Abs,Lower back,Wrists | 3×10–15 s, then straddle | Flat back, knees away from the chest | `ffpl` | [cv](https://www.caliverse.app/exercises/planche-tuck-advanced-1282) [source video/guide](https://www.youtube.com/watch?v=3vKmcAN-iVw) |
| `bap` | `tp` | 4 | Band-assisted planche (branch) | `bar+band\|pt+band` | Front delts,Serratus | Abs | Use to practise harder body lines | Band under the hips | `ffpw` | [source video/guide](https://www.youtube.com/watch?v=ghNIgUG8_ZY) |
| `ppu` | `tp` | 4 | Planche push-up branch | `floor\|pt\|band` | Front delts,Chest,Triceps | Serratus,Wrists | FitnessFAQs order: band-assisted → bodyweight → mechanical-advantage → pseudo-planche push-ups | Keep the lean as you lower | `ffppu` | [fl](https://www.fitloop.app/exercises/pseudo-planche-push-ups) [fl](https://www.fitloop.app/exercises/rings-turned-out-psuedo-plance-push-ups) [source video/guide](https://www.youtube.com/watch?v=TZ63httkob4) |
| `sp` | `atp` | 5 | Straddle planche | `floor\|pt` | Front delts,Serratus,Biceps | Abs,Glutes,Lower back | 3×5–10 s, then full | Wide straddle, legs active | `ffpl` | [cv](https://www.caliverse.app/exercises/planche-straddle-147) [source video/guide](https://www.youtube.com/watch?v=3vKmcAN-iVw) |
| `fp` | `sp` | 6 | Full planche | `floor\|pt` | Front delts,Serratus,Biceps | Abs,Glutes,Lower back | Takes years for most people | Legs together, body horizontal | `ffpl` | [cv](https://www.caliverse.app/exercises/planche-100) [source video/guide](https://www.youtube.com/watch?v=3vKmcAN-iVw) |

### Front lever

- tree id: `fl`
- category: `skill`
- notes: Straight-arm pull skill. Simonster's intermediate entry: 12 dips, 8 pull-ups, 10 s tuck lever.
- full progression video: [Front Lever Training Tutorial: tuck → full (YouTube, via Antranik)](https://www.youtube.com/watch?v=ysqkaCxv2bI)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `tf` |  | 1 | Tuck front lever | `bar\|rings` | Lats,Abs | Rear delts,Upper back,Biceps,Forearms/grip | 3×10–15 s, then advanced tuck | Arms locked, shoulders down, pelvis tucked | `cmfl` | [fl](https://www.fitloop.app/exercises/tuck-front-lever) [cv](https://www.caliverse.app/exercises/front-lever-tuck-719) [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `at` | `tf` | 2 | Advanced tuck front lever | `bar\|rings` | Lats,Abs | Rear delts,Biceps | 3×10–15 s | Flat back | `cmfl` | [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `ol` | `at` | 3 | One-leg front lever | `bar\|rings` | Lats,Abs | Hip flexors,Biceps | 3×8–10 s per leg | Extended leg in line | `cmfl` | [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `st` | `ol` | 4 | Straddle front lever | `bar\|rings` | Lats,Abs | Glutes,Biceps | 3×5–10 s | Wide legs, hips up | `cmfl` | [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `hl` | `st` | 5 | Half-lay front lever | `bar\|rings` | Lats,Abs | Glutes | 3×5–8 s | Knees bent 90°, hips extended | `cmfl` | [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `ff` | `hl` | 6 | Full front lever | `bar\|rings` | Lats,Abs | Rear delts,Glutes,Biceps | Hold 5–10 s | Straight line from ankles to shoulders | `cmfl` | [source video/guide](https://www.youtube.com/watch?v=vLrjlIofGZ0) |
| `flr` | `tf` | 2 | Front-lever raises / rows (branch) | `bar\|rings` | Lats,Abs | Biceps,Rear delts | 3×5 at your tuck level | Straight arms on raises | `gen` | [fl](https://www.fitloop.app/exercises/tuck-front-lever-row) [fl](https://www.fitloop.app/exercises/advanced-tuck-front-lever-row) |
| `bfl` | `tf` | 2 | Band-assisted front lever (branch) | `bar+band` | Lats,Abs | Biceps | Use for harder positions | Band under the hips | `gen` | search only |

### Back lever

- tree id: `bl`
- category: `skill`
- notes: Heavy on the biceps tendon and shoulder extension. Go slowly.
- full progression video: [RingFrat: The Back Lever Tutorial, tuck → half-lay (YouTube)](https://www.youtube.com/watch?v=9DhXHwcI4L4)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `gh` |  | 1 | German hang | `rings\|bar` | Biceps,Chest,Front delts | Rotator cuff | Build to 30 s, feet assisted at first | Lower slowly, no bouncing | `gen` | [fl](https://www.fitloop.app/exercises/german-hang) |
| `stc` | `gh` | 2 | Skin the cat | `rings\|bar` | Lats,Abs,Biceps | Front delts | 3×3–5 slow reps | Controlled in and out | `gen` | [fl](https://www.fitloop.app/exercises/skin-the-cat) |
| `tb` | `stc` | 3 | Tuck back lever | `rings\|bar` | Biceps,Chest,Front delts | Abs,Lower back | 3×10–15 s | Arms locked, hips at hand height | `gen` | [fl](https://www.fitloop.app/exercises/tuck-back-lever) |
| `atb` | `tb` | 4 | Advanced tuck back lever | `rings\|bar` | Biceps,Chest,Front delts | Glutes | 3×10–15 s | Hips open | `gen` | [fl](https://www.fitloop.app/exercises/advanced-tuck-back-lever) |
| `sb` | `atb` | 5 | Straddle / half-lay back lever | `rings\|bar` | Biceps,Chest,Front delts | Glutes,Lower back | 3×5–10 s | Squeeze the glutes | `gen` | search only |
| `fb` | `sb` | 6 | Full back lever | `rings\|bar` | Biceps,Chest,Front delts | Glutes,Abs | Hold 5–10 s | Straight body, face down | `gen` | search only |

### Bar muscle-up

- tree id: `bmu`
- category: `skill`
- notes: Calimove: 8–10 pull-ups, 8–10 dips and a 20–30 s false grip to start drills; about 12 pull-ups, 5 deep straight-bar dips and 3 explosive pull-ups for clean reps.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `cb` |  | 1 | Chest-to-bar pull-up | `bar` | Lats,Upper back | Biceps | 3×5 clean | Bar to the lower chest | `cmmu` | [fl](https://www.fitloop.app/exercises/chest-to-bar-pull-up) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `ep` | `cb` | 2 | Explosive (high) pull-up | `bar` | Lats,Biceps | Abs,Forearms/grip | 3 reps to waist height (Calimove) | Pull the bar toward the hips, not the chin | `cmmu` | [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `sbd` | `cb` | 2 | Straight-bar dip | `bar` | Triceps,Chest,Front delts | Abs | 5 deep reps (Calimove) | Lean over the bar | `cmmu` | [fl](https://www.fitloop.app/exercises/straight-bar-dips) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `amu` | `ep` | 3 | Band / jumping muscle-up, negatives | `bar+band\|bar+box` | Lats,Triceps,Chest | Abs | 3×3–5 | Learn the turnover | `cmmu` | [fl](https://www.fitloop.app/exercises/muscle-up-negative) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `kmu` | `amu` | 4 | Kipping bar muscle-up | `bar` | Lats,Triceps,Chest | Abs,Hip flexors | 3×3 | Hollow, arch, then pull to the hips | `cmmu` | [fl](https://www.fitloop.app/exercises/kipping-muscle-up) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `smu` | `kmu` | 5 | Strict bar muscle-up | `bar` | Lats,Triceps,Chest | Abs,Forearms/grip | 3×3–5 | Minimal swing | `cmmu` | [fl](https://www.fitloop.app/exercises/muscle-up) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `wmu` | `smu` | 6 | Weighted muscle-up | `bar+wt` | Lats,Triceps,Chest | Abs | Small loads | Same technique | `gen` | search only |

### Ring muscle-up

- tree id: `rmu`
- category: `skill`
- notes: The false grip is the key. Daniel Vadnal's floor: about 5 pull-ups, 5 dips and 10 push-ups before serious ring work.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `fg` |  | 1 | False-grip hang | `rings` | Forearms/grip | Biceps | 20–30 s | Heel of the hand over the ring | `cmmu` | [fl](https://www.fitloop.app/exercises/ring-false-grip-hold) [source video/guide](https://blog.calimove.com/2026/09/14/muscle-up-progression-guide/) |
| `fgr` | `fg` | 2 | False-grip rows / pull-ups | `rings` | Lats,Biceps,Forearms/grip | Upper back | 3×5–8 without losing the grip | Pull rings to the lower chest | `gen` | search only |
| `rd` | `fg` | 2 | Deep ring dips | `rings` | Chest,Triceps,Front delts | Biceps | 3×8 to full depth | Rings close, elbows back | `gen` | [fl](https://www.fitloop.app/exercises/ring-dips) |
| `td` | `fgr` | 3 | Low-ring transition drill | `rings` | Lats,Triceps,Chest | Abs | 3×5 with feet assisting | Rings to the ribs, then lean over | `gen` | [fl](https://www.fitloop.app/exercises/kipping-muscle-up-feet-assisted-transition-rings) |
| `rm` | `td` | 4 | Ring muscle-up | `rings` | Lats,Triceps,Chest | Forearms/grip,Abs | 3×3–5 | Keep the rings close through the transition | `gen` | search only |

### Human flag

- tree id: `flag`
- category: `skill`
- notes: Needs a vertical pole or stall bars. Antranik's prerequisite: 3×5 wall HSPU.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `vf` |  | 1 | Vertical flag | `pole` | Lats,Obliques,Front delts | Triceps,Side delts | 10–15 reps per set before negatives | Bottom arm pushes, top arm pulls | `flag` | [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |
| `ef` | `vf` | 2 | Eccentric flag (one knee bent) | `pole` | Lats,Obliques,Side delts | Triceps | 3×3–5 slow lowers | Lower from vertical with control | `antp` | [source video/guide](https://antranik.org/bodyweight-training/) |
| `tf` | `ef` | 3 | Tuck flag | `pole` | Lats,Obliques,Side delts | Abs | 3×10 s | Lift without jumping | `flag` | [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |
| `olf` | `tf` | 4 | One-leg flag | `pole` | Lats,Obliques,Side delts | Abs | 20 s hold before straddle | One leg tucked, one extended | `flag` | [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |
| `bf` | `tf` | 4 | Band-assisted flag (branch) | `pole+band` | Lats,Obliques | Side delts | Use for straddle and full lines | Band around the waist | `flag` | [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |
| `sf` | `olf` | 5 | Straddle flag | `pole` | Lats,Obliques,Side delts | Glute med,Abs | 3×5–10 s | Wide straddle | `flag` | [cv](https://www.caliverse.app/exercises/straddle-human-flag-hold-1514) [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |
| `ff` | `sf` | 6 | Full human flag | `pole` | Lats,Obliques,Side delts | Abs,Glute med,Triceps | Hold 5–10 s | Body horizontal, legs together | `flag` | [source video/guide](https://calisthenicsnerd.com/2020/12/15/human-flag-tutorial-all-the-progressions/) |

### L-sit → V-sit → manna

- tree id: `lsit`
- category: `skill`
- notes: Compression plus straight-arm support. Flexibility is half the work.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `fs` |  | 1 | Foot-supported L-sit | `floor\|pt\|dip` | Triceps,Abs,Hip flexors | Quads | 3×20–30 s | Shoulders pushed down | `antp` | [fl](https://www.fitloop.app/exercises/foot-supported-l-sit) [source video/guide](https://antranik.org/bodyweight-training/) |
| `tl` | `fs` | 2 | Tuck L-sit | `floor\|pt\|dip` | Abs,Hip flexors,Triceps | Quads | 3×10–20 s | Knees to chest, hips off the floor | `antp` | [fl](https://www.fitloop.app/exercises/tuck-l-sit) [source video/guide](https://antranik.org/bodyweight-training/) |
| `ol` | `tl` | 3 | One-leg L-sit | `floor\|pt\|dip` | Abs,Hip flexors | Quads,Triceps | 3×10–15 s per leg | Extended leg locked | `antp` | [fl](https://www.fitloop.app/exercises/one-leg-l-sit) [source video/guide](https://antranik.org/bodyweight-training/) |
| `fl` | `ol` | 4 | Full L-sit | `floor\|pt\|dip` | Abs,Hip flexors,Quads | Triceps,Front delts | 3×15–30 s | Legs horizontal, toes pointed | `antp` | [fl](https://www.fitloop.app/exercises/l-sit) [sl](https://www.strengthlog.com/l-sit/) [source video/guide](https://antranik.org/bodyweight-training/) |
| `rl` | `fl` | 5 | Ring L-sit (branch) | `rings` | Abs,Hip flexors,Triceps | Biceps | 3×10–20 s | Rings turned out | `gen` | search only |
| `sl` | `fl` | 5 | Straddle L-sit | `floor\|pt` | Hip flexors,Abs | Adductors | 3×10 s | Hands between the legs | `gen` | [fl](https://www.fitloop.app/exercises/straddle-l-sit-hold) |
| `vs` | `fl` | 5 | V-sit | `floor\|pt` | Hip flexors,Abs | Triceps,Front delts | 3×5–10 s | Needs pike compression; lean back | `tm` | [cv](https://www.caliverse.app/exercises/tucked-v-sit-hold-1390) [source video/guide](https://www.youtube.com/@BodyweightWarrior) |
| `mn` | `vs` | 6 | Manna | `floor\|pt` | Front delts,Triceps,Hip flexors | Abs,Upper back | Elite; years of work | Shoulder extension strength plus extreme compression | `gen` | [fl](https://www.fitloop.app/exercises/manna) |

### One-arm pull-up

- tree id: `oap`
- category: `skill`
- notes: Unilateral pulling ladder. Heavy weighted pull-ups build the base.
- full progression video: [Hybrid Calisthenics: pull-up progression video](https://www.youtube.com/watch?v=fO3dKSQayfg)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `arp` |  | 1 | Archer pull-up | `bar\|rings` | Lats,Biceps | Obliques | HC: 2×9 per side | Assisting arm straight | `hc` | [fl](https://www.fitloop.app/exercises/archer-pull-up) [hc](https://www.hybridcalisthenics.com/archer-pullups) |
| `tw` | `arp` | 2 | Typewriter pull-up | `bar` | Lats,Biceps | Forearms/grip | 3×3–5 traverses | Stay at the top | `gen` | [fl](https://www.fitloop.app/exercises/typewriter-pull-up) |
| `aoap` | `tw` | 3 | Assisted one-arm pull-up | `bar+slider\|bar+band\|bar` | Lats,Biceps,Brachialis | Forearms/grip,Obliques | HC one-hand-assisted standard: 2×9 per side | Assisting hand on the forearm or a towel; use less over time | `hc` | [hc](https://www.hybridcalisthenics.com/one-hand-pullups) [hc](https://www.hybridcalisthenics.com/advanced-onehand-pullups) |
| `oan` | `aoap` | 4 | One-arm negative | `bar` | Lats,Biceps,Brachialis | Forearms/grip | 3×3 per side, 5 s lowers | Resist rotation | `gen` | search only |
| `oapu` | `oan` | 5 | One-arm pull-up | `bar` | Lats,Biceps,Brachialis | Forearms/grip,Obliques,Abs | 1–3 reps per side | Chin over the bar, minimal swing | `gen` | [hc](https://www.hybridcalisthenics.com/one-arm-pullups) [fl](https://www.fitloop.app/exercises/one-arm-chin-up) |
| `wpu` |  | 1 | Weighted pull-up (support branch) | `bar+wt` | Lats,Biceps | Forearms/grip | Heavy sets of 3–5 | Full range | `sim` | [fl](https://www.fitloop.app/exercises/weighted-pull-ups) |

### Pistol squat

- tree id: `pistol`
- category: `skill`
- notes: Strength plus balance, ankle and hip mobility.
- full progression video: [Hybrid Calisthenics: squat progression video](https://www.youtube.com/watch?v=z3XQ7T4-abQ)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `bp` |  | 1 | Box pistol | `box` | Quads,Glutes | Calves,Hip flexors | 3×5–8 per leg, lowering the box | Sit back under control | `soc` | [hc](https://www.hybridcalisthenics.com/one-leg-chair-squats) [source video/guide](https://www.youtube.com/watch?v=DJ5Ukbfak7I) |
| `ap` | `bp` | 2 | Assisted pistol (holding support) | `rings\|wall\|low` | Quads,Glutes | Calves | 3×5–8 per leg | Use your hands only as needed | `soc` | [hc](https://www.hybridcalisthenics.com/assisted-oneleg-squats) [source video/guide](https://www.youtube.com/watch?v=DJ5Ukbfak7I) |
| `neg` | `ap` | 3 | Pistol negative | `floor` | Quads,Glutes | Hip flexors | 3×5 slow per leg | Reach the arms forward | `soc` | [source video/guide](https://www.youtube.com/watch?v=DJ5Ukbfak7I) |
| `eps` | `ap` | 3 | Elevated pistol (on a box) | `box` | Quads,Glutes | Hip flexors,Calves | 3×5 per leg | Free leg hangs below box level | `gen` | search only |
| `ps` | `eps` | 4 | Pistol squat | `floor` | Quads,Glutes | Calves,Hip flexors,Adductors | 3×5 per leg, then weighted | Heel down, knee tracks the toes | `soc` | [fl](https://www.fitloop.app/exercises/pistol-squat) [hc](https://www.hybridcalisthenics.com/oneleg-squats) [sl](https://www.strengthlog.com/pistol-squat/) [source video/guide](https://www.youtube.com/watch?v=DJ5Ukbfak7I) |
| `wps` | `ps` | 5 | Weighted pistol | `floor+wt` | Quads,Glutes | Calves | 3–8 reps | A front counterweight helps balance | `sim` | [fl](https://www.fitloop.app/exercises/kettlebell-pistol-squat) |

### Dragon flag

- tree id: `dflag`
- category: `skill`
- notes: Grip a bench or pole behind your head.

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `llr` |  | 1 | Lying leg raise / reverse crunch | `floor` | Abs,Hip flexors | Obliques | 3×12–15 | Low back down | `gen` | [hc](https://www.hybridcalisthenics.com/full-leg-raises) |
| `tdf` | `llr` | 2 | Tuck dragon flag negatives | `box` | Abs,Lats | Obliques,Hip flexors | 3×5 slow | Weight on the upper back, not the neck | `gen` | [fl](https://www.fitloop.app/exercises/dragon-flag-tucked-short-range-bench) |
| `sldf` | `tdf` | 3 | One-leg / straddle dragon flag | `box` | Abs,Lats | Obliques | 3×5 | Hips stay extended | `gen` | search only |
| `dfn` | `sldf` | 4 | Full dragon flag negatives | `box` | Abs,Lats | Obliques,Glutes | 3×3–5 lowers of 5 s | Straight line, no hip bend | `gen` | [fl](https://www.fitloop.app/exercises/dragon-flag) |
| `df` | `dfn` | 5 | Full dragon flag | `box` | Abs,Lats | Obliques,Glutes | 3×3–5 reps | Straight line, no hip bend | `gen` | [fl](https://www.fitloop.app/exercises/dragon-flag) [sl](https://www.strengthlog.com/dragon-flag/) |

### Elbow lever

- tree id: `elbow`
- category: `skill`
- notes: An accessible balance skill, but hard on the wrists.
- full progression video: [Hybrid Calisthenics: elbow lever progression video](https://www.youtube.com/watch?v=yJqW3Xh253E)

| id | parent | rung | exercise | equipment | primary | secondary | advance | cues | source | how-to |
|---|---|---|---|---|---|---|---|---|---|---|
| `cr` |  | 1 | Crow pose | `floor` | Front delts,Triceps,Wrists | Abs | 20 s (Antranik's prerequisite) | Knees on the triceps | `antp` | [fl](https://www.fitloop.app/exercises/crow-pose) [source video/guide](https://antranik.org/bodyweight-training/) |
| `el` | `cr` | 2 | Two-arm elbow lever | `floor\|pt` | Abs,Wrists,Forearms/grip | Front delts,Obliques | 3×10–20 s | Elbows into the hips, body horizontal | `gen` | [hc](https://www.hybridcalisthenics.com/fullelbowlevers) |
| `oel` | `el` | 3 | One-arm elbow lever | `floor\|pt` | Abs,Obliques,Wrists | Forearms/grip | 3×5–10 s per side | Elbow at the hip bone | `gen` | search only |
