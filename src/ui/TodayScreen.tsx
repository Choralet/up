import { BRANCHES } from '../engine/graph'
import { todaysValues } from '../engine/progress'
import { goalText } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

export function TodayScreen({ onOpen }: { onOpen: (nodeId: string) => void }) {
  const { progress, byId } = useProgress()
  const today = localDate()
  const heading = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="screen">
      <div className="sub" style={{ fontWeight: 600 }}>{heading}</div>
      <h1 className="large">Today</h1>
      <div className="group">
        {BRANCHES.map((b) => {
          const meta = BRANCH_META[b]
          const node = progress.focus[b] ? byId.get(progress.focus[b]!) : undefined
          if (!node) {
            return (
              <div className="row" key={b}>
                <span className="dot" style={{ background: meta.color }}>{meta.short}</span>
                <span className="t"><b>{meta.label}</b><span>Branch complete</span></span>
              </div>
            )
          }
          const done = todaysValues(progress, node.id, today).filter((v) => v >= node.goal.target).length
          return (
            <button className="row" key={b} onClick={() => onOpen(node.id)}>
              <span className="dot" style={{ background: meta.color }}>{meta.short}</span>
              <span className="t">
                {node.kind === 'skill' && <span className="tag">SKILL</span>}
                <b>{node.name}</b>
                <span>{goalText(node.goal)} · {done} of {node.goal.sets} sets today</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
