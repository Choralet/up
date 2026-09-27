# Decisions

Source of truth for choices made about the app. Update after each answer.

## Decided (by the user, 2026-09-26)

- Platform: native iPhone app, Apple-like design
- Core mechanic: level up to a harder variation when a goal is achieved
- Starting level: found **inside the app** (guided "Find your level" onboarding), no need to tell the agent
- Skills: research done, tracked **alongside workouts** (e.g. push day workout, then skill work)
- Level-up: **suggestion** the user confirms, not automatic
- Goal rule: default is one qualifying session (about 3 sets at the goal), with a stricter option in settings
- Branches: each muscle group tracked **separately** (Push, Pull, Legs, Core)
- Workout plan: **one plan per day**, easy to follow, includes the selected skill for that day
- Game feel: **quiet**
- Logging: reps, **hold timer** for holds, **workout schedule**. **No rest timer.**
- **Name: Up**
- **Platform changed to a WEB APP (PWA)** on the iPhone home screen, hosted on **GitHub Pages**. No Xcode, SideStore or $99 (supersedes the native-app plan). Apple Health and widgets are therefore impossible and dropped.
- Wants data **saved via GitHub**. Pages can't store data, so see PLAN.md 9b (local + export + optional GitHub backup)
- How-to: only a **small button**, only where a demo exists; **no custom stick figures**; if no legit source, leave it out (see DEMOS.md)
- Skill tree must be a **real, game-like branching tree**, not a list (mockups 4–6 approved direction; everything else in mockups is fine)
- Workout days, active skills, focus nodes and goals are **all customizable in the app** (no fixed schedule chosen)
- **After trying Plan 1 (round 5):** hold-timer ring must glide smoothly (done: per-frame updates); logged sets can be corrected (done: tap a set chip to change its value or remove it; interpreted from "relog the set for miss click"); on the Tree tab the Push/Pull/Legs/Core bar is fixed and only the tree scrolls (done, tree starts scrolled to the bottom where beginner exercises are)
- **Schedule (round 6):** default is **Monday / Wednesday / Friday** as Push / Pull / Legs+Core. It must be **customizable in the app** (Plan 2 Settings), noted as the default only.
- **Skills get a timer (round 6):** skill steps whose goal is a hold (handstand, planche, lever, L-sit) use the hold timer, opened straight from the workout. Rep-based skill steps (one-arm push-up, muscle-up, HSPU, pistol, dragon flag) keep the rep stepper.

## Proposed by the agent, awaiting approval

- React + TypeScript + Vite PWA, data in IndexedDB, no account
- 3-day Push / Pull / Legs+Core schedule as default, editable
- Max 2 active skills at once
- Soft (never blocking) prerequisites for skills
- Design direction: mockups/index.html

## Facts found

- Node v26, npm, git and `gh` are installed; `gh` is logged in as **Choralet** (checked 2026-09-26). Xcode is not installed and is no longer needed.

## Decided (2026-09-26, round 4)

- **Demos:** option 3, personal use. Hotlink GIFs from the Gym visual-based dataset (never copy the files into the repo), show "© Gym visual" credit, and show the How-to button only where a demo exists. Agent flagged that this may not comply with Gym visual's terms; user accepted since it is personal use.
- **GitHub backup:** approved (fine-grained token stored on the phone, separate private data repo).
- **Repo (done):** private + Pages was tried first and GitHub returned 422 (plan does not support Pages on private repos), so `Choralet/up` is **public** (code and docs only). Original decision: try **private + GitHub Pages first**; if GitHub refuses (Pages on private repos needs a paid plan), use **public**. The public repo holds only code, never data.

## Open questions

- User feedback after trying Plan 1 on the iPhone

## Known minors deferred from the Plan 1 final review (fix in Plan 2 or 3)

