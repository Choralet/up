import { useState } from 'react'
import type { Branch } from '../data/types'
import { BRANCHES } from '../engine/graph'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { NodeSheet } from './NodeSheet'
import { TreeView } from './TreeView'

export function TreeScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const [branch, setBranch] = useState<Branch>('push')
  const [selected, setSelected] = useState<string | null>(null)
  const { byId } = useProgress()
  const node = selected ? byId.get(selected) : undefined

  return (
    <div className="screen">
      <h1 className="navt">Skill Tree</h1>
      <div className="seg" role="tablist" aria-label="Branch">
        {BRANCHES.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={b === branch}
            className={b === branch ? 'on' : ''}
            onClick={() => { setBranch(b); setSelected(null) }}
          >
            {BRANCH_META[b].label}
          </button>
        ))}
      </div>
      <TreeView branch={branch} selectedId={selected} onSelect={setSelected} />
      {node && <NodeSheet node={node} onClose={() => setSelected(null)} onLog={onLog} />}
    </div>
  )
}
