import { addDays, formatClock, localDate, weekdayIndex, weekStart } from './time'
import { goalText, plural, wrapLabel } from './format'

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

describe('wrapLabel', () => {
  it('keeps short text on one line', () => {
    expect(wrapLabel('Push-up')).toEqual(['Push-up'])
  })
  it('wraps on word boundaries without exceeding the width', () => {
    expect(wrapLabel('Incline push-up')).toEqual(['Incline', 'push-up'])
    expect(wrapLabel('Bulgarian split squat')).toEqual(['Bulgarian', 'split squat'])
    expect(wrapLabel('Elevated pike push-up')).toEqual(['Elevated pike', 'push-up'])
  })
  it('never returns an empty list', () => {
    expect(wrapLabel('')).toEqual([''])
  })
})

describe('week helpers (Monday is day 0)', () => {
  it('numbers weekdays from Monday', () => {
    expect(weekdayIndex(new Date(2026, 8, 21))).toBe(0) // Monday
    expect(weekdayIndex(new Date(2026, 8, 26))).toBe(5) // Saturday
    expect(weekdayIndex(new Date(2026, 8, 27))).toBe(6) // Sunday
  })
  it('adds days across month ends', () => {
    expect(addDays('2026-09-28', 3)).toBe('2026-10-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds the Monday of the week, including for a Sunday', () => {
    expect(weekStart('2026-09-21')).toBe('2026-09-21')
    expect(weekStart('2026-09-23')).toBe('2026-09-21')
    expect(weekStart('2026-09-27')).toBe('2026-09-21')
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
  })
})

describe('plural', () => {
  it('uses the singular only for 1', () => {
    expect(plural(1, 'step')).toBe('1 step')
    expect(plural(0, 'step')).toBe('0 steps')
    expect(plural(3, 'step')).toBe('3 steps')
  })
})
