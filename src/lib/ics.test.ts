import { scheduleIcs } from './ics'

describe('scheduleIcs', () => {
  const ics = scheduleIcs(['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'], '18:30', new Date(2026, 8, 23, 12))
  it('one weekly event per training day with an alert', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3)
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR')
    expect(ics).toContain('SUMMARY:Up · Push Day')
    expect(ics).toContain('SUMMARY:Up · Legs + Core Day')
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(3)
  })
  it('starts each event on the next such weekday at the chosen time, with CRLF lines', () => {
    expect(ics).toContain('DTSTART:20260923T183000') // Wednesday is today
    expect(ics).toContain('DTSTART:20260925T183000') // Friday
    expect(ics).toContain('DTSTART:20260928T183000') // next Monday
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
  it('no training days gives a calendar with no events', () => {
    expect(scheduleIcs(Array(7).fill('rest'), '18:00', new Date(2026, 8, 23))).not.toContain('BEGIN:VEVENT')
  })
})
