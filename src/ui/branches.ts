import type { CSSProperties } from 'react'
import type { Branch, ExerciseNode } from '../data/types'

export type AccentKey = Branch | 'skill'

const meta = (b: AccentKey) => ({ color: `var(--${b})`, edge: `var(--${b}-edge)`, text: `var(--${b}-text)` })

/** `color` fills buttons, badges and nodes (dark text on it); `edge` is the darker pressable edge; `text` is the colour as text on the page. */
export const BRANCH_META: Record<Branch, { label: string; short: string; color: string; edge: string; text: string }> = {
  push: { label: 'Push', short: 'Pu', ...meta('push') },
  pull: { label: 'Pull', short: 'Pl', ...meta('pull') },
  legs: { label: 'Legs', short: 'Le', ...meta('legs') },
  core: { label: 'Core', short: 'Co', ...meta('core') },
}

/** CSS variables that colour a screen, sheet or card in one branch (or the skill pink). */
export function accentStyle(key: AccentKey): CSSProperties {
  const m = meta(key)
  return { '--accent': m.color, '--accent-edge': m.edge, '--accent-text': m.text } as CSSProperties
}

export const nodeAccent = (node: ExerciseNode): CSSProperties => accentStyle(node.kind === 'skill' ? 'skill' : node.branch)
