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

- Plan 2 scope questions (to brainstorm before writing Plan 2): default weekday schedule, how many days per week, warm-up content, whether skills also get a per-set timer
- User feedback after trying Plan 1 on the iPhone
