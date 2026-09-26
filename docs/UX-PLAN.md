# UX improvement plan

**Status: built (Plan 5, 2026-09-27)**, plus the Skills tab change the user asked for: the My Skills library is removed; Skills = **Now** (Training + Ready to Start, Replace at the 2-skill limit) | **Roadmap** (the one catalog, Ready Now section, collapsible years). Deviations: Find your level can't "step down" (answers are a draft; Back undoes), and has no "pick a first skill" step (Skills → Now lists every skill ready to start).

From a real-user walkthrough on 2026-09-27: an agent used the app at iPhone size (dark and light, 390 and 375 wide) through first launch, a week of workouts, skills, Roadmap and Settings. Screenshots were in the session scratchpad.

**Overall:** calm and Apple-like; the log screen, level-up and rest days are good. As a beginner the week felt thin: one exercise per day, "done" never shows unless you hit the goal, progress barely moves, and skills live in three overlapping places.

## Phase 1: Fix the slips (bugs)

| # | Problem | Fix |
|---|---|---|
| 1 | Warm-up ticks and "Train anyway" reset when you switch tabs | Keep them per date (saved), not inside the Today screen |
| 2 | A quick double tap on Log Set logs two sets, with no feedback | Ignore a second tap within 0.6 s; briefly highlight the new set chip |
| 3 | Done → "Log It" during a hold skips the level-up suggestion | Route it through the same check as a normal set |
| 4 | Roadmap "Done" rows look like "Locked" rows | Done gets a green check and normal text |
| 5 | Roadmap "Needs" shows the skill's own earlier step once step 1 is done | Needs always shows the skill's real prerequisites; own steps show in Steps |
| 6 | Changing the schedule during "Train anyway" shows a mismatched pill | Reset "Train anyway" when the schedule changes |
| 7 | Import said 11 finished exercises for a file with 12 | Investigate and fix the count |

## Phase 2: A workout that feels complete

| # | Problem | Fix |
|---|---|---|
| 8 | "Done" is never clear below the goal ("0 of 3 sets" after 5/4/4) | Today shows "3 sets · best 5"; an exercise is done when its sets are logged; the goal tick stays separate |
| 9 | No end to a workout | "Finish Workout" button → a short summary (sets, best numbers, anything new, next workout) |
| 10 | Push and Pull days are one exercise (about 5 minutes); core only on Fridays | Add a short core finisher every day, and a second strength exercise for volume (the variation you just finished, e.g. Knee push-up after moving to Push-up) |
| 11 | The rep stepper starts at the goal (10); 3 taps log a fake 3×10 and level you up | Start from last session's first set; label it "last session" |

## Phase 3: A hold timer for real holds

| # | Problem | Fix |
|---|---|---|
| 12 | Walking to the bar or kicking up is counted | 3-second countdown before the timer starts |
| 13 | You can't see the screen during a hang or handstand | A soft sound at the goal (can be turned off in Settings) |
| 14 | A small button to stop | The whole screen becomes the stop button while holding |
| 15 | After Stop, the full ring looks like it's still running; the "hold is running" sheet doesn't tick | Clear stopped state; live time in the sheet |

## Phase 4: Clear skills and rewarding progress

| # | Problem | Fix |
|---|---|---|
| 16 | Tab icons are identical grey squares | Real icons (Apple SF-Symbols-style, drawn in SVG) |
| 17 | My Skills is a dead end for beginners (all Start buttons locked) while Roadmap has 7 ready skills | Empty state lists "Ready to start" skills from the Roadmap |
| 18 | Three catalogs, different status words and names for the same move | One vocabulary (Locked / Ready / Training / Done everywhere) and one name per move; a line on each screen saying what it is for |
| 19 | Progress hardly moves week to week | Week strip ("2 of 3 days this week"), recent sessions list, "+2 reps vs last week" lines; quiet, no confetti |
| 20 | Find your level has no Back or Close, can't step down, and the wording is awkward | Back and Close, "Can you do 3 sets of 10 clean push-ups?", and a final step to pick days and a first skill |
| 21 | Roadmap is 4.5 screens long | "Ready now" section at the top, years collapsible; neutral icons instead of the emoji lock |
| 22 | At the 2-skill limit you must leave the Roadmap to stop one | Inline "Replace <skill>" |
| 23 | Roadmap skills have no How-to on the log screen | Show the video chapter as the How-to |

## Phase 5: Polish

| # | Problem | Fix |
|---|---|---|
| 24 | Some tap targets under 44 pt; Done on the log screen is top-right | Bigger targets; add a bottom "Done" on the log screen |
| 25 | White on orange/green buttons is low contrast (about 2:1) | Darker button shades for text, same hues |
| 26 | Mixed button capitalization | Title Case for all buttons (Apple style) |
| 27 | Settings points to docs/BACKUP.md (not on the phone); no placeholders; cramped status line | In-app backup steps, placeholders, "last exported" |
| 28 | Warm-up items have no amounts | "Arm circles · 10 each way", and so on |

## Not tested (needs your iPhone)

Home-screen app behaviour, wake lock, share sheet, status bar, VoiceOver and text size, GIFs loading, GitHub connect, midnight, tree pan and zoom.
