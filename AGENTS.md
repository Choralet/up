# Calisthenic Quest: Agent Guide

Instructions for any AI coding agent working in this repo. `CLAUDE.md` imports this file.

## Project

**Up**: an iPhone-home-screen web app that tracks calisthenics progress like a game: skill-tree branches (Push, Pull, Legs, Core), one node per exercise variation, and the user **levels up** to the next variation when they hit a goal. Apple-like design. Local-first, no account.

## Current status

**Plans 1 and 2 are built and deployed** at https://choralet.github.io/up/ (public repo `Choralet/up`). It has: the 45-node exercise graph, pure rules engine, branching skill tree, per-day workouts (default Mon Push / Wed Pull / Fri Legs+Core, editable in Settings) with warm-up, skill block and strength, up to 2 active skills with the hold timer for hold steps, Find your level onboarding, goal editing, Progress tab (rings, weekly streak, bests), fix/remove a logged set, IndexedDB storage with save retry, PWA/offline. Saves from Plan 1 migrate automatically (`sanitizeProgress`).

**Next: Plan 3** (backup export/import, GitHub backup, How-to demo button, accessibility polish, stale-day/midnight handling, and the deferred minors listed in `docs/DECISIONS.md`). Brainstorm open questions first, then write the plan with `superpowers:writing-plans`.

Read these first, in order:
1. `docs/DECISIONS.md`: user's answers (source of truth; update it)
2. `docs/PLAN.md`: product plan and milestones
3. `docs/superpowers/plans/2026-09-26-up-plan-1-foundation-and-core-loop.md` and `...-plan-2-workouts-skills-placement.md`: what was built (file maps inside)
4. `docs/SKILLS.md`, `docs/RESEARCH.md`, `docs/UI-REFERENCES.md`, `docs/DEMOS.md`
5. `docs/mockups/index.html`: design mockups

Code map: `src/data` (types, nodes.json graph, skills.json, schedule.ts), `src/engine` (progress, workout, skills, stats, layout, graph: all pure), `src/lib` (time, format), `src/store` (storage, context), `src/ui` (screens). Commands: `npm test`, `npm run build`, `npm run dev`. Deploys on push to `main` via GitHub Actions. Tests pin the clock to a Monday (see `src/App.test.tsx`).

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
