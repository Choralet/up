import exportText from '../../docs/data/calisthenics-trees.md?raw'
import { NODES } from './nodes'
import { indexNodes } from '../engine/graph'
import { computeDepths } from '../engine/layout'
import { wrapLabel } from '../lib/format'
import { SKILLS } from './skills'
import { DEMO_IDS, demoUrl } from './demos'
import { DAY_BRANCHES } from './schedule'
import { formatStamp, ROADMAP, videoUrl } from './roadmap'
import { ACCESSORY_TRACKS, DAY_TRACKS, FINISHER_TRACKS, SHORT_TRACKS, TRACKS } from './tracks'
import { EQUIPMENT, MUSCLES, SOURCES, TREES, parseEquipment, youtubeSearch } from './trees'
import { GATES, GOALS, TWINS } from './overlay'
import { parseTrees } from './parseTrees'
import { parseGoal } from './goals'
import { LEGACY_IDS } from './legacy'
import { OLD_IDS } from '../test/legacy-ids'
import trees from './trees.json'

const byId = indexNodes(NODES)
const TREE = NODES.filter((n) => !n.roadmapOnly)

describe('the export', () => {
  it('trees.json is the importer output of docs/data/calisthenics-trees.md (re-run scripts/import-trees.mjs)', () => {
    expect(parseTrees(exportText)).toEqual(trees)
  })
  it('has 34 trees and 229 exercises: 10 main, 11 muscle-specific, 13 skill ladders', () => {
    expect(TREES).toHaveLength(34)
    expect(TREE).toHaveLength(229)
    expect(TREES.filter((t) => t.category === 'main')).toHaveLength(10)
    expect(TREES.filter((t) => t.category === 'supp')).toHaveLength(11)
    expect(TREES.filter((t) => t.category === 'skill')).toHaveLength(13)
  })
  it('reads tables with escaped pipes, links and empty parents', () => {
    const p = parseTrees(exportText)
    const fe = p.trees.find((t) => t.id === 'hpull')!.nodes.find((n) => n.id === 'fe')!
    expect(fe.equipment).toBe('rings+box|low+box')
    expect(parseEquipment(fe.equipment)).toEqual([['rings', 'box'], ['low', 'box']])
    const w = p.trees[0].nodes[0]
    expect(w).toMatchObject({ id: 'w', parent: null, rung: 1, name: 'Wall push-up', primary: ['Chest', 'Front delts', 'Triceps'] })
    expect(w.links.map((l) => l.label)).toEqual(['fl', 'hc'])
    expect(p.trees[0].video?.url).toBe('https://www.youtube.com/watch?v=zkU6Ok44_CI')
    expect(p.sources.gen).toEqual({ title: 'General coaching consensus (no single verified video)' })
  })
  it('every equipment code, muscle and source is in its table', () => {
    for (const n of TREE) {
      for (const opt of n.equipment ?? []) for (const e of opt) expect(EQUIPMENT[e], `${n.id} ${e}`).toBeDefined()
      for (const m of [...n.muscles!.primary, ...n.muscles!.secondary]) expect(MUSCLES, `${n.id} ${m}`).toContain(m)
      if (n.source) expect(SOURCES[n.source], `${n.id} ${n.source}`).toBeDefined()
    }
  })
  it('names a provider for every how-to link', () => {
    const labels = new Set(TREE.flatMap((n) => n.links!.map((l) => l.label)))
    for (const l of labels) expect(l, l).not.toMatch(/^(fl|hc|sl|cv|source video\/guide)$/)
    expect(byId.get('hpush:w')!.links!.map((l) => l.label)).toEqual(['Fitloop', 'Hybrid Calisthenics'])
    expect(byId.get('vpush:pk')!.links![1].label).toBe('THENX / Chris Heria: How To Handstand Push Up (YouTube)')
  })
  it('builds the YouTube search link without the parentheses', () => {
    expect(youtubeSearch('Box pistol (into the pistol ladder)')).toBe('https://www.youtube.com/results?search_query=Box%20pistol%20calisthenics%20tutorial')
  })
})

