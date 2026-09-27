import { DAY_LABEL } from '../data/schedule'
import type { DayType } from '../data/types'
import { weekdayIndex } from './time'

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

/** A calendar file with one weekly event (and an alert) per training day, at `time` (HH:MM, local). */
export function scheduleIcs(schedule: DayType[], time: string, today: Date = new Date()): string {
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const utc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Up//Calisthenics//EN', 'CALSCALE:GREGORIAN']
  schedule.forEach((day, weekday) => {
    if (day === 'rest') return
    const first = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    first.setDate(first.getDate() + ((weekday - weekdayIndex(today) + 7) % 7))
    lines.push(
      'BEGIN:VEVENT',
      `UID:up-training-${BYDAY[weekday].toLowerCase()}@choralet.github.io`,
      `DTSTAMP:${utc}`,
      `DTSTART:${stamp(first)}T${pad(h)}${pad(m)}00`,
      'DURATION:PT45M',
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[weekday]}`,
      `SUMMARY:Up · ${DAY_LABEL[day]}`,
      'DESCRIPTION:Open Up for today\'s workout.',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Up · ${DAY_LABEL[day]}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
