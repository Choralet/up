import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ExerciseNode } from '../data/types'
import { indexNodes } from '../engine/graph'
import {
  editSet as editSetRule, initialProgress, levelUp as levelUpRule, logSet, removeSet as removeSetRule,
  sanitizeProgress, setFocus as setFocusRule,
  type Progress,
} from '../engine/progress'
import { localDate } from '../lib/time'
import type { ProgressStorage } from './storage'

export interface ProgressValue {
  nodes: ExerciseNode[]
  byId: Map<string, ExerciseNode>
  progress: Progress
  log(nodeId: string, value: number): void
  levelUp(fromId: string, toId: string | null): void
  setFocus(nodeId: string): void
  /** `index` is the position in `progress.logs` */
  removeSet(index: number): void
  editSet(index: number, value: number): void
}

const Ctx = createContext<ProgressValue | null>(null)

export function ProgressProvider({
  storage, nodes, children,
}: { storage: ProgressStorage; nodes: ExerciseNode[]; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const byId = useMemo(() => indexNodes(nodes), [nodes])

  useEffect(() => {
    let alive = true
    storage
      .load()
      .then((raw) => alive && setProgress(sanitizeProgress(nodes, raw)))
      .catch(() => alive && setProgress(initialProgress(nodes)))
    return () => {
      alive = false
    }
  }, [storage, nodes])

  useEffect(() => {
    if (!progress) return
    storage.save(progress).then(() => setSaveFailed(false), () => setSaveFailed(true))
  }, [progress, storage])

  if (!progress) return null

  const value: ProgressValue = {
    nodes,
    byId,
    progress,
    log: (nodeId, v) => setProgress((p) => (p ? logSet(p, nodeId, v, localDate(), Date.now()) : p)),
    levelUp: (fromId, toId) => setProgress((p) => (p ? levelUpRule(nodes, p, fromId, toId) : p)),
    setFocus: (nodeId) => setProgress((p) => (p ? setFocusRule(nodes, p, nodeId) : p)),
    removeSet: (index) => setProgress((p) => (p ? removeSetRule(p, index) : p)),
    editSet: (index, v) => setProgress((p) => (p ? editSetRule(p, index, v) : p)),
  }
  return (
    <Ctx.Provider value={value}>
      {saveFailed && <div className="banner" role="alert">Couldn't save your progress on this device.</div>}
      {children}
    </Ctx.Provider>
  )
}

export function useProgress(): ProgressValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgress must be used inside <ProgressProvider>')
  return v
}
