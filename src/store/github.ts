import type { GithubConfig } from './services'

export const BACKUP_PATH = 'up-data.json'

export class GithubError extends Error {}

type Cfg = Pick<GithubConfig, 'owner' | 'repo' | 'token'>

const repoUrl = (c: Cfg) => `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`
const fileUrl = (c: Cfg) => `${repoUrl(c)}/contents/${BACKUP_PATH}`
const headers = (c: Cfg) => ({
  Authorization: `Bearer ${c.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

function explain(status: number): string {
  if (status === 401) return 'GitHub rejected the token. Check it, or make a new one.'
  if (status === 403) return 'The token is not allowed to write to this repository. Give it "Contents: Read and write".'
  if (status === 404) return 'Repository not found. Check the owner and name, and that the token can see it.'
  return `GitHub error ${status}. Try again later.`
}

async function call(f: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await f(url, { ...init, cache: 'no-store' })
  } catch {
    throw new GithubError("Couldn't reach GitHub. Check your connection.")
  }
}

export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Throws a GithubError unless the repository is reachable with this token. */
export async function githubCheck(c: Cfg, f: typeof fetch): Promise<void> {
  const r = await call(f, repoUrl(c), { headers: headers(c) })
  if (!r.ok) throw new GithubError(explain(r.status))
}

/** The backup file's sha and base64 content, or null when the repo exists but has no backup yet. */
async function current(c: Cfg, f: typeof fetch): Promise<{ sha: string; content: string } | null> {
  const r = await call(f, fileUrl(c), { headers: headers(c) })
  if (r.status === 404) {
    await githubCheck(c, f) // tells "no file yet" apart from "no repo"
    return null
  }
  if (!r.ok) throw new GithubError(explain(r.status))
  const body = (await r.json()) as { sha: string; content: string }
  return { sha: body.sha, content: body.content }
}

export async function githubBackup(c: Cfg, text: string, f: typeof fetch): Promise<void> {
  const cur = await current(c, f)
  const r = await call(f, fileUrl(c), {
    method: 'PUT',
    headers: { ...headers(c), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Up backup ${new Date().toISOString()}`, content: toBase64(text), ...(cur ? { sha: cur.sha } : {}) }),
  })
  if (!r.ok) throw new GithubError(explain(r.status))
}

export async function githubRestore(c: Cfg, f: typeof fetch): Promise<string> {
  const cur = await current(c, f)
  if (!cur) throw new GithubError('No backup in this repository yet.')
  return fromBase64(cur.content)
}

/** True when the repository already holds a backup file. */
export async function githubHasBackup(c: Cfg, f: typeof fetch): Promise<boolean> {
  return (await current(c, f)) !== null
}

/** Same repository and token (used to avoid writing results for a config the user has since changed). */
export const sameTarget = (a: Cfg, b: Cfg) => a.owner === b.owner && a.repo === b.repo && a.token === b.token
