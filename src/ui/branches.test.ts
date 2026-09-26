import { BRANCH_META, SKILL_STRONG } from './branches'

/** WCAG contrast ratio of white text on a #rrggbb colour. */
function whiteContrast(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (l + 0.05)
}

describe('button colours', () => {
  it('white text on every branch button colour is readable (at least 4.5:1)', () => {
    for (const meta of Object.values(BRANCH_META)) expect(whiteContrast(meta.strong), meta.label).toBeGreaterThanOrEqual(4.5)
    expect(whiteContrast(SKILL_STRONG)).toBeGreaterThanOrEqual(4.5)
  })
})
