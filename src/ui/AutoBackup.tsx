import { useEffect, useRef } from 'react'
import { exportBackup, progressHash } from '../engine/backup'
import { githubBackup, sameTarget } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices, type GithubConfig } from '../store/services'

/** When the app goes to the background, back up to GitHub if connected, not paused, and something changed. */
export function AutoBackup() {
  const { progress } = useProgress()
  const services = useServices()
  const latest = useRef(progress)
  latest.current = progress
  const running = useRef(false)

  useEffect(() => {
    const onChange = async () => {
      if (document.visibilityState !== 'hidden' || running.current) return
      running.current = true
      try {
        const cfg = await services.github.load().catch(() => null)
        if (!cfg || cfg.paused) return
        const snapshot = latest.current
        const hash = progressHash(snapshot)
        if (hash === cfg.lastHash) return
        let result: Partial<GithubConfig>
        try {
          await githubBackup(cfg, exportBackup(snapshot), services.fetch)
          result = { lastBackupAt: Date.now(), lastError: undefined, lastHash: hash }
        } catch (e) {
          result = { lastError: (e as Error).message }
        }
        // the user may have disconnected or switched repo while the upload was in flight
        const now = await services.github.load().catch(() => null)
        if (now && sameTarget(now, cfg)) await services.github.save({ ...now, ...result }).catch(() => {})
      } finally {
        running.current = false
      }
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [services])

  return null
}
