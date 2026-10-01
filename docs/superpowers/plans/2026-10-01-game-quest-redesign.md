# Game Quest Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen of Up in the approved Game Quest look (rounded Nunito, chunky pressable cards, branch level badges and bars, short reward moments) without changing behaviour or saved data.

**Architecture:** Plain CSS, restyled in place. A new `src/tokens.css` holds three token layers (primitive → semantic → legacy aliases) and is checked by a contrast unit test. Shared building blocks are a few small React components (`Icon`, `LevelBadge`, `XpBar`, `BranchLevel`, `Streak`) plus restyled existing classes (`.cta`, `.group`, `.card`, `.sheet`, `.seg`, `.pill`). Screens change one task at a time; a CDP screenshot script (`scripts/shots.mjs`) checks every task visually.

**Tech Stack:** React 19, TypeScript, Vite 8 + vite-plugin-pwa, Vitest + Testing Library (jsdom), headless Chrome over the DevTools Protocol (Node 26 built-in `WebSocket`/`fetch`).

**Spec:** `docs/superpowers/specs/2026-10-01-game-quest-redesign-design.md` (approved mockups: `docs/mockups/game-quest.html`).

## Global Constraints

- Work on branch `redesign-game-quest`. Never push. Never merge to `main` (pushing `main` deploys to the user's phone).
- No new npm dependencies. The only new asset is the Nunito font file (SIL OFL), bundled, never loaded from Google.
- No behaviour, data or backup changes: `Progress`, `sanitizeProgress`, `progressHash`, storage keys stay as they are.
- Text on any bright fill (buttons, badges, node fills, icon tiles) is `var(--on-color)` (`#2b1a00`), never white.
- Contrast: 4.5:1 for all text pairs in both modes, enforced by `src/tokens.test.ts`. Never lower the threshold or exempt a pair; change the colour.
- Touch targets at least 44×44 px. Icons are inline SVG from `src/ui/Icon.tsx` (or the existing tab-bar SVGs), never emoji or text glyphs. Decorative icons are `aria-hidden`.
- Button and section labels become uppercase **through CSS only** (`text-transform`). DOM text and accessible names stay exactly as today ("Log Set", "Level Up", "Not Yet", "Done").
- All animation lives inside `@media (prefers-reduced-motion: no-preference)` in `src/styles.css`. Entrance animations use `animation-fill-mode: backwards`, never `both`/`forwards`, on anything that contains sheets or fixed elements (see `AGENTS.md` Gotchas). Animate `transform`, `opacity` or `clip-path`, not `width`/`height`.
- CSS deletion lists name rules by selector. If a listed rule is already gone (an earlier task removed it), skip it; never delete a rule that a later task still styles without replacing it.
- Keep an `aria-live` element stable; re-key only an inner span (AGENTS.md).
- Sheets render outside fixed containers (AGENTS.md).
- Each task ends with `npm test` green, `npm run build` green, and the visual check (`scripts/shots.mjs`) looked at in dark **and** light.
- Every commit message ends with this trailer block (shown in each commit step):
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
  ```

## Review Focus

1. **Larger text on Legs + Core day:** two level blocks, the streak and the title must fit at 125% text without overflowing or wrapping a goal. Pinned by the `fri` scenario run with `LARGE=1` in Task 7.
2. **The last exercise of a branch:** the level-up bar must never pass 100% and a branch with 0 exercises shows an empty bar, not `NaN`. Pinned by the `branchLevel` and `afterLevel` tests in Task 6.
3. **Reduce Motion:** the level-up card, finish totals and bars must show their final state with no animation. Pinned by the `useCountUp` jsdom test and the `REDUCE=1` shots run in Task 12.
4. **Offline first launch after update:** the Nunito file must be in the service-worker precache or the app falls back to the system font offline. Pinned by the `grep woff2 dist/sw.js` check in Task 2.
5. **Long exercise names** ("Chest-to-wall handstand hold", "Pseudo planche push-up") in quest cards and tree labels must wrap without pushing the tick/chevron off the card. Pinned by the layout check output of `scripts/shots.mjs` in Tasks 7 and 9 (must report no `text overflows` / `past viewport`).

## File map

| File | Change |
|---|---|
| `scripts/shots.mjs` | **Create.** Phone-size screenshots + layout check over CDP |
| `src/tokens.css` | **Create.** Design tokens (primitive, semantic per mode, legacy aliases), font face |
| `src/tokens.test.ts` | **Create.** Parses `tokens.css`, asserts contrast of every text pair |
| `src/assets/fonts/nunito-latin-wght.woff2`, `src/assets/fonts/OFL.txt` | **Create.** Bundled font + licence |
| `src/ui/Icon.tsx`, `src/ui/Icon.test.tsx` | **Create.** Inline SVG icon set |
| `src/ui/Level.tsx`, `src/ui/Level.test.tsx` | **Create.** `LevelBadge`, `XpBar`, `BranchLevel`, `Streak` |
| `src/lib/useCountUp.ts`, `src/lib/useCountUp.test.ts` | **Create.** Count-up hook for Finish Workout |
| `src/engine/stats.ts`, `stats.test.ts` | Add `branchLevel`, `afterLevel`, `sessionMinutes` |
| `src/ui/branches.ts`, `branches.test.ts` | Replace `strong`/`SKILL_STRONG` with `edge`/`text`, add `accentStyle`, `nodeAccent` |
| `src/styles.css` | Restyled section by section |
| `src/main.tsx`, `vite.config.ts`, `index.html`, `package.json` | Token import, font precache, theme colours, `shots` script |
| `src/ui/*.tsx` (most screens) | Classes instead of inline styles, icons, level blocks |
| `src/ui/Ring.tsx` | **Delete** (replaced by level cards) |
| `public/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | New colours |
| Docs: `DECISIONS.md`, `UI-REFERENCES.md`, `AGENTS.md`, `IPHONE-TEST.md`, spec | Updated in Task 14 |

---

### Task 1: Screenshot tool and baseline

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm run shots -- <outDir> [scenario …]` writes `<outDir>/<scenario>-<dark|light>[-large][-reduce].png` and prints layout issues per shot. Env: `UP_URL` (default `http://localhost:4173/up/`), `LARGE=1` (html font-size 125%), `REDUCE=1` (reduced motion), `CHROME` (binary path). Every later task uses it.

- [ ] **Step 1: Write the script**

```js
// scripts/shots.mjs
// Phone-size screenshots of the built app, driven over the Chrome DevTools Protocol, plus a quick layout check.
// Usage: npm run build && npx vite preview --port 4173 --strictPort   (leave running), then
//        npm run shots -- <outDir> [scenario ...]
// Env: UP_URL, CHROME, LARGE=1 (125% text), REDUCE=1 (prefers-reduced-motion: reduce)
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = process.env.UP_URL ?? 'http://localhost:4173/up/'
const LARGE = process.env.LARGE === '1'
const REDUCE = process.env.REDUCE === '1'
const PORT = 9333
const [outDir = 'shots', ...only] = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Dates as [year, monthIndex, day] (month is 0-based, like src/App.test.tsx). 2026-09-21 is a Monday.
const MON = [2026, 8, 21], TUE = [2026, 8, 22], FRI = [2026, 8, 25]
const log = (nodeId, value, date, at) => ({ nodeId, value, date, at })
const SEED = {
  onboarded: true,
  seenAchievements: null,
  completed: ['push-wall', 'push-incline', 'push-knee', 'push-pike-hold', 'pull-hang', 'pull-row-high', 'legs-assisted', 'legs-bridge', 'core-deadbug', 'core-lying-raise'],
  logs: [
    log('push-knee', 10, '2026-09-14', 1), log('push-knee', 10, '2026-09-14', 2), log('push-knee', 10, '2026-09-14', 3),
    log('pull-hang', 30, '2026-09-16', 4), log('legs-assisted', 10, '2026-09-18', 5),
    log('push-standard', 10, '2026-09-21', 1790000000000), log('push-standard', 10, '2026-09-21', 1790000600000),
  ],
}

// steps: ['text', label] clicks the first button/link/tab whose accessible label or text is (or starts with) label;
//        ['sel', css] clicks the first element matching css; ['wait', ms]
const SCENARIOS = {
  today: { steps: [] },
  fri: { date: FRI, steps: [] },
  rest: { date: TUE, steps: [] },
  finish: { steps: [['text', 'Finish Workout']] },
  log: { steps: [['text', 'Push-up']] },
  levelup: { steps: [['text', 'Push-up'], ['text', 'Log Set']] },
  hold: { date: FRI, steps: [['text', 'Plank'], ['text', 'Start'], ['wait', 4500]] },
  tree: { steps: [['text', 'Tree']] },
  node: { steps: [['text', 'Tree'], ['sel', '[aria-label^="Push-up,"]']] },
  skills: { steps: [['text', 'Skills']] },
  roadmap: { steps: [['text', 'Skills'], ['text', 'Roadmap']] },
  progress: { steps: [['text', 'Progress']] },
  settings: { steps: [['sel', '[aria-label="Settings"]']] },
  onboarding: { seed: { onboarded: false }, steps: [] },
}

function dateInit([y, m, d]) {
  return `(() => {
    const T = new Date(${y}, ${m}, ${d}, 12).getTime(), D = Date, t0 = performance.now()
    class F extends D { constructor(...a) { super(...(a.length ? a : [T + (performance.now() - t0)])) } static now() { return T + (performance.now() - t0) } }
    window.Date = F
    ${LARGE ? "addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '125%' })" : ''}
  })()`
}

const seedJs = (p) => `new Promise((ok, no) => {
  const r = indexedDB.open('keyval-store')
  r.onupgradeneeded = () => r.result.createObjectStore('keyval')
  r.onsuccess = () => {
    const tx = r.result.transaction('keyval', 'readwrite')
    tx.objectStore('keyval').put(${JSON.stringify(p)}, 'up.progress')
    tx.oncomplete = () => { r.result.close(); ok(true) }
    tx.onerror = () => no(String(tx.error))
  }
  r.onerror = () => no(String(r.error))
})`

function clickJs([kind, arg]) {
  if (kind === 'sel') return `(() => { const el = document.querySelector(${JSON.stringify(arg)}); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true })()`
  return `(() => {
    const els = [...document.querySelectorAll('button, a, [role=button], [role=tab]')]
    const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim()
    const t = ${JSON.stringify(arg)}
    const el = els.find((e) => label(e) === t) || els.find((e) => label(e).startsWith(t))
    if (!el) return false
    el.click()
    return true
  })()`
}

/** Runs in the page: siblings of different heights in a row, text overflowing its box, anything past the viewport. */
function layoutCheck() {
  const out = []
  const name = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent || '').trim().slice(0, 30)}"`
  const clipsX = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll' || o === 'hidden') return true
    }
    return false
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg')) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const cs = getComputedStyle(el)
    if ((r.right > innerWidth + 1 || r.left < -1) && !clipsX(el)) out.push(`past viewport: ${name(el)}`)
    if (el.children.length === 0 && cs.display !== 'inline' && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1) out.push(`text overflows: ${name(el)}`)
    if (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')) {
      const hs = [...el.children]
        .filter((k) => k.matches('button, a, .pill, .howto, .pillbtn') && k.getBoundingClientRect().height)
        .map((k) => k.getBoundingClientRect().height)
      if (hs.length > 1 && Math.max(...hs) - Math.min(...hs) > 2) out.push(`uneven row: ${name(el)} ${hs.map(Math.round).join('/')}`)
    }
  }
  return [...new Set(out)]
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let id = 0
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    const p = msg.id && pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    if (msg.error) p.no(new Error(msg.error.message)); else p.ok(msg.result)
  }
  await new Promise((ok) => (ws.onopen = ok))
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; pending.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })) })
  return { send, close: () => ws.close() }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'up-shots-'))}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
  try {
    let list
    for (let i = 0; i < 50 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() } catch { await sleep(200) } }
    const page = list.find((t) => t.type === 'page')
    const c = await cdp(page.webSocketDebuggerUrl)
    await c.send('Page.enable')
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    const evalJs = async (expression) => (await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
    const names = only.length ? only : Object.keys(SCENARIOS)
    for (const scheme of ['dark', 'light']) {
      await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: REDUCE ? 'reduce' : 'no-preference' }] })
      for (const nameKey of names) {
        const sc = SCENARIOS[nameKey]
        if (!sc) throw new Error(`Unknown scenario ${nameKey}`)
        const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: dateInit(sc.date ?? MON) })
        await c.send('Page.navigate', { url: BASE }); await sleep(1200)
        await evalJs(seedJs({ ...SEED, ...(sc.seed ?? {}) }))
        await c.send('Page.navigate', { url: BASE }); await sleep(1500)
        for (const step of sc.steps) {
          if (step[0] === 'wait') { await sleep(step[1]); continue }
          if (!(await evalJs(clickJs(step)))) console.warn(`  ${nameKey}: could not click ${step[1]}`)
          await sleep(900)
        }
        await sleep(600)
        const file = join(outDir, `${nameKey}-${scheme}${LARGE ? '-large' : ''}${REDUCE ? '-reduce' : ''}.png`)
        writeFileSync(file, Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
        const issues = await evalJs(`(${layoutCheck.toString()})()`)
        console.log(`${file}${issues.length ? '' : '  ok'}`)
        for (const i of issues) console.log(`  ${i}`)
        await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier })
      }
    }
    c.close()
  } finally {
    chrome.kill()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add after `"test:watch"`:

```json
    "shots": "node scripts/shots.mjs"
```

- [ ] **Step 3: Take the baseline of the current app**

Run: `npm run build`, then start `npx vite preview --port 4173 --strictPort` in the background, then:
`npm run shots -- /private/tmp/up-shots/baseline`
Expected: 28 PNGs (14 scenarios × 2 schemes), each line printed, no crash. Open `today-dark.png`, `log-dark.png`, `levelup-dark.png`, `hold-dark.png`: Today shows Push Day with Push-up at 2 sets, Log shows Push-up, level-up shows "You hit 3 × 10", hold shows the full-screen hold. If a click warning appears, fix the scenario's step label to match the current app (do not change the app).

- [ ] **Step 4: Commit**

```bash
git add scripts/shots.mjs package.json
git commit -F- <<'EOF'
chore: phone-size screenshot and layout check script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 2: Design tokens, contrast test and bundled Nunito

**Files:**
- Create: `src/tokens.css`, `src/tokens.test.ts`, `src/assets/fonts/nunito-latin-wght.woff2`, `src/assets/fonts/OFL.txt`
- Modify: `src/main.tsx`, `src/styles.css` (remove old colour tokens), `vite.config.ts` (precache woff2)

**Interfaces:**
- Produces (CSS custom properties, used by every later task): `--bg --card --ink --ink2 --line --fill --on-color`; per accent `K` in `push pull legs core skill danger primary`: `--K` (fill), `--K-edge`, `--K-text`; `--gold --gold-edge`; `--font --fs-title --fs-heading --fs-body --fs-small --fs-label --fs-big`; `--r-sm --r-md --r-lg --r-sheet --r-pill --edge`. Legacy aliases kept until Task 14: `--label --label2 --label3 --sep --blue --blue-text`.

- [ ] **Step 1: Write the failing contrast test**

```ts
// src/tokens.test.ts
import css from './tokens.css?raw'

/** Every `--name: value` inside the first-level block that starts at `start`. */
function decls(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/** The text between the `{` after `index` and its matching `}`. */
function body(src: string, index: number): string {
  const open = src.indexOf('{', index)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  throw new Error('unbalanced braces')
}

function modes(): { light: Record<string, string>; dark: Record<string, string> } {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const media = src.indexOf('@media (prefers-color-scheme: dark)')
  const darkBlock = body(src, media)
  const outside = src.slice(0, media) + src.slice(src.indexOf(darkBlock) + darkBlock.length + 1)
  const light: Record<string, string> = {}
  for (const m of outside.matchAll(/:root\s*\{/g)) Object.assign(light, decls(body(outside, m.index!)))
  return { light, dark: { ...light, ...decls(darkBlock) } }
}

function resolve(vars: Record<string, string>, name: string, seen: string[] = []): string {
  const v = vars[name]
  if (v === undefined) throw new Error(`missing ${name}`)
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  if (!ref) return v
  if (seen.includes(name)) throw new Error(`cycle at ${name}`)
  return resolve(vars, ref[1], [...seen, name])
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
function lum(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
/** `amount` of `top` over `base`, like color-mix(in srgb, top amount, base). */
const mix = (top: string, base: string, amount: number) =>
  '#' + rgb(top).map((c, i) => Math.round(c * amount + rgb(base)[i] * (1 - amount)).toString(16).padStart(2, '0')).join('')

const ACCENTS = ['push', 'pull', 'legs', 'core', 'skill', 'danger', 'primary']

describe.each(['light', 'dark'] as const)('%s mode text contrast (at least 4.5:1)', (mode) => {
  const vars = modes()[mode]
  const c = (n: string) => resolve(vars, n)
  const pairs: [string, string, string][] = [
    ['ink on bg', c('--ink'), c('--bg')],
    ['ink2 on bg', c('--ink2'), c('--bg')],
    ['ink on fill', c('--ink'), c('--fill')],
    ['ink2 on fill', c('--ink2'), c('--fill')],
    ['on-color on gold', c('--on-color'), c('--gold')],
    ...ACCENTS.flatMap((k): [string, string, string][] => [
      [`${k}-text on bg`, c(`--${k}-text`), c('--bg')],
      [`${k}-text on fill`, c(`--${k}-text`), c('--fill')],
      [`${k}-text on a 14% ${k} tint`, c(`--${k}-text`), mix(c(`--${k}`), c('--bg'), 0.14)],
      [`on-color on ${k}`, c('--on-color'), c(`--${k}`)],
    ]),
  ]
  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/tokens.test.ts`
Expected: FAIL (cannot resolve `./tokens.css?raw`).

- [ ] **Step 3: Download the font and licence**

```bash
mkdir -p src/assets/fonts
curl -fsSL -o src/assets/fonts/nunito-latin-wght.woff2 https://cdn.jsdelivr.net/npm/@fontsource-variable/nunito@5/files/nunito-latin-wght-normal.woff2
curl -fsSL -o src/assets/fonts/OFL.txt https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt
ls -l src/assets/fonts && head -3 src/assets/fonts/OFL.txt
```
Expected: the woff2 is 30–80 KB; OFL.txt starts with "Copyright 2014 The Nunito Project Authors".

- [ ] **Step 4: Write `src/tokens.css`**

```css
/* Game Quest design tokens. Layers: primitive (raw values, --p-*) → semantic (meaning, per mode) → component (in styles.css).
   Components use semantic tokens only. Every text pair is contrast-checked by src/tokens.test.ts. */

@font-face {
  font-family: 'Nunito';
  font-style: normal;
  font-display: swap;
  font-weight: 200 1000;
  src: url('./assets/fonts/nunito-latin-wght.woff2') format('woff2');
}

:root {
  /* primitive: brights, their darker edge, and a darker ink for text on white */
  --p-orange: #ff9600; --p-orange-edge: #cc7800; --p-orange-ink: #9e5c00;
  --p-blue: #1cb0f6; --p-blue-edge: #1899d6; --p-blue-ink: #12729f;
  --p-green: #58cc02; --p-green-edge: #46a302; --p-green-ink: #357c01;
  --p-purple: #ce82ff; --p-purple-edge: #a568cc; --p-purple-ink: #8a57aa;
  --p-pink: #ff4b8b; --p-pink-edge: #d63a70; --p-pink-ink: #ba3665; --p-pink-glow: #ff6b9e;
  --p-red: #ff4b4b; --p-red-edge: #d93636; --p-red-ink: #bf3838; --p-red-glow: #ff7070;
  --p-yellow: #ffc800; --p-yellow-edge: #cc9a00;
  --p-night-900: #131f24; --p-night-800: #202f36; --p-night-600: #37464f; --p-night-300: #8fa6b2; --p-night-50: #f1f7fb;
  --p-white: #ffffff; --p-gray-100: #f2f2f2; --p-gray-200: #e5e5e5; --p-gray-600: #666666; --p-gray-800: #3c3c3c;
  --p-cocoa: #2b1a00;

  /* semantic, light mode */
  --bg: var(--p-white);
  --card: var(--p-white);
  --ink: var(--p-gray-800);
  --ink2: var(--p-gray-600);
  --line: var(--p-gray-200);
  --fill: var(--p-gray-100);
  --on-color: var(--p-cocoa);
  --push: var(--p-orange); --push-edge: var(--p-orange-edge); --push-text: var(--p-orange-ink);
  --pull: var(--p-blue); --pull-edge: var(--p-blue-edge); --pull-text: var(--p-blue-ink);
  --legs: var(--p-green); --legs-edge: var(--p-green-edge); --legs-text: var(--p-green-ink);
  --core: var(--p-purple); --core-edge: var(--p-purple-edge); --core-text: var(--p-purple-ink);
  --skill: var(--p-pink); --skill-edge: var(--p-pink-edge); --skill-text: var(--p-pink-ink);
  --danger: var(--p-red); --danger-edge: var(--p-red-edge); --danger-text: var(--p-red-ink);
  --primary: var(--pull); --primary-edge: var(--pull-edge); --primary-text: var(--pull-text);
  --gold: var(--p-yellow); --gold-edge: var(--p-yellow-edge);

  /* type: rem so larger text scales the app */
  --font: 'Nunito', ui-rounded, system-ui, sans-serif;
  --fs-title: 1.875rem; --fs-heading: 1.625rem; --fs-body: 1rem; --fs-small: 0.8125rem; --fs-label: 0.75rem; --fs-big: 6rem;

  /* shape and depth: a solid bottom edge instead of a blurred shadow */
  --r-sm: 12px; --r-md: 16px; --r-lg: 18px; --r-sheet: 28px; --r-pill: 999px;
  --edge: 4px;

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: var(--p-night-900);
    --card: var(--p-night-900);
    --ink: var(--p-night-50);
    --ink2: var(--p-night-300);
    --line: var(--p-night-600);
    --fill: var(--p-night-800);
    --push-text: var(--p-orange);
    --pull-text: var(--p-blue);
    --legs-text: var(--p-green);
    --core-text: var(--p-purple);
    --skill-text: var(--p-pink-glow);
    --danger-text: var(--p-red-glow);
  }
}

/* legacy names still used in styles.css; removed in the final task */
:root {
  --label: var(--ink); --label2: var(--ink2); --label3: var(--ink2); --sep: var(--line);
  --blue: var(--primary-text); --blue-text: var(--primary-text);
}
```

Note: `--primary-text` resolves to `--pull-text`, which the dark block overrides, so `--primary-text` follows the mode automatically.

- [ ] **Step 5: Run the contrast test**

Run: `npx vitest run src/tokens.test.ts`
Expected: PASS, 2 × 33 cases. If a pair fails, darken that `--p-*-ink` (light) or lighten the dark-mode value until it passes; never lower 4.5.

- [ ] **Step 6: Wire tokens in, remove the old colour tokens, precache the font**

`src/main.tsx`: add `import './tokens.css'` on the line **before** `import './styles.css'`.

`src/styles.css`: delete the first block (`:root { --bg: #f2f2f7; … color-scheme: light dark; }`) and the `@media (prefers-color-scheme: dark) { :root { … } }` block right after it (lines 1–14), and delete these two later lines:
```css
:root { --blue-text: #0060c8; }
@media (prefers-color-scheme: dark) { :root { --blue-text: #0a84ff; } }
```
Change the `body` rule's font to:
```css
body {
  font: 700 var(--fs-body)/1.45 var(--font);
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
```

`vite.config.ts`: change `globPatterns: ['**/*.{js,css,html,svg,png,json}']` to `globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}']`.

- [ ] **Step 7: Run all tests and build, check the font is precached**

Run: `npm test && npm run build && ls dist/assets/*.woff2 && grep -c woff2 dist/sw.js`
Expected: all tests pass; one `nunito-latin-wght-*.woff2` in `dist/assets`; the grep count is at least 1.

- [ ] **Step 8: Visual check**

Restart the preview (it serves the old build otherwise), then `npm run shots -- /private/tmp/up-shots/t2 today progress settings`. Expected: Nunito is visible (rounded letters), dark background is navy `#131f24`, light background white. Layout may look half-old; that is expected until Task 6.

- [ ] **Step 9: Commit**

```bash
git add src/tokens.css src/tokens.test.ts src/assets/fonts src/main.tsx src/styles.css vite.config.ts
git commit -F- <<'EOF'
feat: Game Quest design tokens, contrast test and bundled Nunito

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 3: Branch accents (`accentStyle`)

**Files:**
- Modify: `src/ui/branches.ts`, `src/ui/branches.test.ts`, `src/ui/LogScreen.tsx`, `src/ui/NodeSheet.tsx`, `src/ui/LevelUpSheet.tsx`, `src/ui/TreeView.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type AccentKey = Branch | 'skill'
  export const BRANCH_META: Record<Branch, { label: string; short: string; color: string; edge: string; text: string }>
  export function accentStyle(key: AccentKey): CSSProperties // sets --accent, --accent-edge, --accent-text
  export function nodeAccent(node: ExerciseNode): CSSProperties // skill steps → 'skill', else the node's branch
  ```
  `SKILL_STRONG` and `strong` are removed.

- [ ] **Step 1: Replace the white-text test with accent tests**

Replace the whole of `src/ui/branches.test.ts` with:

```ts
import { accentStyle, BRANCH_META, nodeAccent } from './branches'
import { NODES } from '../data/nodes'

describe('accentStyle', () => {
  it('points a branch at its fill, edge and text tokens', () => {
    expect(accentStyle('pull')).toEqual({ '--accent': 'var(--pull)', '--accent-edge': 'var(--pull-edge)', '--accent-text': 'var(--pull-text)' })
  })
  it('has a skill accent', () => {
    expect(accentStyle('skill')).toEqual({ '--accent': 'var(--skill)', '--accent-edge': 'var(--skill-edge)', '--accent-text': 'var(--skill-text)' })
  })
  it('every branch has its own tokens', () => {
    for (const [b, m] of Object.entries(BRANCH_META)) expect([m.color, m.edge, m.text]).toEqual([`var(--${b})`, `var(--${b}-edge)`, `var(--${b}-text)`])
  })
})

describe('nodeAccent', () => {
  it('uses pink for skill steps and the branch colour for strength exercises', () => {
    const skill = NODES.find((n) => n.kind === 'skill')!
    const strength = NODES.find((n) => n.kind === 'strength' && n.branch === 'legs')!
    expect(nodeAccent(skill)).toEqual(accentStyle('skill'))
    expect(nodeAccent(strength)).toEqual(accentStyle('legs'))
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/ui/branches.test.ts`
Expected: FAIL (`accentStyle` is not exported).

- [ ] **Step 3: Implement**

Replace `src/ui/branches.ts` with:

```ts
import type { CSSProperties } from 'react'
import type { Branch, ExerciseNode } from '../data/types'

export type AccentKey = Branch | 'skill'

const meta = (b: AccentKey) => ({ color: `var(--${b})`, edge: `var(--${b}-edge)`, text: `var(--${b}-text)` })

/** `color` fills buttons, badges and nodes (dark text on it); `edge` is the darker pressable edge; `text` is the colour as text on the page. */
export const BRANCH_META: Record<Branch, { label: string; short: string; color: string; edge: string; text: string }> = {
  push: { label: 'Push', short: 'Pu', ...meta('push') },
  pull: { label: 'Pull', short: 'Pl', ...meta('pull') },
  legs: { label: 'Legs', short: 'Le', ...meta('legs') },
  core: { label: 'Core', short: 'Co', ...meta('core') },
}

/** CSS variables that colour a screen, sheet or card in one branch (or the skill pink). */
export function accentStyle(key: AccentKey): CSSProperties {
  const m = meta(key)
  return { '--accent': m.color, '--accent-edge': m.edge, '--accent-text': m.text } as CSSProperties
}

export const nodeAccent = (node: ExerciseNode): CSSProperties => accentStyle(node.kind === 'skill' ? 'skill' : node.branch)
```

Update the users:
- `src/ui/LogScreen.tsx`: import `{ BRANCH_META, nodeAccent } from './branches'` (drop `SKILL_STRONG`); change the root to `<div className="log" style={nodeAccent(node)}>`; remove `type CSSProperties` from the react import if now unused.
- `src/ui/NodeSheet.tsx`: same import change; the sheet's `style={{ '--accent': …, '--accent-strong': … } as CSSProperties}` becomes `style={nodeAccent(node)}`.
- `src/ui/LevelUpSheet.tsx`: the sheet's `style={{ '--accent': BRANCH_META[node.branch].color, '--accent-strong': BRANCH_META[node.branch].strong } as CSSProperties}` becomes `style={nodeAccent(node)}`; the Level Up button loses its `style` prop.
- `src/ui/TreeView.tsx`: `style={{ '--accent': BRANCH_META[branch].color, width: … } as CSSProperties}` becomes `style={{ ...accentStyle(branch), width: \`${Math.round(zoom * 100)}%\` }}` (import `accentStyle`).
- In `src/styles.css`, replace every `var(--accent-strong, var(--accent))` and `var(--accent-strong, var(--accent, var(--push)))` with `var(--accent)`.

Run `grep -rn "accent-strong\|SKILL_STRONG\|\.strong" src` — expected: no output.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -F- <<'EOF'
refactor: branch accents as fill, edge and text tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 4: Icon set

**Files:**
- Create: `src/ui/Icon.tsx`, `src/ui/Icon.test.tsx`
- Modify: `src/ui/TodayScreen.tsx`, `src/ui/NodeSheet.tsx`, `src/ui/RoadmapSheet.tsx`, `src/ui/Onboarding.tsx`, `src/ui/LevelUpSheet.tsx`, `src/ui/ProgressScreen.tsx`, `src/ui/AchievementCard.tsx`, `src/styles.css`

**Interfaces:**
- Produces:
  ```ts
  export type IconName = 'check' | 'chevron' | 'gear' | 'star' | 'lock' | 'plus' | 'minus' | 'dots' | 'flame' | 'bolt' | 'push' | 'pull' | 'legs' | 'core'
  export function Icon(props: { name: IconName; size?: number; className?: string }): JSX.Element // aria-hidden svg.icon
  export const ICON_NAMES: IconName[]
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/Icon.test.tsx
import { render } from '@testing-library/react'
import { Icon, ICON_NAMES } from './Icon'

describe('Icon', () => {
  it.each(ICON_NAMES)('%s is a decorative svg with a drawing', (name) => {
    const { container } = render(<Icon name={name} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg.children.length).toBeGreaterThan(0)
  })
  it('takes a size and an extra class', () => {
    const { container } = render(<Icon name="check" size={14} className="tick" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '14')
    expect(svg).toHaveClass('icon', 'tick')
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/ui/Icon.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/ui/Icon.tsx
import type { ReactElement } from 'react'

/** Line icons on a 24 grid, drawn with currentColor. `solid` parts are filled. Never emoji. */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" />
    </>
  ),
  star: <path className="solid" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.9l-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
  flame: <path className="solid" d="M12 2.5c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  push: <path d="M5 16l7-7 7 7" />,
  pull: <path d="M5 8l7 7 7-7" />,
  legs: <path d="M9 3v7l4 4v7M15 21v-5" />,
  core: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle className="solid" cx="12" cy="12" r="2.5" />
    </>
  ),
} satisfies Record<string, ReactElement>

export type IconName = keyof typeof PATHS
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}
```

Add to `src/styles.css` (after the `button { … }` base rule):

```css
.icon { display: block; flex: none; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.icon .solid { fill: currentColor; stroke: none; }
.icon path[d^="M6 12h.01"] { stroke-width: 4; }
```

- [ ] **Step 4: Run the icon test**

Run: `npx vitest run src/ui/Icon.test.tsx` — Expected: PASS.

- [ ] **Step 5: Replace every glyph icon**

Import `{ Icon } from './Icon'` in each file below and replace:

| File | Before | After |
|---|---|---|
| `TodayScreen.tsx` | `<button className="gear" aria-label="Settings" onClick={onSettings}>⚙</button>` | `<button className="gear" aria-label="Settings" onClick={onSettings}><Icon name="gear" size={22} /></button>` |
| `TodayScreen.tsx` | `<span className="tick" aria-label="Goal reached">✓</span>` | `<span className="tick" role="img" aria-label="Goal reached"><Icon name="check" /></span>` |
| `TodayScreen.tsx` | `<span className="tick done" aria-label="Sets done">✓</span>` | `<span className="tick done" role="img" aria-label="Sets done"><Icon name="check" /></span>` |
| `TodayScreen.tsx` | `<span className="chev" aria-hidden="true">›</span>` | `<Icon name="chevron" className="chev" />` |
| `TodayScreen.tsx`, `Onboarding.tsx` | `<span className="box" aria-hidden="true">{on ? '✓' : ''}</span>` (Onboarding: `{days[i] ? '✓' : ''}`) | `<span className="box" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>` (Onboarding: `{days[i] && …}`) |
| `NodeSheet.tsx`, `RoadmapSheet.tsx` | `{ok ? '✓' : '…'}` inside `.req span` | `<Icon name={ok ? 'check' : 'dots'} size={12} />` |
| `LevelUpSheet.tsx` | `<div className="medal" aria-hidden="true">✓</div>` | `<div className="medal" aria-hidden="true"><Icon name="check" size={34} /></div>` |
| `ProgressScreen.tsx`, `AchievementCard.tsx` | `<span className="achmedal" aria-hidden="true">★</span>` | `<span className="achmedal" aria-hidden="true"><Icon name="star" size={22} /></span>` |

Add to `src/styles.css`:

```css
.gear, .medal, .achmedal, .req span, .check .box { display: grid; place-items: center; }
```

Leave the `→` arrows in `GithubSection.tsx` alone: they are words in setup instructions ("your picture → Settings"), not icons.

Run: `grep -rnE "[⚙✓★›]" src/ui --include=*.tsx` — Expected: no output.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass (the tests read accessible names, which did not change).

- [ ] **Step 7: Commit**

```bash
git add src/ui src/styles.css
git commit -F- <<'EOF'
feat: SVG icon set replaces glyph icons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 5: Base components (buttons, cards, sheets, pills, tabs, tab bar, inputs)

**Files:**
- Modify: `src/styles.css`, `src/ui/ConfirmSheet.tsx`, `src/ui/SetSheet.tsx`, `src/ui/GithubSection.tsx`, `src/ui/TabBar.tsx`

**Interfaces:**
- Consumes: tokens (Task 2), `--accent*` (Task 3).
- Produces (CSS classes later tasks rely on): `.cta` (chunky primary in `--accent`, default `--primary`), `.cta.sec` (outline), `.cta.danger` (red text, combine with `.sec`), `.group`/`.card` (2 px border + edge), `.sheet.top` / `.scrim.top` (z 31/30), `.sheet.left`, `.pillbtn`, `.pill`, `.seg`, `.note` (footnote under a control), `.hint` (12 px helper), `.sr-only`.

- [ ] **Step 1: Replace the base and component rules**

In `src/styles.css`, delete these existing rules (each selector's whole rule; search by selector):
`.large`, `.sub`, `.navt`, `.tabbar`, `.tabbar button`, `.tabbar button[aria-current='page']`, `.group`, `.row`, `.row + .row, .group > li + li > .row`, `.dot`, `.row .t b`, `.row .t span`, `.row .chev`, `.tag`, `.cta`, `.cta.sec`, `.cta:disabled`, `.seg`, `.seg button`, `.seg button.on`, `.scrim`, `.sheet`, `.sheet h2, .sheet h3`, `.sheet p`, `.eyebrow`, `.pill`, `.pill.skill`, `.req`, `.req span`, `.req .ok`, `.req .nx`, `.choice` and its four related rules (`.choice[aria-pressed='true']`, `.choice b`, `.choice em`), `.gear`, `.card`, `.check`, `.check + .check`, `.check .box`, `.check[aria-checked='true'] .box`, `.hdr`, `.pillbtn`, `.pillbtn:disabled`, `.linkbtn`, `.selrow select`, `.form label`, `.form input`, `.howto`, `.howto::before`, `a.howto`, `.histbtn::before`, `.pills`, `.pills .pill, .pills .howto`, `.head .pillbtn, .achcard .pillbtn`, `.linkbtn.inline`, `.switch`, `.switch::after`, `.switch.on`, `.switch.on::after`, `.selrow input[type='time']`, and the whole "Plan 5 polish" and "Plan 5 review polish" groups (from `/* Plan 5 polish` through the `.cta.sec { color: var(--blue-text); }` line, keeping `.goalup`, `.histchart*` and the rules after them). Before deleting the "Plan 5 polish" group, move its `.status`, `.howtoken`, `.howtoken summary`, `.howtoken ol` and `.tsvg .n.locked .lb` lines out of it unchanged; later tasks restyle them.

Then add this block right after the `.icon` rules from Task 4:

```css
/* ============ Base ============ */
:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.large { font-size: var(--fs-title); font-weight: 900; letter-spacing: -0.01em; line-height: 1.15; }
.title-sm { font-size: var(--fs-heading); }
.sub { color: var(--ink2); font-size: var(--fs-small); font-weight: 700; }
.hint { color: var(--ink2); font-size: var(--fs-label); font-weight: 700; margin-top: 6px; }
.note { color: var(--ink2); font-size: var(--fs-small); font-weight: 700; margin: 10px 4px 0; }
.navt { text-align: center; font-size: 1.125rem; font-weight: 900; margin-bottom: 8px; }
.hdr, .eyebrow, .tag { font-size: var(--fs-label); font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink2); }
.hdr { margin: 20px 4px -8px; }
.eyebrow.accent, .tag.accent { color: var(--accent-text); }
.tag { display: block; color: var(--skill-text); }
.tag.extra { color: var(--ink2); }
.error { color: var(--danger-text); }

/* ============ Cards and lists ============ */
.group, .card { background: var(--card); border: 2px solid var(--line); border-radius: var(--r-lg); box-shadow: 0 var(--edge) 0 var(--line); }
.group { overflow: hidden; margin: 16px 0; }
.card { padding: 14px 16px; margin: 16px 0; }
.card .sub { margin-top: 4px; }
.row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; text-align: left; min-height: 56px; }
.row + .row, .group > li + li > .row { border-top: 2px solid var(--line); }
.row .t { flex: 1; min-width: 0; display: block; }
.row .t b { display: block; font-size: var(--fs-body); font-weight: 800; }
.t b { overflow-wrap: anywhere; }
.row .t span { font-size: var(--fs-small); color: var(--ink2); }
.row .chev { color: var(--ink2); }
.check { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; text-align: left; min-height: 52px; font-weight: 800; }
.check + .check { border-top: 2px solid var(--line); }
.check .box { width: 26px; height: 26px; border-radius: 9px; border: 2px solid var(--line); flex: none; color: var(--on-color); }
.check[aria-checked='true'] .box { background: var(--legs); border-color: var(--legs); box-shadow: 0 2px 0 var(--legs-edge); }
.check .amount { margin-left: auto; font-size: var(--fs-small); color: var(--ink2); }

/* ============ Buttons ============ */
.cta {
  display: block; width: 100%; min-height: 52px; padding: 14px 16px; margin-top: 12px;
  border-radius: var(--r-md); background: var(--accent, var(--primary)); color: var(--on-color);
  box-shadow: 0 var(--edge) 0 var(--accent-edge, var(--primary-edge));
  font-size: 0.9375rem; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; text-align: center; text-decoration: none;
}
.cta.sec { background: transparent; color: var(--accent-text, var(--primary-text)); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line); }
.cta.danger { color: var(--danger-text); }
.cta:disabled, .pillbtn:disabled { opacity: 0.45; }
.pillbtn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 16px; margin: 4px 6px 0 0;
  border-radius: var(--r-md); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line);
  color: var(--accent-text, var(--primary-text)); font-size: 0.875rem; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase;
}
.head .pillbtn, .achcard .pillbtn { margin: 0; }
.linkbtn { display: block; text-align: left; color: var(--accent-text, var(--primary-text)); font-weight: 800; font-size: 0.875rem; padding: 6px 0; min-height: 44px; }
.linkbtn.inline { display: inline; padding: 0; min-height: 0; }
.gear { min-width: 44px; min-height: 44px; border-radius: var(--r-md); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line); color: var(--ink2); }
.cta:active:not(:disabled), .pillbtn:active:not(:disabled), .gear:active, .quest:active, .steps button:active, .choice:active, .howto:active {
  transform: translateY(var(--edge)); box-shadow: none;
}

/* ============ Pills ============ */
.pills { margin: 10px 0; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.pills.center { justify-content: center; }
.pill { display: inline-flex; align-items: center; white-space: nowrap; padding: 3px 12px; border-radius: var(--r-pill); background: var(--fill); font-size: var(--fs-small); font-weight: 800; color: var(--ink); }
.pill.skill { color: var(--skill-text); }
.howto { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: var(--r-pill); border: 2px solid var(--line); box-shadow: 0 3px 0 var(--line); color: var(--accent-text, var(--primary-text)); font-size: var(--fs-small); font-weight: 900; text-decoration: none; }
.pills .pill, .pills .howto { min-height: 44px; padding: 0 14px; line-height: 1; }

/* ============ Segmented tabs ============ */
.seg { display: flex; gap: 8px; margin: 10px 0; }
.seg button {
  flex: 1; min-height: 44px; border-radius: var(--r-sm); border: 2px solid var(--line); color: var(--ink2);
  font-size: var(--fs-label); font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
}
.seg button.on { border-color: var(--accent, var(--primary)); color: var(--accent-text, var(--primary-text)); background: color-mix(in srgb, var(--accent, var(--primary)) 14%, transparent); }

/* ============ Sheets ============ */
.scrim { position: fixed; inset: 0; background: rgb(0 0 0 / 0.5); z-index: 20; }
.sheet {
  position: fixed; left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 21;
  max-width: 464px; max-height: 88dvh; overflow: auto; margin: 0 auto; padding: 24px 18px 20px;
  background: var(--bg); border: 2px solid var(--line); border-radius: var(--r-sheet);
}
.scrim.top { z-index: 30; }
.sheet.top { z-index: 31; }
.sheet.left { text-align: left; }
.sheet h2, .sheet h3 { font-size: 1.375rem; font-weight: 900; }
.sheet p { color: var(--ink2); font-size: 0.875rem; margin: 6px 0; }
.choice { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left; padding: 12px 14px; margin: 10px 0; border-radius: var(--r-lg); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line); }
.choice[aria-pressed='true'] { border-color: var(--accent); box-shadow: 0 var(--edge) 0 var(--accent-edge); }
.choice b { display: block; font-size: var(--fs-body); font-weight: 900; color: var(--ink); }
.choice span { font-size: var(--fs-label); color: var(--ink2); }
.choice em { font-style: normal; font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; color: var(--on-color); background: var(--accent); padding: 4px 9px; border-radius: var(--r-pill); }
.req { font-size: var(--fs-small); margin-top: 6px; color: var(--ink2); display: flex; align-items: center; }
.req span { width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; flex: none; color: var(--on-color); }
.req .ok { background: var(--legs); }
.req .nx { background: var(--line); color: var(--ink); }

/* ============ Tab bar ============ */
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; display: flex; justify-content: center;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 2px solid var(--line);
}
.tabbar button { flex: 1 1 0; max-width: 96px; min-width: 0; min-height: 44px; font-size: 0.6875rem; font-weight: 800; color: var(--ink2); }
.tabbar button[aria-current='page'] { color: var(--primary-text); }
.tabbar svg { display: block; margin: 0 auto 2px; }

/* ============ Inputs ============ */
.selrow select, .selrow input[type='time'] {
  font: inherit; font-size: 16px; /* 16px stops iOS zooming the page on focus */ color: var(--primary-text);
  background: var(--fill); border: 2px solid var(--line); border-radius: var(--r-sm); padding: 6px 10px; min-height: 44px;
}
.form label { display: block; font-size: var(--fs-small); color: var(--ink2); margin: 10px 0 0; }
.form input { display: block; width: 100%; margin-top: 4px; font: inherit; font-size: 16px; color: var(--ink); background: var(--fill); border: 2px solid var(--line); border-radius: var(--r-sm); padding: 10px 12px; }
.switch { width: 51px; height: 31px; border-radius: 16px; background: var(--line); position: relative; flex: none; }
.switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 0 rgb(0 0 0 / 0.2); }
.switch.on { background: var(--legs); }
.switch.on::after { transform: translateX(20px); }
```

In the motion block (`@media (prefers-reduced-motion: no-preference)`), replace

```css
  button, .cta, a.howto { transition: transform 0.12s var(--ease), background-color 0.2s, opacity 0.2s; }
  button:active, .cta:active, a.howto:active { transform: scale(0.97); }
```
with
```css
  .cta, .pillbtn, .gear, .quest, .steps button, .choice, .howto { transition: transform 80ms var(--ease), box-shadow 80ms var(--ease), opacity 0.2s; }
  .switch { transition: background 0.2s; }
```

- [ ] **Step 2: Danger buttons and the tab bar icons**

- `src/ui/ConfirmSheet.tsx`: `className={a.tone === 'primary' ? 'cta' : 'cta sec'}` plus the `style` line become `className={a.tone === 'primary' ? 'cta' : a.tone === 'danger' ? 'cta sec danger' : 'cta sec'}` (delete the `style` prop).
- `src/ui/SetSheet.tsx`: `<button className="cta sec" style={{ color: 'var(--skill)' }} onClick={onRemove}>` → `<button className="cta sec danger" onClick={onRemove}>`.
- `src/ui/GithubSection.tsx`: the Disconnect button → `className="cta sec danger"` without `style`; the two `className="sub" … style={{ color: 'var(--skill)' …}}` elements → `className="sub error"` (keep `role="alert"` where present; drop `marginTop: 4`, `.card .sub` handles it); every other `className="sub" style={{ marginTop: 4 }}` → `className="sub"`; `<p className="sub" style={{ marginTop: 0 }}>` → `<p className="sub">`.
- `src/ui/TabBar.tsx`: change every `strokeWidth="1.8"` to `strokeWidth="2.4"` (the progress icon keeps `2.4`).

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass.

- [ ] **Step 4: Visual check**

Restart preview; `npm run shots -- /private/tmp/up-shots/t5 settings finish node progress`. Look at dark and light: buttons are chunky with a 4 px edge and dark uppercase text, outline buttons have a grey edge, sheets have 2 px borders, the Settings Disconnect/Remove-style buttons are red text. The layout check must print no `uneven row` or `past viewport` lines for these screens; fix CSS until it is clean.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/ui
git commit -F- <<'EOF'
feat: chunky Game Quest buttons, cards, sheets, pills, tabs and inputs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 6: Level helpers and level components

**Files:**
- Modify: `src/engine/stats.ts`, `src/engine/stats.test.ts`, `src/styles.css`
- Create: `src/ui/Level.tsx`, `src/ui/Level.test.tsx`

**Interfaces:**
- Consumes: `branchProgress`, `weeklyStreak` (stats.ts), `accentStyle`, `BRANCH_META` (Task 3), `Icon` (Task 4), `useProgress`.
- Produces:
  ```ts
  // stats.ts
  export interface Level { level: number; done: number; total: number; ratio: number }
  export function branchLevel(nodes: ExerciseNode[], progress: Progress, branch: Branch): Level
  export function afterLevel(l: Level): Level // one more exercise done, capped at total
  // Level.tsx
  export function LevelBadge(p: { branch: Branch; level: number; size?: 'sm' | 'lg' }): JSX.Element // aria-hidden
  export function XpBar(p: { ratio: number; from?: number; label: string }): JSX.Element // role="img"; animates from→ratio when from is given
  export function BranchLevel(p: { branch: Branch }): JSX.Element // badge + bar + "Push · 7 of 12"; bar label "Push: 7 of 12 steps"
  export function Streak(): JSX.Element // flame + "3 wk"; role="img" label "3 week streak" / "No streak yet"
  ```

- [ ] **Step 1: Write failing tests for the helpers**

Append to `src/engine/stats.test.ts` (and add `afterLevel, branchLevel` to its import from `./stats`):

```ts
describe('branchLevel', () => {
  const nodes = [N('a'), N('b', { requires: ['a'] }), N('c', { branch: 'pull' })]
  it('level is the number of finished exercises; the bar is finished over total', () => {
    const p: Progress = { ...initialProgress(nodes), completed: ['a'] }
    expect(branchLevel(nodes, p, 'push')).toEqual({ level: 1, done: 1, total: 2, ratio: 0.5 })
  })
  it('an empty branch has level 0 and an empty bar (never NaN)', () => {
    expect(branchLevel(nodes, initialProgress(nodes), 'legs')).toEqual({ level: 0, done: 0, total: 0, ratio: 0 })
  })
})

describe('afterLevel', () => {
  it('adds one finished exercise', () => {
    expect(afterLevel({ level: 1, done: 1, total: 4, ratio: 0.25 })).toEqual({ level: 2, done: 2, total: 4, ratio: 0.5 })
  })
  it('never passes the total or a full bar', () => {
    expect(afterLevel({ level: 4, done: 4, total: 4, ratio: 1 })).toEqual({ level: 4, done: 4, total: 4, ratio: 1 })
    expect(afterLevel({ level: 0, done: 0, total: 0, ratio: 0 })).toEqual({ level: 0, done: 0, total: 0, ratio: 0 })
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/engine/stats.test.ts` — Expected: FAIL (`branchLevel` is not a function).

- [ ] **Step 3: Implement the helpers**

Add to `src/engine/stats.ts` after `branchProgress`:

```ts
export interface Level {
  level: number
  done: number
  total: number
  ratio: number
}

/** A branch's level is how many of its exercises you have finished; the bar is finished out of all of them. */
export function branchLevel(nodes: ExerciseNode[], progress: Progress, branch: Branch): Level {
  const { done, total } = branchProgress(nodes, progress, branch)
  return { level: done, done, total, ratio: total ? done / total : 0 }
}

/** The level after one more exercise is finished (what a level-up gives you). */
export function afterLevel(l: Level): Level {
  const done = Math.min(l.done + 1, l.total)
  return { level: done, done, total: l.total, ratio: l.total ? done / l.total : 0 }
}
```

Run: `npx vitest run src/engine/stats.test.ts` — Expected: PASS.

- [ ] **Step 4: Write failing component tests**

```tsx
// src/ui/Level.test.tsx
import { render, screen } from '@testing-library/react'
import { LevelBadge, XpBar } from './Level'

describe('LevelBadge', () => {
  it('shows the level, hidden from screen readers (the bar carries the words)', () => {
    const { container } = render(<LevelBadge branch="push" level={7} />)
    const badge = container.querySelector('.lvbadge')!
    expect(badge).toHaveTextContent('7')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
    expect(badge).toHaveStyle({ '--accent': 'var(--push)' })
  })
})

describe('XpBar', () => {
  it('is an image with a label and the ratio as a CSS variable, clamped to 0..1', () => {
    render(<XpBar ratio={1.4} label="Push: 7 of 12 steps" />)
    const bar = screen.getByRole('img', { name: 'Push: 7 of 12 steps' })
    expect(bar.style.getPropertyValue('--r')).toBe('1')
    expect(bar.style.getPropertyValue('--from')).toBe('1')
    expect(bar).not.toHaveClass('grow')
  })
  it('grows from an earlier ratio when given one', () => {
    render(<XpBar ratio={0.5} from={0.25} label="x" />)
    const bar = screen.getByRole('img', { name: 'x' })
    expect(bar.style.getPropertyValue('--from')).toBe('0.25')
    expect(bar).toHaveClass('grow')
  })
})
```

Run: `npx vitest run src/ui/Level.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 5: Implement the components**

```tsx
// src/ui/Level.tsx
import type { CSSProperties } from 'react'
import type { Branch } from '../data/types'
import { branchLevel, weeklyStreak } from '../engine/stats'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { accentStyle, BRANCH_META } from './branches'
import { Icon } from './Icon'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function LevelBadge({ branch, level, size = 'sm' }: { branch: Branch; level: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={`lvbadge ${size}`} style={accentStyle(branch)} aria-hidden="true">
      {size === 'lg' && <small>{BRANCH_META[branch].label}</small>}
      <b>{level}</b>
      <small>{size === 'lg' ? 'Level' : 'LVL'}</small>
    </span>
  )
}

/** A rounded progress bar. With `from`, it fills from that ratio to `ratio` (motion only, see styles.css). */
export function XpBar({ ratio, from, label }: { ratio: number; from?: number; label: string }) {
  const r = clamp01(ratio)
  const f = from === undefined ? r : clamp01(from)
  return (
    <span className={from === undefined ? 'xpbar' : 'xpbar grow'} role="img" aria-label={label} style={{ '--r': String(r), '--from': String(f) } as CSSProperties}>
      <i />
    </span>
  )
}

export function BranchLevel({ branch }: { branch: Branch }) {
  const { nodes, progress } = useProgress()
  const l = branchLevel(nodes, progress, branch)
  const name = BRANCH_META[branch].label
  return (
    <div className="lvrow" style={accentStyle(branch)}>
      <LevelBadge branch={branch} level={l.level} />
      <div className="lvinfo">
        <span aria-hidden="true">{name} · {l.done} of {l.total}</span>
        <XpBar ratio={l.ratio} label={`${name}: ${l.done} of ${l.total} steps`} />
      </div>
    </div>
  )
}

export function Streak() {
  const { progress } = useProgress()
  const weeks = weeklyStreak(progress.logs, progress.schedule, localDate())
  return (
    <span className="streak" role="img" aria-label={weeks > 0 ? `${weeks} week streak` : 'No streak yet'}>
      <Icon name="flame" size={18} />
      <span aria-hidden="true">{weeks} wk</span>
    </span>
  )
}
```

Add to `src/styles.css` (after the tab bar section):

```css
/* ============ Level and streak ============ */
.lvbadge {
  display: inline-grid; place-items: center; align-content: center; flex: none; width: 44px; height: 44px; line-height: 1;
  border-radius: 14px; background: var(--accent); color: var(--on-color); box-shadow: 0 var(--edge) 0 var(--accent-edge);
}
.lvbadge b { font-size: 1rem; font-weight: 900; }
.lvbadge small { font-size: 0.5625rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.lvbadge.lg { width: 116px; height: 116px; border-radius: 32px; box-shadow: 0 7px 0 var(--accent-edge); transform: rotate(-6deg); }
.lvbadge.lg b { font-size: 3rem; }
.lvbadge.lg small { font-size: 0.75rem; }
.xpbar { display: block; height: 12px; border-radius: var(--r-pill); background: var(--fill); overflow: hidden; }
.xpbar i { display: block; height: 100%; border-radius: inherit; background: var(--accent); box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.15); clip-path: inset(0 calc(100% - var(--r) * 100%) 0 0 round var(--r-pill)); }
.lvrow { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.lvinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.lvinfo > span { font-size: var(--fs-small); font-weight: 900; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.streak { display: inline-flex; align-items: center; gap: 3px; flex: none; color: var(--push-text); font-weight: 900; font-size: 0.9375rem; }
```

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass. (`toHaveStyle` with a custom property works in jsdom; if it does not, assert `badge.getAttribute('style')` contains `--accent: var(--push)` instead.)

- [ ] **Step 7: Commit**

```bash
git add src/engine/stats.ts src/engine/stats.test.ts src/ui/Level.tsx src/ui/Level.test.tsx src/styles.css
git commit -F- <<'EOF'
feat: branch level helpers, level badge, XP bar and streak

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 7: Today screen

**Files:**
- Modify: `src/ui/TodayScreen.tsx`, `src/ui/AchievementCard.tsx`, `src/ui/BackupNotice.tsx` (only if it uses removed classes), `src/styles.css`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `BranchLevel`, `Streak` (Task 6), `Icon` (Task 4), `nodeAccent`, `accentStyle` (Task 3), `DAY_BRANCHES` (`src/data/schedule.ts`).

- [ ] **Step 1: Write failing tests**

Add to the `'Today screen (default schedule…)'` describe in `src/App.test.tsx`:

```tsx
  it('shows the day’s branch level and the streak in the header', async () => {
    render(<App storage={seed({ completed: ['push-wall', 'push-incline'] })} />)
    expect(await screen.findByRole('img', { name: 'Push: 2 of 23 steps' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No streak yet' })).toBeInTheDocument()
  })

  it('Legs + Core day shows both branch levels', async () => {
    vi.setSystemTime(FRIDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('img', { name: /^Legs: 0 of \d+ steps$/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Core: 0 of \d+ steps$/ })).toBeInTheDocument()
  })

  it('a rest day shows the streak but no branch level', async () => {
    vi.setSystemTime(SATURDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('img', { name: 'No streak yet' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /steps$/ })).not.toBeInTheDocument()
  })
```

Run: `npx vitest run src/App.test.tsx -t "branch level|rest day shows"` — Expected: FAIL.

- [ ] **Step 2: Implement the Today screen**

In `src/ui/TodayScreen.tsx`:

Imports: add `DAY_BRANCHES` to the `../data/schedule` import; add `import { Icon, type IconName } from './Icon'`, `import { BranchLevel, Streak } from './Level'`; change `import { BRANCH_META } from './branches'` to `import { BRANCH_META, accentStyle, nodeAccent } from './branches'`.

Replace the `row` function with a quest card:

```tsx
  const quest = (node: ExerciseNode, tag?: string) => {
    const values = todaysValues(progress, node.id, today)
    const logged = values.length
    const met = goalMet(node.goal, values)
    const status = logged === 0
      ? goalText(node.goal)
      : `${goalText(node.goal)} · ${Math.min(logged, node.goal.sets)} of ${node.goal.sets} sets · best ${Math.max(...values)}${unit(node)}`
    const icon: IconName = met ? 'check' : node.kind === 'skill' ? 'bolt' : node.branch
    return (
      <button className={`quest${node.kind === 'skill' ? ' skill' : ''}`} key={`${tag ?? 'main'}:${node.id}`} style={nodeAccent(node)} onClick={() => onOpen(node.id)}>
        <span className="qicon" aria-hidden="true"><Icon name={icon} /></span>
        <span className="t">
          {(tag || node.kind === 'skill') && <span className={`tag${tag ? ' extra' : ''}`}>{tag ?? 'Skill'}</span>}
          <b>{node.name}</b>
          <span>{status}</span>
        </span>
        {met ? <span className="tick" role="img" aria-label="Goal reached"><Icon name="check" /></span>
          : logged >= node.goal.sets ? <span className="tick done" role="img" aria-label="Sets done"><Icon name="check" /></span>
          : <Icon name="chevron" className="chev" />}
      </button>
    )
  }
```

Replace the header (`<div className="head">…</div>`) with:

```tsx
      <div className="todaytop">
        {day !== 'rest' && DAY_BRANCHES[day].map((b) => <BranchLevel key={b} branch={b} />)}
        {day === 'rest' && <span className="sub">Rest day</span>}
        <Streak />
      </div>
      <div className="head">
        <div>
          <div className="sub">{heading}</div>
          <h1 className="large">{DAY_LABEL[day]}</h1>
        </div>
        <button className="gear" aria-label="Settings" onClick={onSettings}><Icon name="gear" size={22} /></button>
      </div>
```

Rest day block: the "Feeling fresh?" buttons become full-width outline buttons (audit: rest-day pills):

```tsx
          <div className="hdr">Feeling fresh?</div>
          <div className="stack">
            {TRAIN_ANYWAY.map((d) => (
              <button key={d} className="cta sec" style={accentStyle(DAY_BRANCHES[d][0])} aria-label={`Train ${ANYWAY_LABEL[d]} Anyway`} onClick={() => setDayPick(d)}>
                Train {ANYWAY_LABEL[d]} Anyway
              </button>
            ))}
          </div>
```
and the rest card's `<div className="sub" style={{ marginTop: 4 }}>` becomes `<div className="sub">`.

"Back to …" stays a `pillbtn`. Workout lists: every `<div className="group">{workout.skill.map((n) => row(n))}</div>` becomes `<div className="quests">{workout.skill.map((n) => quest(n))}</div>`; the Strength list becomes `<div className="quests">…</div>` with `row(node, t.name)` → `quest(node, t.name)` and the "Track complete" placeholder becomes:

```tsx
                <div className="quest flat" key={track} style={accentStyle(t.branch)}>
                  <span className="qicon" aria-hidden="true"><Icon name="check" /></span>
                  <span className="t"><span className="tag extra">{t.name}</span><b>{BRANCH_META[t.branch].label}</b><span>Track complete</span></span>
                </div>
```
"Also Today": `<div className="quests">{workout.extra.map((e) => quest(e.node, …))}</div>`. The Warm-up stays a `.group` of `.check` rows. Finish Workout: `<button className="cta" style={accentStyle(DAY_BRANCHES[day][0])} …>` so it takes the day's colour.

`src/ui/AchievementCard.tsx`: no markup change beyond Task 4.

Delete from `src/styles.css`: `.head` (old rule), `.done-banner`, `.row .tick`, `.row .tick.done`. Add:

```css
/* ============ Today ============ */
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
.todaytop { display: flex; align-items: center; gap: 12px; min-height: 48px; }
.todaytop > .sub { flex: 1; }
.stack { margin-top: 16px; }
.quests { display: flex; flex-direction: column; gap: 12px; margin: 16px 0 24px; }
.quest {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 14px; text-align: left;
  background: var(--card); border: 2px solid var(--line); border-radius: var(--r-lg); box-shadow: 0 var(--edge) 0 var(--line);
}
.quest.skill { border-color: var(--skill); box-shadow: 0 var(--edge) 0 var(--skill-edge); }
.quest.flat { box-shadow: none; }
.quest .qicon { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--accent); color: var(--on-color); box-shadow: 0 3px 0 var(--accent-edge); }
.quest .t { flex: 1; min-width: 0; }
.quest .t b { display: block; font-size: var(--fs-body); font-weight: 900; overflow-wrap: anywhere; }
.quest .t > span:last-child { font-size: var(--fs-small); color: var(--ink2); }
.quest .tick { color: var(--legs-text); }
.quest .tick.done, .quest .chev { color: var(--ink2); }
.done-banner { text-align: center; color: var(--legs-text); font-weight: 900; margin: 8px 0; }
```

In the motion block, extend the list stagger so quest cards fade up too: change `.group > .row, .group > li, .summary > li, .achgrid > li` to `.group > .row, .group > li, .quests > *, .summary > li, .achgrid > li`, and add `.quests > :nth-child(2)` … `.quests > :nth-child(n+7)` to the six delay selectors in the same way as `.group`.

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass, including the three new tests.

- [ ] **Step 4: Visual check (including Review Focus 1 and 5)**

Restart preview; run `npm run shots -- /private/tmp/up-shots/t7 today fri rest finish` and `LARGE=1 npm run shots -- /private/tmp/up-shots/t7 fri today`. Compare `today-dark.png` and `today-light.png` with `docs/mockups/game-quest.html` (Today light). Required: no `text overflows`, `past viewport` or `uneven row` lines; on `fri-*-large.png` both level blocks, the streak and "Legs + Core Day" fit; the Push-up card shows the orange tile and "2 of 3 sets"; rest day shows full-width outline buttons.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css src/App.test.tsx
git commit -F- <<'EOF'
feat: Today screen as quest cards with branch level and streak

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 8: Log a Set, hold timer, set and history sheets, demo sheet

**Files:**
- Modify: `src/ui/LogScreen.tsx`, `src/ui/HoldTimer.tsx`, `src/ui/SetSheet.tsx`, `src/ui/HistorySheet.tsx`, `src/ui/DemoButton.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `.cta`, `.pills.center`, `.title-sm`, `.hint`, `.sheet.top/.left`, `.scrim.top` (Task 5), accent vars on `.log` (Task 3).
- `SetSheet` loses its `color` prop (the sheet renders inside `.log`, which already sets the accent).

- [ ] **Step 1: Remove inline styles in the log screens**

`src/ui/LogScreen.tsx`:
- eyebrow: `<div className="eyebrow" style={{ color: … }}>` → `<div className="eyebrow accent">`
- `<h1 className="large" style={{ fontSize: 26 }}>` → `<h1 className="large title-sm">`
- `<div className="pills" style={{ justifyContent: 'center' }}>` → `<div className="pills center">`
- Log Set: `<button className="cta" style={{ background: … }} onClick={() => record(reps)}>` → `<button className="cta" onClick={() => record(reps)}>`
- `<div className="sub" style={{ marginTop: 6, fontSize: 12 }}>Tap a set to fix it</div>` → `<div className="hint">Tap a set to fix it</div>`
- `<p className="cue sub" style={{ marginTop: 16 }}>` → `<p className="cue sub">`
- `<button className="cta sec" style={{ marginTop: 24 }} onClick={leave}>Back to Workout</button>` → `<button className="cta sec spaced" onClick={leave}>Back to Workout</button>`
- The stepper buttons' text `−` / `+` → `<Icon name="minus" size={28} />` / `<Icon name="plus" size={28} />` (keep their `aria-label`s); import `Icon`.
- `<SetSheet … color={meta.color} …/>` → drop the `color` prop. If `meta` is now unused except for the eyebrow label, keep it for `meta.label`.

`src/ui/SetSheet.tsx`: remove `color` from `Props` and the parameter list; remove the sheet's `style`; `<div className="big" style={{ fontSize: 64, margin: '8px 0' }} …>` → `<div className="big md" …>`; `<div className="steps" style={{ margin: '8px 0 12px' }}>` → `<div className="steps tight">`; Save loses its `style`; −/+ become the `Icon` minus/plus as above; drop the `CSSProperties` import.

`src/ui/HoldTimer.tsx`: the ring svg's `style={{ margin: '14px auto 0', display: 'block' }}` → remove (CSS below); its first `<text>`: `fontWeight="700" fill="var(--label)" style={{ fontVariantNumeric: 'tabular-nums' }}` → `fontWeight="900" fill="var(--ink)"`; second `<text>`: `fill="var(--label2)"` → `fill="var(--ink2)" fontWeight="800"`; `<div className="sub" style={{ marginTop: 8 }}>` → `<div className="hint">`; Start: `<button className="cta" style={{ … }} onClick={start}>` → `<button className="cta spaced" onClick={start}>`.

`src/ui/HistorySheet.tsx`: `<div className="scrim" style={{ zIndex: 30 }} …>` → `<div className="scrim top" …>`; `<div className="sheet" style={{ zIndex: 31, textAlign: 'left' }} …>` → `<div className="sheet top left" …>`; `<g … style={{ cursor: 'pointer' }}>` → `<g …>`; `<p className="sub" style={{ fontSize: 12 }}>` → `<p className="hint">`; `strokeWidth="2"` on the polyline → `strokeWidth="3"`; the point circles `stroke="var(--card)"` stay.

`src/ui/DemoButton.tsx`: same scrim/sheet change as HistorySheet; `<p className="sub" style={{ fontSize: 11 }}>{DEMO_CREDIT}</p>` → `<p className="hint">{DEMO_CREDIT}</p>`.

Run: `grep -n "style={{" src/ui/LogScreen.tsx src/ui/SetSheet.tsx src/ui/HoldTimer.tsx src/ui/HistorySheet.tsx src/ui/DemoButton.tsx` — Expected: only the HistorySheet chart's dynamic attributes remain (none with `style={{`).

- [ ] **Step 2: Restyle**

Delete from `src/styles.css`: `.log .close` (both rules), `.cue`, `.bars`, `.bars i`, `.bars i.on`, `.big`, `.steps`, `.steps button`, `.chips`, `.pill.chip` (both), `.pill.chip.new` (the non-motion one and its `@keyframes chipin` and the `@media (prefers-reduced-motion: reduce)` line), `.countdown`, `.demo`, `.goaled .steps`, `.goaled .field .steps button`, `.goalup`, `.histchart .grid`, `.histchart .goalline`, `.histchart .axis`, `.holdcover`. Add:

```css
/* ============ Log a set ============ */
.log .close { display: block; margin: 0 0 8px auto; padding: 8px 4px; min-height: 44px; min-width: 44px; position: relative; z-index: 13; color: var(--primary-text); font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.875rem; }
.spaced { margin-top: 24px; }
.cue { margin: 16px 0 6px; }
.bars { display: flex; gap: 8px; justify-content: center; margin: 16px 0 6px; }
.bars i { width: 44px; height: 12px; border-radius: var(--r-pill); background: var(--fill); }
.bars i.on { background: var(--accent); box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.15); }
.big { font-size: var(--fs-big); font-weight: 900; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1; margin: 18px 0 4px; }
.big.md { font-size: 4rem; margin: 8px 0; }
.steps { display: flex; justify-content: center; gap: 26px; margin: 18px 0; }
.steps.tight { margin: 8px 0 12px; }
.steps button { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line); color: var(--ink); }
.chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
.pill.chip { min-height: 44px; min-width: 44px; justify-content: center; padding: 4px 14px; border-radius: var(--r-sm); font-size: var(--fs-body); font-weight: 900; color: var(--ink); }
.goalup { margin: 8px auto 0; display: inline-block; padding: 4px 12px; border-radius: var(--r-pill); background: color-mix(in srgb, var(--legs) 14%, transparent); color: var(--legs-text); font-weight: 900; font-size: var(--fs-small); }
.goaled .steps { margin: 10px 0; }
.goaled .field .steps button { width: 44px; height: 44px; border-radius: var(--r-sm); }
.ring { display: block; margin: 14px auto 0; }
.ring text { font-family: inherit; font-variant-numeric: tabular-nums; }
.holdcover { position: fixed; inset: 0; z-index: 12; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: var(--bg); }
.countdown { font-size: 7.5rem; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; color: var(--accent-text); }
.demo { display: grid; place-items: center; min-height: 220px; margin: 12px 0; border-radius: var(--r-lg); background: #fff; border: 2px solid var(--line); }
.histchart .grid { stroke: var(--line); stroke-width: 1; }
.histchart .goalline { stroke: var(--ink2); stroke-width: 1.5; stroke-dasharray: 4 4; }
.histchart .axis { font-size: 10px; font-weight: 800; fill: var(--ink2); font-variant-numeric: tabular-nums; }
.histchart g { cursor: pointer; }
```

In the motion block replace `.pill.chip.new { animation: chipin 0.9s ease-out, pop 0.35s var(--spring); }` with:

```css
  .pill.chip.new { animation: chipin 0.9s ease-out, pop 0.35s var(--spring); }
  @keyframes chipin { from { background: var(--accent); color: var(--on-color); } }
  .bars i.on { animation: pop 0.35s var(--spring); }
```

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass (`HoldTimer.test.tsx` still finds two circles; `set-value`/`rep-value` test ids unchanged).

- [ ] **Step 4: Visual check**

Restart preview; `npm run shots -- /private/tmp/up-shots/t8 log levelup hold`. Compare `log-dark.png` with the mockup "Log a set": orange set bars, big number, chunky −/+, orange LOG SET with dark text, set chips. `hold-*.png`: full-screen cover, ring with navy/white background. No layout-check lines.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -F- <<'EOF'
feat: Game Quest log screen, hold timer and set sheets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 9: Tree

**Files:**
- Modify: `src/engine/layout.ts`, `src/ui/TreeView.tsx`, `src/ui/TreeScreen.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `accentStyle` (Task 3), `BranchLevel` (Task 6).
- Changes constants: `NODE_R` 17 → 19, `ROW_H` 78 → 86, `LABEL_Y` 16 → 20. Tests read the constants, so they stay valid.

- [ ] **Step 1: Bigger nodes with a 3D edge**

`src/engine/layout.ts`: `export const ROW_H = 86` and `export const NODE_R = 19`.

`src/ui/TreeView.tsx`: `export const LABEL_Y = 20`. Inside each node `<g>`, replace the shape block

```tsx
            {isSkill ? (
              <rect className="sh" … transform="rotate(45)" />
            ) : (
              <circle className="sh" r={R} />
            )}
```
with
```tsx
            {isSkill ? (
              <>
                <rect className="edge" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="translate(0 3) rotate(45)" />
                <rect className="sh" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="rotate(45)" />
              </>
            ) : (
              <>
                <circle className="edge" cy={3} r={R} />
                <circle className="sh" r={R} />
              </>
            )}
            {state === 'available' && <path className="plus" d="M-5 0 H5 M0 -5 V5" />}
```
and the label `<text className="lb" y={R + LABEL_Y}>` stays (it now sits lower because `LABEL_Y` grew; the edge adds 3 px).

`src/ui/TreeScreen.tsx`:
- import `{ accentStyle, BRANCH_META } from './branches'` and `{ BranchLevel } from './Level'`.
- `<p className="sub center" style={{ margin: '0 0 6px' }}>` → `<p className="sub center treehint">`.
- each branch tab button gets `style={accentStyle(b)}`.
- after the `.seg` div, add `<BranchLevel branch={branch} />`.
- **Audit: the node sheet covers the tapped node.** Add after the existing scroll effect:

```tsx
  // keep a tapped node visible above the sheet: move it into the top third of the tree area
  useEffect(() => {
    const el = scroller.current
    const target = selected ? el?.querySelector<SVGGElement>(`[data-id="${selected}"]`) : null
    if (!el || !target) return
    const box = el.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    if (r.bottom > box.top + box.height * 0.45) el.scrollTop += r.top - box.top - box.height * 0.25
  }, [selected])
```
and in `TreeView.tsx` add `data-id={node.id}` to each node `<g>`.

- [ ] **Step 2: Restyle**

Delete from `src/styles.css`: every `.tsvg …` rule outside the motion block, `.tree-head`, `.tree-head .seg`, `.trackchips`, `.chipbtn`, `.chipbtn .chiptrack`, `.zoombar` and its two `.zoombar .pillbtn…` rules. Keep `.tree-screen`, `.tree-scroll` (all three), `.tsvg { max-width: none; }`. Add:

```css
/* ============ Tree ============ */
.tree-head { flex: none; padding: calc(env(safe-area-inset-top) + 16px) 16px 8px; background: var(--bg); border-bottom: 2px solid var(--line); }
.tree-head .seg { margin: 6px 0 10px; }
.treehint { margin: 0 0 6px; }
.tsvg { display: block; width: 100%; height: auto; margin: 0 auto; }
.tsvg .e { fill: none; stroke-width: 4; stroke-linecap: round; }
.tsvg .e.done { stroke: var(--accent); }
.tsvg .e.avail { stroke: var(--accent); stroke-dasharray: 1 9; }
.tsvg .e.lock { stroke: var(--line); stroke-dasharray: 1 9; }
.tsvg .n { cursor: pointer; outline: none; }
.tsvg .n .edge { fill: var(--line); }
.tsvg .n .sh { fill: var(--bg); stroke: var(--line); stroke-width: 3; }
.tsvg .n.available .sh { stroke: var(--accent); }
.tsvg .n.available .edge { fill: var(--accent-edge); }
.tsvg .n.st.completed .sh, .tsvg .n.st.focus .sh { fill: var(--accent); stroke: var(--accent); }
.tsvg .n.st.completed .edge, .tsvg .n.st.focus .edge { fill: var(--accent-edge); }
.tsvg .n.sk .sh { stroke: var(--skill); }
.tsvg .n.sk.completed .sh, .tsvg .n.sk.focus .sh { fill: var(--skill); }
.tsvg .n.sk .edge { fill: var(--skill-edge); }
.tsvg .n.locked .sh { fill: var(--line); stroke: var(--line); }
.tsvg .n.locked .edge { fill: var(--fill); }
.tsvg .plus { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; }
.tsvg .glow { fill: var(--accent); opacity: 0.25; }
.tsvg .sel { fill: none; stroke: var(--ink); stroke-width: 2; stroke-dasharray: 4 4; }
.tsvg .ic { fill: none; stroke: var(--on-color); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.tsvg .dotc { fill: var(--on-color); }
.tsvg .lk rect { fill: var(--ink2); }
.tsvg .lk path { fill: none; stroke: var(--ink2); stroke-width: 2; }
.tsvg .lb { font-size: 9px; font-weight: 800; text-anchor: middle; fill: var(--ink2); paint-order: stroke; stroke: var(--bg); stroke-width: 4px; stroke-linejoin: round; }
.tsvg .n.focus .lb { fill: var(--accent-text); font-weight: 900; }
.tsvg .n:focus-visible .sh { stroke: var(--primary); stroke-width: 5; }
.trackchips { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0 6px; }
.chipbtn { white-space: nowrap; font-size: var(--fs-small); color: var(--ink); margin: 0; flex: none; text-transform: none; letter-spacing: 0; box-shadow: 0 3px 0 var(--line); }
.chipbtn .chiptrack { color: var(--accent-text); font-weight: 900; }
.zoombar { position: absolute; right: 16px; bottom: calc(76px + env(safe-area-inset-bottom)); display: flex; align-items: center; padding: 2px; border-radius: var(--r-md); background: var(--bg); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line); }
.zoombar .pillbtn { margin: 0; min-height: 40px; min-width: 40px; padding: 0 8px; border: 0; box-shadow: none; font-size: var(--fs-small); }
.zoombar .pillbtn:nth-child(2) { min-width: 56px; font-variant-numeric: tabular-nums; }
```

The tree-head's `.lvrow` from `BranchLevel` needs no extra CSS.

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass (`treeedge.test.ts`, `layout.test.ts`, `zoom.test.ts`, the tree tests in `App.test.tsx`).

- [ ] **Step 4: Visual check (Review Focus 5)**

Restart preview; `npm run shots -- /private/tmp/up-shots/t9 tree node` and `LARGE=1 npm run shots -- /private/tmp/up-shots/t9 tree`. Compare with the mockup "Tree": done nodes filled with a tick and darker edge, the training node filled with a glow, ready nodes outlined with a plus, locked nodes grey with a lock, labels never crossed by lines, two-line labels not hitting the node below (`AGENTS.md` "Tree geometry"). In `node-*.png` the tapped Push-up node is still visible above the sheet. If labels collide, raise `ROW_H` in steps of 4 and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/engine/layout.ts src/ui src/styles.css
git commit -F- <<'EOF'
feat: Game Quest skill tree with 3D nodes and branch level

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 10: Skills and Roadmap

**Files:**
- Modify: `src/ui/SkillsScreen.tsx`, `src/ui/RoadmapView.tsx`, `src/ui/RoadmapSheet.tsx`, `src/ui/NodeSheet.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `accentStyle('skill')` (Task 3), `.note`, `.hint` (Task 5).

- [ ] **Step 1: One skill colour and no inline styles**

`src/ui/SkillsScreen.tsx`: root `<div className="screen">` → `<div className="screen" style={accentStyle('skill')}>` (import `accentStyle`); `<p className="sub" style={{ margin: '12px 4px 0' }}>` → `<p className="note">`; `<p className="sub" style={{ margin: '12px 4px' }}>` → `<p className="note">`.

`src/ui/RoadmapView.tsx`: `<p className="sub" style={{ marginTop: 8 }}>` → `<p className="note">`; both `<h2 className="hdr" style={{ marginBottom: 8 }}>` → `<h2 className="hdr flush">`; `<div className="sub" style={{ margin: '0 4px 8px', fontSize: 12 }}>` → `<div className="hint inset">`.

`src/ui/RoadmapSheet.tsx`: root sheet gets `style={accentStyle('skill')}`; both `<div className="hdr" style={{ margin: '12px 0 4px' }}>` → `<div className="hdr inset">`; the eyebrow → `className="eyebrow accent"`.

`src/ui/NodeSheet.tsx`: the eyebrow → `className="eyebrow accent"`.

Run: `grep -n "style={{" src/ui/SkillsScreen.tsx src/ui/RoadmapView.tsx src/ui/RoadmapSheet.tsx src/ui/NodeSheet.tsx` — Expected: no output.

- [ ] **Step 2: Restyle**

Delete from `src/styles.css`: `.rmrow .rmnum`, `.rmrow.done b` (both), `.rmrow.locked b`, `.rmrow .rmicon`, `.rmicon`, `.rmicon.done`, `.rmicon.training`, `.rmicon.ready`, `.rmrow.done .rmicon`, `.steplist li.stepdone b`. Add:

```css
/* ============ Skills and Roadmap ============ */
.hdr.flush { margin-bottom: 8px; }
.hdr.inset { margin: 14px 0 4px; }
.hint.inset { margin: 0 4px 8px; }
.skillrow { align-items: flex-start; }
.rmrow .rmnum { width: 28px; flex: none; color: var(--ink2); font-variant-numeric: tabular-nums; font-weight: 900; }
.rmrow.locked b { color: var(--ink2); }
.rmicon { flex: none; width: 22px; color: var(--ink2); }
.rmicon.done { color: var(--legs-text); }
.rmicon.training { color: var(--skill-text); }
.rmicon.ready { color: var(--primary-text); }
.steplist li.stepdone b { text-decoration: line-through; color: var(--ink2); }
.yearbtn { font: inherit; color: inherit; letter-spacing: inherit; text-transform: inherit; padding: 8px 0; min-height: 44px; width: 100%; text-align: left; }
```
(Remove the old `.yearbtn` rule so it is defined once.)

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass.

- [ ] **Step 4: Visual check**

Restart preview; `npm run shots -- /private/tmp/up-shots/t10 skills roadmap`. Skills uses pink everywhere (Now/Roadmap tab, Start/Stop buttons, links): the audit's "mixed accents" item is gone. No layout-check lines.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles.css
git commit -F- <<'EOF'
feat: Game Quest Skills and Roadmap in one skill colour

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 11: Progress, Settings, Find your level, GitHub, goal editor

**Files:**
- Modify: `src/ui/ProgressScreen.tsx`, `src/ui/SettingsScreen.tsx`, `src/ui/Onboarding.tsx`, `src/ui/GoalEditor.tsx`, `src/styles.css`, `src/App.test.tsx` (test name only)
- Delete: `src/ui/Ring.tsx`

**Interfaces:**
- Consumes: `branchLevel` (Task 6), `LevelBadge`, `XpBar` (Task 6), `accentStyle`.

- [ ] **Step 1: Level cards replace rings**

In `src/ui/ProgressScreen.tsx`, replace the `<div className="rings">…</div>` block with:

```tsx
      <div className="levels">
        {BRANCHES.map((b) => {
          const l = branchLevel(nodes, progress, b)
          return (
            <div className="lvcard" key={b} style={accentStyle(b)}>
              <LevelBadge branch={b} level={l.level} />
              <b>{BRANCH_META[b].label}</b>
              <XpBar ratio={l.ratio} label={`${BRANCH_META[b].label}: ${l.done} of ${l.total} steps`} />
              <span className="sub">{l.done} of {plural(l.total, 'step')}</span>
            </div>
          )
        })}
      </div>
```
Imports: replace `branchProgress` with `branchLevel` in the stats import; add `accentStyle` to the branches import; add `import { LevelBadge, XpBar } from './Level'`; remove `import { Ring } from './Ring'`. `<div className="card" style={{ marginTop: 12 }}>` → `<div className="card">`; `<div className="sub" style={{ marginTop: 4 }}>` → `<div className="sub">`.

Delete `src/ui/Ring.tsx` (`git rm src/ui/Ring.tsx`) and confirm `grep -rn "Ring'" src` prints nothing.

In `src/App.test.tsx`, rename the test `'shows a ring per branch, the weekly streak and personal bests'` to `'shows a level per branch, the weekly streak and personal bests'` (its assertions stay).

- [ ] **Step 2: Settings, Find your level, goal editor**

`src/ui/SettingsScreen.tsx`: `<div className="screen" style={{ textAlign: 'left' }}>` → `<div className="screen left">`; every footnote `<p className="sub">…</p>` and `<p className="sub" style={{ margin: '0 4px' }}>…</p>` directly after a control → `<p className="note">…</p>` (audit: footnote spacing); `<p className="sub status">` stays.

`src/ui/Onboarding.tsx`: `<div className="screen" style={{ textAlign: 'left' }}>` → `<div className="screen left">`; `<p className="sub" style={{ margin: '8px 0 24px' }}>` → `<p className="sub intro">`; `<h1 className="large" style={{ fontSize: 26, margin: '8px 0' }}>` → `<h1 className="large title-sm intro-title">`; `<p style={{ fontSize: 17, margin: '8px 0' }}>` → `<p className="question">`; `<button className="cta" style={{ marginTop: 24 }} …>Yes</button>` → `<button className="cta spaced" …>Yes</button>`; `<p className="sub" style={{ margin: '12px 4px 0' }}>` → `<p className="note">`; the two trailing `<p className="sub">` hints → `<p className="note">`.

`src/ui/GoalEditor.tsx`: `<p className="sub" style={{ margin: '4px 0' }}>` → `<p className="sub">`.

Run: `grep -rn "style={{" src/ui | grep -v "accentStyle\|nodeAccent\|'--r'\|width: \`" ` — Expected: no output (only dynamic accent/zoom/bar styles remain).

- [ ] **Step 3: Restyle**

Delete from `src/styles.css`: `.rings`, `.ringcard`, the motion rule `.ringcard svg circle:nth-child(2) { … }` and `@keyframes ringFill`, `.weekstrip` and its 8 related rules (`.weekstrip li`, `.wsdot`, `.weekstrip li.trained .wsdot`, `.weekstrip li.planned .wsdot`, `.weekstrip li.rest .wsdot`, `.weekstrip li.today .wslabel`, `.wslabel`), `.gain`, `.achmedal`, `.achgrid`, `.achgrid li`, `.achgrid li:not(.earned) .achmedal`, `.achgrid li:not(.earned) b`, `.summary`, `.summary li`, `.summary li b`, `.newbest`, `.medal`, `.notice`, `.notice b`, `.status`, `.howtoken`, `.howtoken summary`, `.howtoken ol`. Add:

```css
/* ============ Progress ============ */
.levels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.lvcard { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px; text-align: center; background: var(--card); border: 2px solid var(--line); border-radius: var(--r-lg); box-shadow: 0 var(--edge) 0 var(--line); }
.lvcard .xpbar { align-self: stretch; }
.weekstrip { list-style: none; padding: 0; margin: 12px 0 0; display: flex; justify-content: space-between; }
.weekstrip li { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 36px; }
.wsdot { width: 26px; height: 26px; border-radius: 9px; }
.weekstrip li.trained .wsdot { background: var(--legs); box-shadow: 0 3px 0 var(--legs-edge); }
.weekstrip li.planned .wsdot { border: 2px solid var(--line); }
.weekstrip li.rest .wsdot { width: 8px; height: 8px; margin: 9px; border-radius: 50%; background: var(--line); }
.wslabel { font-size: 0.6875rem; font-weight: 800; color: var(--ink2); }
.weekstrip li.today .wslabel { color: var(--ink); font-weight: 900; }
.gain { color: var(--legs-text); font-weight: 900; }
.achmedal { width: 44px; height: 44px; border-radius: 14px; flex: none; color: var(--on-color); background: var(--gold); box-shadow: 0 3px 0 var(--gold-edge); }
.achcard { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.achcard .t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.achcard .t .sub { margin: 0; }
.achgrid { list-style: none; padding: 0; margin: 16px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.achgrid li { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; text-align: center; font-size: var(--fs-label); background: var(--card); border: 2px solid var(--line); border-radius: var(--r-md); }
.achgrid li:not(.earned) .achmedal { background: var(--fill); color: var(--ink2); box-shadow: none; }
.achgrid li:not(.earned) b { color: var(--ink2); font-weight: 700; }
.summary { list-style: none; padding: 0; margin: 8px 0; }
.summary li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; padding: 8px 0; border-top: 2px solid var(--line); }
.summary li b { flex: 1 1 100%; }
.newbest { font-size: 0.6875rem; font-weight: 900; color: var(--legs-text); text-transform: uppercase; letter-spacing: 0.06em; }
.medal { width: 68px; height: 68px; border-radius: 22px; margin: 0 auto 10px; color: var(--on-color); background: var(--accent); box-shadow: 0 var(--edge) 0 var(--accent-edge); }

/* ============ Settings, onboarding, backup ============ */
.screen.left { text-align: left; }
.intro { margin: 8px 0 24px; }
.intro-title { margin: 8px 0; }
.question { font-size: 1.0625rem; margin: 8px 0; }
.notice { display: block; width: 100%; text-align: left; margin: 12px 0 0; }
.notice b { display: block; color: var(--danger-text); }
.status { margin: 8px 4px 12px; }
.howtoken { margin: 8px 0; font-size: 0.875rem; }
.howtoken summary { color: var(--primary-text); font-weight: 900; min-height: 44px; display: flex; align-items: center; cursor: pointer; }
.howtoken ol { padding-left: 20px; color: var(--ink2); }
```

In the motion block, add `.lvcard .xpbar i { animation: xpFill 0.9s var(--ease) backwards; }` and `@keyframes xpFill { from { clip-path: inset(0 100% 0 0 round var(--r-pill)); } }`.

- [ ] **Step 3b: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass (the Progress test still finds `Push: 2 of 23 steps` and `Pull: 0 of 16 steps`, now on the bars).

- [ ] **Step 4: Visual check**

Restart preview; `npm run shots -- /private/tmp/up-shots/t11 progress settings onboarding`. Four level cards with badge, name, bar and "2 of 23 steps"; gold achievement medals; Settings footnotes spaced under their controls. No layout-check lines.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -F- <<'EOF'
feat: level cards on Progress and Game Quest Settings and onboarding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 12: Reward moments (level-up card, Finish Workout count-up, achievement pop)

**Files:**
- Create: `src/lib/useCountUp.ts`, `src/lib/useCountUp.test.ts`
- Modify: `src/ui/LevelUpSheet.tsx`, `src/ui/FinishSheet.tsx`, `src/engine/stats.ts`, `src/engine/stats.test.ts`, `src/styles.css`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `branchLevel`, `afterLevel`, `LevelBadge`, `XpBar` (Task 6), `nodeAccent`, `BRANCH_META`.
- Produces:
  ```ts
  export function useCountUp(target: number, ms?: number): number // final value at once under Reduce Motion or without matchMedia
  export function sessionMinutes(logs: SetLog[], date: string): number // whole minutes from first to last set that day
  ```

- [ ] **Step 1: Failing tests for the hook and minutes**

```ts
// src/lib/useCountUp.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

describe('useCountUp', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('shows the final value at once when motion is reduced (or matchMedia is missing)', () => {
    const { result } = renderHook(() => useCountUp(12))
    expect(result.current).toBe(12)
  })

  it('counts up to the value when motion is allowed', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }))
    const { result } = renderHook(() => useCountUp(12, 800))
    expect(result.current).toBe(0)
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(12)
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe(12)
  })
})
```

Append to `src/engine/stats.test.ts` (add `sessionMinutes` to the import):

```ts
describe('sessionMinutes', () => {
  it('is the whole minutes from the first to the last set of that day', () => {
    const logs = [L('2026-09-21', 'a', 10, 1_000_000), L('2026-09-21', 'b', 10, 1_000_000 + 14.6 * 60_000), L('2026-09-20', 'a', 10, 0)]
    expect(sessionMinutes(logs, '2026-09-21')).toBe(15)
  })
  it('is 0 with one set or none', () => {
    expect(sessionMinutes([L('2026-09-21')], '2026-09-21')).toBe(0)
    expect(sessionMinutes([], '2026-09-21')).toBe(0)
  })
})
```

Run: `npx vitest run src/lib/useCountUp.test.ts src/engine/stats.test.ts` — Expected: FAIL (missing modules/exports).

- [ ] **Step 2: Implement**

```ts
// src/lib/useCountUp.ts
import { useEffect, useState } from 'react'

const reduced = () => typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A number that counts up to `target` over `ms` (ease-out). Under Reduce Motion it is `target` from the start. */
export function useCountUp(target: number, ms = 800): number {
  const still = reduced()
  const [shown, setShown] = useState(still ? target : 0)
  useEffect(() => {
    if (still) { setShown(target); return }
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setShown(Math.round(target * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, still])
  return shown
}
```

Add to `src/engine/stats.ts`:

```ts
/** Whole minutes between the first and the last set logged on `date`. */
export function sessionMinutes(logs: SetLog[], date: string): number {
  const at = logs.filter((l) => l.date === date).map((l) => l.at)
  return at.length < 2 ? 0 : Math.round((Math.max(...at) - Math.min(...at)) / 60_000)
}
```

Run the two test files — Expected: PASS.

- [ ] **Step 3: Failing test for the level-up card**

Add to the `'Logging and level-up'` describe in `src/App.test.tsx`:

```tsx
  it('the level-up card names the branch level you reach', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'] })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    const dialog = await screen.findByRole('dialog', { name: 'Level up' })
    expect(dialog).toHaveTextContent('Push level 2')
    expect(within(dialog).getByRole('img', { name: 'Push: 2 of 23 steps' })).toBeInTheDocument()
  })
```

Run: `npx vitest run src/App.test.tsx -t "names the branch level"` — Expected: FAIL. (If the stepper does not start at 10 for Incline push-up, click `Increase reps` until it reads 10 before logging, as the Finish Workout test does.)

- [ ] **Step 4: Implement the level-up card**

In `src/ui/LevelUpSheet.tsx`: keep (or add) `import { useState, type CSSProperties } from 'react'`; import `{ afterLevel, branchLevel } from '../engine/stats'`, `{ useProgress } from '../store/ProgressContext'`, `{ LevelBadge, XpBar } from './Level'`, `{ BRANCH_META, nodeAccent } from './branches'`; remove the `Icon` import and the `.medal` element. In the component body add:

```tsx
  const { nodes, progress } = useProgress()
  const before = branchLevel(nodes, progress, node.branch)
  const after = afterLevel(before)
  const branchName = BRANCH_META[node.branch].label
```

Change the sheet's opening and top content to:

```tsx
      <div className="sheet center levelup" role="dialog" aria-modal="true" aria-label="Level up" style={nodeAccent(node)}>
        <div className="burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
          <LevelBadge branch={node.branch} level={after.level} size="lg" />
        </div>
        <div className="eyebrow accent">Level up · {branchName} level {after.level}</div>
        <h3>You hit {goalText(node.goal)}</h3>
        <XpBar ratio={after.ratio} from={before.ratio} label={`${branchName}: ${after.done} of ${after.total} steps`} />
```
(keep the existing `<p>`, choices, unlock lines and buttons after it, unchanged).

- [ ] **Step 5: Finish Workout totals**

In `src/ui/FinishSheet.tsx` import `{ sessionMinutes } from '../engine/stats'` and `{ useCountUp } from '../lib/useCountUp'`, and replace `<h3>Nice work</h3>` plus the `<p>` after it with:

```tsx
        <h3>Nice work</h3>
        <Totals exercises={lines.length} sets={lines.reduce((n, l) => n + l.sets, 0)} minutes={sessionMinutes(progress.logs, today)} />
```
and add below the component:

```tsx
function Total({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <div className="total">
      <b aria-hidden="true">{shown}</b>
      <span aria-hidden="true">{label}</span>
    </div>
  )
}

/** Big totals that count up; screen readers get the plain sentence. */
function Totals({ exercises, sets, minutes }: { exercises: number; sets: number; minutes: number }) {
  return (
    <>
      <div className="totals">
        <Total value={exercises} label={exercises === 1 ? 'Exercise' : 'Exercises'} />
        <Total value={sets} label={sets === 1 ? 'Set' : 'Sets'} />
        {minutes > 0 && <Total value={minutes} label="Min" />}
      </div>
      <p className="sr-only">{plural(exercises, 'exercise')} · {plural(sets, 'set')}{minutes > 0 ? ` · ${minutes} min` : ''}</p>
    </>
  )
}
```
Its Done button gets `className="cta"` (unchanged).

- [ ] **Step 6: CSS and motion**

Add to `src/styles.css` (outside the motion block):

```css
/* ============ Reward moments ============ */
.levelup { background: radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 62%), var(--bg); }
.levelup .xpbar { margin: 12px 0 4px; }
.burst { position: relative; width: 150px; height: 150px; margin: 4px auto 18px; display: grid; place-items: center; }
.burst i { position: absolute; left: 50%; top: 50%; width: 10px; height: 10px; margin: -5px; border-radius: 3px; background: var(--accent); opacity: 0; }
.burst i:nth-child(even) { background: var(--gold); border-radius: 50%; }
.totals { display: flex; justify-content: center; gap: 12px; margin: 14px 0 6px; }
.total { flex: 1; max-width: 120px; padding: 10px 6px; text-align: center; border: 2px solid var(--line); border-radius: var(--r-md); box-shadow: 0 var(--edge) 0 var(--line); }
.total b { display: block; font-size: 2rem; font-weight: 900; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--accent-text, var(--primary-text)); }
.total span { font-size: var(--fs-label); font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink2); }
```

In the motion block, delete the old `.medal { … }` and `.medal::after { … }` rules and `@keyframes burst`, and add:

```css
  /* level-up: the badge drops in and bounces, shapes burst out, the bar fills; about 1.5 s, then still */
  .levelup .lvbadge.lg { animation: dropIn 0.55s var(--spring) 0.1s backwards; }
  @keyframes dropIn { from { transform: translateY(-60px) rotate(-18deg) scale(0.6); opacity: 0; } }
  .burst i { animation: shoot 0.7s var(--ease) calc(0.35s + var(--i) * 0.02s) both; }
  @keyframes shoot {
    0% { opacity: 1; transform: rotate(calc(var(--i) * 45deg)) translateY(0) scale(0.6); }
    100% { opacity: 0; transform: rotate(calc(var(--i) * 45deg)) translateY(-78px) scale(1); }
  }
  .xpbar.grow i { animation: xpGrow 0.6s var(--ease) 0.6s backwards; }
  @keyframes xpGrow { from { clip-path: inset(0 calc(100% - var(--from) * 100%) 0 0 round var(--r-pill)); } }
  .total b { animation: pop 0.4s var(--spring) 0.75s backwards; }
```

(`.burst i` may use `both`: it holds no sheet or fixed element, and its final state is invisible on purpose. Under Reduce Motion the shapes stay at `opacity: 0`, the badge and bar show their final state.)

The achievement card already pops (`.achcard .achmedal` uses `pop`, scale 0.6 → 1.15 → 1); keep it.

- [ ] **Step 7: Run tests and build**

Run: `npm test && npm run build` — Expected: all pass (`'Workout summary'` test still finds `1 set · best 9` in the summary list).

- [ ] **Step 8: Visual check (Review Focus 3)**

Restart preview; `npm run shots -- /private/tmp/up-shots/t12 levelup finish` and `REDUCE=1 npm run shots -- /private/tmp/up-shots/t12 levelup finish`. In the normal run the shots are taken after the animation: the badge sits tilted, the bar is full to its new value. In the `-reduce` shots everything is identical and in its final state (no half-filled bar, no invisible badge). Compare `levelup-dark.png` with the mockup "Level up".

- [ ] **Step 9: Commit**

```bash
git add src
git commit -F- <<'EOF'
feat: level-up card, Finish Workout totals and short reward motion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 13: App icon, theme colours and leftover cleanup

**Files:**
- Modify: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `index.html`, `vite.config.ts`, `src/tokens.css`, `src/styles.css`

- [ ] **Step 1: New icon**

Replace `public/icon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#131f24"/>
  <path d="M136 366 L256 230 L376 366" fill="none" stroke="#cc7800" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M136 344 L256 208 L376 344" fill="none" stroke="#ff9600" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M136 252 L256 116 L376 252" fill="none" stroke="#ff9600" stroke-opacity=".45" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Regenerate the PNGs at their current sizes:

```bash
for f in icon-192 icon-512 apple-touch-icon; do
  s=$(sips -g pixelWidth public/$f.png | awk '/pixelWidth/ {print $2}')
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=$s,$s --screenshot=public/$f.png "file://$PWD/public/icon.svg"
  sips -g pixelWidth -g pixelHeight public/$f.png
done
```
Expected: each PNG keeps its original size and shows the orange chevrons with a darker edge on navy (open one with the Read tool).

- [ ] **Step 2: Theme colours**

`index.html`: `content="#f2f2f7"` → `content="#ffffff"`; `content="#000000"` → `content="#131f24"`.
`vite.config.ts` manifest: `background_color: '#000000'` and `theme_color: '#000000'` → `'#131f24'`.

- [ ] **Step 3: Remove the legacy aliases**

In `src/styles.css`, replace `var(--label3)` → `var(--ink2)`, `var(--label2)` → `var(--ink2)`, `var(--label)` → `var(--ink)`, `var(--sep)` → `var(--line)`, `var(--blue-text)` → `var(--primary-text)`, `var(--blue)` → `var(--primary-text)`. Do the same in `src/ui/*.tsx` (e.g. `HistorySheet`, `HoldTimer`). Then delete the "legacy names" `:root { … }` block from `src/tokens.css`.

Run: `grep -rnE "var\(--(label|label2|label3|sep|blue|blue-text|segon|card)\b" src | grep -v "var(--card)"` — Expected: no output except `--card` uses (which is a real token).

Also remove now-unused rules: run `grep -c` for each of `.dot`, `.chips`, `.choice em`… is not needed; instead remove rules whose class appears in no `.tsx`: for each class selector in `src/styles.css`, `grep -rn "<class>" src/ui src/App.tsx`; delete a rule only when the class appears nowhere (expected candidates: `.dot`, `.skillrow` if unused, `.needs` if unused). Keep anything you are unsure about.

- [ ] **Step 4: Run tests and build, full visual sweep**

Run: `npm test && npm run build`. Restart preview; run all scenarios in both modes, plus large text and reduced motion:
`npm run shots -- /private/tmp/up-shots/final && LARGE=1 npm run shots -- /private/tmp/up-shots/final && REDUCE=1 npm run shots -- /private/tmp/up-shots/final`
Expected: no layout-check lines anywhere. Look at every PNG. Then read `~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.13.0/.claude/skills/ui-ux-pro-max/references/pro-rules.md` and go through its Pre-Delivery Checklist; fix anything that fails, re-run the affected shots.

- [ ] **Step 5: Commit**

```bash
git add -A public index.html vite.config.ts src
git commit -F- <<'EOF'
feat: Game Quest app icon and theme colours; drop legacy colour names

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

---

### Task 14: Docs

**Files:**
- Modify: `docs/UI-REFERENCES.md`, `AGENTS.md`, `docs/IPHONE-TEST.md`, `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-01-game-quest-redesign-design.md`

- [ ] **Step 1: Update the docs**

- `docs/UI-REFERENCES.md`, "Design principles for this app": replace principle 1 with "**Game Quest look.** Rounded Nunito (bundled), chunky cards and buttons with a solid bottom edge, dark text on bright fills. Tokens in `src/tokens.css`." and principle 5 with "**Celebrate, briefly.** Level-up card with a bouncing badge, a short burst and a filling bar (about 1.5 s). No confetti, no sound. Respect Reduce Motion." Add Duolingo to the top of "Apps to study" as the main look reference.
- `AGENTS.md`: in "Current status", add a first sentence: "**Game Quest redesign** (branch `redesign-game-quest`, plan `docs/superpowers/plans/2026-10-01-game-quest-redesign.md`): rounded Nunito, chunky pressable cards, branch level badges and bars from existing progress, short reward moments." Under "Gotchas", add:
  - "**Colours:** tokens live in `src/tokens.css` (primitive `--p-*` → semantic). Text on a bright fill is `var(--on-color)`, never white; colour as text uses `--<branch>-text`. `src/tokens.test.ts` checks every pair at 4.5:1: change the colour, never the threshold."
  - "**Visual check:** `npm run shots -- <dir> [scenario]` (after `npm run build` and `npx vite preview --port 4173 --strictPort`); `LARGE=1` and `REDUCE=1` for large text and reduced motion."
  In "Conventions", change "Apple-like CSS: system font stack…" to "Game Quest CSS: tokens from `src/tokens.css`, rounded cards and sheets, safe-area insets."
  In "Visual check before shipping UI" step 1–3, mention `scripts/shots.mjs` does steps 1–3.
- `docs/IPHONE-TEST.md`: add a section "Game Quest redesign": the rounded font shows with Wi-Fi and mobile data off after one online launch; level-up card (badge bounce, bar fill) and Finish Workout totals; Reduce Motion on (Settings → Accessibility → Motion) shows them still; light and dark mode; larger text (Settings → Display → Text Size) on Legs + Core day.
- `docs/DECISIONS.md`, "Redesign: Game Quest": add "Built on `redesign-game-quest`, finished <the date from `date +%F`>", and one line each for anything decided while building (for example a changed `ROW_H`).
- Spec: under "## 2. Shared building blocks", change the Button row to "Restyled `.cta` in place (no new `.btn` class)" and the Tab bar row's "active tab in branch colour" to "active tab in the primary blue".

- [ ] **Step 2: Commit**

```bash
git add docs AGENTS.md
git commit -F- <<'EOF'
docs: Game Quest redesign in guides, checklist and decisions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WEMwuMnEecSBSJgtEmr2eU
EOF
```

- [ ] **Step 3: Hand over**

Do not merge or push. Report to the user: the branch is ready, how to preview it (`npm run build && npx vite preview`), the screenshots folder, and that merging to `main` deploys to their phone, so it waits for their go-ahead after they have looked.
