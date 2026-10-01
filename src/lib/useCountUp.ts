import { useEffect, useState } from 'react'

const reduced = () => typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A number that counts up to `target` over `ms` (ease-out). Under Reduce Motion it is `target` from the start. */
export function useCountUp(target: number, ms = 800): number {
  const still = reduced()
  const [shown, setShown] = useState(still ? target : 0)
  useEffect(() => {
    if (still) { setShown(target); return }
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setShown(Math.round(target * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, still])
  return shown
}
