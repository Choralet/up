import { NODES } from './nodes'
import { indexNodes } from '../engine/graph'
import { computeDepths } from '../engine/layout'
import { wrapLabel } from '../lib/format'
import { SKILLS } from './skills'
import { DEMO_IDS, demoUrl } from './demos'
import { DAY_BRANCHES } from './schedule'
import { formatStamp, ROADMAP, videoUrl } from './roadmap'
import { TRACKS } from './tracks'

const TREE = NODES.filter((n) => !n.roadmapOnly)

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
        if (n.roadmapOnly) continue // roadmap moves may build on any branch
        expect(parent!.branch, `${n.id} requires other-branch ${r}`).toBe(n.branch)
        expect(parent!.roadmapOnly, `${n.id} (tree) requires roadmap-only ${r}`).toBeFalsy()
      }
    }
  })

  it('has no cycles (computeDepths would throw)', () => {
    expect(() => computeDepths(NODES)).not.toThrow()
  })

  it('every strength exercise belongs to one track of its branch; skill steps have none', () => {
    const byId = new Map(TRACKS.map((t) => [t.id, t]))
    for (const n of NODES) {
      if (n.kind === 'skill') expect(n.track, n.id).toBeUndefined()
      else expect(byId.get(n.track!)?.branch, `${n.id} track ${n.track}`).toBe(n.branch)
    }
  })

  it('each track has exactly one starting exercise (no requirements)', () => {
    for (const t of TRACKS) {
      const roots = NODES.filter((n) => n.track === t.id && n.requires.length === 0)
      expect(roots.map((r) => r.id), t.id).toHaveLength(1)
    }
  })

  it('the new starter moves exist in their tracks', () => {
    const track = (id: string) => NODES.find((n) => n.id === id)?.track
    expect([track('push-pike-hold'), track('push-bench-dip'), track('push-dip-neg'), track('rm-dip')]).toEqual(['push-v', 'push-d', 'push-d', 'push-d'])
    expect([track('pull-row-high'), track('pull-row'), track('pull-row-elevated'), track('pull-row-archer')]).toEqual(['pull-r', 'pull-r', 'pull-r', 'pull-r'])
    expect([track('legs-bridge'), track('legs-sl-bridge'), track('legs-nordic-neg')]).toEqual(['legs-h', 'legs-h', 'legs-h'])
    expect([track('core-lying-raise'), track('core-knee-raise'), track('core-leg-raise')]).toEqual(['core-l', 'core-l', 'core-l'])
  })

  it('never draws two nodes in the same cell of a tree', () => {
    const depths = computeDepths(NODES)
    const seen = new Set<string>()
    for (const n of TREE) {
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

  it('every tree label fits in two short lines', () => {
    for (const n of TREE) {
      const lines = wrapLabel(n.short ?? n.name)
      expect(lines.length, `${n.id} label wraps to ${lines.length} lines`).toBeLessThanOrEqual(2)
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
          const parent = NODES.find((n) => n.id === r)!
          if (parent.skill === chain.id) expect(index.get(r)!, `${s.id} before ${r}`).toBeLessThan(index.get(s.id)!)
        }
      }
    }
  })
  it('every demo belongs to a known exercise and points at the pinned CDN', () => {
    const ids = new Set(NODES.map((n) => n.id))
    for (const id of DEMO_IDS) {
      expect(ids.has(id), id).toBe(true)
      expect(demoUrl(id)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\/exercises-dataset@7455efa[0-9a-f]+\/videos\/\d{4}-\w+\.gif$/)
    }
    expect(demoUrl('push-wall')).toBeNull()
  })
  it('roadmap: 50 items in 3 years, every step exists, no duplicates, video stamps valid', () => {
    const ids = new Set(NODES.map((n) => n.id))
    expect(ROADMAP).toHaveLength(50)
    expect(ROADMAP.filter((r) => r.year === 1)).toHaveLength(22)
    expect(ROADMAP.filter((r) => r.year === 2)).toHaveLength(18)
    expect(ROADMAP.filter((r) => r.year === 3)).toHaveLength(10)
    expect(new Set(ROADMAP.map((r) => r.id)).size).toBe(50)
    for (const r of ROADMAP) {
      expect(r.steps.length, r.id).toBeGreaterThan(0)
      for (const s of r.steps) expect(ids.has(s), `${r.id} -> ${s}`).toBe(true)
      expect(Number.isInteger(r.t) && r.t >= 0 && r.t < 1000, r.id).toBe(true)
    }
    const stepsPerYear = [1, 2, 3].map((y) => ROADMAP.filter((r) => r.year === y).map((r) => r.t))
    for (const ts of stepsPerYear) expect(ts).toEqual([...ts].sort((a, b) => a - b))
  })

  it('roadmap-only nodes are skill steps of roadmap-only chains; tree chains stay in the tree', () => {
    const chainById = new Map(SKILLS.map((c) => [c.id, c]))
    for (const n of NODES.filter((x) => x.roadmapOnly)) {
      expect(n.kind, n.id).toBe('skill')
      expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBe(true)
    }
    for (const n of NODES.filter((x) => !x.roadmapOnly && x.skill)) expect(chainById.get(n.skill!)?.roadmapOnly, n.id).toBeFalsy()
  })

  it('builds the video link at the chapter', () => {
    const first = ROADMAP[0]
    expect(videoUrl(first)).toBe('https://www.youtube.com/watch?v=J2JHDavNZB4&t=9s')
    expect(formatStamp(128)).toBe('2:08')
  })
})
