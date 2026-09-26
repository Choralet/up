import { useState } from 'react'
import { ROADMAP, VIDEOS, type RoadmapItem } from '../data/roadmap'
import { roadmapStatus } from '../engine/roadmap'
import { useProgress } from '../store/ProgressContext'
import { RoadmapSheet } from './RoadmapSheet'

const ICON = { done: '✓', training: '●', ready: '', locked: '🔒' } as const
const WORD = { done: 'done', training: 'training', ready: 'ready', locked: 'locked' } as const

export function RoadmapView({ onLog }: { onLog: (id: string) => void }) {
  const { byId, progress } = useProgress()
  const [open, setOpen] = useState<RoadmapItem | null>(null)

  return (
    <>
      <p className="sub" style={{ marginTop: 8 }}>
        Order from STRIQfit's videos. Steps and prerequisites are standard progressions, not from the videos.
      </p>
      {([1, 2, 3] as const).map((year) => {
        const items = ROADMAP.filter((r) => r.year === year)
        const rows = items.map((item) => ({ item, s: roadmapStatus(byId, progress, item) }))
        const doneCount = rows.filter((r) => r.s.status === 'done').length
        return (
          <section key={year}>
            <h2 className="hdr" style={{ marginBottom: 8 }}>Year {year} · {doneCount} of {items.length} done</h2>
            <div className="sub" style={{ margin: '0 4px 8px', fontSize: 12 }}>{VIDEOS[year].title}</div>
            <div className="group">
              {rows.map(({ item, s }, i) => (
                <button
                  key={item.id}
                  className={`row rmrow ${s.status}`}
                  aria-label={`${i + 1}. ${item.name}, ${WORD[s.status]}${s.status === 'locked' ? `, needs ${s.needs.join(', ')}` : ''}`}
                  onClick={() => setOpen(item)}
                >
                  <span className="rmnum">{i + 1}</span>
                  <span className="t">
                    <b>{item.name}</b>
                    <span>{s.status === 'locked' ? `Needs: ${s.needs.join(', ')}` : s.status === 'ready' ? 'Ready' : s.status === 'training' ? 'Training' : 'Done'}</span>
                  </span>
                  <span className="rmicon" aria-hidden="true">{ICON[s.status]}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {open && <RoadmapSheet item={open} onClose={() => setOpen(null)} onLog={onLog} />}
    </>
  )
}
