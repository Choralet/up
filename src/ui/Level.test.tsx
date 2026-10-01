import { render, screen } from '@testing-library/react'
import { LevelBadge, XpBar } from './Level'

describe('LevelBadge', () => {
  it('shows the level, hidden from screen readers (the bar carries the words)', () => {
    const { container } = render(<LevelBadge branch="push" level={7} />)
    const badge = container.querySelector('.lvbadge')!
    expect(badge).toHaveTextContent('7')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
    expect(badge).toHaveStyle({ '--accent': 'var(--push)' })
  })
})

describe('XpBar', () => {
  it('is an image with a label and the ratio as a CSS variable, clamped to 0..1', () => {
    render(<XpBar ratio={1.4} label="Push: 7 of 12 steps" />)
    const bar = screen.getByRole('img', { name: 'Push: 7 of 12 steps' })
    expect(bar.style.getPropertyValue('--r')).toBe('1')
    expect(bar.style.getPropertyValue('--from')).toBe('1')
    expect(bar).not.toHaveClass('grow')
  })
  it('grows from an earlier ratio when given one', () => {
    render(<XpBar ratio={0.5} from={0.25} label="x" />)
    const bar = screen.getByRole('img', { name: 'x' })
    expect(bar.style.getPropertyValue('--from')).toBe('0.25')
    expect(bar).toHaveClass('grow')
  })
})
