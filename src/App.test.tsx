import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { NODES } from './data/nodes'
import { memoryStorage } from './store/storage'
import { memoryServices } from './store/services'
import { onboardingTuning } from './ui/Onboarding'
import { logTuning } from './ui/LogScreen'
import { fakeGithub } from './test/fakeGithub'
import { githubBackup } from './store/github'
import { exportBackup, progressHash } from './engine/backup'
import { sanitizeProgress } from './engine/progress'

/** A save that has finished onboarding, so tests start on the Today screen. */
const seed = (extra: Record<string, unknown> = {}) => memoryStorage({ onboarded: true, ...extra })

/** Pin the clock. Month is 0-based. 2026-09-21 is a Monday. */
const MONDAY = new Date(2026, 8, 21, 12)
const WEDNESDAY = new Date(2026, 8, 23, 12)
const FRIDAY = new Date(2026, 8, 25, 12)
const SATURDAY = new Date(2026, 8, 26, 12)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MONDAY)
  onboardingTuning.answerLockMs = 0
  logTuning.doubleTapMs = 0
})
afterEach(() => vi.useRealTimers())

describe('Today screen (default schedule: Mon Push, Wed Pull, Fri Legs + Core)', () => {
  it('Monday is Push Day with the push focus exercise', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 8')
    expect(screen.queryByRole('button', { name: /Dead hang/ })).not.toBeInTheDocument()
  })

  it('Wednesday is Pull Day', async () => {
    vi.setSystemTime(WEDNESDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toHaveTextContent('1 × 60 s')
  })

  it('Friday is Legs + Core Day with both exercises', async () => {
    vi.setSystemTime(FRIDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Legs + Core Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Assisted squat/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead bug/ })).toBeInTheDocument()
  })

  it('shows the day’s branch level and the streak in the header', async () => {
    render(<App storage={seed({ completed: ['hpush:w', 'hpush:i'] })} />)
    expect(await screen.findByRole('img', { name: 'Push: 2 of 53 steps' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No streak yet' })).toBeInTheDocument()
  })

  it('Legs + Core day shows both branch levels', async () => {
    vi.setSystemTime(FRIDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('img', { name: /^Legs: 0 of \d+ steps$/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Core: 0 of \d+ steps$/ })).toBeInTheDocument()
  })

  it('the level caption keeps each count whole, so it can wrap instead of being cut off', async () => {
    vi.setSystemTime(FRIDAY)
    const { container } = render(<App storage={seed()} />)
    await screen.findByRole('img', { name: /^Legs: 0 of \d+ steps$/ })
    const counts = [...container.querySelectorAll('.lvinfo .lvcount')].map((e) => e.textContent)
    expect(counts).toEqual([expect.stringMatching(/^0\/\d+$/), expect.stringMatching(/^0\/\d+$/)])
  })

  it('a rest day shows the streak but no branch level', async () => {
    vi.setSystemTime(SATURDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('img', { name: 'No streak yet' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /steps$/ })).not.toBeInTheDocument()
  })

  it('shows the warm-up for the day', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('checkbox', { name: 'Wrist circles' })).toBeInTheDocument()
  })

  it('ticks off a warm-up item', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    const box = await screen.findByRole('checkbox', { name: 'Wrist circles' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('Saturday is a Rest Day that points at the next training day and lets you train anyway', async () => {
    vi.setSystemTime(SATURDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
    expect(screen.getByText(/Next: Monday · Push Day/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Train Pull Anyway' }))
    expect(screen.getByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to Rest Day' }))
    expect(screen.getByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
  })

  it('a schedule with no training days is just a Rest Day', async () => {
    const rest = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']
    render(<App storage={seed({ schedule: rest })} />)
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
  })

  it('shows "Branch complete" when every push exercise is done', async () => {
    const allPush = NODES.filter((n) => n.branch === 'push').map((n) => n.id)
    render(<App storage={seed({ completed: allPush })} />)
    expect(await screen.findAllByText('Track complete')).toHaveLength(3) // push-ups, overhead, dips
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })

  it('shows an active skill first and opens its hold timer', async () => {
    const user = userEvent.setup()
    const done = ['antiext:db', 'antiext:pl', 'hs:w', 'hs:pk']
    render(<App storage={seed({ completed: done, skillFocus: { hs: 'hs:cw' } })} />)
    const skill = await screen.findByRole('button', { name: /Chest-to-wall handstand/ })
    expect(skill.querySelector('.tag')).toHaveTextContent('Handstand') // the ladder's name, in capitals by CSS
    expect(skill).toHaveTextContent('1 × 60 s')
    await user.click(skill)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('says the workout is done once every goal is met', async () => {
    const user = userEvent.setup()
    const done = (nodeId: string, value: number) => [1, 2, 3].map((at) => ({ nodeId, value, date: '2026-09-21', at: at + value }))
    const logs = [...done('vpush:pk', 12), { nodeId: 'dip:sh', value: 60, date: '2026-09-21', at: 99 }]
    const first = render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not Yet' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Workout complete')).not.toBeInTheDocument() // the core finisher (a hold) is still to do
    first.unmount()
    render(<App storage={seed({ logs: [...logs, ...done('hpush:w', 8), ...done('antiext:db', 30)] })} />)
    expect(await screen.findByText('Workout complete')).toBeInTheDocument()
  })
})

describe('Skill Tree screen', () => {
  it('reserves room under the tree while a node sheet is open, so a bottom node can scroll above it', async () => {
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    const scroller = container.querySelector('.tree-scroll')!
    expect(scroller).not.toHaveClass('has-sheet')
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    expect(scroller).toHaveClass('has-sheet')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(scroller).not.toHaveClass('has-sheet')
  })

  it('shows nodes with their state and lets you open one', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('button', { name: 'Wall push-up, training' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incline push-up, locked' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Incline push-up, locked' }))
    const dialog = screen.getByRole('dialog', { name: 'Incline push-up' })
    expect(dialog).toHaveTextContent('Requires Wall push-up')
    expect(dialog).not.toHaveTextContent('Make This My Focus')
  })

  it('lets you make an available exercise your focus', async () => {
    const user = userEvent.setup()
    const done = ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p']
    render(<App storage={seed({ completed: done })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Deficit push-up, ready' }))
    await user.click(screen.getByRole('button', { name: 'Make This My Focus' }))
    expect(screen.getByRole('button', { name: 'Deficit push-up, training' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Diamond / close push-up, ready' })).toBeInTheDocument()
  })

  it('switches branches', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Pull' }))
    expect(screen.getByRole('button', { name: 'Dead hang, training' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })
})

describe('Logging and level-up', () => {
  it('three sets at the goal offer a level-up, and confirming moves your focus', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log)
    await user.click(log)
    expect(screen.queryByText('You hit 3 × 8')).not.toBeInTheDocument()
    await user.click(log)
    expect(await screen.findByText('You hit 3 × 8')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Incline push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Level Up' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument() // Volume variations only on Full length
  })

  it('the level-up card names the branch level you reach', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'] })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    const dialog = await screen.findByRole('dialog', { name: 'Level up' })
    expect(dialog).toHaveTextContent('Push level 2')
    expect(within(dialog).getByRole('img', { name: 'Push: 2 of 53 steps' })).toBeInTheDocument()
  })

  it('"Not yet" keeps the same focus, and a 4th set does not re-open the sheet', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not Yet' }))
    expect(screen.queryByText('You hit 3 × 8')).not.toBeInTheDocument()
    await user.click(log)
    expect(screen.queryByText('You hit 3 × 8')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wall push-up' })).toBeInTheDocument()
  })

  it('offers a Level Up button to come back to the sheet after "Not yet"', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    expect(screen.queryByRole('button', { name: 'Level Up' })).not.toBeInTheDocument()
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not Yet' }))
    await user.click(screen.getByRole('button', { name: 'Level Up' }))
    expect(await screen.findByText('You hit 3 × 8')).toBeInTheDocument()
  })

  it('steps the rep count and never goes below 1', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const value = () => screen.getByTestId('rep-value') // re-rendered on each change so it can roll
    expect(value()).toHaveTextContent('8')
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    expect(value()).toHaveTextContent('9')
    for (let i = 0; i < 15; i++) await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    expect(value()).toHaveTextContent('1')
  })

  it('a set below the goal counts as logged but does not fill the goal bars', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    expect(screen.getByText('0 of 3 sets at goal')).toBeInTheDocument()
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('7')
  })

  it('remembers logged sets after the app is reopened', async () => {
    const user = userEvent.setup()
    const storage = seed()
    const first = render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText(/1 of 3 sets · best 8/)).toBeInTheDocument()
    first.unmount()
    render(<App storage={storage} />)
    expect(await screen.findByText(/1 of 3 sets · best 8/)).toBeInTheDocument()
  })

  it('uses a hold timer for hold goals', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log Set' })).not.toBeInTheDocument()
  })

  it('lets you correct or remove a mis-tapped set', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('8')
    await user.click(screen.getByRole('button', { name: /Edit set 1/ }))
    await user.click(screen.getByRole('button', { name: 'Decrease set value' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('7')
    expect(screen.getByText('0 of 3 sets at goal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Edit set 1/ }))
    await user.click(screen.getByRole('button', { name: 'Remove Set' }))
    expect(screen.queryByLabelText('Sets logged today')).not.toBeInTheDocument()
  })

  it('removing the set that reached the goal takes the Level Up button away', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('button', { name: 'Level Up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Edit set 3/ }))
    await user.click(screen.getByRole('button', { name: 'Remove Set' }))
    expect(screen.queryByRole('button', { name: 'Level Up' })).not.toBeInTheDocument()
    expect(screen.getByText('2 of 3 sets at goal')).toBeInTheDocument()
  })
})

describe('Skill Tree layout', () => {
  it('keeps the branch tabs outside the scrolling tree area', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    const tabs = screen.getByRole('tablist', { name: 'Branch' })
    const tree = screen.getByRole('group', { name: 'Push-ups tree' })
    expect(tabs.closest('.tree-scroll')).toBeNull()
    expect(tree.closest('.tree-scroll')).not.toBeNull()
  })
})

describe('Skill Tree pop-ups', () => {
  it('renders the node sheet outside the fixed tree container so the tab bar cannot cover it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    const dialog = screen.getByRole('dialog', { name: 'Wall push-up' })
    // a position:fixed ancestor traps the sheet's z-index below the tab bar
    expect(dialog.closest('.tree-screen')).toBeNull()
  })
})

describe('Skills tab', () => {
  const plankDone = ['antiext:db', 'antiext:pl']
  const pushUpDone = ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p']
  const openSkills = async (extra: Record<string, unknown>) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    return user
  }

  it('Now lists only skills you can start; locked ones live in the Roadmap', async () => {
    await openSkills({ completed: plankDone })
    expect(screen.getByRole('button', { name: 'Start Handstand' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Start Planche' })).not.toBeInTheDocument()
    expect(screen.getByText(/Locked skills are in the Roadmap/)).toBeInTheDocument()
  })

  it("starting a skill makes it active and puts it in that day's workout", async () => {
    const user = await openSkills({ completed: plankDone })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    expect(screen.getByRole('button', { name: 'Stop Handstand' })).toBeInTheDocument()
    expect(screen.getByText(/Wrist prep/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wrist prep/ })).toBeInTheDocument()
  })

  it('with both slots in use, Start becomes Replace', async () => {
    const user = await openSkills({ completed: [...plankDone, ...pushUpDone] })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Start Planche' }))
    expect(screen.getByText('Both skill slots are in use. Replace one to start another.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Replace for Handstand push-up' }))
    await user.click(screen.getByRole('button', { name: 'Replace Handstand' }))
    expect(screen.getByRole('button', { name: 'Stop Handstand push-up' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop Handstand' })).not.toBeInTheDocument()
  })
})

describe('Node sheet and level-up for skills and goals', () => {
  it('a skill step in the tree offers Train This Skill, which starts the chain', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['antiext:db', 'antiext:pl'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Wrist prep, 3–5 min, ready, skill' }))
    await user.click(screen.getByRole('button', { name: 'Train This Skill' }))
    expect(screen.getByRole('button', { name: 'Wrist prep, 3–5 min, training, skill' })).toBeInTheDocument()
  })

  it('lets you edit a goal, see it on Today, and reset it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Save Goal' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Reset to Default' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 8')
  })

  it('the level-up sheet points at skills a new exercise unlocks', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['hpush:w', 'hpush:i'] })} />)
    await user.click(await screen.findByRole('button', { name: /Knee push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' }) // the stepper starts at the goal, 8 reps
    await user.click(log); await user.click(log); await user.click(log)
    expect(await screen.findByText(/Unlocks in Roadmap: Frog stand\./)).toBeInTheDocument()
  })
})

describe('Find your level', () => {
  it('walks up each branch until the first "Not yet", then starts training there', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('heading', { name: 'What do you have?' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Wall' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Wall push-up' })).toBeInTheDocument()
    expect(screen.getByText('Can you do 3 sets of 8 clean reps?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    // Incline push-up needs a bench or a table: stepped over
    expect(screen.getByRole('heading', { name: 'Knee push-up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not Yet' })) // push-ups done
    expect(screen.getByRole('heading', { name: 'Pike push-up' })).toBeInTheDocument()
    expect(screen.getByText('Can you do 3 sets of 12 clean reps?')).toBeInTheDocument()
    // Dips and Pull-ups need equipment (dip bars, a bar): not asked
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument()
    expect(screen.getByText(/Push-ups: Knee push-up/)).toBeInTheDocument()
    expect(screen.getByText(/Dips: Needs equipment/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    expect(screen.queryByRole('heading', { name: 'Find your level' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Knee push-up/ })).toBeInTheDocument()
  })

  it('can be skipped, keeping the beginner exercises', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Skip for Now' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toBeInTheDocument()
  })

  it('completes skill steps only through their twins and ends with a valid focus when everything is a Yes', async () => {
    const user = userEvent.setup()
    const store = memoryStorage()
    render(<App storage={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let i = 0; i < 120 && screen.queryByRole('button', { name: 'Yes' }); i++) {
      await user.click(screen.getByRole('button', { name: 'Yes' }))
    }
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    const saved = (await store.load()) as { completed: string[]; skillFocus: object }
    const byId = new Map(NODES.map((n) => [n.id, n]))
    for (const id of saved.completed.filter((x) => byId.get(x)!.skill)) {
      expect(byId.get(id)!.twins?.some((t) => saved.completed.includes(t) && !byId.get(t)!.skill), id).toBe(true)
    }
    expect(saved.completed).toContain('hpush:w')
  })

  it('does not show for a returning user', async () => {
    render(<App storage={seed()} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    expect(screen.queryByRole('heading', { name: 'Find your level' })).not.toBeInTheDocument()
  })
})

describe('Settings', () => {
  const openSettings = async (storage = seed()) => {
    const user = userEvent.setup()
    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    return user
  }

  it('shows the schedule with the Monday / Wednesday / Friday default', async () => {
    await openSettings()
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveValue('push')
    expect(screen.getByRole('combobox', { name: 'Tuesday' })).toHaveValue('rest')
    expect(screen.getByRole('combobox', { name: 'Wednesday' })).toHaveValue('pull')
    expect(screen.getByRole('combobox', { name: 'Friday' })).toHaveValue('legs')
  })

  it('changing a day changes what Today shows', async () => {
    const user = await openSettings()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Monday' }), 'pull')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toBeInTheDocument()
  })

  it('every day can be set to rest', async () => {
    const user = await openSettings()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Monday' }), 'rest')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: 'Rest Day' })).toBeInTheDocument()
  })

  it('lets you redo Find your level', async () => {
    const user = await openSettings()
    await user.click(screen.getByRole('button', { name: 'Find Your Level Again' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Find your level again?' })).getByRole('button', { name: 'Start' }))
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
  })
})

describe('Progress tab', () => {
  const log = (date: string, nodeId: string, value: number, at: number) => ({ nodeId, value, date, at })

  it('shows a level per branch, the weekly streak and personal bests', async () => {
    const user = userEvent.setup()
    const logs = [
      log('2026-09-14', 'push-wall', 10, 1), log('2026-09-16', 'push-wall', 12, 2),
      log('2026-09-07', 'push-wall', 9, 0), log('2026-09-09', 'push-wall', 8, 0),
    ]
    render(<App storage={seed({ completed: ['push-wall', 'push-incline'], logs })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('2 week streak')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Push: 2 of 53 steps' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pull: 0 of 62 steps' })).toBeInTheDocument()
    expect(screen.getByText('Wall push-up')).toBeInTheDocument()
    expect(screen.getByText('12 reps')).toBeInTheDocument()
  })

  it('shows a friendly empty state with no history', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('No streak yet')).toBeInTheDocument()
    expect(screen.getByText('Log a set to see your bests here.')).toBeInTheDocument()
  })
})

describe('Plan 3 wording fixes', () => {
  it('Skills uses "step" for one step and explains a full slot list', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['antiext:db', 'antiext:pl'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    const oneStep = screen.getByRole('button', { name: "Start Butcher's block" }).closest('li')!
    expect(oneStep).toHaveTextContent(/1 step(?!s)/) // a one-step chain
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    await user.click(screen.getByRole('button', { name: "Start Butcher's block" }))
    expect(screen.getByText('Both skill slots are in use. Replace one to start another.')).toBeInTheDocument()
  })

  it('the streak card states the real rule for a one-day schedule', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ schedule: ['push', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText(/Train on 1 day in a week/)).toBeInTheDocument()
  })
})

describe('Backup file', () => {
  it('exports a backup file from Settings', async () => {
    const user = userEvent.setup()
    const services = memoryServices()
    render(<App storage={seed({ completed: ['push-wall'] })} services={services} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Export Backup File' }))
    expect(services.saved).toHaveLength(1)
    expect(services.saved[0].name).toBe('up-backup-2026-09-21.json')
    expect(JSON.parse(services.saved[0].text).progress.completed).toEqual(['hpush:w'])
  })

  it('imports a backup after confirmation and replaces progress', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed: ['push-wall'], onboarded: true } })
    await user.upload(screen.getByLabelText('Import backup file'), new File([text], 'b.json', { type: 'application/json' }))
    const dialog = await screen.findByRole('dialog', { name: 'Replace your progress?' })
    expect(dialog).toHaveTextContent('1 finished exercise')
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
  })

  it('shows an error for a file that is not a backup and changes nothing', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.upload(screen.getByLabelText('Import backup file'), new File(['hello'], 'x.json', { type: 'application/json' }))
    expect(await screen.findByText("This file isn't an Up backup.")).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Replace your progress?' })).not.toBeInTheDocument()
  })

  it('cancelling the import changes nothing', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed: ['push-wall'] } })
    await user.upload(screen.getByLabelText('Import backup file'), new File([text], 'b.json', { type: 'application/json' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toBeInTheDocument()
  })
})

describe('GitHub backup', () => {
  const connect = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.type(screen.getByLabelText('GitHub owner'), 'me')
    await user.type(screen.getByLabelText('Repository'), 'up-data')
    await user.type(screen.getByLabelText('Token'), 't0ken')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
  }

  it('connects, backs up now, and never puts the token in the backup', async () => {
    const user = userEvent.setup()
    const gh = fakeGithub()
    render(<App storage={seed({ completed: ['push-wall'] })} services={memoryServices({ fetch: gh.fetch })} />)
    await connect(user)
    expect(await screen.findByText(/Connected to me\/up-data/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Token')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back Up Now' }))
    expect(await screen.findByText(/Last backup:/)).toBeInTheDocument()
    expect(JSON.parse(gh.text()!).progress.completed).toEqual(['hpush:w'])
    expect(gh.text()).not.toContain('t0ken')
  })

  it('shows a clear message when the token is rejected', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices({ fetch: fakeGithub({ status: 401 }).fetch })} />)
    await connect(user)
    expect(await screen.findByText(/GitHub rejected the token/)).toBeInTheDocument()
    expect(screen.getByLabelText('Token')).toBeInTheDocument()
  })

  it('restores from GitHub after confirmation', async () => {
    const user = userEvent.setup()
    const gh = fakeGithub()
    const services = memoryServices({ fetch: gh.fetch })
    const { unmount } = render(<App storage={seed({ completed: ['push-wall'] })} services={services} />)
    await connect(user)
    await user.click(await screen.findByRole('button', { name: 'Back Up Now' }))
    await screen.findByText(/Last backup:/)
    unmount()
    render(<App storage={seed()} services={services} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Restore from GitHub' }))
    await user.click(await screen.findByRole('button', { name: 'Replace' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
  })

  it('backs up automatically when the app goes to the background, only after changes', async () => {
    const user = userEvent.setup()
    const gh = fakeGithub()
    const services = memoryServices({ fetch: gh.fetch })
    await services.github.save({ owner: 'me', repo: 'up-data', token: 't0ken' })
    render(<App storage={seed()} services={services} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    const hide = async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      await new Promise((r) => setTimeout(r, 0))
    }
    await hide()
    await vi.waitFor(() => expect(gh.text()).not.toBeNull())
    const puts = () => gh.calls.filter((c) => c.method === 'PUT').length
    expect(puts()).toBe(1)
    await hide()
    expect(puts()).toBe(1) // nothing changed, nothing sent
    await user.click(screen.getByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    await hide()
    await vi.waitFor(() => expect(puts()).toBe(2))
  })

  it('disconnect forgets the token', async () => {
    const user = userEvent.setup()
    const services = memoryServices({ fetch: fakeGithub().fetch })
    render(<App storage={seed()} services={services} />)
    await connect(user)
    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    expect(await services.github.load()).not.toBeNull() // asks first
    await user.click(within(screen.getByRole('dialog', { name: 'Disconnect GitHub backup?' })).getByRole('button', { name: 'Disconnect' }))
    expect(await services.github.load()).toBeNull()
    expect(screen.getByLabelText('Token')).toBeInTheDocument()
  })
})

describe('How-to demos', () => {
  it('shows a How-to button only for exercises that have a demo', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    expect(screen.queryByRole('button', { name: 'How-to' })).not.toBeInTheDocument()
  })

  it('opens the demo with its credit', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], focus: { push: 'push-incline' } })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    await user.click(screen.getByRole('button', { name: 'How-to' }))
    const dialog = screen.getByRole('dialog', { name: 'How to do Incline push-up' })
    expect(dialog.querySelector('img')!.getAttribute('src')).toContain('0493-B1EVP9F.gif')
    expect(dialog).toHaveTextContent('© Gym visual — gymvisual.com')
    await user.click(screen.getByRole('button', { name: 'Close demo' }))
    expect(screen.queryByRole('dialog', { name: 'How to do Incline push-up' })).not.toBeInTheDocument()
  })

  it('is also in the tree node sheet', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: /^Incline push-up/ }))
    expect(screen.getByRole('button', { name: 'How-to' })).toBeInTheDocument()
  })
})

