import type { Branch } from '../data/types'

export const BRANCH_META: Record<Branch, { label: string; color: string }> = {
  push: { label: 'Push', color: 'var(--push)' },
  pull: { label: 'Pull', color: 'var(--pull)' },
  legs: { label: 'Legs', color: 'var(--legs)' },
  core: { label: 'Core', color: 'var(--core)' },
}
