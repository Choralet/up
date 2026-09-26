# Calisthenic Quest: Agent Guide

Instructions for any AI coding agent working in this repo. `CLAUDE.md` imports this file.

## Project

**Up**: an iPhone-home-screen web app that tracks calisthenics progress like a game: skill-tree branches (Push, Pull, Legs, Core), one node per exercise variation, and the user **levels up** to the next variation when they hit a goal. Apple-like design. Local-first, no account.

## Current status

**Plan 1 (foundation and core loop) is built and deployed** at https://choralet.github.io/up/ (public repo `Choralet/up`; Pages on private repos needs a paid plan). It has: the 45-node exercise graph, the pure rules engine, the branching skill tree, Today, reps logging, hold timer, level-up suggestions, IndexedDB storage, PWA/offline.

**Next: Plan 2** (weekly schedule and per-day workout plan with the skill block first, active-skills picker max 2, "Find your level" onboarding, editing goals/days, Progress screen), then **Plan 3** (backup export/import, GitHub backup, How-to demo button, polish). Write each plan with `superpowers:writing-plans` after brainstorming any open questions.

Read these first, in order:
1. `docs/DECISIONS.md`: user's answers (source of truth; update it)
2. `docs/PLAN.md`: product plan, workout-plan structure, screens, milestones
3. `docs/superpowers/plans/2026-09-26-up-plan-1-foundation-and-core-loop.md`: what was built (file map inside)
4. `docs/SKILLS.md`, `docs/RESEARCH.md`, `docs/UI-REFERENCES.md`, `docs/DEMOS.md`
5. `docs/mockups/index.html`: design mockups (open in a browser)

Code map: `src/data` (types, nodes.json graph), `src/engine` (pure rules, layout), `src/lib` (time, format), `src/store` (storage, context), `src/ui` (screens). Commands: `npm test`, `npm run build`, `npm run dev`. Deploys on push to `main` via GitHub Actions.

## Reminders

- The user will **not** pay for the Apple Developer Program, so the app is a **web app (PWA)** on GitHub Pages. No Xcode, no Swift.
- Web limits: no Apple Health, no widgets, no real haptics. Don't promise them.
- GitHub Pages can't store user data. Data is in IndexedDB, with export/import and an optional GitHub-repo backup (PLAN.md 9b).
- How-to demo button: only if a legit demo exists (DEMOS.md). No custom-drawn stick figures. Don't copy © Gym visual media into the repo without a license.

## Working agreements

- The user is a non-developer-style product owner: explain choices briefly, in plain language, and recommend one option rather than listing many.
- Ask before big decisions (stack, scope, naming). Record each answer in `docs/DECISIONS.md`.
- Follow the milestone order in `docs/PLAN.md`. Don't jump ahead.
- Keep `docs/PLAN.md` easy to read (tables, short sections). Update it when scope changes.

## Intended tech (confirm in DECISIONS.md before using)

React + TypeScript + Vite PWA, IndexedDB, bundled JSON for the exercise graph, Vitest, GitHub Pages via GitHub Actions. No backend.

## Conventions (once code exists)

- Exercises are a **graph** (nodes with `requires`), stored in a bundled JSON file, not hard-coded in views. The skill tree UI is a real branching tree.
- Level-up logic is pure and unit-tested, separate from UI.
- Apple-like CSS: system font stack, rounded cards, sheets, safe-area insets. Support dark mode, large text, screen readers, reduced motion. Test in a real browser at phone size.
- Don't recreate Apple's official Activity rings; build our own ring style.
- Update the "Current status" section above whenever a milestone completes.