describe('A new day while the app is open', () => {
  it('moves Today to the new day and forgets "Train anyway" and warm-up ticks', async () => {
    vi.setSystemTime(new Date(2026, 8, 27, 23, 50)) // Sunday night, rest day
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Train Pull Anyway' }))
    await user.click(screen.getByRole('checkbox', { name: 'Arm circles' }))
    vi.setSystemTime(new Date(2026, 8, 28, 7, 0)) // Monday morning
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Wrist circles' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('button', { name: /Back to/ })).not.toBeInTheDocument()
  })
})

describe('Done while a hold is running', () => {
  const startHang = async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 34_000)) // 3 s countdown + 31 s hold
    await user.click(screen.getByRole('button', { name: 'Done' }))
    return user
  }

  it('asks, and "Log It" saves the hold', async () => {
    const user = await startHang()
    expect(screen.getByRole('dialog', { name: 'A hold is running' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log It' }))
    expect(await screen.findByText(/1 of 1 sets · best 31 s/)).toBeInTheDocument()
  })

  it('"Discard" closes without saving', async () => {
    const user = await startHang()
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(await screen.findByRole('button', { name: /Dead hang/ })).not.toHaveTextContent('sets ·')
  })

  it('"Cancel" keeps you in the hold', async () => {
    const user = await startHang()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Stop and Log' })).toBeInTheDocument()
  })
})

describe('Plan 3 accessibility and taps', () => {
  it('a double tap on Yes answers only one question', async () => {
    onboardingTuning.answerLockMs = 350
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(MONDAY.getTime() + 1000)) // past the answer lock
    await user.click(screen.getByRole('button', { name: 'Next' }))
    vi.setSystemTime(new Date(MONDAY.getTime() + 2000))
    await user.dblClick(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByRole('heading', { name: 'Knee push-up' })).toBeInTheDocument()
  })

  it('tree nodes say "unlocked" and mark skills', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['hpush:w', 'hpush:i', 'hpush:k', 'hpush:p', 'antiext:db', 'antiext:pl'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('button', { name: 'Deficit push-up, ready' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Handstand' }))
    expect(screen.getByRole('button', { name: 'Wrist prep, 3–5 min, ready, skill' })).toBeInTheDocument()
  })

  it('the rep count is announced and the screens behind an overlay are inert', async () => {
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    expect(screen.getByTestId('rep-value').closest('[aria-live="polite"]')).not.toBeNull()
    expect(container.querySelector('nav')!.closest('[inert]')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(container.querySelector('nav')!.closest('[inert]')).toBeNull()
  })
})

describe('Plan 3 review fixes', () => {
  const cfg = { owner: 'me', repo: 'up-data', token: 't0ken' }
  const hide = async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await new Promise((r) => setTimeout(r, 0))
  }
  const puts = (gh: ReturnType<typeof fakeGithub>) => gh.calls.filter((c) => c.method === 'PUT').length
  const connect = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.type(screen.getByLabelText('GitHub owner'), 'me')
    await user.type(screen.getByLabelText('Repository'), 'up-data')
    await user.type(screen.getByLabelText('Token'), 't0ken')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
  }
  const withOldBackup = async () => {
    const gh = fakeGithub()
    const old = sanitizeProgress(NODES, { completed: ['push-wall'], onboarded: true })
    await githubBackup(cfg, exportBackup(old), gh.fetch)
    return gh
  }

  it('a new phone connecting to a repo with a backup does not overwrite it, even when leaving the app', async () => {
    const user = userEvent.setup()
    const gh = await withOldBackup()
    render(<App storage={seed()} services={memoryServices({ fetch: gh.fetch })} />)
    await connect(user)
    expect(await screen.findByText(/already has a backup/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back Up Now' })).not.toBeInTheDocument()
    await hide()
    expect(puts(gh)).toBe(1) // only the old backup made in the test setup
    await user.click(screen.getByRole('button', { name: 'Restore It' }))
    await user.click(await screen.findByRole('button', { name: 'Replace' }))
    expect(await screen.findByRole('button', { name: 'Back Up Now' })).toBeInTheDocument()
    await hide()
    expect(puts(gh)).toBe(1) // restored progress equals the backup: nothing to send
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
  })

  it('"Replace with This Phone" overwrites the old backup on purpose', async () => {
    const user = userEvent.setup()
    const gh = await withOldBackup()
    render(<App storage={seed()} services={memoryServices({ fetch: gh.fetch })} />)
    await connect(user)
    await user.click(await screen.findByRole('button', { name: 'Replace with This Phone' }))
    await vi.waitFor(() => expect(puts(gh)).toBe(2))
    expect(JSON.parse(gh.text()!).progress.completed).toEqual([])
  })

  it('a background backup finishing after Disconnect does not bring the token back', async () => {
    const gh = fakeGithub()
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const slow = (async (url: RequestInfo | URL, init?: RequestInit) => { await gate; return gh.fetch(url, init) }) as typeof fetch
    const services = memoryServices({ fetch: slow })
    await services.github.save(cfg)
    render(<App storage={seed()} services={services} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    await hide()
    await hide() // a second run while the first is still waiting
    await services.github.save(null) // Disconnect meanwhile
    release()
    await vi.waitFor(() => expect(puts(gh)).toBe(1))
    await new Promise((r) => setTimeout(r, 0))
    expect(await services.github.load()).toBeNull()
  })

  it('does not upload again after a relaunch when nothing changed', async () => {
    const gh = fakeGithub()
    const services = memoryServices({ fetch: gh.fetch })
    const progress = sanitizeProgress(NODES, { onboarded: true })
    await services.github.save({ ...cfg, lastHash: progressHash(progress) })
    render(<App storage={seed()} services={services} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    await hide()
    expect(puts(gh)).toBe(0)
  })

  it('Today warns when backup needs attention', async () => {
    const services = memoryServices()
    await services.github.save({ ...cfg, lastError: 'GitHub rejected the token. Check it, or make a new one.' })
    render(<App storage={seed()} services={services} />)
    expect(await screen.findByText('Backup needs attention')).toBeInTheDocument()
  })

  it('Today warns when the last backup is over a week old, and stays quiet when it is recent', async () => {
    const services = memoryServices()
    await services.github.save({ ...cfg, lastBackupAt: MONDAY.getTime() - 8 * 86_400_000 })
    const first = render(<App storage={seed()} services={services} />)
    expect(await screen.findByText('Backup needs attention')).toBeInTheDocument()
    first.unmount()
    await services.github.save({ ...cfg, lastBackupAt: MONDAY.getTime() - 86_400_000 })
    render(<App storage={seed()} services={services} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText('Backup needs attention')).not.toBeInTheDocument()
  })

  it('a new day keeps a running hold on the Log screen', async () => {
    vi.setSystemTime(new Date(2026, 8, 23, 23, 59)) // Wednesday, pull day
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(2026, 8, 24, 0, 1))
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByRole('button', { name: 'Stop and Log' })).toBeInTheDocument()
  })

  it('hides Level Up while a hold is running', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    const logs = [{ nodeId: 'vpull:dh', value: 60, date: '2026-09-23', at: 1 }]
    render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    expect(screen.getByRole('button', { name: 'Level Up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.queryByRole('button', { name: 'Level Up' })).not.toBeInTheDocument()
  })

  it('demo images are requested with CORS so failures are never cached', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], focus: { push: 'push-incline' } })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    await user.click(screen.getByRole('button', { name: 'How-to' }))
    expect(screen.getByRole('img', { name: /Incline push-up/ })).toHaveAttribute('crossorigin', 'anonymous')
  })

  it('rejects a huge import file without reading it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.upload(screen.getByLabelText('Import backup file'), new File(['x'.repeat(5_000_001)], 'big.json', { type: 'application/json' }))
    expect(await screen.findByText('That file is too big to be an Up backup.')).toBeInTheDocument()
  })
})

