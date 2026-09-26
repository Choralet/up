# Up: Plan 1 of 3: Foundation and Core Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working "Up" web app on GitHub Pages where you can see a branching skill tree per muscle group, log reps or timed holds for your focus exercise, and get a level-up suggestion that unlocks the next step.

**Architecture:** React + TypeScript single-page PWA. The exercise catalogue is a bundled JSON **graph** (`nodes.json`). All rules (unlock, goal met, level-up, sanitising stored data, tree layout) are **pure functions** in `src/engine/`, unit-tested with Vitest. React screens sit on top through one context (`ProgressProvider`) that persists a single `Progress` object to IndexedDB (`idb-keyval`).

**Tech Stack:** Vite, React 19, TypeScript, Vitest + React Testing Library + jsdom, `idb-keyval`, `vite-plugin-pwa`, GitHub Actions + GitHub Pages.

**Spec:** `docs/PLAN.md` (design), `docs/SKILLS.md` (skill data), `docs/DECISIONS.md` (user decisions). Mockups: `docs/mockups/index.html` (screens 1, 2, 3, 4, 5, 6 are built here).

**Scope of this plan (Plan 1):** milestones 2, 3 and 4 of `docs/PLAN.md` section 11. **Not in this plan** (later plans): weekly schedule and per-day workout plan, active-skills picker, "Find your level" onboarding, editing goals, Progress screen, backup export/import and GitHub backup, How-to demo button, accessibility polish pass. Plan 1's Today screen simply lists the focus exercise of each of the four branches.

## Global Constraints

- App name is **Up** (`<title>`, manifest name, home-screen name).
- Vite `base` is `/up/`; repo is `Choralet/up`; live URL is `https://choralet.github.io/up/`.
- **No backend, no account.** Progress lives only in IndexedDB under the key `up.progress`.
- Goal rule (user decision): a node's goal is met when **at least `goal.sets` logged sets today have `value >= goal.target`**. One qualifying session is enough.
- Level-up is a **suggestion** the user confirms ("Set Focus") or declines ("Not yet"). Never automatic.
- Goal text format: reps `3 × 10`; holds `3 × 30 s` (uses the `×` character and a space before `s`).
- **No rest timer.** No sounds, no confetti. Quiet UI.
- One accent colour per branch (CSS vars `--push`, `--pull`, `--legs`, `--core`); skills use `--skill`. Dark and light mode via `prefers-color-scheme`.
- Never copy Gym visual media into the repo (demos are Plan 3).
- Every commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, added with a second `-m`.
- Node 26 and npm 11 are installed. Work in `/Users/arch/Desktop/Calisthenic`.

## Review Focus

Failure modes the spec implies but a happy-path build would miss (each is pinned by a test in the owning task):

1. **Finishing the top of a branch** (no more nodes to unlock): level-up must not crash, focus becomes `null`, Today shows "Branch complete". *(Task 3 engine test, Task 6 UI test)*
2. **Corrupted or outdated stored data** (garbage, unknown node ids, focus on a locked node): the app must start with sane progress, not a white screen. *(Task 3, Task 5)*
3. **Bad set values** (0, negative, NaN, 9.7): ignored or floored; never stored as-is. *(Task 3)*
4. **Day rollover**: yesterday's sets must not count toward today's goal. *(Task 3)*
5. **Hold goals**: a short hold must not count; three holds at or above the target must. *(Task 3)*
6. **Old node not focus anymore**: logging after level-up must not re-open the level-up sheet. *(Task 8)*
7. **Offline first launch from the home screen**: the service worker must precache the app. *(Task 9 manual check)*

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Tooling, PWA manifest, test config |
| `.github/workflows/deploy.yml` | Test, build, deploy to Pages on push to `main` |
| `public/icon.svg`, `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons |
| `src/main.tsx` | Mounts `<App/>` |
| `src/data/types.ts` | `Branch`, `Goal`, `ExerciseNode` types |
| `src/data/nodes.json` | The exercise graph (4 branches, 45 nodes) |
| `src/data/nodes.ts` | Typed export `NODES` |
| `src/data/nodes.test.ts` | Validates graph integrity |
| `src/engine/graph.ts` | `BRANCHES`, `indexNodes`, `rootOf` |
| `src/engine/progress.ts` | Pure rules: state, goal, log, suggest, level-up, sanitise |
| `src/engine/layout.ts` | `computeDepths`, `layoutBranch` for the tree |
| `src/lib/time.ts` | `localDate`, `formatClock` |
| `src/lib/format.ts` | `goalText` |
| `src/store/storage.ts` | `ProgressStorage`, `idbStorage`, `memoryStorage` |
| `src/store/ProgressContext.tsx` | `ProgressProvider`, `useProgress` |
| `src/ui/branches.ts` | Branch labels and colours |
| `src/ui/TabBar.tsx`, `TodayScreen.tsx`, `TreeScreen.tsx`, `TreeView.tsx`, `NodeSheet.tsx`, `LogScreen.tsx`, `HoldTimer.tsx`, `LevelUpSheet.tsx` | Screens and components |
| `src/App.tsx`, `src/App.test.tsx` | Shell and integration tests |
| `src/styles.css` | All styling |

---

### Task 1: Project setup, PWA shell, first deploy

**Files:**
- Create: `.gitignore`, `package.json` (via npm), `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`, `src/smoke.test.tsx`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run build`, `npm run dev`; a deployed placeholder page at `https://choralet.github.io/up/`.

- [ ] **Step 1: Initialise git and ignore file**

```bash
cd /Users/arch/Desktop/Calisthenic
git init -b main
cat > .gitignore <<'EOF'
node_modules
dist
coverage
.DS_Store
*.local
EOF
```

- [ ] **Step 2: Install dependencies and set scripts**

```bash
npm init -y
npm pkg set name=up private=true type=module version=0.1.0
npm pkg set scripts.dev="vite" scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch="vitest"
npm install react react-dom idb-keyval
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom vite-plugin-pwa
```

Expected: install completes with no errors.

- [ ] **Step 3: Write config files**

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/up/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Up',
        short_name: 'Up',
        description: 'Calisthenics progression, like a game',
        start_url: '/up/',
        scope: '/up/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'] },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts', globals: true },
})
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "vite-plugin-pwa/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Up" />
    <meta name="theme-color" content="#000000" />
    <link rel="icon" href="%BASE_URL%icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" />
    <title>Up</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3b: Write the failing smoke test**

`src/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the app name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Up' })).toBeInTheDocument()
})
```

- [ ] **Step 4: Run it and see it fail**

Run: `npx vitest run src/smoke.test.tsx`
Expected: FAIL (cannot resolve `./App`).

- [ ] **Step 5: Minimal app**

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>Up</h1>
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Run test, expect pass**

Run: `npx vitest run src/smoke.test.tsx`
Expected: PASS.

- [ ] **Step 7: Create icons**

`public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000"/>
  <path d="M136 344 L256 208 L376 344" fill="none" stroke="#FF9F0A" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M136 252 L256 116 L376 252" fill="none" stroke="#FF9F0A" stroke-opacity=".45" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Render PNGs with headless Chrome:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SVG="file://$PWD/public/icon.svg"
for spec in "512:icon-512.png" "192:icon-192.png" "180:apple-touch-icon.png"; do
  size="${spec%%:*}"; name="${spec##*:}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=$size,$size --screenshot="public/$name" "$SVG"
done
sips -g pixelWidth -g pixelHeight public/icon-512.png public/icon-192.png public/apple-touch-icon.png
```

Expected: widths and heights print as 512, 192, 180. If a size is off (Chrome window chrome), re-run with `--window-size` adjusted or resize with `sips -z <size> <size> public/<file>`.

- [ ] **Step 8: Build check**

Run: `npm run build`
Expected: `tsc` passes, Vite builds, output mentions `sw.js` and `manifest.webmanifest`. If `tsc` reports a `Plugin` type mismatch inside `vite.config.ts` (two copies of Vite types), remove `"vite.config.ts"` from `include` in `tsconfig.json`; the config still works at runtime.

- [ ] **Step 9: GitHub Pages workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 10: Privacy check before anything goes online**

Run:

```bash
git ls-files -co --exclude-standard | xargs grep -il "@gmail.com" || echo "no email address found"
git ls-files -co --exclude-standard | xargs grep -lE "ghp_|github_pat_|AKIA[0-9A-Z]{8}" || echo "no secrets found"
```

Expected: both print the `no ... found` line and nothing else. (The docs mention the word "token" in prose about the future GitHub backup; that is fine, only real key patterns matter.)

- [ ] **Step 11: First commit**

```bash
git add -A
git commit -m "chore: scaffold Up (Vite, React, TS, PWA, tests, Pages workflow)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 12: Create the repo (private first) and enable Pages**

```bash
gh repo create Choralet/up --private --source=. --remote=origin
gh api -X POST repos/Choralet/up/pages -f build_type=workflow
```

Expected: either a JSON response containing `"html_url": "https://choralet.github.io/up/"`, **or** an error like `Your current plan does not support GitHub Pages for this repository` (HTTP 422/403).

If it errored, the user pre-approved the fallback to public (docs/DECISIONS.md, round 4). Run:

```bash
gh repo edit Choralet/up --visibility public --accept-visibility-change-consequences
gh api -X POST repos/Choralet/up/pages -f build_type=workflow
```

Expected: the JSON response above. Tell the user which case happened.

- [ ] **Step 13: Push and watch the deploy**

```bash
git push -u origin main
gh run watch --exit-status
curl -sI https://choralet.github.io/up/ | head -1
```

Expected: run succeeds; curl prints `HTTP/2 200`. (If the site returns 404, wait 30 s and retry once.)

- [ ] **Step 14: Tell the user how to install**

Give the user: open `https://choralet.github.io/up/` in Safari, Share, Add to Home Screen. (Milestone 2 done: blank "Up" on the home screen.)

---

### Task 2: Exercise graph data and validation

**Files:**
- Create: `src/data/types.ts`, `src/data/nodes.json`, `src/data/nodes.ts`, `src/engine/graph.ts`, `src/engine/layout.ts` (only `computeDepths` in this task), `src/data/nodes.test.ts`

