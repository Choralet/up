import css from './tokens.css?raw'

/** Every `--name: value` inside the first-level block that starts at `start`. */
function decls(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/** The text between the `{` after `index` and its matching `}`. */
function body(src: string, index: number): string {
  const open = src.indexOf('{', index)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  throw new Error('unbalanced braces')
}

function modes(): { light: Record<string, string>; dark: Record<string, string> } {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const media = src.indexOf('@media (prefers-color-scheme: dark)')
  const darkBlock = body(src, media)
  const outside = src.slice(0, media) + src.slice(src.indexOf(darkBlock) + darkBlock.length + 1)
  const light: Record<string, string> = {}
  for (const m of outside.matchAll(/:root\s*\{/g)) Object.assign(light, decls(body(outside, m.index!)))
  return { light, dark: { ...light, ...decls(darkBlock) } }
}

function resolve(vars: Record<string, string>, name: string, seen: string[] = []): string {
  const v = vars[name]
  if (v === undefined) throw new Error(`missing ${name}`)
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  if (!ref) return v
  if (seen.includes(name)) throw new Error(`cycle at ${name}`)
  return resolve(vars, ref[1], [...seen, name])
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
function lum(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
/** `amount` of `top` over `base`, like color-mix(in srgb, top amount, base). */
const mix = (top: string, base: string, amount: number) =>
  '#' + rgb(top).map((c, i) => Math.round(c * amount + rgb(base)[i] * (1 - amount)).toString(16).padStart(2, '0')).join('')

const ACCENTS = ['push', 'pull', 'legs', 'core', 'skill', 'danger', 'primary']

describe.each(['light', 'dark'] as const)('%s mode text contrast (at least 4.5:1)', (mode) => {
  const vars = modes()[mode]
  const c = (n: string) => resolve(vars, n)
  const pairs: [string, string, string][] = [
    ['ink on bg', c('--ink'), c('--bg')],
    ['ink2 on bg', c('--ink2'), c('--bg')],
    ['ink on fill', c('--ink'), c('--fill')],
    ['ink2 on fill', c('--ink2'), c('--fill')],
    ['on-color on gold', c('--on-color'), c('--gold')],
    ...ACCENTS.flatMap((k): [string, string, string][] => [
      [`${k}-text on bg`, c(`--${k}-text`), c('--bg')],
      [`${k}-text on fill`, c(`--${k}-text`), c('--fill')],
      [`${k}-text on a 14% ${k} tint`, c(`--${k}-text`), mix(c(`--${k}`), c('--bg'), 0.14)],
      [`on-color on ${k}`, c('--on-color'), c(`--${k}`)],
    ]),
  ]
  // the level-up card's glow: text over the strongest point of the branch-colour glow
  const glow = parseFloat(vars['--glow-mix']) / 100
  pairs.push(...ACCENTS.flatMap((k): [string, string, string][] => [
    [`${k}-text on the ${k} glow`, c(`--${k}-text`), mix(c(`--${k}`), c('--bg'), glow)],
    [`ink2 on the ${k} glow`, c('--ink2'), mix(c(`--${k}`), c('--bg'), glow)],
    [`ink on the ${k} glow`, c('--ink'), mix(c(`--${k}`), c('--bg'), glow)],
  ]))
  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})
