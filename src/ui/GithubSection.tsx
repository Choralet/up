import { useEffect, useState } from 'react'
import { exportBackup, parseBackup, progressHash } from '../engine/backup'
import type { Progress } from '../engine/progress'
import { githubBackup, githubCheck, githubHasBackup, githubRestore } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices, type GithubConfig } from '../store/services'
import { ConfirmSheet } from './ConfirmSheet'

/** `onRestore` shows the replace confirmation; `after` runs once the user confirmed. */
export function GithubSection({ onRestore }: { onRestore: (p: Progress, after: () => void) => void }) {
  const { progress, nodes } = useProgress()
  const services = useServices()
  const [cfg, setCfg] = useState<GithubConfig | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ owner: '', repo: '', token: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askDisconnect, setAskDisconnect] = useState(false)

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

  const store = async (next: GithubConfig | null) => {
    await services.github.save(next)
    setCfg(next)
  }

  const connect = () =>
    run(async () => {
      const next = { owner: form.owner.trim(), repo: form.repo.trim(), token: form.token.trim() }
      await githubCheck(next, services.fetch)
      // a repo that already has a backup (e.g. a new phone) must not be overwritten by this phone's progress
      await store({ ...next, paused: await githubHasBackup(next, services.fetch) })
      setForm({ owner: '', repo: '', token: '' })
    })

  const backUp = () =>
    run(async () => {
      await githubBackup(cfg!, exportBackup(progress), services.fetch)
      await store({ ...cfg!, lastBackupAt: Date.now(), lastError: undefined, lastHash: progressHash(progress), paused: false })
    })

  const restore = () =>
    run(async () => {
      const p = parseBackup(await githubRestore(cfg!, services.fetch), nodes)
      const target = cfg!
      onRestore(p, () => { void store({ ...target, paused: false, lastError: undefined, lastHash: progressHash(p) }) })
    })

  if (!loaded) return null
  return (
    <>
      <div className="hdr">GitHub backup</div>
      {cfg ? (
        <div className="card">
          <b>Connected to {cfg.owner}/{cfg.repo}</b>
          {cfg.paused ? (
            <>
              <div className="sub" style={{ marginTop: 4 }}>
                This repository already has a backup. Restore it to this phone, or replace it with this phone's progress. Automatic backup waits until you choose.
              </div>
              <button className="cta" disabled={busy} onClick={restore}>Restore It</button>
              <button className="cta sec" disabled={busy} onClick={backUp}>Replace with This Phone</button>
            </>
          ) : (
            <>
              <div className="sub" style={{ marginTop: 4 }}>
                {cfg.lastBackupAt ? `Last backup: ${new Date(cfg.lastBackupAt).toLocaleString()}.` : 'No backup yet.'} Backs up automatically when you leave the app.
              </div>
              {cfg.lastError && <div className="sub" style={{ color: 'var(--skill)', marginTop: 4 }}>Last automatic backup failed: {cfg.lastError}</div>}
              <button className="cta" disabled={busy} onClick={backUp}>Back Up Now</button>
              <button className="cta sec" disabled={busy} onClick={restore}>Restore from GitHub</button>
            </>
          )}
          <button className="cta sec" style={{ color: 'var(--skill)' }} disabled={busy} onClick={() => setAskDisconnect(true)}>Disconnect</button>
        </div>
      ) : (
        <div className="card form">
          <p className="sub" style={{ marginTop: 0 }}>Saves a copy of your progress to a private GitHub repository, automatically when you leave the app.</p>
          <details className="howtoken">
            <summary>How to Make a Token</summary>
            <ol>
              <li>On github.com: your picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.</li>
              <li>Repository access: Only select repositories → your backup repository (for example up-data).</li>
              <li>Permissions → Repository permissions → Contents: Read and write.</li>
              <li>Generate, copy, and paste it below. It stays on this phone and only goes to GitHub.</li>
            </ol>
          </details>
          <label>GitHub owner<input aria-label="GitHub owner" placeholder="your GitHub name" autoCapitalize="none" autoCorrect="off" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label>
          <label>Repository<input aria-label="Repository" placeholder="up-data" autoCapitalize="none" autoCorrect="off" value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} /></label>
          <label>Token<input aria-label="Token" placeholder="github_pat_…" type="password" autoComplete="off" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></label>
          <button className="cta" disabled={busy || !form.owner || !form.repo || !form.token} onClick={connect}>Connect</button>
        </div>
      )}
      {error && <p className="sub" role="alert" style={{ color: 'var(--skill)' }}>{error}</p>}
      {askDisconnect && (
        <ConfirmSheet
          title="Disconnect GitHub backup?"
          message="Up forgets the token on this phone. Your backup stays on GitHub. To connect again you will need the token, which GitHub shows only once."
          actions={[{ label: 'Disconnect', tone: 'danger', onClick: () => { setAskDisconnect(false); void run(() => store(null)) } }]}
          onCancel={() => setAskDisconnect(false)}
        />
      )}
    </>
  )
}
