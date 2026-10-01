import { useMemo } from 'react'
import type { Branch } from '../data/types'
import { layoutBranch, NODE_R } from '../engine/layout'
import { nodeState, type NodeState } from '../engine/progress'
import { wrapLabel } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { accentStyle, BRANCH_META } from './branches'

// the same words as everywhere else in the app (Locked / Ready / Training / Done)
/** A label's first line sits this far below the node's edge; each further line adds 10. */
export const LABEL_Y = 16

/** A line from a node up to the one it unlocks. A slanted line stops under the upper node's label so it never crosses the text. */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, bLines: number): string {
  const R = NODE_R
  const endY = a.x === b.x ? b.y + R : b.y + R + LABEL_Y + 10 * (bLines - 1) + 4
  const my = (a.y - R + endY) / 2
  return `M${a.x} ${a.y - R} C${a.x} ${my},${b.x} ${my},${b.x} ${endY}`
}

const WORD = { locked: 'locked', available: 'ready', focus: 'training', completed: 'done' } as const

interface Props {
  branch: Branch
  selectedId: string | null
  onSelect: (id: string) => void
  zoom?: number
}

export function TreeView({ branch, selectedId, onSelect, zoom = 1 }: Props) {
  const { nodes, progress, justUnlocked } = useProgress()
  const layout = useMemo(() => layoutBranch(nodes, branch), [nodes, branch])
  const pos = new Map(layout.placed.map((p) => [p.node.id, p]))
  const states = new Map<string, NodeState>(layout.placed.map((p) => [p.node.id, nodeState(p.node, progress)]))
  const R = NODE_R

  return (
    <svg
      className="tsvg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={`${BRANCH_META[branch].label} skill tree`}
      style={{ ...accentStyle(branch), width: `${Math.round(zoom * 100)}%` }}
    >
      {layout.edges.map(({ from, to }) => {
        const a = pos.get(from)!
        const b = pos.get(to)!
        const sa = states.get(from)
        const sb = states.get(to)
        const cls =
          sa === 'completed' && (sb === 'completed' || sb === 'focus') ? 'done'
          : sa === 'completed' && sb === 'available' ? 'avail'
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
              <rect className="sh" x={-(R - 2)} y={-(R - 2)} width={2 * (R - 2)} height={2 * (R - 2)} rx={6} transform="rotate(45)" />
            ) : (
              <circle className="sh" r={R} />
            )}
            {state === 'completed' && <path className="ic" d="M-5 0 L-1.5 3.5 L5 -4" />}
            {state === 'focus' && <circle className="dotc" r={4.5} />}
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
