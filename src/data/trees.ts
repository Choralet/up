import raw from './trees.json'
import { GATES, GOALS, SHORT, TREE_INFO, TWINS } from './overlay'
import { parseGoal } from './goals'
import type { Branch, DayType, ExerciseNode, HowToLink } from './types'

export type TreeCategory = 'main' | 'supp' | 'skill'

interface RawNode {
  id: string
  parent: string | null
  name: string
  equipment: string
  primary: string[]
  secondary: string[]
  advance: string
  cues: string
  source: string
  links: HowToLink[]
}

interface RawTree {
  id: string
  name: string
  category: string
  notes: string
  video?: HowToLink
  nodes: RawNode[]
}

export interface TreeMeta {
  id: string
  /** short app name (chips, tracks, Skills) */
  name: string
  /** the export's own title */
  title: string
  category: TreeCategory
  branch: Branch
  /** skill ladders: the day that trains them */
  day?: Exclude<DayType, 'rest'>
  notes: string
  video?: HowToLink
}

const data = raw as unknown as { equipment: Record<string, string>; muscles: string[]; sources: Record<string, { title: string; url?: string }>; trees: RawTree[] }

/** Equipment code -> label, in the export's order. */
export const EQUIPMENT: Record<string, string> = data.equipment
export const MUSCLES: string[] = data.muscles
export const SOURCES: Record<string, { title: string; url?: string }> = data.sources

/** Every tree, in TREE_INFO order (main, muscle-specific, skill). */
export const TREES: TreeMeta[] = Object.entries(TREE_INFO).map(([id, info]) => {
  const t = data.trees.find((x) => x.id === id)
  if (!t) throw new Error(`Tree ${id} is not in trees.json`)
  const meta: TreeMeta = { id, name: info.name, title: t.name, category: t.category as TreeCategory, branch: info.branch, notes: t.notes }
  if (info.day) meta.day = info.day
  if (t.video) meta.video = t.video
  return meta
})

export const treeById = (id: string) => TREES.find((t) => t.id === id)

const PROVIDER: Record<string, string> = { fl: 'Fitloop', hc: 'Hybrid Calisthenics', sl: 'StrengthLog', cv: 'Caliverse', video: 'Video' }

/** "rings+box|low+box" -> [["rings","box"],["low","box"]]; floor alone needs nothing. */
export function parseEquipment(text: string): string[][] {
  return text.split('|').map((opt) => opt.split('+').map((s) => s.trim()).filter(Boolean))
}

const twinsOf = (id: string) => TWINS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []))

function toNode(tree: RawTree, meta: TreeMeta, n: RawNode): ExerciseNode {
  const id = `${tree.id}:${n.id}`
  const goal = GOALS[id] ?? parseGoal(n.advance)
  if (!goal) throw new Error(`No goal for ${id}: add one to GOALS in overlay.ts`)
  const node: ExerciseNode = {
    id,
    name: n.name,
    branch: meta.branch,
    kind: meta.category === 'skill' ? 'skill' : 'strength',
    tree: tree.id,
    requires: n.parent ? [`${tree.id}:${n.parent}`] : GATES[tree.id] ?? [],
    goal,
    cue: n.cues,
    advance: n.advance,
    muscles: { primary: n.primary, secondary: n.secondary },
    links: n.links.map((l) => ({ label: PROVIDER[l.label] ?? (SOURCES[n.source]?.title || 'Guide'), url: l.url })),
  }
  if (meta.category === 'skill') node.skill = tree.id
  else node.track = tree.id
  if (SHORT[id]) node.short = SHORT[id]
  if (n.equipment !== 'floor') node.equipment = parseEquipment(n.equipment)
  if (n.source && n.source !== 'gen') node.source = n.source
  const twins = twinsOf(id)
  if (twins.length) node.twins = twins
  return node
}

/** Every exercise of every tree, in tree order. */
export const TREE_NODES: ExerciseNode[] = TREES.flatMap((meta) => {
  const t = data.trees.find((x) => x.id === meta.id)!
  return t.nodes.map((n) => toNode(t, meta, n))
})

/** The source's YouTube search fallback for an exercise. */
export function youtubeSearch(name: string): string {
  const q = `${name.replace(/\s*\([^)]*\)/g, '').trim()} calisthenics tutorial`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}
