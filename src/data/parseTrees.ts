// Parser for the user's tree export (docs/data/calisthenics-trees.md). A faithful copy: app decisions live in overlay.ts.
// Plain TypeScript (types only) so scripts/import-trees.mjs can run it with Node's type stripping.

export interface ParsedLink { label: string; url: string }
export interface ParsedNode {
  id: string
  parent: string | null
  rung: number
  name: string
  equipment: string
  primary: string[]
  secondary: string[]
  advance: string
  cues: string
  source: string
  links: ParsedLink[]
}
export interface ParsedTree { id: string; name: string; category: string; notes: string; video?: ParsedLink; nodes: ParsedNode[] }
export interface ParsedExport {
  equipment: Record<string, string>
  muscles: string[]
  sources: Record<string, { title: string; url?: string }>
  trees: ParsedTree[]
}

const PIPE = '\u0000'
/** Cells of a markdown table row; `\|` inside a cell is a plain `|`. */
const cells = (line: string) =>
  line.replaceAll('\\|', PIPE).trim().replace(/^\||\|$/g, '').split('|').map((c) => c.replaceAll(PIPE, '|').trim())
const code = (s: string) => s.replace(/^`|`$/g, '')
const list = (s: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [])
const links = (s: string): ParsedLink[] => [...s.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((m) => ({ label: m[1], url: m[2] }))

/** Table rows (as cell arrays) after line `start`, skipping the header and the --- line. */
function tableAfter(lines: string[], start: number): string[][] {
  const rows: string[][] = []
  let i = start
  while (i < lines.length && !lines[i].startsWith('|')) i++
  for (i += 2; i < lines.length && lines[i].startsWith('|'); i++) rows.push(cells(lines[i]))
  return rows
}

export function parseTrees(text: string): ParsedExport {
  const lines = text.split('\n')
  const at = (h: string) => lines.findIndex((l) => l.trim() === h)

  const equipment = Object.fromEntries(tableAfter(lines, at('## Equipment')).map(([c, label]) => [code(c), label]))
  const muscleLine = lines.slice(at('## Muscles') + 1).find((l) => l.trim()) ?? ''
  const muscles = [...muscleLine.matchAll(/`([^`]+)`/g)].map((m) => m[1])
  const sources = Object.fromEntries(
    tableAfter(lines, at('## Sources')).map(([k, title, url]) => [code(k), url.startsWith('http') ? { title, url } : { title }]),
  )

  const trees: ParsedTree[] = []
  let tree: ParsedTree | null = null
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('### ')) {
      tree = { id: '', name: l.slice(4).trim(), category: '', notes: '', nodes: [] }
      continue
    }
    if (!tree) continue
    const meta = l.match(/^- (tree id|category|notes|full progression video): (.*)$/)
    if (meta) {
      const [, key, value] = meta
      if (key === 'tree id') tree.id = code(value)
      else if (key === 'category') tree.category = code(value)
      else if (key === 'notes') tree.notes = value.trim()
      else tree.video = links(value)[0]
      continue
    }
    if (l.startsWith('| id |')) {
      for (const [id, parent, rung, name, equip, primary, secondary, advance, cues, source, howto] of tableAfter(lines, i)) {
        tree.nodes.push({
          id: code(id), parent: code(parent) || null, rung: Number(rung), name, equipment: code(equip),
          primary: list(primary), secondary: list(secondary), advance, cues, source: code(source), links: links(howto),
        })
      }
      trees.push(tree)
      tree = null
    }
  }
  return { equipment, muscles, sources, trees }
}
