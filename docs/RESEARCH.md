# Research Notes

Researched 2026-09-26. Summaries only; verify specifics before treating as fact.

## 1. How calisthenics progression works

- No external load, so **difficulty rises by changing leverage/variation**: incline → flat → decline, two arms → one arm, bent → straight body.
- Movements group into **Push, Pull, Legs, Core** (plus balance/skills). Each has its own chain, and you can be at different levels in each.
- Skill trees model each exercise as a node with states: Locked → Unlocked → Ongoing → Completed → Mastered ([Simple Calisthenics](https://www.simple-calisthenics.com/features/calisthenics-skill-tree), [Titans Grip](https://www.titans-grip.com/tools/skill-progression/)).

## 2. Standards for leveling up (they vary by source)

| Source | Rule |
|---|---|
| [Reddit BWF Recommended Routine](https://redditbwf.github.io/wiki/recommended_routine.html) | Hardest variation you can do for 3×5–8. At **3×8** (or **3×30s** holds) advance and restart at 5 reps. Train 3×/week, full body. |
| [Convict Conditioning](https://legendarystrength.com/convict-conditioning/) | 6 exercises × 10 steps. Each step has beginner / intermediate / progression standards. |
| [Guppy Calisthenics](https://www.guppycalisthenics.com/blog/calisthenics-progression-levels-explained) | Push 3×10–15, pull 3×8–10, legs 3×10–15/side, core 30–60s, each **across 3 consecutive sessions**. |

**Takeaway for the app:** use a simple default (3 sets at the goal reps, or 30s holds) and let the user edit it. Optional "must hit it in 2–3 sessions" setting for stricter users. Form matters: the goal is "clean" reps, so the app should show cues and let the user be honest.

Also useful: gains come fast early, so expect a new variation every 1–2 weeks in the first 3 months, and slower later.

## 3. Chains

The concrete list is in [PLAN.md](PLAN.md#5-progression-chains-starter-data). Named sources for the details: Guppy (levels above), Convict Conditioning (Big Six), [Caliprogressions](https://www.caliprogressions.com/), [Calisthenics skill list (Gravgear)](https://thegravgear.com/blogs/calisthenics/calisthenics-skill-list), [BodySpec templates](https://www.bodyspec.com/blog/post/calisthenics_workout_plan_beginner_to_advanced_templates).

## 4. Existing apps (competition)

- [Calistack](https://www.calistack.com/) (Android and web): calisthenics skills tracker.
- [Caliprogressions](https://www.caliprogressions.com/): step-by-step progressions.
- [Simple Calisthenics](https://www.simple-calisthenics.com/features/calisthenics-skill-tree) and [Titans Grip](https://www.titans-grip.com/tools/skill-progression/): skill tree visualizers.
- [Fitloop](https://apps.apple.com/us/app/id1474941254): iOS bodyweight routine app.

**Gap we can fill:** a polished, Apple-quality iOS app where the *tree + leveling up* is the main experience, not a text chart.

## 5. Gamification lessons

From [Yu-kai Chou's analysis](https://yukaichou.com/gamification-analysis/top-10-gamification-in-fitness/), [Plotline](https://www.plotline.so/blog/gamification-in-health-and-fitness-apps), [Trophy](https://trophy.so/blog/strava-gamification-case-study):

- Products that **reward showing up** beat ones that only reward performance.
- Mixing drives (progression, identity, community) lasts longer than one mechanic.
- **Weekly streaks** fit strength training better than daily ones (recovery, travel, injury).
- Motivation built mostly on fear of losing a streak tends to collapse after the first month, so progression and mastery carry long-term.
- Gentler Streak (Apple Design Award 2024) shows the "gentle" approach: rest, sick and vacation days that don't reset progress.
