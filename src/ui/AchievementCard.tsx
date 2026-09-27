import { useEffect } from 'react'
import { achievements } from '../engine/achievements'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'

/** A small, quiet card on Today for one newly earned achievement. */
export function AchievementCard() {
  const { nodes, progress, markSeen } = useProgress()
  const earned = achievements(nodes, progress, localDate()).filter((a) => a.earned)
  const seen = progress.seenAchievements

  // an older save: what it already earned counts as seen, so no pile of cards appears
  useEffect(() => {
    if (seen === null) markSeen(earned.map((a) => a.id))
  }, [seen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (seen === null) return null
  const fresh = earned.find((a) => !seen.includes(a.id))
  if (!fresh) return null
  return (
    <div className="card achcard" role="status" aria-label="New achievement">
      <span className="achmedal" aria-hidden="true">★</span>
      <span className="t">
        <span className="tag extra">Achievement</span>
        <b>{fresh.name}</b>
        <span className="sub">{fresh.detail}</span>
      </span>
      <button className="pillbtn" onClick={() => markSeen([fresh.id])}>Nice</button>
    </div>
  )
}