describe('Roadmap', () => {
  const openRoadmap = async (extra: Record<string, unknown> = {}) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    return user
  }

  it('lists Year 1 to 3 in the video order with the source note', async () => {
    await openRoadmap()
    expect(screen.getByRole('heading', { name: /Year 1/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Year 3/ })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Year 2/ }))
    await user.click(screen.getByRole('button', { name: /^Year 3/ }))
    const names = screen.getAllByRole('button', { name: /^\d+\. / }).map((b) => b.getAttribute('aria-label'))
    expect(names[0]).toMatch(/^1\. Hollow body hang/)
    expect(names[1]).toMatch(/^2\. Frog stand/)
    expect(names).toHaveLength(50)
    expect(screen.getByText(/Order from STRIQfit's videos/)).toBeInTheDocument()
  })

  it('opens a skill with needs, steps and a video link at its chapter', async () => {
    const user = await openRoadmap()
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand/ }))
    const dialog = screen.getByRole('dialog', { name: 'Frog stand' })
    expect(dialog).toHaveTextContent('Needs')
    expect(dialog).toHaveTextContent('Knee push-up')
    expect(dialog).toHaveTextContent('Crow pose')
    const link = within(dialog).getByRole('link', { name: /Watch in Video/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=J2JHDavNZB4&t=49s')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('Train This starts a ready skill and it shows in that day\'s workout', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'Train This' }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, training/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Crow pose/ })).toBeInTheDocument()
  })

  it('"I can already do this" marks it done after confirming', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'I Can Already Do This' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Mark Frog stand as done?' })).getByRole('button', { name: 'Mark Done' }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, done/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Year 1 · 1 of 22 done/ })).toBeInTheDocument()
  })

  it('a locked skill says what it needs and cannot be trained', async () => {
    const user = await openRoadmap()
    await user.click(screen.getByRole('button', { name: /^7\. Elbow lever, locked/ }))
    const dialog = screen.getByRole('dialog', { name: 'Elbow lever' })
    expect(dialog).toHaveTextContent('Crow pose')
    expect(within(dialog).queryByRole('button', { name: 'Train This' })).not.toBeInTheDocument()
  })

  it('explains when two skills are already active', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee', 'pull-hang'], skillFocus: { 'hollow-hang': 'rm-hollow-hang-1', 'butchers-block': 'rm-butcher' } })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    expect(screen.queryByRole('button', { name: 'Train This' })).not.toBeInTheDocument()
    expect(screen.getByText('Two skills are active. Replace one to train this:')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Replace Butcher's block" }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, training/ })).toBeInTheDocument()
  })

  it('Now offers ready Roadmap skills (not locked ones), and Roadmap skills stay out of the tree', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.getByRole('button', { name: "Start Butcher's block" })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Frog stand' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    expect(screen.queryByRole('button', { name: /Frog stand/ })).not.toBeInTheDocument()
  })
})

