# Game Quest Redesign: Design Spec

Date: 2026-10-01 · Status: approved in chat, awaiting written-spec review · Branch: `redesign-game-quest`

## Why

The user wants **more energy and game feel** ("redesign my app following the ui-ux-pro-max skill"). The app works, but its quiet Apple-like look reads as too calm. They picked direction **C, Game Quest** (Duolingo-like) from three mockups, then approved the four-screen mockup and the design below.

This replaces three earlier decisions: Apple-like look with the system font, the "quiet" game feel, and "no confetti" (now "bigger but short").

Approved mockups (fragments from the brainstorm companion, open in a browser): `docs/mockups/game-quest.html` (Log a set, Tree, Level up, Today light) and `docs/mockups/game-quest-directions.html` (the three directions).

## Success criteria

- Every screen, sheet and overlay uses the Game Quest look in dark and light mode. No leftover Apple-style screen.
- Each branch shows a level badge and bar built only from existing data.
- Level-up, Finish Workout and achievements feel rewarding and finish in about 1.5 s. With Reduce Motion everything is static and nothing is lost.
- The ui-ux-pro-max rules hold: text contrast 4.5:1 (3:1 for large bold text), touch targets of at least 44×44 px, SVG icons and no emoji as icons, visible focus, reduced motion, body text 16 px.
- All existing tests pass. Behaviour, data and backups do not change.

## Out of scope

- New features, a new scoring/XP points system, sounds, confetti, haptics (not available to iPhone web apps).
- Changes to the exercise graph, workout logic, storage or backup.
- Tailwind, shadcn or any UI library.
- A switch back to the old look.

## Approach

Restyle in place: keep React + plain CSS. Rebuild `src/styles.css` around design tokens, add a few shared components, and change screens one phase at a time. The two alternatives were rejected: a Tailwind + shadcn rewrite (rewrites all markup, new dependencies, no visible gain) and a theme switch (two styles to maintain).

## 1. Tokens

Three layers, following the ui-ux-pro-max design-system skill: **primitive** (raw values) → **semantic** (meaning, per mode) → **component** (used by one component). Components read only semantic or component tokens, never raw hex. The current file defines colours directly on `:root`; the new one keeps that place and the `prefers-color-scheme: dark` block.

### Colour

Branch and skill colours have three roles: `fill` (bright surface), `edge` (darker shade under a pressable surface) and `text` (the colour when used as text on the page background, darkened in light mode to reach 4.5:1).

| Role | Push | Pull | Legs | Core | Skill |
|---|---|---|---|---|---|
| fill (both modes) | `#ff9600` | `#1cb0f6` | `#58cc02` | `#ce82ff` | `#ff4b8b` |
| edge | `#cc7800` | `#1899d6` | `#46a302` | `#a568cc` | `#d63a70` |
| text, dark mode | fill | fill | fill | fill | fill |
| text, light mode | darker shade chosen to pass 4.5:1 on white (checked by the contrast test) | | | | |

Neutrals:

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#131f24` | `#ffffff` |
| `--ink` (main text) | `#f1f7fb` | `#3c3c3c` |
| `--ink2` (secondary text) | `#8fa6b2` | `#6f6f6f` |
| `--line` (borders, card edge) | `#37464f` | `#e5e5e5` |
| `--fill` (tracks, chips) | `#202f36` | `#f2f2f2` |
| `--on-color` (text on any bright fill) | `#2b1a00` | `#2b1a00` |

Success (goal reached, ticks) uses Legs green. Destructive actions (Remove Set, Disconnect, Delete) use a red with its own edge, also contrast-checked. Exact light-mode text shades and secondary-text values are set during the build so the contrast test passes. Starting values that fail are adjusted, never exempted.

Text on a bright fill is always `--on-color` (dark), never white. White on these brights fails 4.5:1.

### Type

- Font: **Nunito** (SIL Open Font License), weights 600, 700, 800, 900. The variable `woff2` is **bundled in the app** (no Google Fonts request) and precached by the service worker, so it works offline. Fallback stack: `Nunito, ui-rounded, system-ui, sans-serif`.
- Scale (px): title 30/900, screen heading 26/900, section label 12/900 uppercase with letter-spacing, body 16/700, secondary 13/700, big number 96/900 with `tabular-nums`.
- Button labels and section labels are uppercase **through CSS only** (`text-transform`). The DOM text stays as today ("Log Set", "Level Up") so tests and VoiceOver are unchanged.
- Sizes work with larger text (rem-based where the current CSS allows, and checked at larger text in the visual check).

### Shape, depth, spacing

- Radius: 12 (small chips, segmented tabs), 16 (buttons, tiles), 18 (cards), 28 (sheets), 999 (pills).
- Depth is a solid **bottom edge**, not a blurred shadow: `box-shadow: 0 4px 0 var(--edge)`. Cards have a 2px `--line` border and a `--line` edge.
- Pressed state: `transform: translateY(4px); box-shadow: none`, 80 ms. This is the touch feedback (skill rule: no 0 ms state changes).
- Spacing scale: 4, 8, 12, 16, 24, 32.

## 2. Shared building blocks

