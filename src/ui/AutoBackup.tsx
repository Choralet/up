import { useEffect, useRef } from 'react'
import { exportBackup } from '../engine/backup'
import { githubBackup } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices } from '../store/services'

/** When the app goes to the background, back up to GitHub if connected and something changed. */
export function AutoBackup() {
  const { progress } = useProgress()
  const services = useServices()
  const latest = useRef(progress)
  latest.current = progress
  const sent = useRef<string | null>(null)

  useEffect(() => {
    const onChange = async () => {
      if (document.visibilityState !== 'hidden') return
      const cfg = await services.github.load().catch(() => null)
      if (!cfg) return
      const key = JSON.stringify(latest.current)
      if (key === sent.current) return
      try {
        await githubBackup(cfg, exportBackup(latest.current), services.fetch)
        sent.current = key
        await services.github.save({ ...cfg, lastBackupAt: Date.now(), lastError: undefined })
      } catch (e) {
        await services.github.save({ ...cfg, lastError: (e as Error).message }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [services])

  return null
}
