import type { Branch, DayType, ExerciseNode } from '../data/types'
import type { Progress, SetLog } from './progress'
import { addDays, weekStart } from '../lib/time'

/** Logged days a week needs to count toward the streak: 2, or 1 if fewer than 2 days are planned. */
export function streakDaysNeeded(schedule: DayType[]): number {
  return Math.max(1, Math.min(2, schedule.filter((d) => d !== 'rest').length))
}

/**
 * Consecutive weeks (Monday to Sunday) in which you trained on enough days.
 * "Enough" is 2 logged days, or fewer if fewer are planned (at least 1). The current unfinished week never breaks a streak.
 */
export function weeklyStreak(logs: SetLog[], schedule: DayType[], today: string): number {
  const need = streakDaysNeeded(schedule)
  const daysByWeek = new Map<string, Set<string>>()
  for (const l of logs) {
    const w = weekStart(l.date)
    if (!daysByWeek.has(w)) daysByWeek.set(w, new Set())
    daysByWeek.get(w)!.add(l.date)
  }
  const counted = (w: string) => (daysByWeek.get(w)?.size ?? 0) >= need
  let week = weekStart(today)
  let streak = counted(week) ? 1 : 0
  week = addDays(week, -7)
  while (counted(week)) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}

export interface Best {
  node: ExerciseNode
  best: number
}

/** Best logged value per exercise, most recently trained first. */
export function personalBests(logs: SetLog[], byId: Map<string, ExerciseNode>, limit = 5): Best[] {
  const acc = new Map<string, { best: number; last: number }>()
  for (const l of logs) {
    if (!byId.has(l.nodeId)) continue
    const cur = acc.get(l.nodeId)
    acc.set(l.nodeId, { best: Math.max(cur?.best ?? 0, l.value), last: Math.max(cur?.last ?? 0, l.at) })
  }
  return [...acc.entries()]
    .sort((a, b) => b[1].last - a[1].last)
    .slice(0, limit)
    .map(([id, v]) => ({ node: byId.get(id)!, best: v.best }))
}

export function branchProgress(nodes: ExerciseNode[], progress: Progress, branch: Branch): { done: number; total: number } {
  const inBranch = nodes.filter((n) => n.branch === branch && !n.roadmapOnly)
  const done = inBranch.filter((n) => progress.completed.includes(n.id)).length
  return { done, total: inBranch.length }
}

export interface StripDay {
  date: string
  planned: DayType
  trained: boolean
  isToday: boolean
}

/** Monday to Sunday of the week containing `today`: what was planned and which days you trained. */
export function weekStrip(logs: SetLog[], schedule: DayType[], today: string): StripDay[] {
  const monday = weekStart(today)
  const trained = new Set(logs.map((l) => l.date))
  return schedule.map((planned, i) => {
    const date = addDays(monday, i)
    return { date, planned, trained: trained.has(date), isToday: date === today }
  })
}

/** Training dates, newest first, with how many exercises and sets. */
export function recentSessions(logs: SetLog[], limit = 5): { date: string; exercises: number; sets: number }[] {
  const byDate = new Map<string, { ids: Set<string>; sets: number }>()
  for (const l of logs) {
    const d = byDate.get(l.date) ?? { ids: new Set<string>(), sets: 0 }
    d.ids.add(l.nodeId)
    d.sets++
    byDate.set(l.date, d)
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .map(([date, d]) => ({ date, exercises: d.ids.size, sets: d.sets }))
}

/** How much this week's best beats last week's for one exercise; null when not better or no data. */
export function weeklyGain(logs: SetLog[], nodeId: string, today: string): number | null {
  const thisWeek = weekStart(today)
  const lastWeek = addDays(thisWeek, -7)
  const best = (from: string, to: string) => {
    const v = logs.filter((l) => l.nodeId === nodeId && l.date >= from && l.date < to).map((l) => l.value)
    return v.length ? Math.max(...v) : null
  }
  const now = best(thisWeek, addDays(thisWeek, 7))
  const before = best(lastWeek, thisWeek)
  return now !== null && before !== null && now > before ? now - before : null
}

/** One exercise's sessions, oldest first: the best set and how many sets. */
export function history(logs: SetLog[], nodeId: string): { date: string; best: number; sets: number }[] {
  const byDate = new Map<string, { best: number; sets: number }>()
  for (const l of logs) {
    if (l.nodeId !== nodeId) continue
    const d = byDate.get(l.date) ?? { best: 0, sets: 0 }
    byDate.set(l.date, { best: Math.max(d.best, l.value), sets: d.sets + 1 })
  }
  return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, d]) => ({ date, ...d }))
}
