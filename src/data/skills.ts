import raw from './skills.json'
import { TREES } from './trees'
import type { SkillChain } from './types'

/** The skill ladders from the trees, then the Roadmap-only chains. */
export const SKILLS: SkillChain[] = [
  ...TREES.filter((t) => t.category === 'skill').map((t) => ({ id: t.id, name: t.name, day: t.day! })),
  ...(raw as unknown as SkillChain[]),
]