- Today/Log screens can show a stale day if the app stays open past midnight (re-render on visibilitychange)
- `sanitizeProgress` keeps fractional stored set values (floor them)
- Logs dropped by sanitising are overwritten by the post-load save; add an id migration before node ids change
- Wake lock can stay held if Stop is tapped before it is granted, and is not re-acquired when the page returns to the foreground
- Tapping Done during a running hold discards it silently
- Status bar is unreadable in light mode (`black-translucent`); use `default` or keep the top area dark
- Accessibility: rep count not announced, overlays not modal/inert, tree state words differ from the sheet ("available"/"focus" vs "Unlocked"/"Focus"), skill nodes don't say "skill"
- `.cta:disabled` is unused
- Unverified without a device: offline and IndexedDB behaviour inside the iOS home-screen app; wake lock before iOS 18.4

## Plan 2 built (2026-09-26)

Decisions taken while building, all reversible: skill steps keep the graph's hard requirements (a locked step cannot be trained); a week counts toward the streak with 2 logged days (or fewer if fewer are planned); Find your level only asks about strength exercises and never completes a skill step; existing users skip onboarding (migration marks a used app as onboarded); "Train anyway" on a rest day is available for Push, Pull or Legs + Core.

Minor polish noticed in the browser check: "0 of 1 steps" should read "step" for singular; a round-cap dot shows on the timer ring at 0:00.

## Known minors deferred from the Plan 2 final review (fix in Plan 3)

- A Plan 1 user who was training a skill as their branch focus loses it in migration (chain is not added to the active skills)
- Today keeps "Train anyway" and warm-up ticks across midnight; reset them when the date changes
- The streak explanation always says 2 days even when the rule is 1 day (0 or 1 planned days)
- A quick double tap on Yes in Find your level answers two questions; add a short lockout or a Back step. There is no way to un-complete an exercise
- The Skills Start button is disabled without explaining why when both slots are full
- One empty frame in onboarding when a branch is already complete
- "0 of 1 steps" wording, and the round-cap dot on the timer ring at 0:00

## Plan 3 built (2026-09-26)

- Backup: file export/import (import replaces everything after an in-app confirmation) and automatic GitHub backup to the private repo `Choralet/up-data` whenever the app goes to the background and progress changed; manual Back Up Now / Restore / Disconnect in Settings. The token is typed by the user, stored only on the phone (IndexedDB key `up.github`), sent only to api.github.com, never included in backups. Guide: `docs/BACKUP.md`.
- Demos: 19 exercises have a How-to GIF, hotlinked from a pinned commit of the dataset via jsDelivr, cached by the service worker after first view, with the "© Gym visual — gymvisual.com" credit. Inexact matches (for example the full front lever for the tuck version) were left out on purpose.
- Fixed from both review lists: fractional stored values, Plan 1 skill focus migration, midnight/stale day (incl. Train anyway and warm-up), wake-lock race, Done during a running hold asks, ring dot at 0:00, streak rule text, step/steps wording, Skills full-slot explanation, onboarding double tap and empty frame, tree state names, rep count announced, inert background behind overlays, readable status bar in light mode. Export falls back to a download when the share sheet is refused.
- Still unverified without a device: behaviour inside the iOS home-screen app (IndexedDB persistence, wake lock, share sheet).

## Plan 3 final review fixes (2026-09-26)

- Connecting to a repo that already has a backup pauses automatic backup until you choose **Restore It** or **Replace with This Phone** (stops a new phone overwriting your backup). Today shows **Backup needs attention** if backups fail, are paused, or are over a week old. Uploads happen only when progress changed. Disconnect asks first.
- Deferred: the ~1 MB GitHub file limit (years of logs away) and its error wording; a negligible wake-lock leak on Stop then Start before the lock is granted. Two phones at once: last write wins (documented).

## Plan 4 built: Roadmap (2026-09-26)

