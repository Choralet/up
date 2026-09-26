import { useEffect, useRef, useState } from 'react'
import { formatClock } from '../lib/time'

const R = 88
const C = 2 * Math.PI * R

export function HoldTimer({ target, onStop }: { target: number; onStop: (seconds: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const lock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 200)
    return () => clearInterval(id)
  }, [startedAt])

  useEffect(() => () => { void lock.current?.release().catch(() => {}) }, [])

  const start = async () => {
    setElapsed(0)
    setStartedAt(Date.now())
    try {
      lock.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* wake lock unsupported or denied: the timer still works */
    }
  }

  const stop = () => {
    if (startedAt === null) return
    const seconds = Math.floor((Date.now() - startedAt) / 1000)
    setStartedAt(null)
    void lock.current?.release().catch(() => {})
    lock.current = null
    onStop(seconds)
  }

  const progress = Math.min(elapsed / target, 1)
  return (
    <div>
      <svg className="ring" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label={`${formatClock(elapsed)} of ${target} seconds`} style={{ margin: '14px auto 0', display: 'block' }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--fill)" strokeWidth="14" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 100 100)" />
        <text x="100" y="112" textAnchor="middle" fontSize="52" fontWeight="700" fill="var(--label)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(elapsed)}</text>
        <text x="100" y="138" textAnchor="middle" fontSize="13" fill="var(--label2)">of {target} s</text>
      </svg>
      {startedAt === null ? (
        <button className="cta" style={{ background: 'var(--accent)', marginTop: 20 }} onClick={start}>Start</button>
      ) : (
        <button className="cta" style={{ background: 'var(--accent)', marginTop: 20 }} onClick={stop}>Stop and Log</button>
      )}
    </div>
  )
}
