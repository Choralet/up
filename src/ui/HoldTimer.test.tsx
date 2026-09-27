import { act, fireEvent, render, screen } from '@testing-library/react'
import { HoldTimer, holdTone } from './HoldTimer'

const offset = () => screen.getByRole('img').querySelectorAll('circle')[1].getAttribute('stroke-dashoffset')
const tick = (ms: number) => act(async () => { vi.advanceTimersByTime(ms) })
const start = () => act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start' })) })

describe('HoldTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('counts down 3, 2, 1 before timing, so getting into position is not counted', async () => {
    const onStop = vi.fn()
    render(<HoldTimer target={30} onStop={onStop} />)
    await start()
    expect(screen.getByTestId('countdown')).toHaveTextContent('3')
    await tick(1000)
    expect(screen.getByTestId('countdown')).toHaveTextContent('2')
    await tick(2000 + 5000)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop and Log' })) })
    expect(onStop).toHaveBeenCalledWith(5)
  })

  it('the countdown keeps one live region, so VoiceOver reads 3, 2, 1', async () => {
    render(<HoldTimer target={30} onStop={vi.fn()} />)
    await start()
    const live = screen.getByTestId('countdown').closest('[aria-live]')
    expect(live).not.toBeNull()
    await tick(1000)
    expect(screen.getByTestId('countdown').closest('[aria-live]')).toBe(live)
  })

  it('tapping during the countdown cancels without logging', async () => {
    const onStop = vi.fn()
    render(<HoldTimer target={30} onStop={onStop} />)
    await start()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel Countdown' })) })
    expect(onStop).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('moves the ring smoothly, on every frame rather than once per interval', async () => {
    render(<HoldTimer target={30} onStop={() => {}} />)
    await start()
    await tick(3016)
    const a = offset()
    await tick(50)
    const b = offset()
    await tick(50)
    const c = offset()
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('plays one soft tone at the goal when sound is on, none when off', async () => {
    const play = vi.spyOn(holdTone, 'play').mockImplementation(() => {})
    const first = render(<HoldTimer target={5} sound onStop={() => {}} />)
    await start()
    await tick(3000 + 4900)
    expect(play).not.toHaveBeenCalled()
    await tick(200)
    await tick(2000)
    expect(play).toHaveBeenCalledTimes(1)
    first.unmount()
    play.mockClear()
    render(<HoldTimer target={5} sound={false} onStop={() => {}} />)
    await start()
    await tick(9000)
    expect(play).not.toHaveBeenCalled()
  })

  it('after stopping, shows what was logged and resets the ring', async () => {
    render(<HoldTimer target={30} onStop={() => {}} />)
    await start()
    await tick(3000 + 23_400)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop and Log' })) })
    expect(screen.getByText('Logged 0:23')).toBeInTheDocument()
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1)
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
    await start()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel Countdown' })) })
    await act(async () => { grant({ release }) })
    expect(release).toHaveBeenCalled()
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
  })

  it('prepares the sound on the Start tap (iOS only allows audio set up during a tap)', async () => {
    const prime = vi.spyOn(holdTone, 'prime').mockImplementation(() => {})
    render(<HoldTimer target={5} sound onStop={() => {}} />)
    await start()
    expect(prime).toHaveBeenCalledTimes(1)
  })
})
