import type { ExerciseNode } from '../data/types'
import { sanitizeProgress, type Progress } from './progress'

export class BackupError extends Error {}

/** The backup text: progress (and app settings), never tokens, and never today's warm-up ticks. */
export function exportBackup(progress: Progress, now: Date = new Date()): string {
  const { day: _day, ...kept } = progress
  return JSON.stringify({ app: 'up', version: 1, exportedAt: now.toISOString(), progress: kept }, null, 2)
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

/** Short fingerprint of progress, to tell whether anything changed since the last upload. */
export function progressHash(progress: Progress): string {
  const { day: _day, seenAchievements: _seen, ...kept } = progress // warm-up ticks and seen badges alone should not trigger an upload
  const text = JSON.stringify(kept)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${text.length.toString(36)}-${(h >>> 0).toString(36)}`
}
