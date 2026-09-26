import { get, set } from 'idb-keyval'
import type { Progress } from '../engine/progress'

export interface ProgressStorage {
  load(): Promise<unknown>
  save(progress: Progress): Promise<void>
}

const KEY = 'up.progress'

export const idbStorage: ProgressStorage = {
  load: () => get(KEY),
  save: (progress) => set(KEY, progress),
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
