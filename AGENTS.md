# Calisthenic Quest: Agent Guide

Instructions for any AI coding agent working in this repo. `CLAUDE.md` imports this file.

## Project

**Up**: an iPhone-home-screen web app that tracks calisthenics progress like a game: skill-tree branches (Push, Pull, Legs, Core), one node per exercise variation, and the user **levels up** to the next variation when they hit a goal. Apple-like design. Local-first, no account.

## Current status

**Planning + design phase (milestone 1: mockups and name; tree mockups revised). Do NOT write app code until the user approves the plan, mockups and name.**
Read these first, in order:
1. `docs/DECISIONS.md`: user's answers (source of truth; update it)
2. `docs/PLAN.md`: product plan, workout-plan structure, screens, milestones
3. `docs/SKILLS.md`: skill progression data (draft; numbers are editable defaults)
4. `docs/RESEARCH.md`: strength-chain research and sources
   `docs/DEMOS.md`: exercise demo media sources and licensing
5. `docs/UI-REFERENCES.md`: design references and principles
6. `docs/mockups/index.html`: design mockups (open in a browser)

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
