import { useEffect, useReducer } from 'react'
import { formatClock } from '../lib/time'

/** A small rest countdown after a set. It never blocks logging; Skip hides it. */
export function RestTimer({ until, onSkip }: { until: number; onSkip: () => void }) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  const left = Math.max(0, Math.ceil((until - Date.now()) / 1000))
  useEffect(() => {
    if (left === 0) return
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [left])
  return (
    <div className="rest" role="timer" aria-label={left > 0 ? `Rest, ${left} seconds left` : 'Rest done'}>
      <span>{left > 0 ? <>Rest <b>{formatClock(left)}</b></> : <b>Ready for the next set</b>}</span>
      <button className="pillbtn" onClick={onSkip}>{left > 0 ? 'Skip' : 'OK'}</button>
    </div>
  )
}
