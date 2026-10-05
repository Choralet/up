import { useMemo } from 'react'
import { treeById } from '../data/trees'
import { layoutTree, NODE_R } from '../engine/layout'
import { nodeState, type NodeState } from '../engine/progress'
import { wrapLabel } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { accentStyle } from './branches'

// the same words as everywhere else in the app (Locked / Ready / Training / Done)
/** A label's first line sits this far below the node's edge; each further line adds 10. */
export const LABEL_Y = 20

/** A line from a node up to the one it unlocks. A slanted line stops under the upper node's label so it never crosses the text. */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, bLines: number): string {
  const R = NODE_R
  const endY = a.x === b.x ? b.y + R : b.y + R + LABEL_Y + 10 * (bLines - 1) + 4
  const my = (a.y - R + endY) / 2
  return `M${a.x} ${a.y - R} C${a.x} ${my},${b.x} ${my},${b.x} ${endY}`
}

const WORD = { locked: 'locked', available: 'ready', focus: 'training', completed: 'done', gear: 'needs equipment' } as const

/** The drawing's width: about 1.27× its natural size, fitting the screen when that is narrower but never below 0.9×. */
export const treeWidth = (natural: number, zoom: number) => `calc(clamp(${Math.round(natural * 0.9)}px, 100%, ${Math.round(natural * 1.27)}px) * ${zoom})`

interface Props {
  tree: string
  selectedId: string | null
  onSelect: (id: string) => void
  zoom?: number
}

export function TreeView({ tree, selectedId, onSelect, zoom = 1 }: Props) {
  const { nodes, progress, passed, justUnlocked } = useProgress()
  const layout = useMemo(() => layoutTree(nodes, tree), [nodes, tree])
  const meta = treeById(tree)!
  const pos = new Map(layout.placed.map((p) => [p.node.id, p]))
  const states = new Map<string, NodeState>(layout.placed.map((p) => [p.node.id, nodeState(p.node, progress, passed)]))
  // a stepped-over exercise (no equipment) passes the line on like a finished one
  const through = (id: string) => states.get(id) === 'completed' || (states.get(id) === 'gear' && passed.has(id))
  const R = NODE_R

  return (
    <svg
      className="tsvg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={`${meta.name} tree`}
      style={{ ...accentStyle(meta.branch), width: treeWidth(layout.width, zoom) }}
    >
      {layout.edges.map(({ from, to }) => {
        const a = pos.get(from)!
        const b = pos.get(to)!
        const sb = states.get(to)
        const cls =
          through(from) && (sb === 'completed' || sb === 'focus') ? 'done'
          : through(from) && sb === 'available' ? 'avail'
          : 'lock'
        return (
          <path
            key={`${from}>${to}`}
            className={`e ${cls}${justUnlocked.includes(to) ? ' draw' : ''}`}
            d={edgePath(a, b, wrapLabel(b.node.short ?? b.node.name).length)}
          />
        )
      })}
      {layout.placed.map(({ node, x, y }) => {
        const state = states.get(node.id)!
        const isSkill = node.kind === 'skill'
        return (
          <g
            key={node.id}
            data-id={node.id}
            className={`n ${state} ${isSkill ? 'sk' : 'st'}${justUnlocked.includes(node.id) ? ' just-unlocked' : ''}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`${node.name}, ${WORD[state]}${isSkill ? ', skill' : ''}`}
            onClick={() => onSelect(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(node.id)
              }
            }}
          >
            {state === 'focus' && <circle className="glow" r={R + 7} />}
            {selectedId === node.id && <circle className="sel" r={R + 8} />}
            {isSkill ? (
              <>
                <rect className="edge" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="translate(0 3) rotate(45)" />
                <rect className="sh" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="rotate(45)" />
              </>
            ) : (
              <>
                <circle className="edge" cy={3} r={R} />
                <circle className="sh" r={R} />
              </>
            )}
            {state === 'available' && <path className="plus" d="M-5 0 H5 M0 -5 V5" />}
            {state === 'completed' && <path className="ic" d="M-5 0 L-1.5 3.5 L5 -4" />}
            {state === 'focus' && <circle className="dotc" r={4.5} />}
            {state === 'gear' && <path className="gx" d="M-5 5 L5 -5" />}
            {state === 'locked' && (
              <g className="lk">
                <rect x={-5} y={-1} width={10} height={8} rx={2} />
                <path d="M-3 -1 v-2.5 a3 3 0 0 1 6 0 v2.5" />
              </g>
            )}
            <text className="lb" y={R + LABEL_Y}>
              {wrapLabel(node.short ?? node.name).map((line, i) => (
                <tspan key={i} x={0} dy={i === 0 ? 0 : 10}>{line}</tspan>
              ))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
