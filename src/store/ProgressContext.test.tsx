import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NODES } from '../data/nodes'
import { ProgressProvider, useProgress } from './ProgressContext'
import { memoryStorage } from './storage'

function Probe() {
  const { progress, log } = useProgress()
  return (
    <button onClick={() => log('hpush:w', 10)}>
      {`focus:${progress.focus.hpush} logs:${progress.logs.length}`}
    </button>
  )
}

describe('ProgressProvider', () => {
  it('starts from initial progress and persists a logged set', async () => {
    const storage = memoryStorage()
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    const button = await screen.findByRole('button')
    expect(button).toHaveTextContent('focus:hpush:w logs:0')
    await userEvent.click(button)
    await waitFor(async () => {
      const saved = (await storage.load()) as { logs: unknown[] }
      expect(saved.logs).toHaveLength(1)
    })
    expect(button).toHaveTextContent('logs:1')
  })

  it('survives corrupted stored data', async () => {
    const storage = memoryStorage({ completed: 'nope', focus: { push: 'ghost' }, logs: 7 })
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:hpush:w logs:0')
  })

  it('falls back to initial progress when storage throws', async () => {
    const storage = { load: () => Promise.reject(new Error('boom')), save: async () => {} }
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('focus:hpush:w logs:0')
  })

  it('warns when progress cannot be saved', async () => {
    const storage = { load: async () => undefined, save: () => Promise.reject(new Error('disk full')) }
    render(<ProgressProvider storage={storage} nodes={NODES}><Probe /></ProgressProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save")
  })
})

function Actions() {
  const { nodes, defaults, progress, setGoal, setDayType, activateSkill, deactivateSkill, finishOnboarding, restartOnboarding } = useProgress()
  const wall = nodes.find((n) => n.id === 'hpush:w')!
  return (
    <div>
      <div data-testid="goal">{`${wall.goal.sets}x${wall.goal.target} default:${defaults.get('hpush:w')!.goal.target}`}</div>
      <div data-testid="monday">{progress.schedule[0]}</div>
      <div data-testid="skills">{Object.keys(progress.skillFocus).join(',')}</div>
      <div data-testid="onboarded">{String(progress.onboarded)}</div>
      <button onClick={() => setGoal('hpush:w', { sets: 4, target: 12 })}>goal</button>
      <button onClick={() => setGoal('hpush:w', null)}>reset</button>
      <button onClick={() => setDayType(0, 'pull')}>monday-pull</button>
      <button onClick={() => activateSkill('hs')}>start</button>
      <button onClick={() => deactivateSkill('hs')}>stop</button>
      <button onClick={finishOnboarding}>finish</button>
      <button onClick={restartOnboarding}>restart</button>
    </div>
  )
}

describe('ProgressProvider actions (Plan 2)', () => {
  const mount = (raw?: unknown) =>
    render(<ProgressProvider storage={memoryStorage(raw)} nodes={NODES}><Actions /></ProgressProvider>)

  it('applies goal overrides to nodes and keeps the defaults', async () => {
    const user = userEvent.setup()
    mount({ settings: { holdSound: true, plan: 'full' } }) // no ramp stage (a fresh user would start at 60%)
    expect(await screen.findByTestId('goal')).toHaveTextContent('3x8 default:8')
    await user.click(screen.getByText('goal'))
    expect(screen.getByTestId('goal')).toHaveTextContent('4x12 default:8')
    await user.click(screen.getByText('reset'))
    expect(screen.getByTestId('goal')).toHaveTextContent('3x8 default:8')
  })

  it('changes the schedule', async () => {
    const user = userEvent.setup()
    mount({ settings: { holdSound: true, plan: 'ppl' }, schedule: ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'] })
    expect(await screen.findByTestId('monday')).toHaveTextContent('push')
    await user.click(screen.getByText('monday-pull'))
    expect(screen.getByTestId('monday')).toHaveTextContent('pull')
  })

  it('activates and deactivates a skill once its requirement is done', async () => {
    const user = userEvent.setup()
    mount({ completed: ['antiext:db', 'antiext:pl'] })
    await screen.findByTestId('skills')
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
    await user.click(screen.getByText('start'))
    expect(screen.getByTestId('skills')).toHaveTextContent('hs')
    await user.click(screen.getByText('stop'))
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
  })

  it('refuses to start a skill whose requirement is not done', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('skills')
    await user.click(screen.getByText('start'))
    expect(screen.getByTestId('skills')).toBeEmptyDOMElement()
  })

  it('finishes and restarts onboarding', async () => {
    const user = userEvent.setup()
    mount()
    expect(await screen.findByTestId('onboarded')).toHaveTextContent('false')
    await user.click(screen.getByText('finish'))
    expect(screen.getByTestId('onboarded')).toHaveTextContent('true')
    await user.click(screen.getByText('restart'))
    expect(screen.getByTestId('onboarded')).toHaveTextContent('false')
  })
})