| Block | What it is | Notes |
|---|---|---|
| Button (`.btn`) | Chunky primary button, branch fill, `--on-color` text, bottom edge | Replaces `.cta`. Variants: ghost (outline, `--line` edge), destructive |
| Quest card (`.quest`) | One exercise row: round icon tile, name, status line, goal on the right | Replaces `.row` inside workout lists. Skill rows have a pink border and edge |
| Level badge | Rounded square in branch fill, level number, small "LVL" | Sizes: small (Today header, Tree), large (level-up card) |
| XP bar | Rounded track in `--fill`, branch-coloured fill with a slight inner edge | Also used for set bars on Log a Set |
| Icon | One `Icon` component rendering inline SVG line icons (2.5 px stroke, round caps) | Replaces every emoji/character icon: ⚙ ✓ ★ › → and the lock. Decorative icons get `aria-hidden`; icon-only buttons keep their `aria-label` |
| Tab bar | Four tabs with line icons (Today house, Tree branching, Skills star, Progress bars), active tab in branch colour | 2px top border, keeps safe-area padding |
| Segmented tabs | Push / Pull / Legs / Core as outlined chips, active one tinted in its branch colour | Used on Tree and Skills |
| Sheet | Bottom sheet with 28 px radius, chunky buttons | Existing rules stay: render outside fixed containers, centred header |
| Chip | Rounded set value chips, pills for Goal / How-to / History | Goal pill must not look like a button (audit item) |
| Tree node | Circle with a bottom edge: done (fill + tick), training (larger, glow ring, "TRAINING" label), ready (outline + plus), locked (grey + lock) | Labels keep the background cut-out so lines never cross text |

The 61 inline `style={{…}}` uses move into classes, except values that are truly dynamic (for example `--accent` per branch).

## 3. Level and XP

- **Level of a branch** = `branchProgress(...).done` (finished exercises in that branch, roadmap-only moves excluded). **Bar** = `done / total`.
- New pure helper in `src/engine/stats.ts`, unit-tested: returns `{ level, done, total, ratio }` for a branch. No new `Progress` fields, so saves, `sanitizeProgress` and `progressHash` are untouched.
- **Today header:** level badge + bar + "Push · 7 of 12" for that day's branch; Legs + Core day shows two small badges; a rest day shows the weekly streak (flame + "3 wk") instead. The streak also sits at the right of the header on training days.
- **Tree:** badge + bar above the tree for the selected branch.
- **Progress:** the four branch rings become level cards (badge, bar, "7 of 12"). Our own style, not Apple's rings.
- **Level-up card:** shows the new level (old + 1) for the branch.

## 4. Reward moments (bigger, but short)

All motion stays inside `@media (prefers-reduced-motion: no-preference)` and follows the existing rules (entrance animations use `animation-fill-mode: backwards`; only the burst may use `both`).

- **Level-up:** the existing `LevelUpSheet` becomes a full-height card over a radial glow in the branch colour. The badge drops in with a spring bounce (about 500 ms), 6 to 8 small shapes burst out in branch and yellow colours (about 700 ms), the bar fills from the old ratio to the new one (about 600 ms). Total about 1.5 s, then still. The choices (next exercise, Level Up, Not Yet) work during the animation.
- **Finish Workout:** sets, exercises and minutes count up (about 800 ms).
- **Achievement card:** the badge pops in (scale 0.6 → 1 with overshoot).
- **Log a set:** the rep number bounces on change (existing roll animation restyled), a set bar fills when a set is logged.
- **Reduce Motion:** final states shown at once, nothing hidden behind an animation. Screen-reader text is unchanged.

## 5. Screens and phases

Each phase ends with tests green and the visual check (section 6). Order:

1. **Foundation:** tokens, font, Icon component, button, quest card, level badge, XP bar, tab bar, sheet, chips. The old classes map to the new look where possible, so screens not yet redone still look acceptable on the branch.
2. **Today, Log a Set, hold timer, set editing, History sheet.** Today header with level and streak.
3. **Tree:** 3D nodes, segmented branch tabs, level bar, track chips, zoom control. Keep the geometry rules (`ROW_H`, `LABEL_Y`, `edgePath`) and recheck label spacing with the larger nodes.
4. **Skills and Roadmap:** Now and Roadmap views, Replace sheet, Roadmap sheet. Skill colour is pink throughout (audit: mixed accents on skill screens).
5. **Progress, Settings, Find your level, all remaining sheets** (node, goal editor, confirm, backup, finish, achievement). Audit polish items fold in here: Settings footnote spacing, rest-day pills, light-mode icon contrast, streak wording, node sheet covering the tapped node.
6. **Reward moments** (section 4) and the app icon / splash colours updated to the new palette.

## 6. Testing and checks

- Existing Vitest suite stays green. Where a test reads a class or character that changes (for example the ✓ tick), the test changes to read the accessible name, not the glyph.
- New unit tests: branch level helper; a **contrast test** that parses the tokens and asserts every text/background pair used (ink, ink2, branch text on `--bg`, `--on-color` on each fill, both modes) meets 4.5:1 (3:1 for large bold text only where marked).
- Visual check after every phase, as in `AGENTS.md`: build + preview, headless Chrome at 390×844 @2x, dark and light, motion on, larger text, seeded data, screenshots of changed screens and their sheets, plus the automatic row-height, overflow and viewport check.
- Before finishing: the ui-ux-pro-max pre-delivery checklist (`references/pro-rules.md`).

## 7. Shipping and docs

- All work on `redesign-game-quest`; nothing reaches `main` (and so GitHub Pages) until every phase is done and reviewed, so the phone never shows a half-old, half-new app.
- Update `docs/DECISIONS.md` (this decision), `docs/UI-REFERENCES.md` (new principles: Game Quest look, Nunito, bigger-but-short celebrations), the "Current status" in `AGENTS.md`, and `docs/IPHONE-TEST.md` (check the new font loads offline, reward moments, light mode).

## Risks

- **Bundled font and offline:** must be in the service worker precache; check with the network off.
- **Bigger tree nodes** may crowd rows; the layout constants are tuned in phase 3 and checked visually.
- **Light-mode branch text** needs darker shades than the fills; the contrast test enforces it.
- **Uppercase via CSS** can look shouty in long labels; only buttons and section labels use it.
