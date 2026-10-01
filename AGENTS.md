# Calisthenic Quest: Agent Guide

Instructions for any AI coding agent working in this repo. `CLAUDE.md` imports this file.

## Project

**Up**: an iPhone-home-screen web app that tracks calisthenics progress like a game: skill-tree branches (Push, Pull, Legs, Core), one node per exercise variation, and the user **levels up** to the next variation when they hit a goal. Game Quest look (rounded, chunky, Duolingo-like). Local-first, no account.

## Current status

**Game Quest redesign** (plan `docs/superpowers/plans/2026-10-01-game-quest-redesign.md`): rounded Nunito, chunky pressable cards, branch level badges and bars from existing progress, short reward moments. Merged into `main` locally on 2026-10-01; not pushed (pushing deploys to the user's phone), so ask before pushing.

**Plans 1 to 7 are built and deployed** at https://choralet.github.io/up/ (public repo `Choralet/up`). **Plan 7 (v1.1):** goal ramp (`goalStage`, `effectiveGoal`), exercise History sheet, achievements (`src/engine/achievements.ts`, `seenAchievements`), calendar reminders (`src/lib/ics.ts`), tree zoom + track chips + unlock glow, app-wide motion (all under `prefers-reduced-motion: no-preference`), iPhone checklist `docs/IPHONE-TEST.md`. It has: the exercise graph and skill tree, per-day workouts (default Mon/Wed/Fri, editable), skills with the hold timer, Find your level, goal editing, Progress tab, fix/remove a set, backup file export/import, automatic backup to the private repo `Choralet/up-data` (setup in `docs/BACKUP.md`; the user makes the token, never the agent), How-to demos for 19 exercises (hotlinked GIFs, `src/data/demos.ts`), midnight handling, and accessibility polish. **Plan 6 (docs/WORKOUT-VOLUME.md):** movement tracks — `Progress.focus` is keyed by track id (`src/data/tracks.ts`, `track` on strength nodes; old branch-keyed saves migrate in `sanitizeProgress`); Workout Length setting. **Plan 5 (UX, docs/UX-PLAN.md):** Today counts logged sets and adds Volume + Core finisher and a Finish Workout summary; hold timer countdown, goal tone (Settings switch), full-screen stop; Skills = Now | Roadmap (library removed); one vocabulary Locked/Ready/Training/Done; Progress week strip and sessions; Find your level with Back/Close and day picker; tab icons, contrast, Title Case. **Plan 4:** Roadmap in the Skills tab: STRIQfit's 50-skill Year 1-3 order with prerequisites, trainable steps, "I can already do this" and video-chapter links (`docs/ROADMAP.md`). Roadmap-only moves (`roadmapOnly`) never appear in the tree or branch rings.

**Next:** whatever the user reports from real iPhone use (they have `docs/IPHONE-TEST.md` to run). A visual audit's 11 layout bugs are fixed; its polish suggestions wait for the user's go-ahead (end of `docs/DECISIONS.md`, "Visual audit fixes"). Brainstorm before any new feature; fix bugs test-first.

Read these first, in order:
1. `docs/DECISIONS.md`: user's answers (source of truth; update it)
2. `docs/PLAN.md`: product plan and milestones
3. `docs/superpowers/plans/` (Plans 1-7): what was built, with file maps
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
- Game Quest CSS: tokens from `src/tokens.css`, rounded cards and sheets, safe-area insets. Support dark mode, large text, screen readers, reduced motion. Test in a real browser at phone size.
- Don't recreate Apple's official Activity rings; build our own ring style.
- Update the "Current status" section above whenever a milestone completes.

## Gotchas (learned the hard way; keep them)

- **Colours:** tokens live in `src/tokens.css` (primitive `--p-*` → semantic). Text on a bright fill is `var(--on-color)`, never white; colour as text uses `--<branch>-text`. `src/tokens.test.ts` checks every pair at 4.5:1: change the colour, never the threshold.
- **Visual check:** `npm run shots -- <dir> [scenario]` (after `npm run build` and `npx vite preview --port 4173 --strictPort`); `LARGE=1`, `REDUCE=1`, `WIDTH`/`HEIGHT` for large text, reduced motion and other screen sizes.
- **Motion:** all animation lives inside `@media (prefers-reduced-motion: no-preference)` in `src/styles.css`. Entrance animations use `animation-fill-mode: backwards`, never `both`/`forwards`, on anything that contains sheets or fixed elements (`.log`, `.screen`, `.tree-screen`, rows). A transform kept after the animation makes the element the containing block for `position: fixed` children, so sheets open off-screen and the hold cover shrinks. Only the level-up card's burst shapes (`.burst i`) use `both`: they hold no sheet and end invisible on purpose.
- **Sheets** render outside fixed containers (see the comment in `TreeScreen.tsx`), or the tab bar paints over them.
- **Two goal sources:** `byId`/`nodes` from `useProgress()` carry today's ramp-stage goal (60/80/100%), while `finalById` carries the full goal with the user's overrides. Use `finalById` for the level-up check, the level-up sheet text, and the goal editor. A stage raised today (`stageRaisedOn`) takes effect the next day, and `settleStage` in the provider undoes it if a set is removed.
- **New `Progress` fields** must be optional in old saves: add them to `initialProgress` and `sanitizeProgress`, and keep `progressHash` (backup) blind to display-only state (`day`, `seenAchievements`).
- **`goalText` uses no-break spaces** (`3 × 10`) so a goal never splits across lines. Testing Library normalizes whitespace, but a raw `toBe('3 × 10')` fails.
- **VoiceOver:** keep an `aria-live` element stable and put a changing `key` (used for animation) on an inner span. Re-keying the live region itself silences it.
- **Tree geometry** (`src/engine/layout.ts` `ROW_H`, `TreeView.tsx` `LABEL_Y`, `edgePath`): labels hang below nodes, so rows need room for two-line labels, and slanted edges stop under the upper label.

## Visual check before shipping UI

jsdom tests can't see layout. The user notices things like a pill stretched next to a taller button, controls of different heights in one row, text wrapping mid-goal, or a floating control covering labels. After any UI change:

1. `scripts/shots.mjs` does steps 1–3 (see Gotchas). By hand: `npm run build` and `npx vite preview`, then drive headless Chrome over CDP at 390×844 @2x (`Emulation.setDeviceMetricsOverride`), in dark **and** light mode (`Emulation.setEmulatedMedia`), with motion on (most users have it on) and ideally larger text.
2. Seed data by writing IndexedDB `keyval-store` → `keyval` → key `up.progress` (shape: `Progress` in `src/engine/progress.ts`), then reload. Fix the date with an init script so the day type is known (the tests use a Monday).
3. Screenshot the changed screens and their sheets, scrolled to the top, and look at them. A quick automatic check is worth running too: siblings in the same row whose heights differ by more than 2px, elements overflowing their box, and anything past the viewport.
4. For a broad sweep, a general-purpose agent with these instructions works well. Have it report only; you verify and fix.
