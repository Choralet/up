import { render, screen } from '@testing-library/react'
import App from './App'
import { NODES } from './data/nodes'
import { memoryStorage } from './store/storage'

describe('Today screen', () => {
  it('lists the focus exercise of each branch with its goal', async () => {
    render(<App storage={memoryStorage()} />)
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
    expect(screen.getByRole('button', { name: /Dead hang/ })).toHaveTextContent('3 × 30 s')
    expect(screen.getByRole('button', { name: /Assisted squat/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead bug/ })).toBeInTheDocument()
  })

  it('shows "Branch complete" when every push exercise is done', async () => {
    const allPush = NODES.filter((n) => n.branch === 'push').map((n) => n.id)
    render(<App storage={memoryStorage({ completed: allPush })} />)
    expect(await screen.findByText('Branch complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })
})
