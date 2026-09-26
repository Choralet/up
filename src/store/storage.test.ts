import { retryOnce } from './storage'

describe('retryOnce', () => {
  it('returns the result without resetting when the first attempt works', async () => {
    const reset = vi.fn()
    expect(await retryOnce(async () => 'ok', reset)).toBe('ok')
    expect(reset).not.toHaveBeenCalled()
  })

  it('resets and retries once when the first attempt fails', async () => {
    let calls = 0
    const reset = vi.fn()
    const result = await retryOnce(async () => {
      calls++
      if (calls === 1) throw new Error('stale connection')
      return 'ok'
    }, reset)
    expect(result).toBe('ok')
    expect(calls).toBe(2)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('rethrows when the retry also fails', async () => {
    await expect(retryOnce(async () => { throw new Error('still broken') }, () => {})).rejects.toThrow('still broken')
  })
})