describe('goals from the "advance" text', () => {
  it.each([
    ['3×8 clean (RR rule), then incline', { type: 'reps', sets: 3, target: 8 }],
    ['3×8–12 at the deeper range', { type: 'reps', sets: 3, target: 12 }],
    ['3×10–15 s, then advanced tuck', { type: 'hold', sets: 3, target: 15 }],
    ['3×8 per side, then one-arm incline', { type: 'reps', sets: 3, target: 8, per: 'side' }],
    ['RR: 3×8 per leg, then Bulgarian', { type: 'reps', sets: 3, target: 8, per: 'leg' }],
    ['10–30 s per arm', { type: 'hold', sets: 3, target: 30, per: 'arm' }],
    ['Hold 30–60 s, then negative dips', { type: 'hold', sets: 1, target: 60 }],
    ['Sets of about 5 slow 3–5 s lowers (THENX), then wall HSPU', { type: 'reps', sets: 3, target: 5 }],
    ['3×5 slow 3–5 s lowers, then full dips', { type: 'reps', sets: 3, target: 5 }],
    ['5–8 reps; add load when all sets hit the top', { type: 'reps', sets: 3, target: 8 }],
    ['2–3×20–30 s per side', { type: 'hold', sets: 3, target: 30, per: 'side' }],
    ['3×12–20 steps', { type: 'reps', sets: 3, target: 20 }],
    ['Takes years for most people', null],
  ])('%s', (text, goal) => {
    expect(parseGoal(text)).toEqual(goal)
  })
  it('every exercise has a sane goal; the overlay covers every text without a number', () => {
    for (const n of NODES) {
      expect(n.goal.sets, n.id).toBeGreaterThanOrEqual(1)
      expect(n.goal.sets, n.id).toBeLessThanOrEqual(10)
      expect(n.goal.target, n.id).toBeGreaterThanOrEqual(1)
      expect(n.cue.length, n.id).toBeGreaterThan(0)
    }
    for (const id of Object.keys(GOALS)) expect(byId.has(id), id).toBe(true)
  })
  it('review fixes: German hang builds to one 30 s hold; shrimp squats and weighted pistols count per leg', () => {
    expect(byId.get('bl:gh')!.goal).toEqual({ type: 'hold', sets: 1, target: 30 })
    for (const id of ['squat:bsh', 'squat:ish', 'squat:ash', 'pistol:wps']) expect(byId.get(id)!.goal.per, id).toBe('leg')
  })
  it('review fixes: a doorway pull-up bar is too high for rows; Human flag waits for full wall HSPUs', () => {
    expect(byId.get('hpull:hr')!.equipment).toEqual([['rings'], ['low']])
    expect(byId.get('flag:vf')!.requires).toEqual(['hspu:wh'])
  })
  it('known goals', () => {
    expect(byId.get('hpush:p')!.goal).toEqual({ type: 'reps', sets: 3, target: 8 })
    expect(byId.get('fl:tf')!.goal).toEqual({ type: 'hold', sets: 3, target: 15 })
    expect(byId.get('antiext:pl')!.goal).toEqual({ type: 'hold', sets: 1, target: 60 })
    expect(byId.get('pistol:ps')!.goal).toEqual({ type: 'reps', sets: 3, target: 5, per: 'leg' })
  })
})

describe('exercise graph', () => {
  it('has unique ids', () => {
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length)
  })
  it('every requirement exists; tree exercises build on their own tree, except a ladder\'s gate', () => {
    for (const n of NODES) {
      for (const r of n.requires) {
        const parent = byId.get(r)
        expect(parent, `${n.id} requires missing ${r}`).toBeDefined()
        if (n.roadmapOnly) continue
        expect(parent!.roadmapOnly, `${n.id} (tree) requires roadmap-only ${r}`).toBeFalsy()
        if (parent!.tree !== n.tree) expect(GATES[n.tree!], `${n.id} requires ${r} of another tree`).toContain(r)
      }
    }
  })
  it('has no cycles (computeDepths would throw)', () => {
    expect(() => computeDepths(NODES)).not.toThrow()
  })
  it('every skill ladder starts behind an exercise of another tree (its gate)', () => {
    for (const t of TREES.filter((x) => x.category === 'skill')) {
      const roots = TREE.filter((n) => n.tree === t.id && n.requires.every((r) => byId.get(r)!.tree !== t.id))
      expect(roots.length, t.id).toBeGreaterThan(0)
      for (const r of roots) {
        expect(r.requires.length, r.id).toBeGreaterThan(0)
        for (const g of r.requires) expect(byId.get(g)!.tree, `${r.id} gate ${g}`).not.toBe(t.id)
      }
    }
  })
  it('twins exist, point both ways and live in different trees', () => {
    for (const [a, b] of TWINS) {
      expect(byId.get(a)?.twins, a).toContain(b)
      expect(byId.get(b)?.twins, b).toContain(a)
      expect(byId.get(a)!.tree).not.toBe(byId.get(b)!.tree)
    }
  })
  it('main and muscle exercises have a track (their tree); skill steps have a chain (their tree)', () => {
    const trackIds = new Set(TRACKS.map((t) => t.id))
    for (const n of TREE) {
      if (n.kind === 'skill') expect([n.skill, n.track], n.id).toEqual([n.tree, undefined])
      else expect([n.track, n.skill, trackIds.has(n.track!)], n.id).toEqual([n.tree, undefined, true])
    }
  })
  it('day, short, finisher and accessory tracks exist and match the day\'s branches', () => {
    for (const lists of [DAY_TRACKS, SHORT_TRACKS, ACCESSORY_TRACKS]) {
      for (const [day, ids] of Object.entries(lists)) {
        for (const id of ids) {
          const t = TRACKS.find((x) => x.id === id)
          expect(t, id).toBeDefined()
          expect(DAY_BRANCHES[day as keyof typeof DAY_BRANCHES], `${day} ${id}`).toContain(t!.branch)
          expect(!!t!.accessory, id).toBe(lists === ACCESSORY_TRACKS)
        }
      }
    }
    for (const id of FINISHER_TRACKS) expect(TRACKS.find((t) => t.id === id)?.branch).toBe('core')
    const accessories = TRACKS.filter((t) => t.accessory).map((t) => t.id).sort()
    expect([...new Set(Object.values(ACCESSORY_TRACKS).flat())].sort()).toEqual(accessories)
    expect([...ACCESSORY_TRACKS.full].sort()).toEqual(accessories) // full body rotates through all of them
  })
  it('every tree label fits in two short lines', () => {
    for (const n of TREE) {
      const lines = wrapLabel(n.short ?? n.name)
      expect(lines.length, `${n.id} label "${n.short ?? n.name}" wraps to ${lines.length} lines`).toBeLessThanOrEqual(2)
      for (const l of lines) expect(l.length, `${n.id} line "${l}"`).toBeLessThanOrEqual(13)
    }
  })
  it('skill steps belong to a known chain and only skill steps have one', () => {
    const chainIds = new Set(SKILLS.map((s) => s.id))
    for (const n of NODES) {
      expect(!!n.skill, `${n.id}: kind ${n.kind} vs skill ${n.skill}`).toBe(n.kind === 'skill')
      if (n.skill) expect(chainIds.has(n.skill), `${n.id} chain ${n.skill}`).toBe(true)
    }
  })
  it('every chain has steps, is trained on a day that covers its branch, and lists steps in order', () => {
    const index = new Map(NODES.map((n, i) => [n.id, i]))
    for (const chain of SKILLS) {
      const steps = NODES.filter((n) => n.skill === chain.id)
      expect(steps.length, `${chain.id} steps`).toBeGreaterThan(0)
      expect(steps.some((s) => DAY_BRANCHES[chain.day].includes(s.branch)), `${chain.id} day`).toBe(true)
      for (const s of steps) {
        for (const r of s.requires) {
          if (byId.get(r)!.skill === chain.id) expect(index.get(r)!, `${s.id} before ${r}`).toBeLessThan(index.get(s.id)!)
        }
      }
    }
  })
  it('every demo belongs to a known exercise and points at the pinned CDN; a twin borrows it', () => {
    for (const id of DEMO_IDS) {
      expect(byId.has(id), id).toBe(true)
      expect(demoUrl(id)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\/exercises-dataset@7455efa[0-9a-f]+\/videos\/\d{4}-\w+\.gif$/)
    }
    expect(demoUrl('hpush:w')).toBeNull()
    expect(demoUrl('tri:x5', byId.get('tri:x5')!.twins)).toBe(demoUrl('hpush:d'))
  })
})

