import { NODES } from '../data/nodes'
import { BackupError, exportBackup, parseBackup, progressHash } from './backup'
import { initialProgress, logSet } from './progress'

describe('backup file', () => {
  const progress = logSet({ ...initialProgress(NODES), completed: ['push-wall'], onboarded: true }, 'push-incline', 10, '2026-09-21', 1)

  it('round-trips progress through the text format', () => {
    const text = exportBackup(progress, new Date('2026-09-21T10:00:00Z'))
    const data = JSON.parse(text)
    expect(data.app).toBe('up')
    expect(data.version).toBe(1)
    expect(data.exportedAt).toBe('2026-09-21T10:00:00.000Z')
    const back = parseBackup(text, NODES)
    expect(back.completed).toEqual(['push-wall'])
    expect(back.logs).toHaveLength(1)
    expect(back.onboarded).toBe(true)
  })

  it('rejects files that are not Up backups with a friendly message', () => {
    for (const bad of ['', 'not json', '{}', '[]', '{"app":"other","progress":{}}', '{"app":"up"}', 'null']) {
      expect(() => parseBackup(bad, NODES), bad).toThrow(BackupError)
    }
    expect(() => parseBackup('nope', NODES)).toThrow("This file isn't an Up backup.")
  })

  it('cleans what it imports (unknown ids dropped)', () => {
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed: ['push-wall', 'ghost'] } })
    expect(parseBackup(text, NODES).completed).toEqual(['push-wall'])
  })

  it('never includes anything but progress', () => {
    const data = JSON.parse(exportBackup(progress))
    expect(Object.keys(data).sort()).toEqual(['app', 'exportedAt', 'progress', 'version'])
  })
})

describe('progressHash', () => {
  it('is stable for equal progress and changes when progress changes', () => {
    const a = initialProgress(NODES)
    expect(progressHash(a)).toBe(progressHash(initialProgress(NODES)))
    expect(progressHash(logSet(a, 'push-wall', 10, '2026-09-21', 1))).not.toBe(progressHash(a))
  })
})

describe('backup leaves out today-only state', () => {
  it('export has no day, and warm-up ticks do not change the hash', () => {
    const p = { ...initialProgress(NODES), day: { date: '2026-09-21', pick: null, warm: ['push:Arm circles'] } }
    expect(JSON.parse(exportBackup(p)).progress.day).toBeUndefined()
    expect(progressHash(p)).toBe(progressHash({ ...p, day: null }))
  })
})
