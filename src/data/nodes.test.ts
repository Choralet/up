import { NODES } from './nodes'
import { BRANCHES, indexNodes } from '../engine/graph'
import { computeDepths } from '../engine/layout'
import { wrapLabel } from '../lib/format'
import { SKILLS } from './skills'
import { DAY_BRANCHES } from './schedule'

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

  it('every tree label fits in two short lines', () => {
    for (const n of NODES) {
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
})
