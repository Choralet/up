import type { Goal } from '../data/types'

export function goalText(goal: Goal): string {
  // no-break spaces: a goal never splits across two lines
  const base = goal.type === 'hold' ? `${goal.sets}\u00a0×\u00a0${goal.target}\u00a0s` : `${goal.sets}\u00a0×\u00a0${goal.target}`
  return goal.per ? `${base}\u00a0/\u00a0${goal.per}` : base
}

/** "Bench / box + Rings" from equipment codes (labels from the export). */
export function gearText(codes: string[], labels: Record<string, string>): string {
  return codes.map((c) => labels[c] ?? c).join(' + ')
}

/** Greedy word wrap for tree labels. A single word longer than `max` stays on its own line. */
export function wrapLabel(text: string, max = 13): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ').filter(Boolean)) {
    if (line && `${line} ${word}`.length > max) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  lines.push(line)
  return lines
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
