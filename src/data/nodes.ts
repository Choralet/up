import roadmapNodes from './roadmap-nodes.json'
import { TREE_NODES } from './trees'
import type { ExerciseNode } from './types'

/** The trees (src/data/trees.json + overlay) and the Roadmap-only moves. */
export const NODES: ExerciseNode[] = [...TREE_NODES, ...(roadmapNodes as unknown as ExerciseNode[])]
