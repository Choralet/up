import { fakeGithub } from '../test/fakeGithub'
import { fromBase64, githubBackup, githubCheck, GithubError, githubRestore, toBase64 } from './github'

const cfg = { owner: 'me', repo: 'up-data', token: 't0ken' }

describe('base64 helpers', () => {
  it('round-trips unicode text', () => {
    const s = 'Handstand ✓ × 3 — ok'
    expect(fromBase64(toBase64(s))).toBe(s)
  })
  it('handles large text', () => {
    const s = 'x'.repeat(200_000)
    expect(fromBase64(toBase64(s))).toBe(s)
  })
})

describe('githubBackup / githubRestore', () => {
  it('creates the file, then updates it with the current sha, and restores it', async () => {
    const gh = fakeGithub()
    await githubBackup(cfg, '{"a":1}', gh.fetch)
    expect(gh.text()).toBe('{"a":1}')
    await githubBackup(cfg, '{"a":2}', gh.fetch)
    expect(gh.text()).toBe('{"a":2}')
    expect(await githubRestore(cfg, gh.fetch)).toBe('{"a":2}')
  })
  it('sends the token only to api.github.com, as a Bearer header', async () => {
    const gh = fakeGithub()
    await githubBackup(cfg, '{}', gh.fetch)
    for (const c of gh.calls) {
      expect(c.url.startsWith('https://api.github.com/repos/me/up-data')).toBe(true)
      expect(c.auth).toBe('Bearer t0ken')
    }
  })
  it('restore with no backup yet says so', async () => {
    await expect(githubRestore(cfg, fakeGithub().fetch)).rejects.toThrow('No backup in this repository yet.')
  })
  it('explains common errors', async () => {
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 401 }).fetch)).rejects.toThrow('GitHub rejected the token')
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 403 }).fetch)).rejects.toThrow('not allowed to write')
    await expect(githubBackup(cfg, '{}', fakeGithub({ repoExists: false }).fetch)).rejects.toThrow('Repository not found')
    await expect(githubBackup(cfg, '{}', fakeGithub({ offline: true }).fetch)).rejects.toThrow("Couldn't reach GitHub")
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 500 }).fetch)).rejects.toBeInstanceOf(GithubError)
  })
  it('githubCheck passes for a reachable repo and fails for a missing one', async () => {
    await expect(githubCheck(cfg, fakeGithub().fetch)).resolves.toBeUndefined()
    await expect(githubCheck(cfg, fakeGithub({ repoExists: false }).fetch)).rejects.toThrow('Repository not found')
  })
})
