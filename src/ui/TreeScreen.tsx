import { useEffect, useRef, useState } from 'react'
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
  const scroller = useRef<HTMLDivElement>(null)

  // the tree grows upward, so start at the bottom where the beginner exercises are
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [branch])
  const node = selected ? byId.get(selected) : undefined

  return (
    <>
      <div className="tree-screen">
        <div className="tree-head">
          <h1 className="navt">Skill Tree</h1>
          <p className="sub center" style={{ margin: '0 0 6px' }}>Your main exercises. Tap one to see what it needs and unlocks.</p>
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
        </div>
        <div className="tree-scroll" ref={scroller}>
          <TreeView branch={branch} selectedId={selected} onSelect={setSelected} />
        </div>
      </div>
      {/* outside the fixed container, otherwise the tab bar paints over the sheet */}
      {node && <NodeSheet node={node} onClose={() => setSelected(null)} onLog={onLog} />}
    </>
  )
}