**Interfaces:**
- Produces:
  - `type Branch = 'push' | 'pull' | 'legs' | 'core'`
  - `interface Goal { type: 'reps' | 'hold'; sets: number; target: number }`
  - `interface ExerciseNode { id: string; name: string; branch: Branch; kind: 'strength' | 'skill'; requires: string[]; col: number; goal: Goal; cue: string }`
  - `NODES: ExerciseNode[]`
  - `BRANCHES: Branch[]`, `indexNodes(nodes): Map<string, ExerciseNode>`, `rootOf(nodes, branch): ExerciseNode | undefined`
  - `computeDepths(nodes): Map<string, number>` (throws on unknown id or cycle)

- [ ] **Step 1: Types**

`src/data/types.ts`:

```ts
export type Branch = 'push' | 'pull' | 'legs' | 'core'
export type GoalType = 'reps' | 'hold'

export interface Goal {
  type: GoalType
  sets: number
  /** reps per set, or seconds per hold */
  target: number
}

export interface ExerciseNode {
  id: string
  name: string
  branch: Branch
  kind: 'strength' | 'skill'
  /** ids of nodes that must be completed first (all of them) */
  requires: string[]
  /** column 0..3 in the tree drawing */
  col: number
  goal: Goal
  cue: string
}
```

- [ ] **Step 2: Write the failing graph-integrity test**

`src/data/nodes.test.ts`:

```ts
import { NODES } from './nodes'
import { BRANCHES, indexNodes } from '../engine/graph'
import { computeDepths } from '../engine/layout'

describe('exercise graph', () => {
  it('has unique ids', () => {
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length)
  })

  it('every requirement exists and lives in the same branch', () => {
    const byId = indexNodes(NODES)
    for (const n of NODES) {
      for (const r of n.requires) {
        const parent = byId.get(r)
        expect(parent, `${n.id} requires missing ${r}`).toBeDefined()
        expect(parent!.branch, `${n.id} requires other-branch ${r}`).toBe(n.branch)
      }
    }
  })

  it('has no cycles (computeDepths would throw)', () => {
    expect(() => computeDepths(NODES)).not.toThrow()
  })

  it('has exactly one root per branch', () => {
    for (const b of BRANCHES) {
      const roots = NODES.filter((n) => n.branch === b && n.requires.length === 0)
      expect(roots, `roots in ${b}`).toHaveLength(1)
    }
  })

  it('never draws two nodes in the same cell of a tree', () => {
    const depths = computeDepths(NODES)
    const seen = new Set<string>()
    for (const n of NODES) {
      const cell = `${n.branch}:${n.col}:${depths.get(n.id)}`
      expect(seen.has(cell), `overlap at ${cell} (${n.id})`).toBe(false)
      seen.add(cell)
    }
  })

  it('has sane goals and columns', () => {
    for (const n of NODES) {
      expect(n.goal.sets).toBeGreaterThanOrEqual(1)
      expect(n.goal.target).toBeGreaterThanOrEqual(1)
      expect(n.col).toBeGreaterThanOrEqual(0)
      expect(n.col).toBeLessThanOrEqual(3)
      expect(n.cue.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/data/nodes.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 4: Write the graph modules**

`src/engine/graph.ts`:

```ts
import type { Branch, ExerciseNode } from '../data/types'

export const BRANCHES: Branch[] = ['push', 'pull', 'legs', 'core']

export function indexNodes(nodes: ExerciseNode[]): Map<string, ExerciseNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

/** The beginner node of a branch: the one with no requirements. */
export function rootOf(nodes: ExerciseNode[], branch: Branch): ExerciseNode | undefined {
  return nodes.find((n) => n.branch === branch && n.requires.length === 0)
}
```

`src/engine/layout.ts` (first version; `layoutBranch` arrives in Task 4):

```ts
import type { ExerciseNode } from '../data/types'
import { indexNodes } from './graph'

/** Depth = longest chain of requirements below a node (roots are 0). Throws on unknown ids or cycles. */
export function computeDepths(nodes: ExerciseNode[]): Map<string, number> {
  const byId = indexNodes(nodes)
  const memo = new Map<string, number>()
  const visit = (id: string, path: string[]): number => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached
    if (path.includes(id)) throw new Error(`Cycle in exercise graph at ${id}`)
    const node = byId.get(id)
    if (!node) throw new Error(`Unknown node ${id}`)
    const depth = node.requires.length === 0 ? 0 : 1 + Math.max(...node.requires.map((r) => visit(r, [...path, id])))
    memo.set(id, depth)
    return depth
  }
  for (const n of nodes) visit(n.id, [])
  return memo
}
```

`src/data/nodes.ts`:

```ts
import raw from './nodes.json'
import type { ExerciseNode } from './types'

