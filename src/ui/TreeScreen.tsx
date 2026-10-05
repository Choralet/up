import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TREES, treeById, type TreeMeta } from '../data/trees'
import type { Branch } from '../data/types'
import { BRANCHES } from '../engine/graph'
import { useProgress } from '../store/ProgressContext'
import { accentStyle, BRANCH_META } from './branches'
import { BranchLevel } from './Level'
import { Icon } from './Icon'
import { NodeSheet } from './NodeSheet'
import { TreeView } from './TreeView'

/** Tree zoom stays between 70% and 200%. */
export function clampZoom(z: number): number {
  return Number.isFinite(z) ? Math.min(2, Math.max(0.7, Math.round(z * 100) / 100)) : 1
}

/** Scroll position after a zoom change that keeps the middle of the view where it was. */
export function zoomScroll(prev: number, next: number, v: { top: number; left: number; width: number; height: number }) {
  const r = next / prev
  return {
    top: Math.max(0, (v.top + v.height / 2) * r - v.height / 2),
    left: Math.max(0, (v.left + v.width / 2) * r - v.width / 2),
  }
}

const CATEGORY_ORDER = { main: 0, skill: 1, supp: 2 } as const
/** A branch's ladders as chips: main trees, then skill ladders, then muscle trees. */
export const branchTrees = (branch: Branch): TreeMeta[] =>
  TREES.filter((t) => t.branch === branch).sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category])

export function TreeScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const { byId, progress, justUnlocked, clearUnlocked } = useProgress()
  // open where the new exercise is, so you see it light up
  const [tree, setTree] = useState<string>(() => byId.get(justUnlocked[0])?.tree ?? 'hpush')
  const branch = treeById(tree)!.branch
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const shownZoom = useRef(1)
  const base = useRef(1)
  const scroller = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  zoomRef.current = zoom

  // the unlock animation plays once where you can see it, then the highlight goes away
  const unlockShown = justUnlocked.some((id) => byId.get(id)?.tree === tree)
  useEffect(() => {
    if (!unlockShown) return
    const id = setTimeout(clearUnlocked, 3400)
    return () => clearTimeout(id)
  }, [unlockShown]) // eslint-disable-line react-hooks/exhaustive-deps

  // zooming keeps the middle of what you were looking at in view
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || shownZoom.current === zoom) return
    const pos = zoomScroll(shownZoom.current, zoom, { top: el.scrollTop, left: el.scrollLeft, width: el.clientWidth, height: el.clientHeight })
    shownZoom.current = zoom
    el.scrollTop = pos.top
    el.scrollLeft = pos.left
  }, [zoom])

  // iPhone pinch (Safari gesture events) and ctrl/trackpad wheel zoom
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const start = (e: Event) => { e.preventDefault(); base.current = zoomRef.current }
    const change = (e: Event) => { e.preventDefault(); setZoom(clampZoom(base.current * (e as unknown as { scale: number }).scale)) }
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom((z) => clampZoom(z - e.deltaY * 0.01)) }
    el.addEventListener('gesturestart', start)
    el.addEventListener('gesturechange', change)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('gesturestart', start)
      el.removeEventListener('gesturechange', change)
      el.removeEventListener('wheel', wheel)
    }
  }, [])

  // the tree grows upward, so start at the bottom where the beginner exercises are
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [tree])
  // keep a tapped node visible above the sheet: move it into the top third of the tree area
  useEffect(() => {
    const el = scroller.current
    const target = selected ? el?.querySelector<SVGGElement>(`[data-id="${selected}"]`) : null
    if (!el || !target) return
    const box = el.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    if (r.bottom > box.top + box.height * 0.45) el.scrollTop += r.top - box.top - box.height * 0.25
  }, [selected])
  const node = selected ? byId.get(selected) : undefined
  const meta = treeById(tree)!
  const nowId = meta.category === 'skill' ? progress.skillFocus[tree] : progress.focus[tree]
  const now = nowId ? byId.get(nowId) : undefined

  return (
    <>
      <div className="tree-screen">
        <div className="tree-head" style={accentStyle(branch)}>
          <h1 className="navt">Skill Tree</h1>
          <p className="sub center treehint">Pick a ladder. Tap an exercise to see what it needs and unlocks.</p>
          <div className="seg" role="tablist" aria-label="Branch">
            {BRANCHES.map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={b === branch}
                className={b === branch ? 'on' : ''}
                style={accentStyle(b)}
                onClick={() => { setTree(branchTrees(b)[0].id); setSelected(null) }}
              >
                {BRANCH_META[b].label}
              </button>
            ))}
          </div>
          <BranchLevel branch={branch} />
          <div className="trackchips" role="tablist" aria-label="Ladder">
            {branchTrees(branch).map((t) => (
              <button key={t.id} role="tab" aria-selected={t.id === tree} className={`pillbtn chipbtn${t.id === tree ? ' on' : ''}${t.category === 'skill' ? ' sk' : ''}`}
                onClick={() => { setTree(t.id); setSelected(null) }}>
                {t.name}
              </button>
            ))}
          </div>
          <p className="sub center treenow">
            {now ? (
              <button className="linkbtn inline" onClick={() => setSelected(now.id)}>{meta.category === 'skill' ? 'Training' : 'Now'}: {now.name}</button>
            ) : meta.category === 'skill' ? (tree in progress.skillFocus ? 'Waiting for the next step to unlock' : 'Start this skill from its first exercise or the Skills tab')
              : 'Nothing to train here right now'}
          </p>
        </div>
        <div className={node ? 'tree-scroll has-sheet' : 'tree-scroll'} ref={scroller}>
          <TreeView tree={tree} selectedId={selected} onSelect={setSelected} zoom={zoom} />
        </div>
        <div className="zoombar" aria-label="Zoom">
          <button className="pillbtn" aria-label="Zoom Out" onClick={() => setZoom((z) => clampZoom(z - 0.25))}><Icon name="minus" size={18} /></button>
          <button className="pillbtn" aria-label="Reset Zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button className="pillbtn" aria-label="Zoom In" onClick={() => setZoom((z) => clampZoom(z + 0.25))}><Icon name="plus" size={18} /></button>
        </div>
      </div>
      {/* outside the fixed container, otherwise the tab bar paints over the sheet */}
      {node && <NodeSheet node={node} onClose={() => setSelected(null)} onLog={onLog} />}
    </>
  )
}
