import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TRACKS } from '../data/tracks'
import type { Branch } from '../data/types'
import { BRANCHES } from '../engine/graph'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
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

export function TreeScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const { byId, progress, justUnlocked, clearUnlocked } = useProgress()
  // open where the new exercise is, so you see it light up
  const [branch, setBranch] = useState<Branch>(() => byId.get(justUnlocked[0])?.branch ?? 'push')
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const shownZoom = useRef(1)
  const base = useRef(1)
  const scroller = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  zoomRef.current = zoom

  // the unlock animation plays once where you can see it, then the highlight goes away
  const unlockShown = justUnlocked.some((id) => byId.get(id)?.branch === branch)
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
          <div className="trackchips">
            {TRACKS.filter((t) => t.branch === branch).map((t) => {
              const id = progress.focus[t.id]
              const n = id ? byId.get(id) : undefined
              return (
                <button key={t.id} className="pillbtn chipbtn" aria-label={`${t.name}: ${n ? n.name : 'Complete'}`} disabled={!n} onClick={() => n && setSelected(n.id)}>
                  <span className="chiptrack">{t.name}</span> {n ? n.name : 'Complete'}
                </button>
              )
            })}
          </div>
        </div>
        <div className="tree-scroll" ref={scroller}>
          <TreeView branch={branch} selectedId={selected} onSelect={setSelected} zoom={zoom} />
        </div>
        <div className="zoombar" aria-label="Zoom">
          <button className="pillbtn" aria-label="Zoom Out" onClick={() => setZoom((z) => clampZoom(z - 0.25))}>−</button>
          <button className="pillbtn" aria-label="Reset Zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button className="pillbtn" aria-label="Zoom In" onClick={() => setZoom((z) => clampZoom(z + 0.25))}>+</button>
        </div>
      </div>
      {/* outside the fixed container, otherwise the tab bar paints over the sheet */}
      {node && <NodeSheet node={node} onClose={() => setSelected(null)} onLog={onLog} />}
    </>
  )
}
