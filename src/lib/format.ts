import type { Goal } from '../data/types'

export function goalText(goal: Goal): string {
  return goal.type === 'hold' ? `${goal.sets} × ${goal.target} s` : `${goal.sets} × ${goal.target}`
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
