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
