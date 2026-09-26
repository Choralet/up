import { useState } from 'react'
import { ROADMAP, VIDEOS, type RoadmapItem } from '../data/roadmap'
import { roadmapStatus, type RoadmapStatus } from '../engine/roadmap'
import { plural } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { RoadmapSheet } from './RoadmapSheet'

const WORD = { done: 'done', training: 'training', ready: 'ready', locked: 'locked' } as const
const TEXT = { done: 'Done', training: 'Training', ready: 'Ready', locked: 'Locked' } as const

/** Quiet status icons (not emoji): check, filled dot, empty ring, lock. */
function StatusIcon({ status }: { status: RoadmapStatus['status'] }) {
  return (
    <svg className={`rmicon ${status}`} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      {status === 'done' && <path d="M5 10.5 L8.5 14 L15 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      {status === 'training' && <circle cx="10" cy="10" r="5" fill="currentColor" />}
      {status === 'ready' && <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="2" />}
      {status === 'locked' && (
        <>
          <rect x="5" y="9" width="10" height="8" rx="2" fill="currentColor" />
          <path d="M7 9 V7 a3 3 0 0 1 6 0 V9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
    </svg>
  )
}

export function RoadmapView({ onLog }: { onLog: (id: string) => void }) {
  const { byId, progress } = useProgress()
  const [open, setOpen] = useState<RoadmapItem | null>(null)
  const rows = ROADMAP.map((item) => ({ item, s: roadmapStatus(byId, progress, item) }))
  const firstOpenYear = ([1, 2, 3] as const).find((y) => rows.some((r) => r.item.year === y && r.s.status !== 'done')) ?? 1
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([firstOpenYear]))
  const readyNow = rows.filter((r) => r.s.status === 'ready')

  const toggle = (y: number) => setExpanded((e) => {
    const next = new Set(e)
    if (next.has(y)) next.delete(y)
    else next.add(y)
    return next
  })

  const detail = (s: RoadmapStatus, steps: number) =>
    `${s.status === 'locked' ? `Needs: ${s.needs.join(', ')}` : TEXT[s.status]}${s.done > 0 && s.status !== 'done' ? ` · ${s.done} of ${plural(steps, 'step')}` : ''}`

  return (
    <>
      <p className="sub" style={{ marginTop: 8 }}>
        Every skill in order. Order from STRIQfit's videos. Steps and prerequisites are standard progressions, not from the videos.
      </p>

      {readyNow.length > 0 && (
        <>
          <h2 className="hdr" style={{ marginBottom: 8 }}>Ready Now</h2>
          <ul className="group list" aria-label="Ready now">
            {readyNow.map(({ item, s }) => (
              <li key={item.id}>
                <button className="row rmrow ready" aria-label={`Ready now: ${item.name}, year ${item.year}`} onClick={() => setOpen(item)}>
                  <span className="rmnum">Y{item.year}</span>
                  <span className="t"><b>{item.name}</b><span>{detail(s, item.steps.length)}</span></span>
                  <StatusIcon status="ready" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {([1, 2, 3] as const).map((year) => {
        const yearRows = rows.filter((r) => r.item.year === year)
        const doneCount = yearRows.filter((r) => r.s.status === 'done').length
        const isOpen = expanded.has(year)
        return (
          <section key={year}>
            <h2 className="hdr" style={{ marginBottom: 8 }}>
              <button className="yearbtn" aria-expanded={isOpen} onClick={() => toggle(year)}>
                Year {year} · {doneCount} of {yearRows.length} done <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
              </button>
            </h2>
            {isOpen && (
              <>
                <div className="sub" style={{ margin: '0 4px 8px', fontSize: 12 }}>{VIDEOS[year].title}</div>
                <div className="group">
                  {yearRows.map(({ item, s }, i) => (
                    <button
                      key={item.id}
                      className={`row rmrow ${s.status}`}
                      aria-label={`${i + 1}. ${item.name}, ${WORD[s.status]}${s.status === 'locked' ? `, needs ${s.needs.join(', ')}` : ''}`}
                      onClick={() => setOpen(item)}
                    >
                      <span className="rmnum">{i + 1}</span>
                      <span className="t"><b>{item.name}</b><span>{detail(s, item.steps.length)}</span></span>
                      <StatusIcon status={s.status} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )
      })}
      {open && <RoadmapSheet item={open} onClose={() => setOpen(null)} onLog={onLog} />}
    </>
  )
}
