import { roadmapItemFor } from './roadmap'
import { SKILLS } from './skills'

/** What a skill is called in the app: its Roadmap name when the step belongs to one, else the chain name. */
export function skillName(chainId: string, stepId?: string | null): string {
  return (stepId && roadmapItemFor(stepId)?.name) || SKILLS.find((c) => c.id === chainId)?.name || chainId
}
