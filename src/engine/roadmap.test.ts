import { NODES } from '../data/nodes'
import { ROADMAP } from '../data/roadmap'
import { indexNodes } from './graph'
import { activateSkill, sanitizeProgress, type Progress } from './progress'
import { roadmapStatus } from './roadmap'

const byId = indexNodes(NODES)
const item = (id: string) => ROADMAP.find((r) => r.id === id)!
const save = (raw: object): Progress => sanitizeProgress(NODES, { onboarded: true, ...raw })

describe('roadmapStatus', () => {
  it('a fresh user: Hollow body hang is locked behind Dead hang', () => {
    const s = roadmapStatus(byId, save({}), item('y1-hollow-hang'))
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['Dead hang'])
  })
  it('ready once the requirement is done, with the first step as next', () => {
    const s = roadmapStatus(byId, save({ completed: ['vpull:dh'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('ready')
    expect(s.next?.id).toBe('rm-hollow-hang-1')
  })
  it('training when the chain is on this item\'s step', () => {
    const p = activateSkill(NODES, save({ completed: ['vpull:dh'] }), 'hollow-hang')
    expect(roadmapStatus(byId, p, item('y1-hollow-hang')).status).toBe('training')
  })
  it('training for a linked strength exercise that is the track focus', () => {
    expect(roadmapStatus(byId, save({}), item('y1-pike-pushup')).status).toBe('training')
  })
  it('done when every step is completed', () => {
    const s = roadmapStatus(byId, save({ completed: ['vpull:dh', 'rm-hollow-hang-1', 'rm-hollow-hang-2'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('done')
    expect(s.next).toBeNull()
    expect(s.done).toBe(2)
  })
  it('lists a ladder\'s gate by name', () => {
    const s = roadmapStatus(byId, save({}), item('y1-tuck-front-lever'))
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['Pull-up'])
  })
  it('items sharing a ladder judge their own steps (Back lever Y1 done, Y2 ready)', () => {
    const p = save({ completed: ['vpull:np', 'bl:gh', 'bl:stc', 'bl:tb'] })
    expect(roadmapStatus(byId, p, item('y1-tuck-back-lever')).status).toBe('done')
    expect(roadmapStatus(byId, p, item('y2-back-lever')).status).toBe('ready')
  })
  it('locked by equipment: names what you would need', () => {
    const p = save({ completed: ['vpull:pu', 'dip:d'], settings: { holdSound: true, length: 'standard', equipment: ['bar'] } })
    const s = roadmapStatus(byId, p, item('y2-false-grip'))
    expect(s.status).toBe('locked')
    expect(s.gear).toEqual(['rings'])
  })
})
