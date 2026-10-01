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