describe('roadmap', () => {
  it('50 items in 3 years, every step exists, no duplicates, video stamps valid', () => {
    expect(ROADMAP).toHaveLength(50)
    expect(ROADMAP.filter((r) => r.year === 1)).toHaveLength(22)
    expect(ROADMAP.filter((r) => r.year === 2)).toHaveLength(18)
    expect(ROADMAP.filter((r) => r.year === 3)).toHaveLength(10)
    expect(new Set(ROADMAP.map((r) => r.id)).size).toBe(50)
    for (const r of ROADMAP) {
      expect(r.steps.length, r.id).toBeGreaterThan(0)
      for (const s of r.steps) expect(byId.has(s), `${r.id} -> ${s}`).toBe(true)
      expect(Number.isInteger(r.t) && r.t >= 0 && r.t < 1000, r.id).toBe(true)
    }
    const stepsPerYear = [1, 2, 3].map((y) => ROADMAP.filter((r) => r.year === y).map((r) => r.t))
    for (const ts of stepsPerYear) expect(ts).toEqual([...ts].sort((a, b) => a - b))
  })
  it('each step after an item\'s first builds on the step before it (so "I can already do this" can finish the item)', () => {
    for (const r of ROADMAP) for (let i = 1; i < r.steps.length; i++) expect(byId.get(r.steps[i])!.requires, `${r.id} ${r.steps[i]}`).toContain(r.steps[i - 1])
  })
  it('roadmap-only nodes are skill steps of roadmap-only chains; tree chains stay in the tree', () => {
    const chainById = new Map(SKILLS.map((c) => [c.id, c]))
    for (const n of NODES.filter((x) => x.roadmapOnly)) {
      expect(n.kind, n.id).toBe('skill')
      expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBe(true)
    }
    for (const n of TREE.filter((x) => x.skill)) expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBeFalsy()
  })
  it('builds the video link at the chapter', () => {
    expect(videoUrl(ROADMAP[0])).toBe('https://www.youtube.com/watch?v=J2JHDavNZB4&t=9s')
    expect(formatStamp(128)).toBe('2:08')
  })
})

describe('legacy ids', () => {
  it('every exercise id before Plan 8 still exists or maps to one that does', () => {
    for (const id of OLD_IDS) expect(byId.has(LEGACY_IDS[id] ?? id), id).toBe(true)
    for (const [from, to] of Object.entries(LEGACY_IDS)) {
      expect(OLD_IDS, from).toContain(from)
      expect(byId.has(to), `${from} -> ${to}`).toBe(true)
      expect(byId.has(from), `${from} is still an id`).toBe(false)
    }
  })
})
