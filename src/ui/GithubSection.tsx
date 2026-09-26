import { useEffect, useState } from 'react'
import { exportBackup, parseBackup } from '../engine/backup'
import type { Progress } from '../engine/progress'
import { githubBackup, githubCheck, githubRestore } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices, type GithubConfig } from '../store/services'

export function GithubSection({ onRestore }: { onRestore: (p: Progress) => void }) {
  const { progress, nodes } = useProgress()
  const services = useServices()
  const [cfg, setCfg] = useState<GithubConfig | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ owner: '', repo: '', token: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    services.github.load().then((c) => { setCfg(c); setLoaded(true) }, () => setLoaded(true))
  }, [services])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      const next = { owner: form.owner.trim(), repo: form.repo.trim(), token: form.token.trim() }
      await githubCheck(next, services.fetch)
      await services.github.save(next)
      setCfg(next)
      setForm({ owner: '', repo: '', token: '' })
    })

  const backUp = () =>
    run(async () => {
      await githubBackup(cfg!, exportBackup(progress), services.fetch)
      const next = { ...cfg!, lastBackupAt: Date.now(), lastError: undefined }
      await services.github.save(next)
      setCfg(next)
    })

  const restore = () => run(async () => onRestore(parseBackup(await githubRestore(cfg!, services.fetch), nodes)))

  const disconnect = () => run(async () => { await services.github.save(null); setCfg(null) })

  if (!loaded) return null
  return (
    <>
      <div className="hdr">GitHub backup</div>
      {cfg ? (
        <div className="card">
          <b>Connected to {cfg.owner}/{cfg.repo}</b>
          <div className="sub" style={{ marginTop: 4 }}>
            {cfg.lastBackupAt ? `Last backup: ${new Date(cfg.lastBackupAt).toLocaleString()}` : 'No backup yet.'} Backs up automatically when you leave the app.
          </div>
          {cfg.lastError && <div className="sub" style={{ color: 'var(--skill)', marginTop: 4 }}>Last automatic backup failed: {cfg.lastError}</div>}
          <button className="cta" disabled={busy} onClick={backUp}>Back Up Now</button>
          <button className="cta sec" disabled={busy} onClick={restore}>Restore from GitHub</button>
          <button className="cta sec" style={{ color: 'var(--skill)' }} disabled={busy} onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <div className="card form">
          <p className="sub" style={{ marginTop: 0 }}>Saves a copy of your progress to a private GitHub repository. See docs/BACKUP.md for making the token.</p>
          <label>GitHub owner<input aria-label="GitHub owner" autoCapitalize="none" autoCorrect="off" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label>
          <label>Repository<input aria-label="Repository" autoCapitalize="none" autoCorrect="off" value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} /></label>
          <label>Token<input aria-label="Token" type="password" autoComplete="off" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></label>
          <button className="cta" disabled={busy || !form.owner || !form.repo || !form.token} onClick={connect}>Connect</button>
        </div>
      )}
      {error && <p className="sub" role="alert" style={{ color: 'var(--skill)' }}>{error}</p>}
    </>
  )
}
