import { NODES } from './nodes'
import { BRANCHES, indexNodes } from '../engine/graph'
import { computeDepths } from '../engine/layout'
import { wrapLabel } from '../lib/format'

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
})