- User asked to turn STRIQfit's "Every Calisthenics Skill to Learn in Order" videos (Year 1-3) into the app, step by step with prerequisites, plus a button to each skill's chapter in the video. Chosen design: Roadmap view inside Skills, trainable (Train This = one of the 2 active skills), "I can already do this", video links. Transcripts were not accessible, so only the order comes from the videos; steps and prerequisites are standard progressions (stated in the app). Open questions answered by the agent at the user's request (see docs/ROADMAP.md, Decisions).

## Plan 5 built: UX (2026-09-27)

- User: "Build all 5 phases plus find a way to make skills tab better… Remove Library in my skills tab and make an adjustment that you think is the best." Agent decisions: workout ≈ 15–20 min (warm-up → skill → main → Volume variation → Core finisher on Push/Pull days); soft goal tone ON by default with a Settings switch; Skills tab = Now (Training + Ready to Start + Replace) | Roadmap (only catalog); Roadmap names unified to app names with the video chapter name shown as "In the video"; buttons in Title Case; level-up primary button "Level Up".

## Open (2026-09-27): more exercises per day

User: "1 exercise per day is too less… do more research on youtube and propose me ways." Research and options A–D in `docs/WORKOUT-VOLUME.md`. **User chose A + C (built in Plan 6).** Agent decisions: 9 tracks (push-ups, pike & handstand, dips; pull-ups, rows; squats, hinge; plank & hollow, leg raises); new starter moves (pike hold, bench dip, negative dip, high incline row, feet-elevated row, archer row, glute bridge, single-leg glute bridge, Nordic curl negative, lying leg raise); Pike push-up now needs Pike hold (not Push-up), Inverted row needs High incline row, Negative pull-up needs Scapular pull-up and Inverted row, Hanging knee raise needs Lying leg raise; the Roadmap 'Parallel bar dip' became the tree exercise 'Dip'. Length: Short = first two tracks, Standard (default) = all + core finisher on Push/Pull, Full = + Volume.

## Plan 6 final review fixes (2026-09-27)

- Negative pull-up needs only Scapular pull-up (a Rows requirement had dead-ended the Pull-ups track); an empty track refills after any level-up.
- Older saves: the easier steps added in Plan 6 (Pike hold, Bench dip, Negative dip, High incline row, Glute bridge, Single-leg glute bridge, Lying leg raise) count as done under work you already did, so nobody restarts at a beginner move. An old "Parallel bar dip" skill moves into the Dips track.
- Short on Legs + Core day = Squats + Plank & hollow. The Push/Pull core finisher moves on to Leg raises once Plank & hollow is finished.
- Deferred minors: arrow keys in the Workout Length control; Full looks like Standard for a beginner (no finished variation yet); track tags share one colour; the Tree sheet doesn't name the track it replaces; some stale code comments; the Dips and Rows chains sit in the same tree column.

## Plan 7 built: v1.1 (2026-09-27)

User: "Your recommendation plus 2. I need more animation in my app" (iPhone test pass, exercise history, achievements, smarter goals, calendar reminders, unlock moment + tree zoom + track labels, app-wide motion). Agent decisions:
- **Goal ramp:** only an exercise reached by Level Up ramps: 60% → 80% → 100% of its goal; meeting the current stage shows "Goal up: 3 × 8 next time". Beginner roots, Find your level placements and older saves keep the full goal.
- **Achievements:** 15 quiet badges (workouts, week streaks, level-ups, first push-up / pull-up / dip / pistol, first skill step, freestanding handstand, Roadmap Year 1). One card at a time on Today with **Nice**; older saves count what they already earned as seen. No confetti.
- **Reminders:** a calendar file (`up-training.ics`, weekly events with an alert) instead of push notifications, which an iPhone home-screen web app can't schedule reliably.
- **Tree:** pinch zoom 70–200% plus − / % / + buttons floating at the bottom right; track chips name each track's current exercise; a newly unlocked exercise glows and its line draws in once.
- **Motion:** CSS only, 150–500 ms, spring-like; all of it off under Reduce Motion. No haptics (not available to web apps on iPhone).
- iPhone checklist: `docs/IPHONE-TEST.md`.