export const NODES = raw as unknown as ExerciseNode[]
```

- [ ] **Step 5: Write `src/data/nodes.json`**

Order matters: within a branch, earlier entries win ties when the app picks a suggestion.

```json
[
  { "id": "push-wall", "name": "Wall push-up", "branch": "push", "kind": "strength", "requires": [], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Stand an arm's length from a wall, hands at chest height. Keep your body in one straight line." },
  { "id": "push-incline", "name": "Incline push-up", "branch": "push", "kind": "strength", "requires": ["push-wall"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Hands on a bench or table. Body straight from head to heels." },
  { "id": "push-knee", "name": "Knee push-up", "branch": "push", "kind": "strength", "requires": ["push-incline"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Knees on the floor, hips in line with shoulders and knees. Chest to a fist above the floor." },
  { "id": "push-standard", "name": "Push-up", "branch": "push", "kind": "strength", "requires": ["push-knee"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Hands under shoulders, body straight, elbows about 45 degrees from your body." },
  { "id": "push-diamond", "name": "Diamond push-up", "branch": "push", "kind": "strength", "requires": ["push-standard"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Hands together under your chest, forming a diamond. Keep elbows tucked." },
  { "id": "push-decline", "name": "Decline push-up", "branch": "push", "kind": "strength", "requires": ["push-standard"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Feet on a bench, hands shoulder-width. Lower until your chest is near the floor." },
  { "id": "push-pike", "name": "Pike push-up", "branch": "push", "kind": "strength", "requires": ["push-standard"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Hips high in an upside-down V. Lower the top of your head between your hands." },
  { "id": "push-archer", "name": "Archer push-up", "branch": "push", "kind": "strength", "requires": ["push-diamond"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 6 }, "cue": "Wide hands. Lower toward one hand while the other arm stays straight. Count reps per side." },
  { "id": "push-pseudo", "name": "Pseudo planche push-up", "branch": "push", "kind": "strength", "requires": ["push-decline"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Hands by your hips, fingers pointing back or out, lean your shoulders past your hands." },
  { "id": "push-elevated-pike", "name": "Elevated pike push-up", "branch": "push", "kind": "strength", "requires": ["push-pike"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Feet on a bench, hips stacked over shoulders. Press up through the shoulders." },
  { "id": "push-hs-chest", "name": "Chest-to-wall handstand hold", "branch": "push", "kind": "skill", "requires": ["push-pike"], "col": 3, "goal": { "type": "hold", "sets": 4, "target": 20 }, "cue": "Kick up with your belly toward the wall. Push tall through the shoulders and squeeze your legs together." },
  { "id": "push-oneam", "name": "One-arm push-up", "branch": "push", "kind": "skill", "requires": ["push-archer"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 3 }, "cue": "Feet wide, hips square, free hand behind your back. Count reps per side." },
  { "id": "push-tuck-planche", "name": "Tuck planche", "branch": "push", "kind": "skill", "requires": ["push-pseudo"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 8 }, "cue": "Knees tucked, back rounded, arms straight, lean forward until your feet lift." },
  { "id": "push-wall-hspu", "name": "Wall handstand push-up", "branch": "push", "kind": "skill", "requires": ["push-elevated-pike"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Chest to the wall in a handstand. Lower your head to a mat, press back up." },
  { "id": "push-hs-back", "name": "Back-to-wall handstand hold", "branch": "push", "kind": "skill", "requires": ["push-hs-chest"], "col": 3, "goal": { "type": "hold", "sets": 3, "target": 30 }, "cue": "Only heels touch the wall. Body long and straight, look at your hands." },
  { "id": "push-adv-tuck", "name": "Advanced tuck planche", "branch": "push", "kind": "skill", "requires": ["push-tuck-planche"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 10 }, "cue": "Hips level with shoulders, back flat, knees pulled in tight." },
  { "id": "push-hspu", "name": "Freestanding handstand push-up", "branch": "push", "kind": "skill", "requires": ["push-wall-hspu"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 3 }, "cue": "Balance a handstand, lower with control, press up without the wall." },
  { "id": "push-hs-free", "name": "Freestanding handstand hold", "branch": "push", "kind": "skill", "requires": ["push-hs-back"], "col": 3, "goal": { "type": "hold", "sets": 3, "target": 10 }, "cue": "Kick up, stack wrists, shoulders, hips and feet. Control balance with your fingertips." },

  { "id": "pull-hang", "name": "Dead hang", "branch": "pull", "kind": "strength", "requires": [], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 30 }, "cue": "Hang from a bar with straight arms and a firm grip. Keep your shoulders active, do not shrug." },
  { "id": "pull-scap", "name": "Scapular pull-up", "branch": "pull", "kind": "strength", "requires": ["pull-hang"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Arms straight. Pull your shoulder blades down and together to lift a few centimetres." },
  { "id": "pull-row", "name": "Inverted row", "branch": "pull", "kind": "strength", "requires": ["pull-scap"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Body straight under a low bar. Pull your chest to the bar." },
  { "id": "pull-negative", "name": "Negative pull-up", "branch": "pull", "kind": "strength", "requires": ["pull-row"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Jump or step to the top, then lower yourself slowly over about 5 seconds." },
  { "id": "pull-pullup", "name": "Pull-up", "branch": "pull", "kind": "strength", "requires": ["pull-negative"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Start from a dead hang. Pull until your chin clears the bar, lower fully." },
  { "id": "pull-chin", "name": "Chin-up", "branch": "pull", "kind": "strength", "requires": ["pull-pullup"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Palms facing you, hands shoulder-width. Chin over the bar." },
  { "id": "pull-archer", "name": "Archer pull-up", "branch": "pull", "kind": "strength", "requires": ["pull-pullup"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Wide grip. Pull toward one hand while the other arm stays straight. Count reps per side." },
  { "id": "pull-explosive", "name": "Explosive pull-up", "branch": "pull", "kind": "strength", "requires": ["pull-pullup"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Pull fast and high, aiming your chest at the bar." },
  { "id": "pull-fl-tuck", "name": "Tuck front lever", "branch": "pull", "kind": "skill", "requires": ["pull-archer"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 10 }, "cue": "Knees tucked, arms straight, back flat and parallel to the floor." },
  { "id": "pull-mu-neg", "name": "Negative muscle-up", "branch": "pull", "kind": "skill", "requires": ["pull-explosive"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 3 }, "cue": "Start above the bar, lower slowly through the transition to a dead hang." },
  { "id": "pull-fl-adv", "name": "Advanced tuck front lever", "branch": "pull", "kind": "skill", "requires": ["pull-fl-tuck"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 8 }, "cue": "Open your hips a little, keep your back flat and hips level with shoulders." },
  { "id": "pull-mu", "name": "Muscle-up", "branch": "pull", "kind": "skill", "requires": ["pull-mu-neg"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 3 }, "cue": "False grip, pull explosively to your chest, roll over the bar, press out." },

  { "id": "legs-assisted", "name": "Assisted squat", "branch": "legs", "kind": "strength", "requires": [], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 12 }, "cue": "Hold a doorframe or pole for balance. Sit back and down, knees track over toes." },
  { "id": "legs-squat", "name": "Bodyweight squat", "branch": "legs", "kind": "strength", "requires": ["legs-assisted"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 15 }, "cue": "Feet shoulder-width. Lower until thighs are parallel to the floor, chest up." },
  { "id": "legs-split", "name": "Split squat", "branch": "legs", "kind": "strength", "requires": ["legs-squat"], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "One foot forward, one back. Lower straight down. Count reps per side." },
  { "id": "legs-bulgarian", "name": "Bulgarian split squat", "branch": "legs", "kind": "strength", "requires": ["legs-split"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Back foot on a bench. Lower until your front thigh is parallel. Count reps per side." },
  { "id": "legs-shrimp", "name": "Shrimp squat", "branch": "legs", "kind": "strength", "requires": ["legs-split"], "col": 2, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Hold your rear foot behind you, lower until your back knee touches the floor. Count reps per side." },
  { "id": "legs-assisted-pistol", "name": "Assisted pistol squat", "branch": "legs", "kind": "strength", "requires": ["legs-bulgarian"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Hold a pole or straps for support. Extend one leg forward and squat on the other. Count reps per side." },
  { "id": "legs-pistol", "name": "Pistol squat", "branch": "legs", "kind": "skill", "requires": ["legs-assisted-pistol"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Free leg straight out, arms forward, heel down. Count reps per side." },

  { "id": "core-deadbug", "name": "Dead bug", "branch": "core", "kind": "strength", "requires": [], "col": 1, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "On your back, lower opposite arm and leg while your lower back stays pressed into the floor." },
  { "id": "core-plank", "name": "Plank", "branch": "core", "kind": "strength", "requires": ["core-deadbug"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 30 }, "cue": "Forearms down, body in one line, squeeze glutes and abs." },
  { "id": "core-hollow", "name": "Hollow hold", "branch": "core", "kind": "strength", "requires": ["core-plank"], "col": 1, "goal": { "type": "hold", "sets": 3, "target": 20 }, "cue": "On your back, lower back glued to the floor, arms and legs long, shoulders and feet lifted." },
  { "id": "core-knee-raise", "name": "Hanging knee raise", "branch": "core", "kind": "strength", "requires": ["core-hollow"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 10 }, "cue": "Hang from a bar, curl your knees to your chest without swinging." },
  { "id": "core-tuck-lsit", "name": "Tuck L-sit", "branch": "core", "kind": "skill", "requires": ["core-hollow"], "col": 2, "goal": { "type": "hold", "sets": 3, "target": 15 }, "cue": "Hands on parallettes or the floor, push down tall, knees tucked, feet off the ground." },
  { "id": "core-leg-raise", "name": "Hanging leg raise", "branch": "core", "kind": "strength", "requires": ["core-knee-raise"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 8 }, "cue": "Legs straight, raise to the bar with control, no swing." },
  { "id": "core-lsit", "name": "L-sit", "branch": "core", "kind": "skill", "requires": ["core-tuck-lsit"], "col": 2, "goal": { "type": "hold", "sets": 3, "target": 15 }, "cue": "Arms locked, shoulders pressed down, legs straight and parallel to the floor." },
  { "id": "core-dragon", "name": "Tuck dragon flag", "branch": "core", "kind": "skill", "requires": ["core-leg-raise"], "col": 0, "goal": { "type": "reps", "sets": 3, "target": 5 }, "cue": "Lie on a bench holding behind your head, lift your body with knees tucked, lower slowly." }
]
```

- [ ] **Step 6: Run the tests, expect pass**

Run: `npx vitest run src/data/nodes.test.ts`
Expected: PASS (6 tests). If "overlap" fails, change one node's `col` so cells are unique, then re-run.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(data): exercise graph for push, pull, legs, core with validation tests" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Progress engine (pure rules)

**Files:**
- Create: `src/engine/progress.ts`, `src/engine/progress.test.ts`, `src/lib/time.ts`, `src/lib/format.ts`, `src/lib/lib.test.ts`

**Interfaces:**
- Consumes: `ExerciseNode`, `Goal`, `Branch` (Task 2); `BRANCHES`, `indexNodes`, `rootOf`.
- Produces (all in `src/engine/progress.ts`):
  - `type NodeState = 'locked' | 'available' | 'focus' | 'completed'`
  - `interface SetLog { nodeId: string; value: number; date: string; at: number }`
  - `interface Progress { completed: string[]; focus: Record<Branch, string | null>; logs: SetLog[] }`
  - `interface Suggestion { node: ExerciseNode; isNew: boolean }`
  - `initialProgress(nodes): Progress`
  - `isUnlocked(node, completed: Set<string>): boolean`
  - `nodeState(node, progress): NodeState`
  - `goalMet(goal, values: number[]): boolean`
  - `todaysValues(progress, nodeId, date): number[]`
  - `logSet(progress, nodeId, value, date, at): Progress`
  - `suggestNext(nodes, progress, fromId): Suggestion[]`
  - `levelUp(nodes, progress, fromId, toId: string | null): Progress`
  - `setFocus(nodes, progress, nodeId): Progress`
  - `sanitizeProgress(nodes, raw: unknown): Progress`
- Produces (`src/lib/time.ts`): `localDate(d?: Date): string` (`YYYY-MM-DD` local), `formatClock(totalSeconds: number): string` (`m:ss`).
- Produces (`src/lib/format.ts`): `goalText(goal: Goal): string`.

- [ ] **Step 1: Write failing lib tests**

`src/lib/lib.test.ts`:

```ts
import { localDate, formatClock } from './time'
import { goalText } from './format'

describe('time helpers', () => {
  it('formats local dates with zero padding', () => {
    expect(localDate(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
  it('formats a clock as m:ss and never goes negative', () => {
    expect(formatClock(75.9)).toBe('1:15')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('goalText', () => {
  it('shows reps and holds', () => {
    expect(goalText({ type: 'reps', sets: 3, target: 10 })).toBe('3 × 10')
    expect(goalText({ type: 'hold', sets: 3, target: 30 })).toBe('3 × 30 s')
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/lib/lib.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement lib**

`src/lib/time.ts`:

```ts
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
```

`src/lib/format.ts`:

```ts
import type { Goal } from '../data/types'

export function goalText(goal: Goal): string {
  return goal.type === 'hold' ? `${goal.sets} × ${goal.target} s` : `${goal.sets} × ${goal.target}`
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/lib/lib.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing engine tests**

`src/engine/progress.test.ts`:

```ts
import type { ExerciseNode } from '../data/types'
import {
  goalMet, initialProgress, isUnlocked, levelUp, logSet, nodeState,
  sanitizeProgress, setFocus, suggestNext, todaysValues,
  type Progress,
} from './progress'

const N = (id: string, requires: string[] = [], over: Partial<ExerciseNode> = {}): ExerciseNode => ({
  id, name: id, branch: 'push', kind: 'strength', requires, col: 1,
  goal: { type: 'reps', sets: 3, target: 10 }, cue: 'cue', ...over,
})
// a -> b -> d(skill);  a -> c
const graph = [N('a'), N('b', ['a']), N('c', ['a']), N('d', ['b'], { kind: 'skill' })]

const fresh = (): Progress => initialProgress(graph)

describe('initialProgress', () => {
  it('focuses the root of a branch and leaves empty branches null', () => {
    const p = fresh()
    expect(p.focus.push).toBe('a')
    expect(p.focus.pull).toBeNull()
    expect(p.completed).toEqual([])
    expect(p.logs).toEqual([])
  })
})

describe('isUnlocked / nodeState', () => {
  it('unlocks when all requirements are completed', () => {
    expect(isUnlocked(graph[1], new Set())).toBe(false)
    expect(isUnlocked(graph[1], new Set(['a']))).toBe(true)
    expect(isUnlocked(graph[0], new Set())).toBe(true)
  })
  it('derives state from progress', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    expect(nodeState(graph[0], p)).toBe('completed')
    expect(nodeState(graph[1], p)).toBe('focus')
    expect(nodeState(graph[2], p)).toBe('available')
    expect(nodeState(graph[3], p)).toBe('locked')
  })
})

describe('goalMet', () => {
  const reps = { type: 'reps' as const, sets: 3, target: 10 }
  const hold = { type: 'hold' as const, sets: 3, target: 30 }
  it('needs enough sets at or above the target', () => {
    expect(goalMet(reps, [10, 10, 10])).toBe(true)
    expect(goalMet(reps, [12, 10, 11, 3])).toBe(true)
    expect(goalMet(reps, [10, 10])).toBe(false)
    expect(goalMet(reps, [10, 10, 9])).toBe(false)
  })
  it('does not count short holds and counts full ones', () => {
    expect(goalMet(hold, [30, 30, 29])).toBe(false)
    expect(goalMet(hold, [30, 31, 45])).toBe(true)
  })
})

describe('logSet / todaysValues', () => {
  it('stores a floored value with its date', () => {
    const p = logSet(fresh(), 'a', 9.7, '2026-09-26', 1)
    expect(p.logs).toEqual([{ nodeId: 'a', value: 9, date: '2026-09-26', at: 1 }])
  })
  it('ignores zero, negative, NaN and Infinity, without mutating', () => {
    const base = fresh()
    for (const bad of [0, -3, NaN, Infinity, 0.4]) {
      expect(logSet(base, 'a', bad, '2026-09-26', 1)).toBe(base)
    }
    expect(base.logs).toHaveLength(0)
  })
  it('only counts sets from the given day (day rollover)', () => {
    let p = logSet(fresh(), 'a', 10, '2026-09-25', 1)
    p = logSet(p, 'a', 8, '2026-09-26', 2)
    p = logSet(p, 'b', 7, '2026-09-26', 3)
    expect(todaysValues(p, 'a', '2026-09-26')).toEqual([8])
    expect(todaysValues(p, 'a', '2026-09-27')).toEqual([])
  })
})

describe('suggestNext', () => {
  it('after completing a, suggests b and c as new; d stays out', () => {
    const s = suggestNext(graph, fresh(), 'a')
    expect(s.map((x) => x.node.id).sort()).toEqual(['b', 'c'])
    expect(s.every((x) => x.isNew)).toBe(true)
  })
  it('ranks strength before skill, and older availables before new skills', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    const s = suggestNext(graph, p, 'b')
    expect(s.map((x) => x.node.id)).toEqual(['c', 'd'])
    expect(s[0].isNew).toBe(false)
    expect(s[1].isNew).toBe(true)
  })
  it('returns nothing for an unknown node', () => {
    expect(suggestNext(graph, fresh(), 'zzz')).toEqual([])
  })
})

describe('levelUp', () => {
  it('completes the focus node and moves focus to the chosen next node', () => {
    const p = levelUp(graph, fresh(), 'a', 'b')
    expect(p.completed).toEqual(['a'])
    expect(p.focus.push).toBe('b')
  })
  it('does nothing if the node is not the current focus', () => {
    const base = fresh()
    expect(levelUp(graph, base, 'b', 'c')).toBe(base)
  })
  it('falls back to the first available node when the choice is locked or missing', () => {
    expect(levelUp(graph, fresh(), 'a', 'd').focus.push).toBe('b')
    expect(levelUp(graph, fresh(), 'a', null).focus.push).toBe('b')
  })
  it('reaching the top of a branch leaves focus null instead of crashing', () => {
    const p: Progress = { ...fresh(), completed: ['a', 'b', 'c'], focus: { ...fresh().focus, push: 'd' } }
    const done = levelUp(graph, p, 'd', null)
    expect(done.completed).toContain('d')
    expect(done.focus.push).toBeNull()
  })
  it('never lists a node twice in completed', () => {
    const p = levelUp(graph, fresh(), 'a', 'b')
    expect(new Set(p.completed).size).toBe(p.completed.length)
  })
})

describe('setFocus', () => {
  it('lets the user focus an available node but not a locked one', () => {
    const p: Progress = { ...fresh(), completed: ['a'], focus: { ...fresh().focus, push: 'b' } }
    expect(setFocus(graph, p, 'c').focus.push).toBe('c')
    expect(setFocus(graph, p, 'd')).toBe(p)
    expect(setFocus(graph, p, 'a')).toBe(p)
  })
})

describe('sanitizeProgress', () => {
  it('turns garbage into initial progress', () => {
    for (const raw of [undefined, null, 'x', 42, [], {}]) {
      expect(sanitizeProgress(graph, raw)).toEqual(fresh())
    }
  })
  it('drops unknown ids and bad logs', () => {
    const p = sanitizeProgress(graph, {
      completed: ['a', 'ghost', 5, 'a'],
      focus: { push: 'b' },
      logs: [
        { nodeId: 'a', value: 10, date: '2026-09-26', at: 1 },
        { nodeId: 'ghost', value: 10, date: '2026-09-26', at: 2 },
        { nodeId: 'a', value: -1, date: '2026-09-26', at: 3 },
        null,
      ],
    })
    expect(p.completed).toEqual(['a'])
    expect(p.focus.push).toBe('b')
    expect(p.logs).toHaveLength(1)
  })
  it('repairs focus that points at a locked, completed or missing node', () => {
    expect(sanitizeProgress(graph, { completed: [], focus: { push: 'd' } }).focus.push).toBe('a')
    expect(sanitizeProgress(graph, { completed: ['a'], focus: { push: 'a' } }).focus.push).toBe('b')
    expect(sanitizeProgress(graph, { completed: [], focus: { push: 'nope' } }).focus.push).toBe('a')
  })
  it('gives a fully completed branch null focus', () => {
    const p = sanitizeProgress(graph, { completed: ['a', 'b', 'c', 'd'] })
    expect(p.focus.push).toBeNull()
  })
})
```

- [ ] **Step 6: Run, expect fail**

Run: `npx vitest run src/engine/progress.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement the engine**

`src/engine/progress.ts`:

```ts
import type { Branch, ExerciseNode, Goal } from '../data/types'
import { BRANCHES, indexNodes, rootOf } from './graph'

export type NodeState = 'locked' | 'available' | 'focus' | 'completed'

export interface SetLog {
  nodeId: string
  value: number
  /** local day, YYYY-MM-DD */
  date: string
  /** epoch ms */
  at: number
}

export interface Progress {
  completed: string[]
  focus: Record<Branch, string | null>
  logs: SetLog[]
}

export interface Suggestion {
  node: ExerciseNode
  isNew: boolean
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus = {} as Record<Branch, string | null>
  for (const b of BRANCHES) focus[b] = rootOf(nodes, b)?.id ?? null
  return { completed: [], focus, logs: [] }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export function nodeState(node: ExerciseNode, progress: Progress): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (progress.focus[node.branch] === node.id) return 'focus'
  return isUnlocked(node, new Set(progress.completed)) ? 'available' : 'locked'
}

export function goalMet(goal: Goal, values: number[]): boolean {
  return values.filter((v) => v >= goal.target).length >= goal.sets
}

export function todaysValues(progress: Progress, nodeId: string, date: string): number[] {
  return progress.logs.filter((l) => l.nodeId === nodeId && l.date === date).map((l) => l.value)
}

export function logSet(progress: Progress, nodeId: string, value: number, date: string, at: number): Progress {
  const v = Math.floor(value)
  if (!Number.isFinite(v) || v < 1) return progress
  return { ...progress, logs: [...progress.logs, { nodeId, value: v, date, at }] }
}

/** Strength before skill; the sort is stable so JSON order breaks ties. */
const kindRank = (n: ExerciseNode) => (n.kind === 'skill' ? 1 : 0)

/** Nodes you could pick as the next focus in this branch once `fromId` is done. New unlocks first among equals. */
export function suggestNext(nodes: ExerciseNode[], progress: Progress, fromId: string): Suggestion[] {
  const from = indexNodes(nodes).get(fromId)
  if (!from) return []
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  const score = (s: Suggestion) => kindRank(s.node) * 2 + (s.isNew ? 0 : 1)
  return nodes
    .filter((n) => n.branch === from.branch && !after.has(n.id) && isUnlocked(n, after))
    .map((n) => ({ node: n, isNew: !isUnlocked(n, before) }))
    .sort((a, b) => score(a) - score(b))
}

function pickFocus(nodes: ExerciseNode[], done: Set<string>, branch: Branch): string | null {
  const open = nodes.filter((n) => n.branch === branch && !done.has(n.id) && isUnlocked(n, done))
  return [...open].sort((a, b) => kindRank(a) - kindRank(b))[0]?.id ?? null
}

/** Complete the branch's focus node and choose the next focus. Returns the same object if `fromId` is not the focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from || progress.focus[from.branch] !== fromId) return progress
  const completed = [...new Set([...progress.completed, fromId])]
  const done = new Set(completed)
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && to.branch === from.branch && !done.has(to.id) && isUnlocked(to, done)
  const focusId = valid ? to!.id : pickFocus(nodes, done, from.branch)
  return { ...progress, completed, focus: { ...progress.focus, [from.branch]: focusId } }
}

/** Make an available node the branch's focus. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node) return progress
  if (nodeState(node, progress) !== 'available') return progress
  return { ...progress, focus: { ...progress.focus, [node.branch]: nodeId } }
}

/** Turn anything read from storage into valid progress for the current graph. */
export function sanitizeProgress(nodes: ExerciseNode[], raw: unknown): Progress {
  const base = initialProgress(nodes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as { completed?: unknown; focus?: unknown; logs?: unknown }
  const byId = indexNodes(nodes)

  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((x): x is string => typeof x === 'string' && byId.has(x)))]
    : []
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs.filter(
        (l): l is SetLog =>
          !!l && typeof l === 'object' &&
          typeof (l as SetLog).nodeId === 'string' && byId.has((l as SetLog).nodeId) &&
          Number.isFinite((l as SetLog).value) && (l as SetLog).value >= 1 &&
          typeof (l as SetLog).date === 'string' && typeof (l as SetLog).at === 'number',
      )
    : []

  const done = new Set(completed)
  const rawFocus = r.focus && typeof r.focus === 'object' ? (r.focus as Record<string, unknown>) : {}
  const focus = { ...base.focus }
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    focus[b] = n && n.branch === b && !done.has(n.id) && isUnlocked(n, done) ? n.id : pickFocus(nodes, done, b)
  }
  return { completed, focus, logs }
}
```

- [ ] **Step 8: Run all tests, expect pass**

Run: `npx vitest run`
Expected: PASS. Note `logSet(..., 0.4)` floors to 0 and is ignored, which the "bad values" test relies on.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(engine): pure progression rules, level-up suggestions, sanitising, helpers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Tree layout

**Files:**
- Modify: `src/engine/layout.ts`
- Create: `src/engine/layout.test.ts`

**Interfaces:**
- Consumes: `computeDepths`, `indexNodes`, `ExerciseNode`, `Branch`, `NODES`.
- Produces (in `layout.ts`):
  - constants `COL_W = 66`, `ROW_H = 64`, `PAD_X = 42`, `PAD_Y = 28`, `NODE_R = 17`, `COLS = 4`
  - `interface Placed { node: ExerciseNode; x: number; y: number; depth: number }`
  - `interface TreeLayout { placed: Placed[]; edges: { from: string; to: string }[]; width: number; height: number }` where an edge goes from **parent id** to **child id**
  - `layoutBranch(nodes: ExerciseNode[], branch: Branch): TreeLayout` (beginners at the bottom)

- [ ] **Step 1: Write failing tests**

`src/engine/layout.test.ts`:

```ts
import { NODES } from '../data/nodes'
import { layoutBranch, COL_W, ROW_H, PAD_X, PAD_Y } from './layout'

describe('layoutBranch', () => {
  const push = layoutBranch(NODES, 'push')
  const at = (id: string) => push.placed.find((p) => p.node.id === id)!

  it('puts beginner nodes at the bottom and harder ones higher', () => {
    expect(at('push-wall').y).toBeGreaterThan(at('push-standard').y)
    expect(at('push-standard').y).toBeGreaterThan(at('push-diamond').y)
    expect(at('push-diamond').y).toBeGreaterThan(at('push-oneam').y)
  })

  it('places columns left to right using col', () => {
    expect(at('push-diamond').x).toBe(PAD_X + 0 * COL_W)
    expect(at('push-decline').x).toBe(PAD_X + 1 * COL_W)
    expect(at('push-pike').x).toBe(PAD_X + 2 * COL_W)
  })

  it('bottom row sits at the bottom padding and the top row at the top padding', () => {
    const ys = push.placed.map((p) => p.y)
    expect(Math.min(...ys)).toBe(PAD_Y)
    const maxDepth = Math.max(...push.placed.map((p) => p.depth))
    expect(Math.max(...ys)).toBe(PAD_Y + maxDepth * ROW_H)
  })

  it('only includes nodes of the requested branch and draws parent-to-child edges', () => {
    expect(push.placed.every((p) => p.node.branch === 'push')).toBe(true)
    expect(push.edges).toContainEqual({ from: 'push-standard', to: 'push-diamond' })
    expect(push.edges).not.toContainEqual({ from: 'push-diamond', to: 'push-standard' })
    const expected = NODES.filter((n) => n.branch === 'push').reduce((sum, n) => sum + n.requires.length, 0)
    expect(push.edges).toHaveLength(expected)
  })

  it('has a positive size for every branch', () => {
    for (const b of ['push', 'pull', 'legs', 'core'] as const) {
      const l = layoutBranch(NODES, b)
      expect(l.width).toBeGreaterThan(0)
      expect(l.height).toBeGreaterThan(0)
      expect(l.placed.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/engine/layout.test.ts`
Expected: FAIL (`layoutBranch` is not exported).

- [ ] **Step 3: Implement**

Append to `src/engine/layout.ts` (keep `computeDepths`); change the first import to also bring in `Branch`:

```ts
import type { Branch, ExerciseNode } from '../data/types'
import { indexNodes } from './graph'

export const COL_W = 66
export const ROW_H = 64
export const PAD_X = 42
export const PAD_Y = 28
export const NODE_R = 17
export const COLS = 4

export interface Placed {
  node: ExerciseNode
  x: number
  y: number
  depth: number
}

export interface TreeLayout {
  placed: Placed[]
  edges: { from: string; to: string }[]
  width: number
  height: number
}

export function layoutBranch(nodes: ExerciseNode[], branch: Branch): TreeLayout {
  const depths = computeDepths(nodes)
  const inBranch = nodes.filter((n) => n.branch === branch)
  const maxDepth = Math.max(0, ...inBranch.map((n) => depths.get(n.id)!))
  const placed = inBranch.map((node) => {
    const depth = depths.get(node.id)!
    return { node, depth, x: PAD_X + node.col * COL_W, y: PAD_Y + (maxDepth - depth) * ROW_H }
  })
  const edges = inBranch.flatMap((n) => n.requires.map((r) => ({ from: r, to: n.id })))
  return {
    placed,
    edges,
    width: PAD_X * 2 + (COLS - 1) * COL_W,
    height: PAD_Y * 2 + maxDepth * ROW_H + 12,
  }
}
```

- [ ] **Step 4: Run all tests, expect pass**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): branch tree layout" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Storage and progress context

**Files:**
- Create: `src/store/storage.ts`, `src/store/ProgressContext.tsx`, `src/store/ProgressContext.test.tsx`

**Interfaces:**
- Consumes: `Progress`, `sanitizeProgress`, `initialProgress`, `logSet`, `levelUp`, `setFocus`, `localDate`, `NODES`.
- Produces:
  - `interface ProgressStorage { load(): Promise<unknown>; save(p: Progress): Promise<void> }`
  - `idbStorage: ProgressStorage` (IndexedDB key `up.progress`), `memoryStorage(initial?: unknown): ProgressStorage`
  - `interface ProgressValue { nodes: ExerciseNode[]; byId: Map<string, ExerciseNode>; progress: Progress; log(nodeId: string, value: number): void; levelUp(fromId: string, toId: string | null): void; setFocus(nodeId: string): void }`
  - `<ProgressProvider storage nodes>`, `useProgress(): ProgressValue` (throws outside the provider)

- [ ] **Step 1: Write failing tests**

`src/store/ProgressContext.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NODES } from '../data/nodes'
import { ProgressProvider, useProgress } from './ProgressContext'
import { memoryStorage } from './storage'

function Probe() {
  const { progress, log } = useProgress()
  return (
    <button onClick={() => log('push-wall', 10)}>
      {`focus:${progress.focus.push} logs:${progress.logs.length}`}
    </button>
  )
}

describe('ProgressProvider', () => {
  it('starts from initial progress and persists a logged set', async () => {
    const storage = memoryStorage()
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    const button = await screen.findByRole('button')
    expect(button).toHaveTextContent('focus:push-wall logs:0')
    await userEvent.click(button)
    await waitFor(async () => {
      const saved = (await storage.load()) as { logs: unknown[] }
      expect(saved.logs).toHaveLength(1)
    })
    expect(button).toHaveTextContent('logs:1')
  })

  it('survives corrupted stored data', async () => {
    const storage = memoryStorage({ completed: 'nope', focus: { push: 'ghost' }, logs: 7 })
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:push-wall logs:0')
  })

  it('falls back to initial progress when storage throws', async () => {
    const storage = { load: () => Promise.reject(new Error('boom')), save: async () => {} }
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:push-wall logs:0')
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/store/ProgressContext.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement storage**

`src/store/storage.ts`:

```ts
import { get, set } from 'idb-keyval'
import type { Progress } from '../engine/progress'

export interface ProgressStorage {
  load(): Promise<unknown>
  save(progress: Progress): Promise<void>
}

const KEY = 'up.progress'

export const idbStorage: ProgressStorage = {
  load: () => get(KEY),
  save: (progress) => set(KEY, progress),
}

/** In-memory storage for tests. */
export function memoryStorage(initial?: unknown): ProgressStorage {
  let data = initial
  return {
    load: async () => data,
    save: async (progress) => {
      data = progress
    },
  }
}
```

- [ ] **Step 4: Implement the context**

`src/store/ProgressContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ExerciseNode } from '../data/types'
import { indexNodes } from '../engine/graph'
import {
  initialProgress, levelUp as levelUpRule, logSet, sanitizeProgress, setFocus as setFocusRule,
  type Progress,
} from '../engine/progress'
import { localDate } from '../lib/time'
import type { ProgressStorage } from './storage'

export interface ProgressValue {
  nodes: ExerciseNode[]
  byId: Map<string, ExerciseNode>
  progress: Progress
  log(nodeId: string, value: number): void
  levelUp(fromId: string, toId: string | null): void
  setFocus(nodeId: string): void
}

const Ctx = createContext<ProgressValue | null>(null)

export function ProgressProvider({
  storage, nodes, children,
}: { storage: ProgressStorage; nodes: ExerciseNode[]; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const byId = useMemo(() => indexNodes(nodes), [nodes])

  useEffect(() => {
    let alive = true
    storage
      .load()
      .then((raw) => alive && setProgress(sanitizeProgress(nodes, raw)))
      .catch(() => alive && setProgress(initialProgress(nodes)))
    return () => {
      alive = false
    }
  }, [storage, nodes])

  useEffect(() => {
    if (progress) void storage.save(progress).catch(() => {})
  }, [progress, storage])

  if (!progress) return null

  const value: ProgressValue = {
    nodes,
    byId,
    progress,
    log: (nodeId, v) => setProgress((p) => (p ? logSet(p, nodeId, v, localDate(), Date.now()) : p)),
    levelUp: (fromId, toId) => setProgress((p) => (p ? levelUpRule(nodes, p, fromId, toId) : p)),
    setFocus: (nodeId) => setProgress((p) => (p ? setFocusRule(nodes, p, nodeId) : p)),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProgress(): ProgressValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgress must be used inside <ProgressProvider>')
  return v
}
```

- [ ] **Step 5: Run all tests, expect pass**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(store): IndexedDB storage and progress context with sanitising load" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Styles, app shell, tab bar, Today screen

**Files:**
- Create: `src/styles.css`, `src/ui/branches.ts`, `src/ui/TabBar.tsx`, `src/ui/TodayScreen.tsx`, `src/ui/TreeScreen.tsx` (stub here, real in Task 7), `src/ui/LogScreen.tsx` (stub here, real in Task 8), `src/App.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Delete: `src/smoke.test.tsx`

**Interfaces:**
- Consumes: `useProgress`, `nodeState`, `todaysValues`, `goalText`, `localDate`, `BRANCHES`, `NODES`, `idbStorage`, `ProgressStorage`.
- Produces:
  - `BRANCH_META: Record<Branch, { label: string; color: string }>`
  - `<TabBar tab onChange>` with `type Tab = 'today' | 'tree'`
  - `<TodayScreen onOpen(nodeId)>`
  - `App({ storage?: ProgressStorage })` default export
  - `<TreeScreen onLog(nodeId)>` and `<LogScreen nodeId onClose>` (stubs replaced by later tasks with the same props)

- [ ] **Step 1: Delete the smoke test and write failing app tests**

```bash
git rm -f src/smoke.test.tsx
```

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'
import { NODES } from './data/nodes'
import { memoryStorage } from './store/storage'

describe('Today screen', () => {
  it('lists the focus exercise of each branch with its goal', async () => {
    render(<App storage={memoryStorage()} />)
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
    expect(screen.getByRole('button', { name: /Dead hang/ })).toHaveTextContent('3 × 30 s')
    expect(screen.getByRole('button', { name: /Assisted squat/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead bug/ })).toBeInTheDocument()
  })

  it('shows "Branch complete" when every push exercise is done', async () => {
    const allPush = NODES.filter((n) => n.branch === 'push').map((n) => n.id)
    render(<App storage={memoryStorage({ completed: allPush })} />)
    expect(await screen.findByText('Branch complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (App does not take storage / no Today screen).

- [ ] **Step 3: Styles**

`src/styles.css`:

```css
:root {
  --bg: #f2f2f7; --card: #fff; --label: #000; --label2: #6c6c70; --label3: #aeaeb2;
  --sep: rgba(60, 60, 67, 0.14); --fill: rgba(120, 120, 128, 0.12);
  --push: #ff9500; --pull: #0a84ff; --legs: #30b455; --core: #af52de; --skill: #ff2d55; --blue: #0a84ff;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #000; --card: #1c1c1e; --label: #fff; --label2: #98989f; --label3: #48484a;
    --sep: rgba(84, 84, 88, 0.55); --fill: rgba(120, 120, 128, 0.24);
    --push: #ff9f0a; --legs: #30d158; --core: #bf5af2; --skill: #ff375f;
  }
}
* { box-sizing: border-box; margin: 0; }
html, body { background: var(--bg); color: var(--label); }
body {
  font: 15px/1.35 -apple-system, 'SF Pro Text', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }

.app { max-width: 480px; margin: 0 auto; min-height: 100dvh; }
.screen { padding: calc(env(safe-area-inset-top) + 16px) 16px calc(90px + env(safe-area-inset-bottom)); }
.large { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; }
.sub { color: var(--label2); font-size: 13px; }
.navt { text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 8px; }

.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; display: flex; justify-content: center; gap: 32px;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); background: var(--card); border-top: 0.5px solid var(--sep);
}
.tabbar button { min-width: 72px; min-height: 44px; font-size: 11px; color: var(--label2); }
.tabbar button[aria-current='page'] { color: var(--blue); font-weight: 600; }
.tabbar i { display: block; width: 24px; height: 24px; margin: 0 auto 2px; border-radius: 8px; background: currentColor; opacity: 0.85; }

.group { background: var(--card); border-radius: 14px; overflow: hidden; margin: 16px 0; }
.row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; text-align: left; min-height: 56px; }
.row + .row { border-top: 0.5px solid var(--sep); }
.dot { width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 700; }
.row .t { flex: 1; min-width: 0; display: block; }
.row .t b { display: block; font-size: 15px; font-weight: 600; }
.row .t span { font-size: 13px; color: var(--label2); }
.row .chev { color: var(--label3); font-size: 22px; }
.tag { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: var(--skill); }

.cta { display: block; width: 100%; padding: 15px; border-radius: 14px; background: var(--blue); color: #fff; font-weight: 600; font-size: 16px; text-align: center; margin-top: 8px; }
.cta.sec { background: var(--fill); color: var(--blue); }
.cta:disabled { opacity: 0.4; }

.seg { display: flex; background: var(--fill); border-radius: 9px; padding: 2px; margin: 8px 0; }
.seg button { flex: 1; text-align: center; font-size: 13px; padding: 7px 0; border-radius: 7px; font-weight: 600; color: var(--label2); }
.seg button.on { background: var(--card); color: var(--label); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15); }

.scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 20; }
.sheet {
  position: fixed; left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 21;
  max-width: 464px; margin: 0 auto; background: var(--card); border-radius: 28px; padding: 22px 18px 18px;
}
.sheet h2, .sheet h3 { font-size: 21px; letter-spacing: -0.01em; }
.sheet p { color: var(--label2); font-size: 14px; margin: 6px 0; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--label2); }
.pills { margin: 8px 0; display: flex; gap: 6px; flex-wrap: wrap; }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; background: var(--fill); font-size: 12px; font-weight: 600; color: var(--label2); }
.pill.skill { color: var(--skill); }
.req { font-size: 13px; margin-top: 6px; color: var(--label2); }
.req span { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; margin-right: 6px; font-size: 11px; font-weight: 700; color: #fff; }
.req .ok { background: var(--legs); } .req .nx { background: var(--label3); }
.cue { margin: 10px 0 6px; }
.medal { width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 10px; display: grid; place-items: center; color: #fff; font-size: 30px; background: var(--accent, var(--push)); }
.center { text-align: center; }
.choice { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; padding: 10px 12px; border-radius: 14px; background: var(--fill); margin: 8px 0; border: 2px solid transparent; }
.choice[aria-pressed='true'] { border-color: var(--accent, var(--push)); }
.choice b { display: block; font-size: 15px; } .choice span { font-size: 12px; color: var(--label2); }
.choice em { font-style: normal; font-size: 10px; font-weight: 700; color: #fff; background: var(--accent, var(--push)); padding: 3px 8px; border-radius: 999px; }

.tsvg { display: block; width: 100%; height: auto; }
.tsvg .e { fill: none; stroke-width: 3; stroke-linecap: round; }
.tsvg .e.done { stroke: var(--accent); }
.tsvg .e.avail { stroke: var(--accent); opacity: 0.55; stroke-dasharray: 2 6; }
.tsvg .e.lock { stroke: var(--label3); opacity: 0.6; stroke-dasharray: 2 6; }
.tsvg .n { cursor: pointer; outline: none; }
.tsvg .n .sh { fill: var(--card); stroke-width: 3; }
.tsvg .n.st.completed .sh { fill: var(--accent); stroke: var(--accent); }
.tsvg .n.st.focus .sh, .tsvg .n.st.available .sh { stroke: var(--accent); }
.tsvg .n.sk .sh { stroke: var(--skill); }
.tsvg .n.sk.completed .sh { fill: var(--skill); }
.tsvg .n.locked .sh { stroke: var(--label3); }
.tsvg .glow { fill: var(--accent); opacity: 0.22; }
.tsvg .sel { fill: none; stroke: var(--label); stroke-width: 2; stroke-dasharray: 4 4; }
.tsvg .ic { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.tsvg .dotc { fill: var(--accent); }
.tsvg .lk rect { fill: var(--label3); }
.tsvg .lk path { fill: none; stroke: var(--label3); stroke-width: 2; }
.tsvg .lb { font-size: 9px; font-weight: 600; text-anchor: middle; fill: var(--label2); paint-order: stroke; stroke: var(--bg); stroke-width: 4px; }
.tsvg .n.locked .lb { fill: var(--label3); }
.tsvg .n:focus-visible .sh { stroke-width: 5; }

.log { position: fixed; inset: 0; z-index: 10; background: var(--bg); overflow: auto; }
.log .screen { padding-bottom: 32px; text-align: center; }
.log .close { display: block; margin: 0 0 8px auto; padding: 8px 4px; color: var(--blue); font-weight: 600; }
.bars { display: flex; gap: 6px; justify-content: center; margin: 12px 0 4px; }
.bars i { width: 36px; height: 6px; border-radius: 3px; background: var(--fill); }
.bars i.on { background: var(--accent); }
.big { font-size: 96px; font-weight: 700; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; line-height: 1; margin: 20px 0 4px; }
.steps { display: flex; justify-content: center; gap: 24px; margin: 18px 0; }
.steps button { width: 68px; height: 68px; border-radius: 50%; background: var(--fill); font-size: 34px; font-weight: 300; }
.chips { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.ring text { font-family: inherit; }
```

- [ ] **Step 4: Branch metadata and tab bar**

`src/ui/branches.ts`:

```ts
import type { Branch } from '../data/types'

export const BRANCH_META: Record<Branch, { label: string; color: string }> = {
  push: { label: 'Push', color: 'var(--push)' },
  pull: { label: 'Pull', color: 'var(--pull)' },
  legs: { label: 'Legs', color: 'var(--legs)' },
  core: { label: 'Core', color: 'var(--core)' },
}
```

`src/ui/TabBar.tsx`:

```tsx
export type Tab = 'today' | 'tree'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tree', label: 'Tree' },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <i aria-hidden="true" />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Today screen**

`src/ui/TodayScreen.tsx`:

```tsx
import { BRANCHES } from '../engine/graph'
import { todaysValues } from '../engine/progress'
import { goalText } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

export function TodayScreen({ onOpen }: { onOpen: (nodeId: string) => void }) {
  const { progress, byId } = useProgress()
  const today = localDate()
  const heading = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="screen">
      <div className="sub" style={{ fontWeight: 600 }}>{heading}</div>
      <h1 className="large">Today</h1>
      <div className="group">
        {BRANCHES.map((b) => {
          const meta = BRANCH_META[b]
          const node = progress.focus[b] ? byId.get(progress.focus[b]!) : undefined
          if (!node) {
            return (
              <div className="row" key={b}>
                <span className="dot" style={{ background: meta.color }}>{meta.label.slice(0, 2)}</span>
                <span className="t"><b>{meta.label}</b><span>Branch complete</span></span>
              </div>
            )
          }
          const done = todaysValues(progress, node.id, today).filter((v) => v >= node.goal.target).length
          return (
            <button className="row" key={b} onClick={() => onOpen(node.id)}>
              <span className="dot" style={{ background: meta.color }}>{meta.label.slice(0, 2)}</span>
              <span className="t">
                {node.kind === 'skill' && <span className="tag">SKILL</span>}
                <b>{node.name}</b>
                <span>{goalText(node.goal)} · {done} of {node.goal.sets} sets today</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Stubs for the two screens built later, and the shell**

`src/ui/TreeScreen.tsx`:

```tsx
export function TreeScreen(_props: { onLog: (nodeId: string) => void }) {
  return <div className="screen"><h1 className="large">Skill Tree</h1></div>
}
```

`src/ui/LogScreen.tsx`:

```tsx
export function LogScreen({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  return (
    <div className="log">
      <div className="screen">
        <button className="close" onClick={onClose}>Done</button>
        <div>{nodeId}</div>
      </div>
    </div>
  )
}
```

`src/App.tsx`:

```tsx
import { useState } from 'react'
import { NODES } from './data/nodes'
import { ProgressProvider } from './store/ProgressContext'
import { idbStorage, type ProgressStorage } from './store/storage'
import { LogScreen } from './ui/LogScreen'
import { TabBar, type Tab } from './ui/TabBar'
import { TodayScreen } from './ui/TodayScreen'
import { TreeScreen } from './ui/TreeScreen'

function Shell() {
  const [tab, setTab] = useState<Tab>('today')
  const [logId, setLogId] = useState<string | null>(null)
  return (
    <div className="app">
      {tab === 'today' ? <TodayScreen onOpen={setLogId} /> : <TreeScreen onLog={setLogId} />}
      <TabBar tab={tab} onChange={setTab} />
      {logId && <LogScreen nodeId={logId} onClose={() => setLogId(null)} />}
    </div>
  )
}

export default function App({ storage = idbStorage }: { storage?: ProgressStorage }) {
  return (
    <ProgressProvider storage={storage} nodes={NODES}>
      <Shell />
    </ProgressProvider>
  )
}
```

Add the stylesheet import to `src/main.tsx` (after the `App` import): `import './styles.css'`.

- [ ] **Step 7: Run tests and build**

Run: `npx vitest run && npm run build`
Expected: all tests PASS; build succeeds. (`noUnusedParameters` is satisfied by the leading underscore in `_props`.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): styles, shell, tab bar and Today screen" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Skill Tree screen

**Files:**
- Create: `src/ui/TreeView.tsx`, `src/ui/NodeSheet.tsx`
- Modify: `src/ui/TreeScreen.tsx` (replace stub), `src/App.test.tsx` (add tests)

**Interfaces:**
- Consumes: `layoutBranch`, `NODE_R`, `nodeState`, `NodeState`, `BRANCH_META`, `BRANCHES`, `goalText`, `useProgress`.
- Produces: `<TreeView branch selectedId onSelect(id)>`, `<NodeSheet node onClose onLog(id)>`, `<TreeScreen onLog(id)>`.

- [ ] **Step 1: Add failing tests to `src/App.test.tsx`**

Add `import userEvent from '@testing-library/user-event'` at the top and append:

```tsx
describe('Skill Tree screen', () => {
  it('shows nodes with their state and lets you open one', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('button', { name: 'Wall push-up, focus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incline push-up, locked' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Incline push-up, locked' }))
    const dialog = screen.getByRole('dialog', { name: 'Incline push-up' })
    expect(dialog).toHaveTextContent('Requires Wall push-up')
    expect(dialog).not.toHaveTextContent('Make This My Focus')
  })

  it('lets you make an available exercise your focus', async () => {
    const user = userEvent.setup()
    const std = NODES.filter((n) => ['push-wall', 'push-incline', 'push-knee'].includes(n.id)).map((n) => n.id)
    render(<App storage={memoryStorage({ completed: [...std, 'push-standard'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Decline push-up, available' }))
    await user.click(screen.getByRole('button', { name: 'Make This My Focus' }))
    expect(screen.getByRole('button', { name: 'Decline push-up, focus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Diamond push-up, available' })).toBeInTheDocument()
  })

  it('switches branches', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Pull' }))
    expect(screen.getByRole('button', { name: 'Dead hang, focus' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })
})
```

Note: `completed` in the second test has `push-standard`; `push-diamond`, `push-decline`, `push-pike` become available; `push-standard` was completed but focus is recomputed by `sanitizeProgress` to the first strength node available (`push-diamond`). That is why the test then expects Diamond to be `available` after Decline becomes focus.

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (tree not rendered).

- [ ] **Step 3: TreeView**

`src/ui/TreeView.tsx`:

```tsx
import { useMemo, type CSSProperties } from 'react'
import type { Branch } from '../data/types'
import { layoutBranch, NODE_R } from '../engine/layout'
import { nodeState, type NodeState } from '../engine/progress'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

interface Props {
  branch: Branch
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TreeView({ branch, selectedId, onSelect }: Props) {
  const { nodes, progress } = useProgress()
  const layout = useMemo(() => layoutBranch(nodes, branch), [nodes, branch])
  const pos = new Map(layout.placed.map((p) => [p.node.id, p]))
  const states = new Map<string, NodeState>(layout.placed.map((p) => [p.node.id, nodeState(p.node, progress)]))
  const R = NODE_R

  return (
    <svg
      className="tsvg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={`${BRANCH_META[branch].label} skill tree`}
      style={{ '--accent': BRANCH_META[branch].color } as CSSProperties}
    >
      {layout.edges.map(({ from, to }) => {
        const a = pos.get(from)!
        const b = pos.get(to)!
        const sa = states.get(from)
        const sb = states.get(to)
        const cls =
          sa === 'completed' && (sb === 'completed' || sb === 'focus') ? 'done'
          : sa === 'completed' && sb === 'available' ? 'avail'
          : 'lock'
        const my = (a.y + b.y) / 2
        return (
          <path
            key={`${from}>${to}`}
            className={`e ${cls}`}
            d={`M${a.x} ${a.y - R} C${a.x} ${my},${b.x} ${my},${b.x} ${b.y + R}`}
          />
        )
      })}
      {layout.placed.map(({ node, x, y }) => {
        const state = states.get(node.id)!
        const isSkill = node.kind === 'skill'
        return (
          <g
            key={node.id}
            className={`n ${state} ${isSkill ? 'sk' : 'st'}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`${node.name}, ${state}`}
            onClick={() => onSelect(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(node.id)
              }
            }}
          >
            {state === 'focus' && <circle className="glow" r={R + 9} />}
            {selectedId === node.id && <circle className="sel" r={R + 8} />}
            {isSkill ? (
              <rect className="sh" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="rotate(45)" />
            ) : (
              <circle className="sh" r={R} />
            )}
            {state === 'completed' && <path className="ic" d="M-5 0 L-1.5 3.5 L5 -4" />}
            {state === 'focus' && <circle className="dotc" r={4.5} />}
            {state === 'locked' && (
              <g className="lk">
                <rect x={-5} y={-1} width={10} height={8} rx={2} />
                <path d="M-3 -1 v-2.5 a3 3 0 0 1 6 0 v2.5" />
              </g>
            )}
            <text className="lb" y={R + 12}>{node.name}</text>
          </g>
        )
      })}
    </svg>
  )
}
```

Long names may overflow their column; the label uses the full name on purpose (the accessible name always has it). If a label is visibly cramped on a phone in Task 9, shorten only the on-screen text by adding an optional `short` field later.

- [ ] **Step 4: NodeSheet**

`src/ui/NodeSheet.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { ExerciseNode } from '../data/types'
import { nodeState } from '../engine/progress'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

const LABEL = { locked: 'Locked', available: 'Unlocked', focus: 'Focus', completed: 'Completed' } as const

export function NodeSheet({ node, onClose, onLog }: { node: ExerciseNode; onClose: () => void; onLog: (id: string) => void }) {
  const { progress, byId, setFocus } = useProgress()
  const state = nodeState(node, progress)
  const meta = BRANCH_META[node.branch]

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={node.name} style={{ '--accent': meta.color } as CSSProperties}>
        <div className="eyebrow">{meta.label} · {LABEL[state]}</div>
        <h2>{node.name}</h2>
        <div className="pills">
          <span className="pill">Goal {goalText(node.goal)}</span>
          {node.kind === 'skill' && <span className="pill skill">Skill</span>}
        </div>
        {node.requires.map((id) => {
          const ok = progress.completed.includes(id)
          return (
            <div className="req" key={id}>
              <span className={ok ? 'ok' : 'nx'} aria-hidden="true">{ok ? '✓' : '…'}</span>
              Requires {byId.get(id)?.name ?? id}
            </div>
          )
        })}
        <p className="cue">{node.cue}</p>
        {state === 'available' && (
          <button className="cta" onClick={() => { setFocus(node.id); onClose() }}>Make This My Focus</button>
        )}
        {state === 'focus' && (
          <button className="cta" onClick={() => { onLog(node.id); onClose() }}>Log This Exercise</button>
        )}
        <button className="cta sec" onClick={onClose}>Close</button>
      </div>
    </>
  )
}
```

- [ ] **Step 5: TreeScreen (replace the stub)**

`src/ui/TreeScreen.tsx`:

```tsx
import { useState } from 'react'
import type { Branch } from '../data/types'
import { BRANCHES } from '../engine/graph'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { NodeSheet } from './NodeSheet'
import { TreeView } from './TreeView'

export function TreeScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const [branch, setBranch] = useState<Branch>('push')
  const [selected, setSelected] = useState<string | null>(null)
  const { byId } = useProgress()
  const node = selected ? byId.get(selected) : undefined

  return (
    <div className="screen">
      <h1 className="navt">Skill Tree</h1>
      <div className="seg" role="tablist" aria-label="Branch">
        {BRANCHES.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={b === branch}
            className={b === branch ? 'on' : ''}
            onClick={() => { setBranch(b); setSelected(null) }}
          >
            {BRANCH_META[b].label}
          </button>
        ))}
      </div>
      <TreeView branch={branch} selectedId={selected} onSelect={setSelected} />
      {node && <NodeSheet node={node} onClose={() => setSelected(null)} onLog={onLog} />}
    </div>
  )
}
```

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run && npm run build`
Expected: PASS and build OK.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): branching skill tree with node sheet and focus selection" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Log screen (reps and hold timer) and level-up

**Files:**
- Create: `src/ui/HoldTimer.tsx`, `src/ui/LevelUpSheet.tsx`
- Modify: `src/ui/LogScreen.tsx` (replace stub), `src/App.test.tsx` (add tests)

**Interfaces:**
- Consumes: `useProgress`, `goalMet`, `todaysValues`, `nodeState`, `suggestNext`, `Suggestion`, `goalText`, `formatClock`, `localDate`, `BRANCH_META`.
- Produces:
  - `<HoldTimer target onStop(seconds: number)>`
  - `<LevelUpSheet node suggestions onPick(toId: string | null) onDismiss>`
  - `<LogScreen nodeId onClose>`

- [ ] **Step 1: Add failing integration tests to `src/App.test.tsx`**

Append:

```tsx
describe('Logging and level-up', () => {
  it('three sets at the goal offer a level-up, and confirming moves your focus', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log)
    await user.click(log)
    expect(screen.queryByText('You hit 3 × 10')).not.toBeInTheDocument()
    await user.click(log)
    expect(await screen.findByText('You hit 3 × 10')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Incline push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Set Focus' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })

  it('"Not yet" keeps the same focus and does not re-trigger on the next set', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
    expect(screen.queryByText('You hit 3 × 10')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wall push-up' })).toBeInTheDocument()
  })

  it('steps the rep count and never goes below 1', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const value = screen.getByTestId('rep-value')
    expect(value).toHaveTextContent('10')
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    expect(value).toHaveTextContent('11')
    for (let i = 0; i < 15; i++) await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    expect(value).toHaveTextContent('1')
  })

  it('a set below the goal counts as logged but does not fill the goal bars', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    expect(screen.getByText('0 of 3 sets at goal')).toBeInTheDocument()
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('9')
  })

  it('remembers logged sets after the app is reopened', async () => {
    const user = userEvent.setup()
    const storage = memoryStorage()
    const first = render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText(/1 of 3 sets today/)).toBeInTheDocument()
    first.unmount()
    render(<App storage={storage} />)
    expect(await screen.findByText(/1 of 3 sets today/)).toBeInTheDocument()
  })

  it('uses a hold timer for hold goals', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log Set' })).not.toBeInTheDocument()
  })
})
```

Notes on the tests: "0 of 3 sets at goal" and the "Not yet" flow rely on the copy defined in Step 4 below. After "remembers", Today's row reads `3 × 10 · 1 of 3 sets today` only when the set **meets** the goal; the logged set is 10 (the pre-filled default), so this holds.

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (log screen is still a stub).

- [ ] **Step 3: HoldTimer**

`src/ui/HoldTimer.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { formatClock } from '../lib/time'

const R = 88
const C = 2 * Math.PI * R

export function HoldTimer({ target, onStop }: { target: number; onStop: (seconds: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const lock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 200)
    return () => clearInterval(id)
  }, [startedAt])

  useEffect(() => () => { void lock.current?.release().catch(() => {}) }, [])

  const start = async () => {
    setElapsed(0)
    setStartedAt(Date.now())
    try {
      lock.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* wake lock unsupported or denied: the timer still works */
    }
  }

  const stop = () => {
    if (startedAt === null) return
    const seconds = Math.floor((Date.now() - startedAt) / 1000)
    setStartedAt(null)
    void lock.current?.release().catch(() => {})
    lock.current = null
    onStop(seconds)
  }

  const progress = Math.min(elapsed / target, 1)
  return (
    <div>
      <svg className="ring" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label={`${formatClock(elapsed)} of ${target} seconds`} style={{ margin: '14px auto 0', display: 'block' }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--fill)" strokeWidth="14" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 100 100)" />
        <text x="100" y="112" textAnchor="middle" fontSize="52" fontWeight="700" fill="var(--label)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(elapsed)}</text>
        <text x="100" y="138" textAnchor="middle" fontSize="13" fill="var(--label2)">of {target} s</text>
      </svg>
      {startedAt === null ? (
        <button className="cta" style={{ background: 'var(--accent)', marginTop: 20 }} onClick={start}>Start</button>
      ) : (
        <button className="cta" style={{ background: 'var(--accent)', marginTop: 20 }} onClick={stop}>Stop and Log</button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: LevelUpSheet**

`src/ui/LevelUpSheet.tsx`:

```tsx
import { useState, type CSSProperties } from 'react'
import type { ExerciseNode } from '../data/types'
import type { Suggestion } from '../engine/progress'
import { goalText } from '../lib/format'
import { BRANCH_META } from './branches'

interface Props {
  node: ExerciseNode
  suggestions: Suggestion[]
  onPick: (toId: string | null) => void
  onDismiss: () => void
}

export function LevelUpSheet({ node, suggestions, onPick, onDismiss }: Props) {
  const [choice, setChoice] = useState<string | null>(suggestions[0]?.node.id ?? null)
  const hasChoices = suggestions.length > 0

  return (
    <>
      <div className="scrim" onClick={onDismiss} />
      <div className="sheet center" role="dialog" aria-modal="true" aria-label="Level up" style={{ '--accent': BRANCH_META[node.branch].color } as CSSProperties}>
        <div className="medal" aria-hidden="true">✓</div>
        <h3>You hit {goalText(node.goal)}</h3>
        <p>{node.name} complete.{hasChoices ? ' Choose your next focus.' : ' You have finished everything unlocked here.'}</p>
        {suggestions.map((s, i) => (
          <button key={s.node.id} className="choice" aria-pressed={choice === s.node.id} onClick={() => setChoice(s.node.id)}>
            <span>
              <b>{s.node.name}</b>
              <span>{s.isNew ? 'New' : 'Unlocked'} · {s.node.kind === 'skill' ? 'Skill · ' : ''}{goalText(s.node.goal)}</span>
            </span>
            {i === 0 && <em>Suggested</em>}
          </button>
        ))}
        <button className="cta" style={{ background: 'var(--accent)' }} onClick={() => onPick(choice)}>
          {hasChoices ? 'Set Focus' : 'Complete'}
        </button>
        <button className="cta sec" onClick={onDismiss}>Not yet</button>
      </div>
    </>
  )
}
```

- [ ] **Step 5: LogScreen (replace the stub)**

`src/ui/LogScreen.tsx`:

```tsx
import { useState, type CSSProperties } from 'react'
import { goalMet, nodeState, suggestNext, todaysValues } from '../engine/progress'
import { goalText } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { HoldTimer } from './HoldTimer'
import { LevelUpSheet } from './LevelUpSheet'

export function LogScreen({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, byId, progress, log, levelUp } = useProgress()
  const node = byId.get(nodeId)!
  const meta = BRANCH_META[node.branch]
  const last = [...progress.logs].reverse().find((l) => l.nodeId === nodeId)?.value
  const [reps, setReps] = useState(last ?? node.goal.target)
  const [showLevelUp, setShowLevelUp] = useState(false)

  const today = localDate()
  const values = todaysValues(progress, nodeId, today)
  const atGoal = values.filter((v) => v >= node.goal.target).length

  const record = (value: number) => {
    if (value < 1) return
    log(nodeId, value)
    const focusNow = nodeState(node, progress) === 'focus'
    if (focusNow && goalMet(node.goal, [...values, value])) setShowLevelUp(true)
  }

  return (
    <div className="log" style={{ '--accent': meta.color } as CSSProperties}>
      <div className="screen">
        <button className="close" onClick={onClose}>Done</button>
        <div className="eyebrow" style={{ color: node.kind === 'skill' ? 'var(--skill)' : undefined }}>
          {meta.label}{node.kind === 'skill' ? ' · Skill' : ''}
        </div>
        <h1 className="large" style={{ fontSize: 26 }}>{node.name}</h1>
        <div className="pills" style={{ justifyContent: 'center' }}>
          <span className="pill">Goal {goalText(node.goal)}</span>
        </div>
        <div className="bars" aria-hidden="true">
          {Array.from({ length: node.goal.sets }, (_, i) => <i key={i} className={i < atGoal ? 'on' : ''} />)}
        </div>
        <div className="sub">{atGoal} of {node.goal.sets} sets at goal</div>

        {node.goal.type === 'reps' ? (
          <>
            <div className="big" data-testid="rep-value">{reps}</div>
            <div className="sub">reps{last ? ` · last time ${last}` : ''}</div>
            <div className="steps">
              <button aria-label="Decrease reps" onClick={() => setReps((r) => Math.max(1, r - 1))}>−</button>
              <button aria-label="Increase reps" onClick={() => setReps((r) => r + 1)}>+</button>
            </div>
            <button className="cta" style={{ background: 'var(--accent)' }} onClick={() => record(reps)}>Log Set</button>
          </>
        ) : (
          <HoldTimer target={node.goal.target} onStop={(s) => record(s)} />
        )}

        {values.length > 0 && (
          <div className="chips" aria-label="Sets logged today">
            {values.map((v, i) => <span className="pill" key={i}>{v}{node.goal.type === 'hold' ? ' s' : ''}</span>)}
          </div>
        )}
        <p className="cue sub" style={{ marginTop: 16 }}>{node.cue}</p>
      </div>

      {showLevelUp && (
        <LevelUpSheet
          node={node}
          suggestions={suggestNext(nodes, progress, nodeId)}
          onDismiss={() => setShowLevelUp(false)}
          onPick={(toId) => { levelUp(nodeId, toId); setShowLevelUp(false); onClose() }}
        />
      )}
    </div>
  )
}
```

A subtle point the tests pin: `record` reads `progress` from the render closure, so `values` does **not** yet include the set being logged; that is why `[...values, value]` is passed to `goalMet`. And `nodeState(node, progress) === 'focus'` is read **before** the level-up, so after a level-up (focus moved on, `onClose` called) a re-opened old node cannot re-trigger.

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run && npm run build`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): rep logging, hold timer and level-up suggestion flow" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Real-browser check, offline check, docs, deploy

**Files:**
- Modify: `AGENTS.md`, `docs/DECISIONS.md`, `docs/PLAN.md` (status lines only)

**Interfaces:** none.

- [ ] **Step 1: Full test and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 2: Look at it in a real browser at phone size**

```bash
npm run build && (npx vite preview --port 4173 > /tmp/up-preview.log 2>&1 &) 
sleep 2
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=390,844 \
  --screenshot=/tmp/up-today.png "http://localhost:4173/up/"
```

Read `/tmp/up-today.png`. Expected: title "Today", four rows (Wall push-up, Dead hang, Assisted squat, Dead bug), tab bar at the bottom, no horizontal scroll. Fix any layout problem in `src/styles.css`, then re-run this step. Then use the Chrome browser tools (claude-in-chrome) to open `http://localhost:4173/up/`, resize to 390×844, tap **Tree**, check that the push tree looks like mockup screen 4 (bottom-up, branching after Push-up, pink diamonds at the top, labels not colliding). If labels collide, add an optional `short?: string` to `ExerciseNode`, set it for the long names in `nodes.json`, and render `node.short ?? node.name` in `TreeView` (keep `aria-label` on the full name). Run `npx vitest run` again after any such change.

- [ ] **Step 3: Log a full level-up by hand**

In the browser: Today → Wall push-up → Log Set three times → level-up sheet appears → Set Focus → Today now shows Incline push-up. Reload the page: the state is still there.

- [ ] **Step 4: Offline check**

With `vite preview` still running: in the browser open the page once, then in DevTools set Network to Offline (or use the browser tools to check `navigator.serviceWorker.controller` is non-null) and reload. Expected: the app still loads. Stop the preview server afterwards (`pkill -f "vite preview"`).

- [ ] **Step 5: Update the docs**

In `AGENTS.md` replace the "Current status" paragraph so it says: Plan 1 (foundation and core loop) is implemented and deployed at `https://choralet.github.io/up/`; next is Plan 2 (schedule/day plans, active skills, Find-your-level onboarding, editing goals, Progress screen), then Plan 3 (backup export/import, GitHub backup, How-to demos, polish). Add the file map from this plan's File Structure table. In `docs/DECISIONS.md` under "Decided" add: repo `Choralet/up` is **private or public** (state which one actually happened in Task 1). In `docs/PLAN.md` milestone table mark milestones 2, 3 and 4 as done.

- [ ] **Step 6: Commit and deploy**

```bash
git add -A
git commit -m "docs: mark Plan 1 done; verified in browser and offline" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push
gh run watch --exit-status
curl -sI https://choralet.github.io/up/ | head -1
```

Expected: run succeeds, `HTTP/2 200`.

- [ ] **Step 7: Hand over to the user**

Tell the user: open `https://choralet.github.io/up/` in Safari on the iPhone, Share, Add to Home Screen, open from the icon. Ask them to try one full level-up on Wall push-up and report anything confusing. Remind them what Plan 2 and Plan 3 contain.
