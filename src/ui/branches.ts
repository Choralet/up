import type { Branch } from '../data/types'

export const BRANCH_META: Record<Branch, { label: string; short: string; color: string }> = {
  push: { label: 'Push', short: 'Pu', color: 'var(--push)' },
  pull: { label: 'Pull', short: 'Pl', color: 'var(--pull)' },
  legs: { label: 'Legs', short: 'Le', color: 'var(--legs)' },
  core: { label: 'Core', short: 'Co', color: 'var(--core)' },
}
