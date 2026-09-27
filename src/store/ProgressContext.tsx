import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayType, ExerciseNode, GoalOverride } from '../data/types'
import { indexNodes } from '../engine/graph'
import {
  activateSkill as activateSkillRule, applyOverrides, currentStages, settleStage, applyStages, completeSteps as completeStepsRule, deactivateSkill as deactivateSkillRule,
  editSet as editSetRule, finishOnboarding as finishOnboardingRule, initialProgress,
  levelUp as levelUpRule, logSet, removeSet as removeSetRule, restartOnboarding as restartOnboardingRule,
  sanitizeProgress, setDayPick as setDayPickRule, setDayType as setDayTypeRule, setSettings as setSettingsRule, markSeen as markSeenRule, unlockedBy, toggleWarm as toggleWarmRule, setFocus as setFocusRule, setGoalOverride,
  type Progress, type Settings,
} from '../engine/progress'
import { achievements } from '../engine/achievements'
import { localDate } from '../lib/time'
import type { ProgressStorage } from './storage'

export interface ProgressValue {
  /** nodes with the user's personal goals applied */
  nodes: ExerciseNode[]
  /** the original nodes, for default goals */
  defaults: Map<string, ExerciseNode>
  byId: Map<string, ExerciseNode>
  /** the full goal (with your overrides), ignoring the ramp stage */
  finalById: Map<string, ExerciseNode>
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
  /** today's Train Anyway choice (null = the schedule) */
  setDayPick(pick: DayType | null): void
  toggleWarm(key: string): void
  setSettings(patch: Partial<Settings>): void
  markSeen(ids: string[]): void
  /** nodes unlocked by the last level-up (this session only), for the unlock animation */
  justUnlocked: string[]
  clearUnlocked(): void
}

const Ctx = createContext<ProgressValue | null>(null)

export function ProgressProvider({
  storage, nodes, children,
}: { storage: ProgressStorage; nodes: ExerciseNode[]; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [justUnlocked, setJustUnlocked] = useState<string[]>([])
  const defaults = useMemo(() => indexNodes(nodes), [nodes])
  const overrides = progress?.goalOverrides
  const stages = progress?.goalStage
  const raisedOn = progress?.stageRaisedOn
  const today = localDate()
  // your goals (overrides) are the full goals; after a level-up the current ramp stage is what screens show
  const finals = useMemo(() => (overrides ? applyOverrides(nodes, overrides) : nodes), [nodes, overrides])
  const effective = useMemo(
    () => (stages && raisedOn ? applyStages(finals, currentStages({ goalStage: stages, stageRaisedOn: raisedOn }, today)) : finals),
    [finals, stages, raisedOn, today],
  )
  const byId = useMemo(() => indexNodes(effective), [effective])
  const finalById = useMemo(() => indexNodes(finals), [finals])

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
  // the goal ramp follows today's sets of that exercise
  const settle = (p: Progress, id: string | undefined): Progress => {
    const f = id ? finalById.get(id) : undefined
    return f ? settleStage(p, f.id, f.goal, localDate()) : p
  }
  // what Find your level placed you at is already yours: no pile of achievement cards for it
  const seeEarned = (p: Progress): Progress =>
    p.seenAchievements === null ? p : markSeenRule(p, achievements(nodes, p, localDate()).filter((a) => a.earned).map((a) => a.id))
  const value: ProgressValue = {
    nodes: effective,
    defaults,
    byId,
    finalById,
    progress,
    log: (nodeId, v) => update((p) => settle(logSet(p, nodeId, v, localDate(), Date.now()), nodeId)),
    levelUp: (fromId, toId) =>
      update((p) => {
        const next = levelUpRule(nodes, p, fromId, toId)
        if (next !== p) setJustUnlocked(unlockedBy(nodes, p, next))
        return next
      }),
    justUnlocked,
    clearUnlocked: () => setJustUnlocked([]),
    setFocus: (nodeId) => update((p) => setFocusRule(nodes, p, nodeId)),
    removeSet: (index) => update((p) => settle(removeSetRule(p, index), p.logs[index]?.nodeId)),
    editSet: (index, v) => update((p) => settle(editSetRule(p, index, v), p.logs[index]?.nodeId)),
    activateSkill: (chainId) => update((p) => activateSkillRule(nodes, p, chainId)),
    deactivateSkill: (chainId) => update((p) => deactivateSkillRule(p, chainId)),
    setDayType: (weekday, type) => update((p) => setDayTypeRule(p, weekday, type)),
    setGoal: (nodeId, goal) => update((p) => setGoalOverride(p, nodeId, goal, nodes)),
    finishOnboarding: () => update((p) => seeEarned(finishOnboardingRule(p))),
    restartOnboarding: () => update(restartOnboardingRule),
    replaceProgress: (p) => setProgress(p),
    completeSteps: (ids) => update((p) => completeStepsRule(nodes, p, ids)),
    setDayPick: (pick) => update((p) => setDayPickRule(p, localDate(), pick)),
    toggleWarm: (key) => update((p) => toggleWarmRule(p, localDate(), key)),
    setSettings: (patch) => update((p) => setSettingsRule(p, patch)),
    markSeen: (ids) => update((p) => markSeenRule(p, ids)),
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
