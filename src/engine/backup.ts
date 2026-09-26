import type { ExerciseNode } from '../data/types'
import { sanitizeProgress, type Progress } from './progress'

export class BackupError extends Error {}

/** The backup text: only progress, never settings or tokens. */
export function exportBackup(progress: Progress, now: Date = new Date()): string {
  return JSON.stringify({ app: 'up', version: 1, exportedAt: now.toISOString(), progress }, null, 2)
}

export function parseBackup(text: string, nodes: ExerciseNode[]): Progress {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError("This file isn't an Up backup.")
  }
  const d = data as { app?: unknown; progress?: unknown } | null
  if (!d || typeof d !== 'object' || d.app !== 'up' || !d.progress || typeof d.progress !== 'object') {
    throw new BackupError("This file isn't an Up backup.")
  }
  return { ...sanitizeProgress(nodes, d.progress), onboarded: true }
}
