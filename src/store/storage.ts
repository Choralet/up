import { createStore, get, set, type UseStore } from 'idb-keyval'
import type { Progress } from '../engine/progress'

export interface ProgressStorage {
  load(): Promise<unknown>
  save(progress: Progress): Promise<void>
}

const KEY = 'up.progress'

/** Run `op`; if it fails, call `reset` (e.g. open a fresh connection) and try exactly once more. */
export async function retryOnce<T>(op: () => Promise<T>, reset: () => void): Promise<T> {
  try {
    return await op()
  } catch {
    reset()
    return await op()
  }
}

// iOS can drop a cached IndexedDB connection after long backgrounding, so reopen the same store once on failure
let store: UseStore | undefined
const reopen = () => {
  store = createStore('keyval-store', 'keyval')
}

export const idbStorage: ProgressStorage = {
  load: () => retryOnce(() => get(KEY, store), reopen),
  save: (progress) => retryOnce(() => set(KEY, progress, store), reopen),
}

/** In-memory storage for tests. */
export function memoryStorage(initial?: unknown): ProgressStorage {
  let data = initial
  return {
    load: async () => data,
    save: async (progress) => {
      data = progress
    },
  }
}