describe('Roadmap review fixes', () => {
  const openRoadmap = async (extra: Record<string, unknown> = {}) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    return user
  }
  const kneeDone = ['push-wall', 'push-incline', 'push-knee']

  it('"Mark done" says honestly that it cannot be undone', async () => {
    const user = await openRoadmap({ completed: kneeDone })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'I Can Already Do This' }))
    expect(screen.getByRole('dialog', { name: 'Mark Frog stand as done?' })).toHaveTextContent("can't be undone")
  })

  it('lets you edit the goal of a roadmap step', async () => {
    const user = await openRoadmap({ completed: kneeDone })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Decrease target' }))
    await user.click(screen.getByRole('button', { name: 'Save Goal' }))
    expect(screen.getByRole('dialog', { name: 'Frog stand' })).toHaveTextContent('3 × 19 s')
  })

  it('shows partial progress on a row', async () => {
    const user = await openRoadmap({ completed: ['pull-hang', 'rm-german-1', 'rm-german-2', 'rm-bl-tuck', 'rm-bl-adv'] })
    await user.click(screen.getByRole('button', { name: /^Year 2/ }))
    expect(screen.getByRole('button', { name: /^8\. Back lever, ready/ })).toHaveTextContent('1 of 3 steps')
  })

  it('remembers Roadmap when you come back to Skills', async () => {
    const user = await openRoadmap()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.getByRole('tab', { name: 'Roadmap' })).toHaveAttribute('aria-selected', 'true')
  })

  it('level-up names the Roadmap skill it unlocks, not step names', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall', 'push-incline'], focus: { push: 'push-knee' } })} />)
    await user.click(await screen.findByRole('button', { name: /Knee push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    const dialog = await screen.findByRole('dialog', { name: 'Level up' })
    expect(dialog).toHaveTextContent('Unlocks in Roadmap: Frog stand.')
    expect(dialog).not.toHaveTextContent('toes touching')
  })
})

