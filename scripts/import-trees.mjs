// Turns the user's tree export (docs/data/calisthenics-trees.md) into src/data/trees.json.
// Re-run after the export changes:  node scripts/import-trees.mjs   (Node 22.18+: runs the .ts parser directly)
import { readFileSync, writeFileSync } from 'node:fs'
import { parseTrees } from '../src/data/parseTrees.ts'

const root = new URL('..', import.meta.url)
const data = parseTrees(readFileSync(new URL('docs/data/calisthenics-trees.md', root), 'utf8'))
writeFileSync(new URL('src/data/trees.json', root), JSON.stringify(data, null, 1) + '\n')
const n = data.trees.reduce((s, t) => s + t.nodes.length, 0)
console.log(`${data.trees.length} trees, ${n} exercises -> src/data/trees.json`)
