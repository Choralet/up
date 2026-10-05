import { ROADMAP } from '../data/roadmap'
import type { DayType, ExerciseNode } from '../data/types'
import type { Progress, SetLog } from './progress'
import { streakDaysNeeded } from './stats'
import { addDays, weekStart } from '../lib/time'

export interface Achievement {
  id: string
  name: string
  detail: string
  earned: boolean
}

/** Longest run of consecutive counted weeks ever (so a streak badge stays earned after a break). */
export function bestStreak(logs: SetLog[], schedule: DayType[]): number {
  const need = streakDaysNeeded(schedule)
  const days = new Map<string, Set<string>>()
  for (const l of logs) {
    const w = weekStart(l.date)
    if (!days.has(w)) days.set(w, new Set())
    days.get(w)!.add(l.date)
  }
  const weeks = [...days.keys()].sort()
  let best = 0
  for (const w of weeks) {
    if ((days.get(w)?.size ?? 0) < need) continue
    let run = 0
    let cur = w
    while ((days.get(cur)?.size ?? 0) >= need) {
      run++
      cur = addDays(cur, 7)
    }
    best = Math.max(best, run)
  }
  return best
}

/** Every achievement and whether it is earned. Pure: computed from progress, nothing stored except "seen". */
export function achievements(nodes: ExerciseNode[], progress: Progress, _today: string): Achievement[] {
  const done = new Set(progress.completed)
  const sessions = new Set(progress.logs.map((l) => l.date)).size
  const streak = bestStreak(progress.logs, progress.schedule)
  // a level-up is an exercise you finished after logging it: placements (Find your level, "I can already do this")
  // and linked twins finished along with it don't count, and twins count once
  const logged = new Set(progress.logs.map((l) => l.nodeId))
  const trained = nodes.filter((n) => done.has(n.id) && logged.has(n.id))
  const levelUps = new Set(trained.map((n) => [n.id, ...(n.twins ?? [])].sort()[0])).size
  const skillStep = trained.some((n) => n.kind === 'skill')
  const year1 = ROADMAP.filter((r) => r.year === 1).every((r) => r.steps.every((s) => done.has(s)))
  const list: [string, string, string, boolean][] = [
    ['first-workout', 'First Workout', 'Log your first set', sessions >= 1],
    ['workouts-10', '10 Workouts', 'Train on 10 different days', sessions >= 10],
    ['workouts-25', '25 Workouts', 'Train on 25 different days', sessions >= 25],
    ['streak-2', '2-Week Streak', 'Two weeks in a row', streak >= 2],
    ['streak-4', '4-Week Streak', 'Four weeks in a row', streak >= 4],
    ['streak-8', '8-Week Streak', 'Eight weeks in a row', streak >= 8],
    ['first-level-up', 'First Level Up', 'Finish your first exercise', levelUps >= 1],
    ['level-ups-10', '10 Level Ups', 'Finish 10 exercises', levelUps >= 10],
    ['first-push-up', 'First Push-up', 'Finish Push-up', done.has('hpush:p')],
    ['first-pull-up', 'First Pull-up', 'Finish Pull-up', done.has('vpull:pu')],
    ['first-dip', 'First Dip', 'Finish Parallel bar dip', done.has('dip:d')],
    ['first-pistol', 'First Pistol Squat', 'Finish Pistol squat', done.has('pistol:ps')],
    ['first-skill', 'First Skill Step', 'Finish a skill step', skillStep],
    ['handstand', 'Freestanding Handstand', 'Finish the freestanding handstand', done.has('hs:fs')],
    ['roadmap-y1', 'Roadmap Year 1', 'Finish every Year 1 skill', year1],
  ]
  return list.map(([id, name, detail, earned]) => ({ id, name, detail, earned }))
}
