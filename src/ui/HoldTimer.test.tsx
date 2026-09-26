import { act, fireEvent, render, screen } from '@testing-library/react'
import { HoldTimer } from './HoldTimer'

const offset = () => screen.getByRole('img').querySelectorAll('circle')[1].getAttribute('stroke-dashoffset')

describe('HoldTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('moves the ring smoothly, on every frame rather than once per interval', async () => {
    render(<HoldTimer target={30} onStop={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start' })) })
    await act(async () => { vi.advanceTimersByTime(16) })
    const a = offset()
    await act(async () => { vi.advanceTimersByTime(50) })
    const b = offset()
    await act(async () => { vi.advanceTimersByTime(50) })
    const c = offset()
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('reports whole seconds when stopped', async () => {
    const onStop = vi.fn()
    render(<HoldTimer target={30} onStop={onStop} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start' })) })
    await act(async () => { vi.advanceTimersByTime(3500) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop and Log' })) })
    expect(onStop).toHaveBeenCalledWith(3)
  })
  it('draws no progress arc at 0:00', () => {
    render(<HoldTimer target={30} onStop={() => {}} />)
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1)
  })

  it('releases a wake lock that is granted after the hold already stopped', async () => {
    const release = vi.fn(() => Promise.resolve())
    let grant: (v: unknown) => void = () => {}
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => new Promise((r) => { grant = r }) } })
    render(<HoldTimer target={30} onStop={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop and Log' })) })
    await act(async () => { grant({ release }) })
    expect(release).toHaveBeenCalled()
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
  })
})
