import type { Branch, DayType, ExerciseNode } from '../data/types'
import type { Progress, SetLog } from './progress'
import { addDays, weekStart } from '../lib/time'

/**
 * Consecutive weeks (Monday to Sunday) in which you trained on enough days.
 * "Enough" is 2 logged days, or fewer if fewer are planned (at least 1). The current unfinished week never breaks a streak.
 */
export function weeklyStreak(logs: SetLog[], schedule: DayType[], today: string): number {
  const planned = schedule.filter((d) => d !== 'rest').length
  const need = Math.max(1, Math.min(2, planned))
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
  const inBranch = nodes.filter((n) => n.branch === branch)
  const done = inBranch.filter((n) => progress.completed.includes(n.id)).length
  return { done, total: inBranch.length }
}
