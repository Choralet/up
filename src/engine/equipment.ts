import type { ExerciseNode } from '../data/types'

/** Equipment codes you own; undefined = not set yet (everything counts as owned). The floor is always there. */
export type Kit = readonly string[] | undefined

const has = (kit: readonly string[], item: string) => item === 'floor' || kit.includes(item)

/** You can do an exercise when you own every item of any one of its options. */
export function canDo(node: ExerciseNode, kit: Kit): boolean {
  if (!kit || !node.equipment) return true
  return node.equipment.some((opt) => opt.every((e) => has(kit, e)))
}

/** The fewest items you'd need to add to do it (the first such option); [] when you can already. */
export function missingFor(node: ExerciseNode, kit: Kit): string[] {
  if (canDo(node, kit)) return []
  const options = node.equipment!.map((opt) => opt.filter((e) => !has(kit!, e)))
  return options.reduce((best, o) => (o.length < best.length ? o : best))
}
