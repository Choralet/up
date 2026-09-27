import { createContext, useContext } from 'react'
import { del, get, set } from 'idb-keyval'

export interface GithubConfig {
  owner: string
  repo: string
  token: string
  lastBackupAt?: number
  lastError?: string
  /** fingerprint of the progress last uploaded (skip uploads when nothing changed) */
  lastHash?: string
  /** the repo already had a backup when connecting: no uploads until the user restores or replaces it */
  paused?: boolean
}

export interface Services {
  fetch: typeof fetch
  /** true when a file was handed to the phone (false if you closed the share sheet) */
  saveFile(name: string, text: string, type?: string): Promise<boolean>
  github: {
    load(): Promise<GithubConfig | null>
    save(cfg: GithubConfig | null): Promise<void>
  }
}

const GITHUB_KEY = 'up.github'

export const realServices: Services = {
  fetch: (...args) => fetch(...args),
  async saveFile(name, text, type = 'application/json') {
    const file = new File([text], name, { type })
    // a calendar file opens Safari's Add to Calendar only as a download; the share sheet has no Calendar
    if (type !== 'text/calendar' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
        return true
      } catch (e) {
        if ((e as Error).name === 'AbortError') return false // you closed the share sheet
        // share refused for another reason: fall back to a normal download below
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  },
  github: {
    load: async () => ((await get(GITHUB_KEY)) as GithubConfig | undefined) ?? null,
    save: async (cfg) => (cfg ? set(GITHUB_KEY, cfg) : del(GITHUB_KEY)),
  },
}

/** Services for tests: files are collected in `saved`, GitHub config lives in memory. */
export function memoryServices(over: Partial<Services> = {}): Services & { saved: { name: string; text: string }[] } {
  const saved: { name: string; text: string }[] = []
  let cfg: GithubConfig | null = null
  return {
    saved,
    fetch: () => Promise.reject(new Error('no network in tests')),
    saveFile: async (name, text) => {
      saved.push({ name, text })
      return true
    },
    github: {
      load: async () => cfg,
      save: async (c) => {
        cfg = c
      },
    },
    ...over,
  }
}

const Ctx = createContext<Services>(realServices)
export const ServicesProvider = Ctx.Provider
export const useServices = () => useContext(Ctx)
