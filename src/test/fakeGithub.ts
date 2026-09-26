import { fromBase64 } from '../store/github'

interface Call { method: string; url: string; auth: string | null; body?: Record<string, unknown> }

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** An in-memory GitHub repo that speaks just enough of the contents API. */
export function fakeGithub(opts: { repoExists?: boolean; status?: number; offline?: boolean } = {}) {
  let file: { sha: string; content: string } | null = null
  const calls: Call[] = []
  const f = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    const headers = new Headers(init.headers)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url, auth: headers.get('Authorization'), body })
    if (opts.offline) throw new TypeError('Failed to fetch')
    if (opts.status) return json(opts.status, { message: 'error' })
    if (opts.repoExists === false) return json(404, { message: 'Not Found' })
    if (url.endsWith('/contents/up-data.json')) {
      if (method === 'GET') return file ? json(200, { sha: file.sha, content: file.content, encoding: 'base64' }) : json(404, { message: 'Not Found' })
      if (method === 'PUT') {
        if (file && body?.sha !== file.sha) return json(409, { message: 'sha mismatch' })
        const created = !file
        file = { sha: `sha${calls.length}`, content: String(body?.content) }
        return json(created ? 201 : 200, {})
      }
    }
    return json(200, { full_name: 'x/y' })
  }
  return { fetch: f as typeof fetch, calls, text: () => (file ? fromBase64(file.content) : null) }
}
