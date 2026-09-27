import { clampZoom } from './TreeScreen'

describe('clampZoom', () => {
  it('keeps the tree between 70% and 200%', () => {
    expect(clampZoom(0.2)).toBe(0.7)
    expect(clampZoom(1.3)).toBe(1.3)
    expect(clampZoom(5)).toBe(2)
    expect(clampZoom(NaN)).toBe(1)
  })
})