describe('Plan 5 · Phase 1 slips', () => {
  it('warm-up ticks and Train Anyway survive a tab switch and a reload', async () => {
    vi.setSystemTime(SATURDAY)
    const user = userEvent.setup()
    const storage = seed()
    const first = render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: /Train Pull Anyway/i }))
    await user.click(screen.getByRole('checkbox', { name: /Arm circles/ }))
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Arm circles/ })).toHaveAttribute('aria-checked', 'true')
    first.unmount()
    render(<App storage={storage} />)
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
  })

  it('a quick double tap on Log Set logs one set', async () => {
    logTuning.doubleTapMs = 600
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.dblClick(screen.getByRole('button', { name: 'Log Set' }))
    expect(screen.getAllByRole('button', { name: /^Edit set/ })).toHaveLength(1)
  })

  it('Done → Log It during a hold still offers the level-up when it reaches the goal', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 64_000)) // 3 s countdown + 61 s hold (goal 1 × 60 s)
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0])
    await user.click(screen.getByRole('button', { name: 'Log It' }))
    expect(await screen.findByRole('dialog', { name: 'Level up' })).toBeInTheDocument()
  })

  it('Roadmap Needs lists real prerequisites, not the skill’s own earlier step', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall', 'push-incline', 'push-knee', 'rm-frog-1'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand/ }))
    const needs = screen.getByRole('list', { name: 'Needs' })
    expect(needs).toHaveTextContent('Knee push-up')
    expect(needs).not.toHaveTextContent('toes touching')
  })

  it('importing a backup counts every finished exercise in the file', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const completed = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike', 'pull-hang', 'pull-scap', 'legs-assisted', 'legs-squat', 'core-deadbug', 'core-plank', 'rm-frog-1']
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed, onboarded: true } })
    await user.upload(screen.getByLabelText('Import backup file'), new File([text], 'b.json', { type: 'application/json' }))
    expect(await screen.findByRole('dialog', { name: 'Replace your progress?' })).toHaveTextContent('15 finished exercises') // old ids move to the new trees; three finish a twin too (Crow pose's planche twin waits for planche leans)
  })
})

describe('Plan 5 · Phase 2 complete workout', () => {
  it('Today counts every logged set, with the best, and ticks the exercise when its sets are logged', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const dec = screen.getByRole('button', { name: 'Decrease reps' })
    for (let i = 0; i < 5; i++) await user.click(dec)
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0])
    const row = await screen.findByRole('button', { name: /Wall push-up/ })
    expect(row).toHaveTextContent('3 of 3 sets · best 3')
    expect(within(row).getByLabelText('Sets done')).toBeInTheDocument()
  })

  it('adds a core finisher on Push day and the finished variation for volume', async () => {
    render(<App storage={seed({ completed: ['push-wall', 'push-incline', 'push-knee'], settings: { holdSound: true, length: 'full' } })} />)
    expect(await screen.findByRole('heading', { name: 'Also Today' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Knee push-up/ })).toHaveTextContent('Volume')
    expect(screen.getByRole('button', { name: /Dead bug/ })).toHaveTextContent('Core finisher')
  })

  it('Finish Workout shows a summary with new bests and the next workout', async () => {
    const user = userEvent.setup()
    const logs = [{ nodeId: 'push-wall', value: 8, date: '2026-09-18', at: 1 }]
    render(<App storage={seed({ logs })} />)
    expect(screen.queryByRole('button', { name: 'Finish Workout' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0])
    await user.click(await screen.findByRole('button', { name: 'Finish Workout' }))
    const sheet = screen.getByRole('dialog', { name: 'Workout summary' })
    expect(sheet).toHaveTextContent('Wall push-up')
    expect(sheet).toHaveTextContent('1 set · best 9')
    expect(sheet).toHaveTextContent('New best')
    expect(sheet).toHaveTextContent('Next: Wednesday · Pull Day')
  })

  it('the rep stepper starts from last session’s first set', async () => {
    const user = userEvent.setup()
    const logs = [6, 5].map((value, i) => ({ nodeId: 'push-wall', value, date: '2026-09-18', at: i }))
    render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    expect(screen.getByTestId('rep-value')).toHaveTextContent('6')
    expect(screen.getByText(/last session 6/)).toBeInTheDocument()
  })
})

