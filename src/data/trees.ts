import raw from './trees.json'
import { ADDED, capGoal, EQUIPMENT_FIX, GATES, GOALS, PARENT_FIX, REMOVED, SHORT, STEPS, TREE_INFO, TWINS } from './overlay'
import { parseGoal } from './goals'
import type { Branch, ExerciseNode, HowToLink, SplitDay } from './types'

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
  day?: SplitDay
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
  const parsed = parseGoal(n.advance)
  const goal = STEPS[id]?.at(-1) ?? GOALS[id] ?? ADDED.find((a) => `${a.tree}:${a.id}` === id)?.goal ?? (parsed && capGoal(parsed))
  if (!goal) throw new Error(`No goal for ${id}: add one to GOALS in overlay.ts`)
  const fixed = `${tree.id}:${n.id}` in PARENT_FIX ? PARENT_FIX[`${tree.id}:${n.id}`] : n.parent
  const parent = fixed && !REMOVED.has(`${tree.id}:${fixed}`) ? fixed : null
  const node: ExerciseNode = {
    id,
    name: n.name,
    branch: meta.branch,
    kind: meta.category === 'skill' ? 'skill' : 'strength',
    tree: tree.id,
    requires: parent ? [`${tree.id}:${parent}`] : GATES[tree.id] ?? [],
    goal,
    cue: n.cues,
    advance: n.advance,
    muscles: { primary: n.primary, secondary: n.secondary },
    links: n.links.map((l) => ({ label: PROVIDER[l.label] ?? (SOURCES[n.source]?.title || 'Guide'), url: l.url })),
  }
  if (meta.category === 'skill') node.skill = tree.id
  else node.track = tree.id
  if (SHORT[id]) node.short = SHORT[id]
  const equipment = EQUIPMENT_FIX[id] ?? n.equipment
  if (equipment !== 'floor') node.equipment = parseEquipment(equipment)
  if (n.source && n.source !== 'gen' && n.source !== 'up') node.source = n.source
  if (STEPS[id]) node.steps = STEPS[id]
  if (n.source === 'up') node.added = true
  const twins = twinsOf(id)
  if (twins.length) node.twins = twins
  return node
}

/** Every exercise of every tree, in tree order, with Up's own additions at the end of their tree. */
export const TREE_NODES: ExerciseNode[] = TREES.flatMap((meta) => {
  const t = data.trees.find((x) => x.id === meta.id)!
  const added: RawNode[] = ADDED.filter((a) => a.tree === t.id).map((a) => ({
    id: a.id, parent: a.parent, name: a.name, equipment: a.equipment, primary: a.primary, secondary: a.secondary,
    advance: a.advance, cues: a.cues, source: 'up', links: [],
  }))
  return [...t.nodes, ...added].filter((n) => !REMOVED.has(`${t.id}:${n.id}`)).map((n) => toNode(t, meta, n))
})

/** The source's YouTube search fallback for an exercise. */
export function youtubeSearch(name: string): string {
  const q = `${name.replace(/\s*\([^)]*\)/g, '').trim()} calisthenics tutorial`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}
