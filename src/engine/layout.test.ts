import { NODES } from '../data/nodes'
import { TREES } from '../data/trees'
import { wrapLabel } from '../lib/format'
import { COL_W, layoutTree, PAD_X, PAD_Y, ROW_H } from './layout'

describe('layoutTree', () => {
  const push = layoutTree(NODES, 'hpush')
  const at = (id: string) => push.placed.find((p) => p.node.id === id)!

  it('puts beginner nodes at the bottom and harder ones higher', () => {
    expect(at('hpush:w').y).toBeGreaterThan(at('hpush:p').y)
    expect(at('hpush:p').y).toBeGreaterThan(at('hpush:d').y)
    expect(at('hpush:d').y).toBeGreaterThan(at('hpush:oa').y)
  })

  it('runs the longest path straight up in the first column; side branches open to the right', () => {
    for (const id of ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'hpush:d', 'hpush:a', 'hpush:oai', 'hpush:oa']) expect(at(id).x, id).toBe(PAD_X)
    expect(at('hpush:pp').x).toBe(PAD_X + COL_W)
    expect(new Set(['hpush:dp', 'hpush:rp', 'hpush:wp'].map((id) => at(id).col))).toEqual(new Set([2, 3, 4]))
    expect(at('hpush:rto').col).toBe(at('hpush:rp').col)
  })

  it('bottom row sits at the bottom padding and the top row at the top padding', () => {
    const ys = push.placed.map((p) => p.y)
    expect(Math.min(...ys)).toBe(PAD_Y)
    expect(Math.max(...ys)).toBe(PAD_Y + 7 * ROW_H)
  })

  it('draws only this tree and its in-tree edges; a ladder\'s gate is not drawn', () => {
    expect(push.placed).toHaveLength(13)
    expect(push.edges).toContainEqual({ from: 'hpush:p', to: 'hpush:d' })
    expect(push.edges).toHaveLength(12)
    const planche = layoutTree(NODES, 'planche')
    expect(planche.placed.every((p) => p.node.tree === 'planche')).toBe(true)
    expect(planche.edges.some((e) => e.from === 'hpush:p')).toBe(false)
  })

  it('places trees with several roots side by side', () => {
    const hinge = layoutTree(NODES, 'hinge')
    const gb = hinge.placed.find((p) => p.node.id === 'hinge:gb')!
    const rdl = hinge.placed.find((p) => p.node.id === 'hinge:rdl')!
    expect(gb.y).toBe(rdl.y)
    expect(gb.col).not.toBe(rdl.col)
  })

  it('every tree: no two nodes share a cell, and labels in one row never overlap', () => {
    for (const t of TREES) {
      const l = layoutTree(NODES, t.id)
      expect(l.placed.length, t.id).toBeGreaterThan(0)
      expect(l.width, t.id).toBeGreaterThan(0)
      const cells = new Set(l.placed.map((p) => `${p.col}:${p.depth}`))
      expect(cells.size, t.id).toBe(l.placed.length)
      // a label line is at most 13 characters (about 5 px each), well inside a column
      for (const p of l.placed) for (const line of wrapLabel(p.node.short ?? p.node.name)) expect(line.length * 5, p.node.id).toBeLessThan(COL_W)
    }
  })
})