describe('Plan 5 · Phase 3 hold settings', () => {
  it('Settings has a Sound at Hold Goal switch, on by default, saved when turned off', async () => {
    const user = userEvent.setup()
    const storage = seed()
    render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const sw = screen.getByRole('switch', { name: 'Sound at Hold Goal' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await vi.waitFor(async () => expect(((await storage.load()) as { settings: { holdSound: boolean } }).settings.holdSound).toBe(false))
  })

  it('the running-hold prompt shows the live time', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 13_000))
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0])
    expect(screen.getByRole('dialog', { name: 'A hold is running' })).toHaveTextContent('0:10 so far')
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 20_000))
    await new Promise((r) => setTimeout(r, 600))
    expect(screen.getByRole('dialog', { name: 'A hold is running' })).toHaveTextContent('0:17 so far')
  })
})

describe('Plan 5 · Phase 4a Skills, words, names, Roadmap', () => {
  const openRoadmap = async (extra: Record<string, unknown> = {}) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    await user.click(screen.getByRole('tab', { name: 'Roadmap' }))
    return user
  }

  it('Skills opens on Now with its purpose line', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Train up to 2 skills alongside your workouts/)).toBeInTheDocument()
  })

  it('the tree sheet uses Ready / Training / Done', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByText(/Pick a ladder/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Wall push-up, done' }))
    expect(screen.getByRole('dialog', { name: 'Wall push-up' })).toHaveTextContent('Push-ups · Done')
  })

  it('one name per move: Hollow body hold everywhere; video chapter names shown as "In the video"', async () => {
    const user = await openRoadmap()
    expect(screen.getByRole('button', { name: /^3\. Hollow body hold/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Year 3/ }))
    await user.click(screen.getByRole('button', { name: /^1\. 90-degree hold/ }))
    expect(screen.getByRole('dialog', { name: '90-degree hold' })).toHaveTextContent('In the video: The 90 hold')
  })

  it('Roadmap shows a Ready Now section and only the current year open', async () => {
    await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    const ready = screen.getByRole('list', { name: 'Ready now' })
    expect(within(ready).getByRole('button', { name: /Frog stand/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Year 1/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^Year 2/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('a Roadmap skill without a GIF offers its video chapter as the How-to', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall', 'push-incline', 'push-knee'], skillFocus: { 'frog-stand': 'rm-frog-1' } })} />)
    await user.click(await screen.findByRole('button', { name: /Crow pose/ }))
    expect(screen.getByRole('link', { name: 'Watch in Video' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=J2JHDavNZB4&t=49s')
  })
})

describe('Plan 5 · Phase 4b Progress', () => {
  it('shows this week, recent sessions and gains vs last week', async () => {
    vi.setSystemTime(new Date(2026, 8, 24, 12)) // Thursday
    const user = userEvent.setup()
    const logs = [
      { nodeId: 'push-wall', value: 8, date: '2026-09-15', at: 1 },
      { nodeId: 'push-wall', value: 10, date: '2026-09-21', at: 2 },
      { nodeId: 'pull-hang', value: 20, date: '2026-09-23', at: 3 },
    ]
    render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('2 of 3 days this week')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'This week' }).querySelectorAll('li')).toHaveLength(7)
    const sessions = screen.getByRole('list', { name: 'Recent sessions' })
    expect(within(sessions).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(/\+2 vs last week/)).toBeInTheDocument()
  })
})

describe('Plan 5 · Phase 4c Find your level', () => {
  it('Back undoes the last answer', async () => {
    const user = userEvent.setup()
    const store = memoryStorage()
    render(<App storage={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByRole('heading', { name: 'Knee push-up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Wall push-up' })).toBeInTheDocument()
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    expect(((await store.load()) as { completed: string[] }).completed).toEqual([])
  })

  it('Close leaves a re-run without changing anything', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Find Your Level Again' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Find your level again?' })).getByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Yes' })) // Knee push-up (no bench: Incline is stepped over)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Knee push-up/ })).not.toBeInTheDocument()
  })

  it('the last step picks training days and assigns Push, Pull, Legs + Core in order', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Tuesday' })).toHaveAttribute('aria-checked', 'false')
    await user.click(screen.getByRole('checkbox', { name: 'Tuesday' }))
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveValue('push')
    expect(screen.getByRole('combobox', { name: 'Tuesday' })).toHaveValue('push')
    expect(screen.getByRole('combobox', { name: 'Wednesday' })).toHaveValue('pull')
    expect(screen.getByRole('combobox', { name: 'Friday' })).toHaveValue('legs')
  })
})

describe('Plan 5 · Phase 5 icons and polish', () => {
  it('every tab has an icon', async () => {
    const { container } = render(<App storage={seed()} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    const tabs = container.querySelectorAll('nav.tabbar button')
    expect(tabs).toHaveLength(4)
    tabs.forEach((b) => expect(b.querySelector('svg')).not.toBeNull())
  })

  it('the log screen has a bottom Back to Workout button', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Back to Workout' }))
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
  })

  it('warm-up items say how much to do', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('checkbox', { name: 'Arm circles' })).toHaveTextContent('10 each way')
  })

  it('Settings: token help in the app, placeholders, and the last export date', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(screen.getByText('How to Make a Token')).toBeInTheDocument()
    expect(screen.getByLabelText('Repository')).toHaveAttribute('placeholder', 'up-data')
    expect(screen.queryByText(/Last exported/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Export Backup File' }))
    expect(await screen.findByText(/Last exported:/)).toBeInTheDocument()
  })
})

describe('Plan 5 review fixes', () => {
  it('levelling up does not make today look unfinished', async () => {
    const user = userEvent.setup()
    const done = (nodeId: string, value: number) => [1, 2, 3].map((at) => ({ nodeId, value, date: '2026-09-21', at: at + value }))
    const logs = [...done('antiext:pl', 60), ...done('vpush:pk', 12), { nodeId: 'dip:sh', value: 60, date: '2026-09-21', at: 99 }]
    render(<App storage={seed({ completed: ['antiext:db'], logs })} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Level Up' }))
    expect(await screen.findByText('Workout complete')).toBeInTheDocument()
  })

  it('Find Your Level Again keeps a custom schedule', async () => {
    const user = userEvent.setup()
    const custom = ['legs', 'rest', 'push', 'rest', 'pull', 'rest', 'rest']
    render(<App storage={seed({ schedule: custom })} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Find Your Level Again' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Find your level again?' })).getByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveValue('legs')
    expect(screen.getByRole('combobox', { name: 'Friday' })).toHaveValue('pull')
  })

  it('the day picker shows which workout each day gets', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('checkbox', { name: 'Friday' })).toHaveTextContent('Legs + Core')
  })

  it('"Last exported" only changes when a file was saved', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} services={memoryServices({ saveFile: async () => false })} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Export Backup File' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/Last exported/)).not.toBeInTheDocument()
  })

  it('a hold under a second says it was too short; Done during the countdown just cancels', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Dead hang/ }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 3500))
    await new Promise((r) => setTimeout(r, 50)) // let an animation frame redraw the cover
    await user.click(screen.getByRole('button', { name: 'Stop and Log' }))
    expect(screen.getByText('Too short to log')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0])
    expect(screen.queryByRole('dialog', { name: 'A hold is running' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
  })

  it('the tree skill sheet offers Replace when both slots are in use', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['antiext:db', 'antiext:pl'], skillFocus: { 'butchers-block': 'rm-butcher', 'straddle-sit': 'rm-straddle-sit' } })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Wrist prep, 3–5 min, ready, skill' }))
    await user.click(screen.getByRole('button', { name: "Replace Butcher's block" }))
    expect(screen.getByRole('button', { name: 'Wrist prep, 3–5 min, training, skill' })).toBeInTheDocument()
  })

  it('training on a rest day never shows more days than planned; hold gains show seconds', async () => {
    vi.setSystemTime(new Date(2026, 8, 24, 12))
    const user = userEvent.setup()
    const logs = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'].map((date, at) => ({ nodeId: 'pull-hang', value: 20 + at, date, at }))
      .concat([{ nodeId: 'pull-hang', value: 10, date: '2026-09-15', at: 9 }])
    render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('4 days this week · 3 planned')).toBeInTheDocument()
    expect(screen.getByText(/\+13 s vs last week/)).toBeInTheDocument()
  })

  it('importing a backup keeps this phone’s settings', async () => {
    const user = userEvent.setup()
    const storage = seed({ settings: { holdSound: false } })
    render(<App storage={storage} services={memoryServices()} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed: ['push-wall'], settings: { holdSound: true } } })
    await user.upload(screen.getByLabelText('Import backup file'), new File([text], 'b.json', { type: 'application/json' }))
    await user.click(await screen.findByRole('button', { name: 'Replace' }))
    expect(screen.getByRole('switch', { name: 'Sound at Hold Goal' })).toHaveAttribute('aria-checked', 'false')
  })
})

