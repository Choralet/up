import { useRef, useState } from 'react'
import { BRANCHES } from '../engine/graph'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

/** Ignore a second tap this soon after an answer (a double tap would otherwise answer the next question). */
export const onboardingTuning = { answerLockMs: 350 }

/** step -1 = intro, 0..3 = one branch each, 4 = summary */
export function Onboarding() {
  const { progress, byId, levelUp, finishOnboarding } = useProgress()
  const [step, setStep] = useState(-1)
  const lastAnswer = useRef(-Infinity)

  // skip branches with nothing left to ask, so no empty frame is ever drawn
  let s = step
  while (s >= 0 && s < BRANCHES.length && !progress.focus[BRANCHES[s]]) s++
  const branch = s >= 0 && s < BRANCHES.length ? BRANCHES[s] : null
  const node = branch ? byId.get(progress.focus[branch]!) : undefined

  const answer = (fn: () => void) => () => {
    const now = Date.now()
    if (now - lastAnswer.current < onboardingTuning.answerLockMs) return
    lastAnswer.current = now
    fn()
  }

  let body
  if (s === -1) {
    body = (
      <>
        <h1 className="large">Find your level</h1>
        <p className="sub" style={{ margin: '8px 0 24px' }}>
          Answer a few quick questions so Up starts each muscle group at the right exercise. It takes about a minute.
        </p>
        <button className="cta" onClick={() => setStep(0)}>Start</button>
        <button className="cta sec" onClick={finishOnboarding}>Skip for now</button>
      </>
    )
  } else if (branch && node) {
    body = (
      <>
        <div className="eyebrow">{BRANCH_META[branch].label} · {s + 1} of {BRANCHES.length}</div>
        <h1 className="large" style={{ fontSize: 26, margin: '8px 0' }}>{node.name}</h1>
        <p style={{ fontSize: 17, margin: '8px 0' }}>Can you do {goalText(node.goal)} clean {node.name}?</p>
        <p className="sub">{node.cue}</p>
        <button className="cta" style={{ marginTop: 24 }} onClick={answer(() => levelUp(node.id, null))}>Yes</button>
        <button className="cta sec" onClick={answer(() => setStep(s + 1))}>Not yet</button>
      </>
    )
  } else {
    body = (
      <>
        <h1 className="large">You're set</h1>
        <div className="group">
          {BRANCHES.map((b) => {
            const id = progress.focus[b]
            return (
              <div className="row" key={b}>
                <span className="t"><b>{BRANCH_META[b].label}: {id ? byId.get(id)!.name : 'Complete'}</b></span>
              </div>
            )
          })}
        </div>
        <button className="cta" onClick={finishOnboarding}>Start Training</button>
      </>
    )
  }

  return (
    <div className="log onboarding" role="dialog" aria-modal="true" aria-label="Find your level">
      <div className="screen" style={{ textAlign: 'left' }}>{body}</div>
    </div>
  )
}
