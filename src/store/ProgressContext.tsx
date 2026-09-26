import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayType, ExerciseNode, GoalOverride } from '../data/types'
import { indexNodes } from '../engine/graph'
import {
  activateSkill as activateSkillRule, applyOverrides, completeSteps as completeStepsRule, deactivateSkill as deactivateSkillRule,
  editSet as editSetRule, finishOnboarding as finishOnboardingRule, initialProgress,
  levelUp as levelUpRule, logSet, removeSet as removeSetRule, restartOnboarding as restartOnboardingRule,
  sanitizeProgress, setDayType as setDayTypeRule, setFocus as setFocusRule, setGoalOverride,
  type Progress,
} from '../engine/progress'
import { localDate } from '../lib/time'
import type { ProgressStorage } from './storage'

export interface ProgressValue {
  /** nodes with the user's personal goals applied */
  nodes: ExerciseNode[]
  /** the original nodes, for default goals */
  defaults: Map<string, ExerciseNode>
  byId: Map<string, ExerciseNode>
  progress: Progress
  log(nodeId: string, value: number): void
  levelUp(fromId: string, toId: string | null): void
  setFocus(nodeId: string): void
  /** `index` is the position in `progress.logs` */
  removeSet(index: number): void
  editSet(index: number, value: number): void
  activateSkill(chainId: string): void
  deactivateSkill(chainId: string): void
  setDayType(weekday: number, type: DayType): void
  setGoal(nodeId: string, goal: GoalOverride | null): void
  finishOnboarding(): void
  restartOnboarding(): void
  /** swap in progress from a backup; the caller has already cleaned it */
  replaceProgress(p: Progress): void
  /** "I can already do this" for these steps */
  completeSteps(ids: string[]): void
}

const Ctx = createContext<ProgressValue | null>(null)

export function ProgressProvider({
  storage, nodes, children,
}: { storage: ProgressStorage; nodes: ExerciseNode[]; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const defaults = useMemo(() => indexNodes(nodes), [nodes])
  const overrides = progress?.goalOverrides
  const effective = useMemo(() => (overrides ? applyOverrides(nodes, overrides) : nodes), [nodes, overrides])
  const byId = useMemo(() => indexNodes(effective), [effective])

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

  const update = (fn: (p: Progress) => Progress) => setProgress((p) => (p ? fn(p) : p))
  const value: ProgressValue = {
    nodes: effective,
    defaults,
    byId,
    progress,
    log: (nodeId, v) => update((p) => logSet(p, nodeId, v, localDate(), Date.now())),
    levelUp: (fromId, toId) => update((p) => levelUpRule(nodes, p, fromId, toId)),
    setFocus: (nodeId) => update((p) => setFocusRule(nodes, p, nodeId)),
    removeSet: (index) => update((p) => removeSetRule(p, index)),
    editSet: (index, v) => update((p) => editSetRule(p, index, v)),
    activateSkill: (chainId) => update((p) => activateSkillRule(nodes, p, chainId)),
    deactivateSkill: (chainId) => update((p) => deactivateSkillRule(p, chainId)),
    setDayType: (weekday, type) => update((p) => setDayTypeRule(p, weekday, type)),
    setGoal: (nodeId, goal) => update((p) => setGoalOverride(p, nodeId, goal, nodes)),
    finishOnboarding: () => update(finishOnboardingRule),
    restartOnboarding: () => update(restartOnboardingRule),
    replaceProgress: (p) => setProgress(p),
    completeSteps: (ids) => update((p) => completeStepsRule(nodes, p, ids)),
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
