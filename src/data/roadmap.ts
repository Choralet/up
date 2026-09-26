import raw from './roadmap.json'

export interface RoadmapItem {
  id: string
  year: 1 | 2 | 3
  name: string
  /** node ids, in order; the item is done when all are completed */
  steps: string[]
  /** seconds into that year's video where this skill's chapter starts */
  t: number
  /** the video's own chapter name, when the app uses a different name */
  video?: string
}

export const ROADMAP = raw as unknown as RoadmapItem[]

export const VIDEOS: Record<1 | 2 | 3, { id: string; title: string }> = {
  1: { id: 'J2JHDavNZB4', title: 'Every Calisthenics Skill to Learn in Order for your First Year' },
  2: { id: 'lWXMkzPBpWU', title: 'Every Calisthenics Skill to Learn In Order for your Second Year' },
  3: { id: 'XTuqnzVzGK4', title: 'Every Calisthenics Skill to Learn in Order for your Third Year' },
}

export const videoUrl = (item: RoadmapItem) => `https://www.youtube.com/watch?v=${VIDEOS[item.year].id}&t=${item.t}s`

export const formatStamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** The Roadmap item a step belongs to, if any. */
export const roadmapItemFor = (nodeId: string): RoadmapItem | undefined => ROADMAP.find((r) => r.steps.includes(nodeId))