describe('Plan 6 · movement tracks and workout length', () => {
  it('Standard push day trains push-ups, pike and dips, then a core finisher', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('Push-ups')
    expect(screen.getByRole('button', { name: /Pike push-up/ })).toHaveTextContent('Overhead')
    expect(screen.getByRole('button', { name: /Support hold/ })).toHaveTextContent('Dips')
    expect(screen.getByRole('button', { name: /Dead bug/ })).toHaveTextContent('Core finisher')
  })

  it('Workout Length in Settings: Short keeps two, Full adds Volume', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall', 'push-incline', 'push-knee'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('radio', { name: 'Short' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Support hold/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dead bug/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('radio', { name: 'Full' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: /Knee push-up/ })).toHaveTextContent('Volume')
  })

  it('a finished track says so', async () => {
    render(<App storage={seed({ completed: NODES.filter((n) => n.tree === 'dip').map((n) => n.id) })} />)
    expect(await screen.findByText('Track complete')).toBeInTheDocument()
  })

  it('Find your level asks about every track', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('checkbox', { name: 'Pull-up bar' }))
    await user.click(screen.getByRole('checkbox', { name: 'Dip bars' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Push-ups · 1 of 10/)).toBeInTheDocument()
    for (let i = 0; i < 10; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument()
    expect(screen.getByText(/Rows: Vertical row/)).toBeInTheDocument()
    expect(screen.getByText(/Side plank: Side plank/)).toBeInTheDocument()
  })
})

describe('Plan 7 · smarter goals', () => {
  it('after a level-up the new exercise starts easier and says when the goal goes up', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], goalStage: { 'push-incline': 0 } })} />)
    const row = await screen.findByRole('button', { name: /Incline push-up/ })
    expect(row).toHaveTextContent('3 × 5')
    await user.click(row)
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log) // stepper starts at 5
    expect(screen.queryByRole('dialog', { name: 'Level up' })).not.toBeInTheDocument()
    expect(screen.getByText('Goal up: 3 × 6 next time')).toBeInTheDocument()
  })

  it('hitting the full goal still offers the level-up, even at an early stage', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], goalStage: { 'push-incline': 0 } })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log) // 3 × 9, over the full 3 × 8
    expect(await screen.findByRole('dialog', { name: 'Level up' })).toBeInTheDocument()
  })
})

describe('Plan 7 · exercise history', () => {
  it('shows a chart and a session list for an exercise', async () => {
    const user = userEvent.setup()
    const logs = [5, 6, 8].map((value, i) => ({ nodeId: 'push-wall', value, date: `2026-09-1${i + 1}`, at: i }))
    render(<App storage={seed({ logs })} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'History' }))
    const sheet = screen.getByRole('dialog', { name: 'History: Wall push-up' })
    expect(within(sheet).getByRole('img', { name: /Best reps per session/ })).toBeInTheDocument()
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(3)
    expect(sheet).toHaveTextContent('Best: 8 reps')
  })

  it('has a friendly empty state', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText('No sets logged yet. Your history starts with the first set.')).toBeInTheDocument()
  })

  it('is also on the tree sheet', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
  })
})

describe('Plan 7 · achievements', () => {
  it('Today shows a newly earned achievement once', async () => {
    const user = userEvent.setup()
    const storage = seed({ seenAchievements: [], logs: [{ nodeId: 'push-wall', value: 5, date: '2026-09-18', at: 1 }] })
    const first = render(<App storage={storage} />)
    const card = await screen.findByRole('status', { name: 'New achievement' })
    expect(card).toHaveTextContent('First Workout')
    await user.click(within(card).getByRole('button', { name: 'Nice' }))
    expect(screen.queryByRole('status', { name: 'New achievement' })).not.toBeInTheDocument()
    first.unmount()
    render(<App storage={storage} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    expect(screen.queryByRole('status', { name: 'New achievement' })).not.toBeInTheDocument()
  })

  it('an older save does not get a pile of cards for what it already earned', async () => {
    render(<App storage={seed({ logs: [{ nodeId: 'push-wall', value: 5, date: '2026-09-18', at: 1 }] })} />)
    await screen.findByRole('heading', { name: 'Push Day' })
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('status', { name: 'New achievement' })).not.toBeInTheDocument()
  })

  it('Progress lists achievements with a count', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ logs: [{ nodeId: 'push-wall', value: 5, date: '2026-09-18', at: 1 }] })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByRole('heading', { name: /Achievements · 1 of \d+/ })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /First Workout, earned/ })).toBeInTheDocument()
  })
})

describe('Plan 7 · calendar reminders', () => {
  it('Settings saves a calendar file with the training days', async () => {
    const user = userEvent.setup()
    const services = memoryServices()
    render(<App storage={seed()} services={services} />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Add Reminders to Calendar' }))
    expect(services.saved.at(-1)!.name).toBe('up-training.ics')
    expect(services.saved.at(-1)!.text).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
  })
})

describe('Plan 7 · unlock moment, zoom, track chips', () => {
  it('a level-up lights up the newly unlocked node in the tree', async () => {
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Level Up' }))
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    const node = screen.getByRole('button', { name: 'Incline push-up, training' })
    expect(node).toHaveClass('just-unlocked')
    expect(container.querySelectorAll('.e.draw').length).toBeGreaterThan(0)
  })

  it('zoom buttons change the tree size', async () => {
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    const width = () => (container.querySelector('svg.tsvg') as SVGElement).style.width.replace(/\s/g, '')
    expect(width()).toMatch(/\*1\)$/)
    await user.click(screen.getByRole('button', { name: 'Zoom In' }))
    expect(width()).toMatch(/\*1\.25\)$/)
    await user.click(screen.getByRole('button', { name: 'Reset Zoom' }))
    expect(width()).toMatch(/\*1\)$/)
  })

  it('ladder chips switch the tree; the Now line opens its current exercise', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('tab', { name: 'Push-ups' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Push', 'Pull', 'Legs', 'Core',
      'Push-ups', 'Overhead', 'Dips', 'Handstand', 'Handstand push-up', 'Planche', 'Elbow lever', 'Triceps', 'Shoulder blades', 'Rotator cuff',
    ])
    await user.click(screen.getByRole('tab', { name: 'Dips' }))
    expect(screen.getByRole('group', { name: 'Dips tree' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Now: Support hold' }))
    expect(screen.getByRole('dialog', { name: 'Support hold' })).toHaveTextContent('Dips · Training')
  })
})

describe('Plan 7 · motion', () => {
  it('the rep number re-renders on change so it can roll', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const before = screen.getByTestId('rep-value')
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    const after = screen.getByTestId('rep-value')
    expect(after).not.toBe(before)
    expect(after).toHaveClass('roll-up')
  })
})

