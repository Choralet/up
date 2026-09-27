import { clampZoom, zoomScroll } from './TreeScreen'

describe('clampZoom', () => {
  it('keeps the tree between 70% and 200%', () => {
    expect(clampZoom(0.2)).toBe(0.7)
    expect(clampZoom(1.3)).toBe(1.3)
    expect(clampZoom(5)).toBe(2)
    expect(clampZoom(NaN)).toBe(1)
  })
})

describe('zoomScroll', () => {
  it('keeps the middle of the view in place when zooming', () => {
    expect(zoomScroll(1, 2, { top: 100, left: 0, width: 400, height: 200 })).toEqual({ top: 300, left: 200 })
    expect(zoomScroll(2, 1, { top: 300, left: 200, width: 400, height: 200 })).toEqual({ top: 100, left: 0 })
  })

  it('never scrolls to a negative position', () => {
    expect(zoomScroll(1, 0.7, { top: 0, left: 0, width: 400, height: 200 })).toEqual({ top: 0, left: 0 })
  })
})
