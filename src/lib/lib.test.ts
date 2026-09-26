import { localDate, formatClock } from './time'
import { goalText } from './format'

describe('time helpers', () => {
  it('formats local dates with zero padding', () => {
    expect(localDate(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
  it('formats a clock as m:ss and never goes negative', () => {
    expect(formatClock(75.9)).toBe('1:15')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('goalText', () => {
  it('shows reps and holds', () => {
    expect(goalText({ type: 'reps', sets: 3, target: 10 })).toBe('3 × 10')
    expect(goalText({ type: 'hold', sets: 3, target: 30 })).toBe('3 × 30 s')
  })
})
