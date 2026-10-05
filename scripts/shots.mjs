// scripts/shots.mjs
// Phone-size screenshots of the built app, driven over the Chrome DevTools Protocol, plus a quick layout check.
// Usage: npm run build && npx vite preview --port 4173 --strictPort   (leave running), then
//        npm run shots -- <outDir> [scenario ...]
// Env: UP_URL, CHROME, LARGE=1 (125% text), REDUCE=1 (prefers-reduced-motion: reduce), WIDTH/HEIGHT (default 390×844)
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = process.env.UP_URL ?? 'http://localhost:4173/up/'
const LARGE = process.env.LARGE === '1'
const REDUCE = process.env.REDUCE === '1'
const WIDTH = Number(process.env.WIDTH ?? 390), HEIGHT = Number(process.env.HEIGHT ?? 844)
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

// steps: ['text', label] clicks the first button/link/tab whose accessible label or text is, starts with, or contains label;
//        ['sel', css] clicks the first element matching css; ['wait', ms]; ['scroll', css, px] scrolls that element (else the page)
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
  'node-bottom': { steps: [['text', 'Tree'], ['sel', '[aria-label^="Wall push-up,"]']] },
  // Plan 8: one ladder at a time, details, equipment (the SEED above uses pre-Plan 8 ids, so every run also checks the migration)
  'tree-pull': { steps: [['text', 'Tree'], ['text', 'Pull']] },
  'tree-hs': { steps: [['text', 'Tree'], ['text', 'Handstand']] },
  'tree-gear': { seed: { settings: { holdSound: true, length: 'standard', equipment: ['band', 'bar'] } }, steps: [['text', 'Tree']] },
  'today-gear': { seed: { settings: { holdSound: true, length: 'standard', equipment: ['band', 'bar'] } }, steps: [] },
  'node-gear': { seed: { settings: { holdSound: true, length: 'standard', equipment: ['band', 'bar'] } }, steps: [['text', 'Tree'], ['text', 'Overhead'], ['sel', '[aria-label^="Feet-elevated pike push-up,"]']] },
  'node-details': { steps: [['text', 'Tree'], ['sel', '[aria-label^="Push-up,"]'], ['scroll', '.sheet', 2000]] },
  'settings-gear': { seed: { settings: { holdSound: true, length: 'standard', equipment: ['band', 'bar'] } }, steps: [['sel', '[aria-label="Settings"]'], ['scroll', '.log', 1150]] },
  'onboarding-gear': { seed: { onboarded: false }, steps: [['text', 'Start']] },
  full: { seed: { settings: { holdSound: true, length: 'full' } }, steps: [['scroll', '.screen', 2000]] },
  // Plan 9: full body (the SEED has no plan, so it migrates to full body), the Push/Pull/Legs option, rest timer
  ppl: { seed: { schedule: ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'], settings: { holdSound: true, length: 'standard', plan: 'ppl', restTimer: true } }, steps: [] },
  'today-scroll': { steps: [['scroll', 'html', 1300]] },
  'log-rest': { steps: [['text', 'Pike push-up'], ['text', 'Log Set']] },
  'settings-plan': { steps: [['sel', '[aria-label="Settings"]']] },
  'tree-rows': { seed: { settings: { holdSound: true, length: 'standard', equipment: ['band', 'bar', 'wall'] } }, steps: [['text', 'Tree'], ['text', 'Pull'], ['text', 'Rows']] },
  'fri-high': { date: FRI, seed: { completed: ["legs-assisted", "legs-squat", "legs-split", "legs-bulgarian", "legs-shrimp", "legs-assisted-pistol", "legs-pistol", "core-deadbug", "core-plank", "core-hollow", "core-knee-raise", "core-tuck-lsit", "core-leg-raise", "core-lsit", "core-dragon", "core-dragon-full", "legs-bridge", "legs-sl-bridge", "legs-nordic-neg", "core-lying-raise"] }, steps: [] },
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
    const el = els.find((e) => label(e) === t) || els.find((e) => label(e).startsWith(t)) || els.find((e) => label(e).includes(t))
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
    // touch targets: at least 44×44 (inline text links are exempt, like WCAG 2.5.8)
    if (el.matches('button, a, select, input, summary, [role=button], [role=tab], [role=switch]') && !el.matches('.inline, a.inline') && cs.display !== 'inline' && (r.width < 43.5 || r.height < 43.5) && !el.closest('[inert]')) out.push(`small target: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
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
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'up-shots-'))}`, '--no-first-run', '--hide-scrollbars', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), 'about:blank'], { stdio: 'ignore' })
  try {
    let list
    for (let i = 0; i < 50 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() } catch { await sleep(200) } }
    const page = list.find((t) => t.type === 'page')
    const c = await cdp(page.webSocketDebuggerUrl)
    await c.send('Page.enable')
    await c.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true })
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
          if (step[0] === 'scroll') { await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(step[1])}); if (el) el.scrollTop = ${step[2]}; else scrollTo(0, ${step[2]}) })()`); await sleep(500); continue }
          if (!(await evalJs(clickJs(step)))) console.warn(`  ${nameKey}: could not click ${step[1]}`)
          await sleep(900)
        }
        await sleep(600)
        const file = join(outDir, `${nameKey}-${scheme}${LARGE ? '-large' : ''}${REDUCE ? '-reduce' : ''}${WIDTH !== 390 ? `-${WIDTH}` : ''}.png`)
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
