import { NODES } from '../data/nodes'
import { achievements, bestStreak } from './achievements'
import { sanitizeProgress } from './progress'

const real = (raw: object = {}) => sanitizeProgress(NODES, { onboarded: true, ...raw })
const L = (date: string, nodeId = 'push-wall') => ({ nodeId, value: 5, date, at: 0 })
const earned = (raw: object, today = '2026-09-26') => achievements(NODES, real(raw), today).filter((a) => a.earned).map((a) => a.id)

describe('achievements', () => {
  it('a fresh user has none, and there are about 15 to earn', () => {
    const all = achievements(NODES, real(), '2026-09-26')
    expect(all.length).toBeGreaterThanOrEqual(14)
    expect(all.filter((a) => a.earned)).toEqual([])
  })
  it('first workout, first level-up and exercise milestones', () => {
    expect(earned({ logs: [L('2026-09-21')] })).toEqual(['first-workout'])
    expect(earned({ completed: ['pull-hang', 'pull-scap', 'pull-negative', 'pull-pullup'], logs: [L('2026-09-21', 'pull-pullup')] })).toEqual(expect.arrayContaining(['first-level-up', 'first-pull-up']))
    expect(earned({ completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard'] })).toContain('first-push-up')
  })
  it('streak badges stay earned after a missed week (best streak ever)', () => {
    const logs = ['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-09'].map((d) => L(d))
    expect(bestStreak(logs, ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'])).toBe(2)
    expect(earned({ logs }, '2026-09-26')).toContain('streak-2')
  })
})

describe('Plan 8 review fixes: achievements count what you trained', () => {
  const log = (nodeId: string, date: string) => ({ nodeId, value: 5, date, at: 0 })
  it('placements and linked exercises are not level-ups or skill steps', () => {
    const placed = ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'hpush:d', 'vpull:dh', 'vpull:sp', 'squat:as', 'squat:s', 'squat:ss', 'antiext:db']
    expect(earned({ completed: placed })).not.toEqual(expect.arrayContaining(['level-ups-10']))
    expect(earned({ completed: placed })).not.toContain('first-level-up')
    const raise = earned({ completed: ['compress:llr', 'compress:hkr'], logs: [log('compress:llr', '2026-09-21'), log('compress:hkr', '2026-09-23')] })
    expect(raise).toContain('first-level-up')
    expect(raise).not.toContain('first-skill') // Dragon flag's lying leg raise came with it
  })
  it('a skill step you trained counts', () => {
    expect(earned({ completed: ['antiext:db', 'antiext:pl', 'hs:pk'], logs: [log('hs:pk', '2026-09-21')] })).toContain('first-skill')
  })
})
