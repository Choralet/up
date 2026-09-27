import { useEffect, useReducer, useRef, useState } from 'react'
import { formatClock } from '../lib/time'

const R = 88
const C = 2 * Math.PI * R
const COUNTDOWN_MS = 3000

let audio: AudioContext | null = null

/** The soft goal tone. iOS only lets a page make sound from an audio context created or resumed during a tap,
 *  so `prime()` runs on the Start tap and `play()` reuses that context later. Replaceable in tests. */
export const holdTone = {
  prime() {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      audio ??= new Ctx()
      void audio.resume().catch(() => {})
    } catch {
      /* no audio: silently skip */
    }
  },
  play() {
    const ctx = audio
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.32)
    } catch {
      /* no audio: silently skip */
    }
  },
}

interface Props {
  target: number
  onStop: (seconds: number) => void
  /** time timing starts (after the countdown), or null when idle */
  onRunningChange?: (startsAt: number | null) => void
  sound?: boolean
}

export function HoldTimer({ target, onStop, onRunningChange, sound = false }: Props) {
  // timing starts at `startsAt`; before that the countdown shows. Phase is derived from the clock at render.
  const [startsAt, setStartsAt] = useState<number | null>(null)
  const [logged, setLogged] = useState<number | null>(null)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const lock = useRef<WakeLockSentinel | null>(null)
  const active = useRef(false)
  const toned = useRef(false)

  const now = Date.now()
  const counting = startsAt !== null && now < startsAt
  const elapsed = startsAt !== null && !counting ? (now - startsAt) / 1000 : 0

  useEffect(() => {
    if (startsAt === null) return
    let raf = 0
    const frame = () => {
      if (sound && !toned.current && Date.now() - startsAt >= target * 1000) {
        toned.current = true
        holdTone.play()
      }
      rerender()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [startsAt, sound, target])

  useEffect(() => () => { active.current = false; void lock.current?.release().catch(() => {}) }, [])

  const release = () => {
    active.current = false
    void lock.current?.release().catch(() => {})
    lock.current = null
  }

  // the screen lock is dropped when the app goes to the background; ask again when it comes back mid-hold
  useEffect(() => {
    if (startsAt === null) return
    const again = async () => {
      if (document.visibilityState !== 'visible' || !active.current) return
      try {
        const l = (await navigator.wakeLock?.request('screen')) ?? null
        if (active.current) lock.current = l
        else void l?.release().catch(() => {})
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [startsAt])

  const start = async () => {
    if (sound) holdTone.prime()
    const at = Date.now() + COUNTDOWN_MS
    active.current = true
    toned.current = false
    setLogged(null)
    setStartsAt(at)
    onRunningChange?.(at)
    try {
      const l = (await navigator.wakeLock?.request('screen')) ?? null
      // the hold may have been stopped (or the screen closed) while the lock was being granted
      if (active.current) lock.current = l
      else void l?.release().catch(() => {})
    } catch {
      /* wake lock unsupported or denied: the timer still works */
    }
  }

  const cancel = () => {
    release()
    setStartsAt(null)
    onRunningChange?.(null)
  }

  const stop = () => {
    if (startsAt === null) return
    const seconds = Math.max(0, Math.floor((Date.now() - startsAt) / 1000))
    release()
    setStartsAt(null)
    setLogged(seconds)
    onRunningChange?.(null)
    onStop(seconds)
  }

  const progress = Math.min(elapsed / target, 1)
  const ring = (
    <svg className="ring" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label={`${formatClock(elapsed)} of ${target} seconds`} style={{ margin: '14px auto 0', display: 'block' }}>
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--fill)" strokeWidth="14" />
      {progress > 0 && (
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 100 100)" />
      )}
      <text x="100" y="112" textAnchor="middle" fontSize="52" fontWeight="700" fill="var(--label)" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(elapsed)}</text>
      <text x="100" y="138" textAnchor="middle" fontSize="13" fill="var(--label2)">of {target} s</text>
    </svg>
  )

  if (startsAt !== null) {
    // the whole screen is the stop button while holding (you may not see or reach a small one)
    return (
      <button className="holdcover" aria-label={counting ? 'Cancel Countdown' : 'Stop and Log'} onClick={counting ? cancel : stop}>
        {counting ? (
          <>
            <span className="countdown" aria-live="assertive"><span className="cdnum" key={Math.ceil((startsAt - now) / 1000)} data-testid="countdown">{Math.ceil((startsAt - now) / 1000)}</span></span>
            <span className="sub">Get into position</span>
          </>
        ) : (
          <>
            {ring}
            <span className="sub">Tap Anywhere to Stop</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div>
      {ring}
      {logged !== null && <div className="sub" style={{ marginTop: 8 }}>{logged >= 1 ? `Logged ${formatClock(logged)}` : 'Too short to log'}</div>}
      <button className="cta" style={{ background: 'var(--accent-strong, var(--accent))', marginTop: 20 }} onClick={start}>Start</button>
    </div>
  )
}
