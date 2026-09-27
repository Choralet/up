import { useMemo, type CSSProperties } from 'react'
import type { Branch } from '../data/types'
import { layoutBranch, NODE_R } from '../engine/layout'
import { nodeState, type NodeState } from '../engine/progress'
import { wrapLabel } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

// the same words as everywhere else in the app (Locked / Ready / Training / Done)
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
      style={{ '--accent': BRANCH_META[branch].color, width: `${Math.round(zoom * 100)}%` } as CSSProperties}
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
        const my = (a.y + b.y) / 2
        return (
          <path
            key={`${from}>${to}`}
            className={`e ${cls}${justUnlocked.includes(to) ? ' draw' : ''}`}
            d={`M${a.x} ${a.y - R} C${a.x} ${my},${b.x} ${my},${b.x} ${b.y + R}`}
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
            {state === 'focus' && <circle className="glow" r={R + 9} />}
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
            <text className="lb" y={R + 12}>
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
