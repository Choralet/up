import { useEffect, useState } from 'react'
import { useServices, type GithubConfig } from '../store/services'

const WEEK = 7 * 86_400_000

/** A quiet card on Today when GitHub backup is connected but not working (failed, stale, or waiting for a choice). */
export function BackupNotice({ refresh, onOpen }: { refresh: unknown; onOpen: () => void }) {
  const services = useServices()
  const [cfg, setCfg] = useState<GithubConfig | null>(null)

  useEffect(() => {
    services.github.load().then(setCfg, () => setCfg(null))
  }, [services, refresh])

  if (!cfg) return null
  const stale = !!cfg.lastBackupAt && Date.now() - cfg.lastBackupAt > WEEK
  if (!cfg.lastError && !cfg.paused && !stale) return null
  const why = cfg.paused ? 'Finish setting up GitHub backup.' : cfg.lastError ?? 'No backup for over a week.'
  return (
    <button className="card notice" onClick={onOpen}>
      <b>Backup needs attention</b>
      <span className="sub">{why} Open Settings.</span>
    </button>
  )
}