describe('Plan 7 · final review fixes', () => {
  it('Edit Goal starts from the full goal, and saving it unchanged keeps the ramp', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], goalStage: { 'push-incline': 0 } })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Incline push-up, training' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    expect(screen.queryByRole('button', { name: 'Reset to Default' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Goal' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toHaveTextContent('3 × 5')
  })

  it('a goal-up waits for the next session, happens once a day, and is undone with the set', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], goalStage: { 'push-incline': 0 } })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log) // 3 × 5
    expect(screen.getByText('Goal up: 3 × 6 next time')).toBeInTheDocument()
    expect(screen.getByText('Goal 3 × 5')).toBeInTheDocument()
    expect(screen.getByText('3 of 3 sets at goal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Edit set 3/ }))
    await user.click(screen.getByRole('button', { name: 'Remove Set' }))
    expect(screen.queryByText(/Goal up/)).not.toBeInTheDocument()
  })

  it('the raised goal applies from the next day', async () => {
    const raised = (on: string) => seed({ completed: ['push-wall'], goalStage: { 'push-incline': 1 }, stageRaisedOn: { 'push-incline': on } })
    const first = render(<App storage={raised('2026-09-21')} />)
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toHaveTextContent('3 × 5')
    first.unmount()
    render(<App storage={raised('2026-09-18')} />)
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toHaveTextContent('3 × 6')
  })

  it('the level-up sheet names the full goal you hit', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall'], goalStage: { 'push-incline': 0 } })} />)
    await user.click(await screen.findByRole('button', { name: /Incline push-up/ }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    expect(await screen.findByRole('dialog', { name: 'Level up' })).toHaveTextContent('You hit 3 × 8')
  })

  it('the Tree opens on the branch of the exercise you just unlocked', async () => {
    vi.setSystemTime(WEDNESDAY)
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Vertical row/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Level Up' }))
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('tab', { name: 'Pull' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Rows' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('.just-unlocked')).not.toBeNull()
  })

  it('the rep number keeps one live region for VoiceOver', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const live = screen.getByTestId('rep-value').closest('[aria-live]')
    expect(live).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    expect(screen.getByTestId('rep-value').closest('[aria-live]')).toBe(live)
  })

  it('placements from Find your level do not bring a run of achievement cards', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage({ onboarded: false, seenAchievements: [], completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Skip for Now' }))
    await screen.findByRole('heading', { name: 'Push Day' })
    expect(screen.queryByRole('status', { name: 'New achievement' })).not.toBeInTheDocument()
  })
})

describe('Plan 8 · new trees, equipment, details', () => {
  it('My Equipment in Settings changes what Today offers, and progress stays', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['hpush:w'] })} />)
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText(/Not set yet: Up offers every exercise/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Pull-up bar' }))
    await user.click(screen.getByRole('checkbox', { name: 'Bands' }))
    expect(screen.getByRole('checkbox', { name: 'Pull-up bar' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    // no bench or table: Incline push-up is stepped over; with only a bar, Dips starts at the straight-bar dip
    expect(await screen.findByRole('button', { name: /Knee push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Incline push-up/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Straight-bar dip/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Push: 1 of 53 steps' })).toBeInTheDocument()
  })

  it('a ladder with nothing you can do is left out of the day', async () => {
    vi.setSystemTime(WEDNESDAY)
    render(<App storage={seed({ settings: { holdSound: true, length: 'standard', equipment: ['wall'] } })} />)
    expect(await screen.findByRole('button', { name: /Vertical row/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dead hang/ })).not.toBeInTheDocument() // needs a bar or rings
  })

  it('the tree greys out exercises you lack equipment for and says what they need', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ settings: { holdSound: true, length: 'standard', equipment: ['bar', 'band'] } })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Incline push-up, needs equipment' }))
    const sheet = screen.getByRole('dialog', { name: 'Incline push-up' })
    expect(sheet).toHaveTextContent('Push-ups · Needs equipment')
    expect(sheet).toHaveTextContent('Needs Bench / box.')
    expect(within(sheet).queryByRole('button', { name: 'Make This My Focus' })).not.toBeInTheDocument()
  })

  it('the exercise sheet shows the move-on rule, equipment, muscles, source and how-to links', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, training' }))
    const sheet = screen.getByRole('dialog', { name: 'Wall push-up' })
    expect(sheet).toHaveTextContent('3×8 clean (RR rule), then incline')
    expect(sheet).toHaveTextContent('Wall')
    expect(sheet).toHaveTextContent('Chest, Front delts, Triceps · also Serratus, Abs')
    expect(within(sheet).getByRole('link', { name: 'r/bodyweightfitness Recommended Routine' })).toHaveAttribute('href', 'https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine')
    expect(within(sheet).getByRole('link', { name: 'Fitloop' })).toHaveAttribute('href', 'https://www.fitloop.app/exercises/wall-pushup')
    expect(within(sheet).getByRole('link', { name: /whole ladder/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=zkU6Ok44_CI')
    expect(within(sheet).getByRole('link', { name: 'Search YouTube' })).toHaveAttribute('target', '_blank')
  })

  it('a skill ladder\'s first rung shows the source notes and its gate', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Planche' }))
    expect(screen.getByText('Start this skill from its first exercise or the Skills tab')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Planche lean, locked, skill' }))
    const sheet = screen.getByRole('dialog', { name: 'Planche lean' })
    expect(sheet).toHaveTextContent('Requires Push-up')
    expect(sheet).toHaveTextContent('Before you start')
    expect(sheet).toHaveTextContent('Straight-arm push skill.')
  })

  it('Full length adds this week\'s accessory', async () => {
    render(<App storage={seed({ settings: { holdSound: true, length: 'full' } })} />)
    const acc = await screen.findByRole('button', { name: /Band pushdown|Scapular push-up|Side-lying external rotation/ })
    expect(acc).toHaveTextContent(/Accessory · (Triceps|Shoulder blades|Rotator cuff)/)
  })

  it('a goal per side says so', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Archer push-up, locked' }))
    expect(screen.getByRole('dialog', { name: 'Archer push-up' })).toHaveTextContent('Goal 3 × 8 / side')
  })
})

describe('Plan 8 review fixes (testers)', () => {
  const kit = (equipment: string[]) => ({ settings: { holdSound: true, length: 'standard', equipment } })
  it('Skills names the first step you can actually do (Box pistol needs a box)', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['squat:as', 'squat:s'], ...kit(['band', 'bar', 'wall']) })} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.getByRole('button', { name: 'Start Pistol squat' }).closest('li')).toHaveTextContent('first: Assisted pistol (holding support)')
  })

  it('the streak card does not promise that rest weeks are fine', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.queryByText(/Rest weeks are fine/)).not.toBeInTheDocument()
    expect(screen.getByText(/A week with fewer days starts it again/)).toBeInTheDocument()
  })

  it('Find your level walks the main line (Arch hang, Negative pull-up, Pull-up), never a side branch', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('checkbox', { name: 'Pull-up bar' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Not Yet' })) // Push-ups
    await user.click(screen.getByRole('button', { name: 'Not Yet' })) // Overhead
    await user.click(screen.getByRole('button', { name: 'Not Yet' })) // Dips (a bar: the straight-bar dip)
    expect(screen.getByRole('heading', { name: 'Dead hang' })).toBeInTheDocument()
    expect(screen.getByText('Can you hold it for 60 s?')).toBeInTheDocument()
    for (const next of ['Scapular pull', 'Arch hang', 'Negative pull-up', 'Pull-up']) {
      await user.click(screen.getByRole('button', { name: 'Yes' }))
      expect(screen.getByRole('heading', { name: next })).toBeInTheDocument()
    }
  })

  it('Find your level says per side / per leg', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: 'Not Yet' }))
    expect(screen.getByRole('heading', { name: 'Side plank' })).toBeInTheDocument()
    expect(screen.getByText('Can you hold it for 60 s per side?')).toBeInTheDocument()
  })

  it('a skill on Today is tagged with its ladder, not a second "Skill"', async () => {
    render(<App storage={seed({ completed: ['antiext:db', 'antiext:pl'], skillFocus: { hs: 'hs:w' } })} />)
    const skill = await screen.findByRole('button', { name: /Wrist prep/ })
    expect(skill.querySelector('.tag')).toHaveTextContent('Handstand')
  })
})
