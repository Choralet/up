import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

describe('useCountUp', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('shows the final value at once when motion is reduced (or matchMedia is missing)', () => {
    const { result } = renderHook(() => useCountUp(12))
    expect(result.current).toBe(12)
  })

  it('counts up to the value when motion is allowed', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }))
    const { result } = renderHook(() => useCountUp(12, 800))
    expect(result.current).toBe(0)
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(12)
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe(12)
  })
})
