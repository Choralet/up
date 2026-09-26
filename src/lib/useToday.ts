import { useEffect, useState } from 'react'
import { localDate } from './time'

/** Today's local date; updates when the app comes back to the foreground or the minute ticks over midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => localDate())
  useEffect(() => {
    const check = () => setToday(localDate())
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
