import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NODES } from '../data/nodes'
import { ProgressProvider, useProgress } from './ProgressContext'
import { memoryStorage } from './storage'

function Probe() {
  const { progress, log } = useProgress()
  return (
    <button onClick={() => log('push-wall', 10)}>
      {`focus:${progress.focus.push} logs:${progress.logs.length}`}
    </button>
  )
}

describe('ProgressProvider', () => {
  it('starts from initial progress and persists a logged set', async () => {
    const storage = memoryStorage()
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    const button = await screen.findByRole('button')
    expect(button).toHaveTextContent('focus:push-wall logs:0')
    await userEvent.click(button)
    await waitFor(async () => {
      const saved = (await storage.load()) as { logs: unknown[] }
      expect(saved.logs).toHaveLength(1)
    })
    expect(button).toHaveTextContent('logs:1')
  })

  it('survives corrupted stored data', async () => {
    const storage = memoryStorage({ completed: 'nope', focus: { push: 'ghost' }, logs: 7 })
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:push-wall logs:0')
  })

  it('falls back to initial progress when storage throws', async () => {
    const storage = { load: () => Promise.reject(new Error('boom')), save: async () => {} }
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:push-wall logs:0')
  })
})
