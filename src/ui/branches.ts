import type { Branch } from '../data/types'

/** `color` for rings, dots and tints; `strong` for filled buttons with white text (≥ 4.5:1 contrast). */
export const BRANCH_META: Record<Branch, { label: string; short: string; color: string; strong: string }> = {
  push: { label: 'Push', short: 'Pu', color: 'var(--push)', strong: '#b85300' },
  pull: { label: 'Pull', short: 'Pl', color: 'var(--pull)', strong: '#0064d2' },
  legs: { label: 'Legs', short: 'Le', color: 'var(--legs)', strong: '#1f7a36' },
  core: { label: 'Core', short: 'Co', color: 'var(--core)', strong: '#8a3bc0' },
}

export const SKILL_STRONG = '#c8193f'
