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
    const s = roadmapStatus(byId, save({ completed: ['pull-hang'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('ready')
    expect(s.next?.id).toBe('rm-hollow-hang-1')
  })
  it('training when the chain is on this item\'s step', () => {
    const p = activateSkill(NODES, save({ completed: ['pull-hang'] }), 'hollow-hang')
    expect(roadmapStatus(byId, p, item('y1-hollow-hang')).status).toBe('training')
  })
  it('training for a linked strength exercise that is the branch focus', () => {
    const s = roadmapStatus(byId, save({ completed: ['push-pike-hold'], focus: { 'push-v': 'push-pike' } }), item('y1-pike-pushup'))
    expect(s.status).toBe('training')
  })
  it('done when every step is completed', () => {
    const s = roadmapStatus(byId, save({ completed: ['pull-hang', 'rm-hollow-hang-1', 'rm-hollow-hang-2'] }), item('y1-hollow-hang'))
    expect(s.status).toBe('done')
    expect(s.next).toBeNull()
    expect(s.done).toBe(2)
  })
  it('lists cross-branch requirements by name', () => {
    const s = roadmapStatus(byId, save({ completed: ['pull-hang', 'pull-scap', 'pull-row', 'pull-negative', 'pull-pullup'] }), item('y2-lsit-pullup'))
    expect(s.status).toBe('locked')
    expect(s.needs).toEqual(['L-sit'])
  })
  it('items sharing a chain judge their own steps (Back lever Y1 done, Y2 ready)', () => {
    const p = save({ completed: ['pull-hang', 'rm-german-1', 'rm-german-2', 'rm-bl-tuck'] })
    expect(roadmapStatus(byId, p, item('y1-tuck-back-lever')).status).toBe('done')
    expect(roadmapStatus(byId, p, item('y2-back-lever')).status).toBe('ready')
  })
})
