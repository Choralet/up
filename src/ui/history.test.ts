import { chartTop } from './HistorySheet'

describe('chartTop', () => {
  it('leaves room above the goal and keeps the middle gridline on a whole number', () => {
    expect(chartTop(10)).toBe(12)
    expect(chartTop(11)).toBe(14)
    expect(chartTop(1)).toBe(2)
    expect(chartTop(30)).toBe(36)
  })
})
