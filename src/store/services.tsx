import { createContext, useContext } from 'react'
import { del, get, set } from 'idb-keyval'

export interface GithubConfig {
  owner: string
  repo: string
  token: string
  lastBackupAt?: number
  lastError?: string
}

export interface Services {
  fetch: typeof fetch
  saveFile(name: string, text: string): Promise<void>
  github: {
    load(): Promise<GithubConfig | null>
    save(cfg: GithubConfig | null): Promise<void>
  }
}

const GITHUB_KEY = 'up.github'

export const realServices: Services = {
  fetch: (...args) => fetch(...args),
  async saveFile(name, text) {
    const file = new File([text], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') throw e
      }
      return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
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
