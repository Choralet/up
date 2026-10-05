import type { Goal } from './types'

const top = (lo: string, hi?: string) => Number(hi ?? lo)
const PER: [RegExp, NonNullable<Goal['per']>][] = [[/per leg/, 'leg'], [/per arm/, 'arm'], [/per side|each direction/, 'side']]

/**
 * A Level Up goal read from the source's "advance" text (null when it has no number).
 * Ranges use their top (3×8–12 → 3 × 12, decided 2026-10-05); the first rule in the text wins;
 * holds are numbers followed by "s"; unstated sets are 3, or 1 for a single long hold (over 30 s).
 */
export function parseGoal(advance: string): Goal | null {
  const t = advance.replace(/ /g, ' ')
  const per = PER.find(([re]) => re.test(t))?.[1]
  const out = (goal: Goal): Goal => (per ? { ...goal, per } : goal)

  const sx = t.match(/(\d+)(?:[–-](\d+))?\s*×\s*(\d+)(?:[–-](\d+))?(\s*s\b)?/)
  const about = t.match(/[Ss]ets of about (\d+)/)
  if (about && (!sx || t.indexOf(about[0]) < t.indexOf(sx[0]))) return out({ type: 'reps', sets: 3, target: Number(about[1]) })
  if (sx) return out({ type: sx[5] ? 'hold' : 'reps', sets: top(sx[1], sx[2]), target: top(sx[3], sx[4]) })

  const reps = t.match(/(\d+)(?:[–-](\d+))?\s*(?:deep |explosive |slow )?reps?\b/)
  const secs = t.match(/(\d+)(?:[–-](\d+))?\s*s\b/)
  if (reps && (!secs || t.indexOf(reps[0]) < t.indexOf(secs[0]))) return out({ type: 'reps', sets: 3, target: top(reps[1], reps[2]) })
  if (secs) {
    const target = top(secs[1], secs[2])
    return out({ type: 'hold', sets: target > 30 ? 1 : 3, target })
  }
  return null
}
