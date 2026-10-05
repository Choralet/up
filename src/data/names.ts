import { roadmapItemFor } from './roadmap'
import { SKILLS } from './skills'

/** What a skill is called in the app: a tree ladder keeps its own name; a Roadmap-only chain uses its Roadmap item's name. */
export function skillName(chainId: string, stepId?: string | null): string {
  const chain = SKILLS.find((c) => c.id === chainId)
  if (chain && !chain.roadmapOnly) return chain.name
  return (stepId && roadmapItemFor(stepId)?.name) || chain?.name || chainId
}
