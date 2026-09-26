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
