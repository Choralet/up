import { realServices } from './services'

describe('realServices.saveFile', () => {
  const setShare = (share: () => Promise<void>) => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  }
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:up')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    click.mockRestore()
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })

  it('falls back to a download when the share sheet is refused', async () => {
    setShare(() => Promise.reject(Object.assign(new Error('no gesture'), { name: 'NotAllowedError' })))
    await realServices.saveFile('up.json', '{}')
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('does nothing more when you cancel the share sheet', async () => {
    setShare(() => Promise.reject(Object.assign(new Error('cancel'), { name: 'AbortError' })))
    await realServices.saveFile('up.json', '{}')
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads directly when sharing files is not supported', async () => {
    await realServices.saveFile('up.json', '{}')
    expect(click).toHaveBeenCalledTimes(1)
  })
})
