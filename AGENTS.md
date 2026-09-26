# Calisthenic Quest: Agent Guide

Instructions for any AI coding agent working in this repo. `CLAUDE.md` imports this file.

## Project

**Up**: an iPhone-home-screen web app that tracks calisthenics progress like a game: skill-tree branches (Push, Pull, Legs, Core), one node per exercise variation, and the user **levels up** to the next variation when they hit a goal. Apple-like design. Local-first, no account.

## Current status

**Plans 1, 2 and 3 are built and deployed** at https://choralet.github.io/up/ (public repo `Choralet/up`). It has: the exercise graph and skill tree, per-day workouts (default Mon/Wed/Fri, editable), skills with the hold timer, Find your level, goal editing, Progress tab, fix/remove a set, backup file export/import, automatic backup to the private repo `Choralet/up-data` (setup in `docs/BACKUP.md`; the user makes the token, never the agent), How-to demos for 19 exercises (hotlinked GIFs, `src/data/demos.ts`), midnight handling, and accessibility polish.

**Next:** whatever the user reports from real iPhone use. Brainstorm before any new feature; fix bugs test-first.

Read these first, in order:
1. `docs/DECISIONS.md`: user's answers (source of truth; update it)
2. `docs/PLAN.md`: product plan and milestones
3. `docs/superpowers/plans/` (Plans 1-3): what was built, with file maps
4. `docs/SKILLS.md`, `docs/RESEARCH.md`, `docs/UI-REFERENCES.md`, `docs/DEMOS.md`
5. `docs/mockups/index.html`: design mockups

Code map: `src/data` (types, nodes.json graph, skills.json, schedule.ts), `src/engine` (progress, workout, skills, stats, layout, graph: all pure), `src/lib` (time, format), `src/store` (storage, context, services, github), `src/ui` (screens). Commands: `npm test`, `npm run build`, `npm run dev`. Deploys on push to `main` via GitHub Actions. Tests pin the clock to a Monday (see `src/App.test.tsx`).

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
