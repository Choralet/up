import { render } from '@testing-library/react'
import { Icon, ICON_NAMES } from './Icon'

describe('Icon', () => {
  it.each(ICON_NAMES)('%s is a decorative svg with a drawing', (name) => {
    const { container } = render(<Icon name={name} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg.children.length).toBeGreaterThan(0)
  })
  it('takes a size and an extra class', () => {
    const { container } = render(<Icon name="check" size={14} className="tick" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '14')
    expect(svg).toHaveClass('icon', 'tick')
  })
})
