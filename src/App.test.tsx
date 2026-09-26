import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { NODES } from './data/nodes'
import { memoryStorage } from './store/storage'

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
})
afterEach(() => vi.useRealTimers())

describe('Today screen (default schedule: Mon Push, Wed Pull, Fri Legs + Core)', () => {
  it('Monday is Push Day with the push focus exercise', async () => {
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
    expect(screen.queryByRole('button', { name: /Dead hang/ })).not.toBeInTheDocument()
  })

  it('Wednesday is Pull Day', async () => {
    vi.setSystemTime(WEDNESDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toHaveTextContent('3 × 30 s')
  })

  it('Friday is Legs + Core Day with both exercises', async () => {
    vi.setSystemTime(FRIDAY)
    render(<App storage={seed()} />)
    expect(await screen.findByRole('heading', { name: 'Legs + Core Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Assisted squat/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead bug/ })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Train Pull anyway' }))
    expect(screen.getByRole('heading', { name: 'Pull Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dead hang/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to rest day' }))
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
    expect(await screen.findByText('Branch complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })

  it('shows an active skill first and opens its hold timer', async () => {
    const user = userEvent.setup()
    const done = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
    render(<App storage={seed({ completed: done, skillFocus: { handstand: 'push-hs-chest' } })} />)
    const skill = await screen.findByRole('button', { name: /Chest-to-wall handstand hold/ })
    expect(skill).toHaveTextContent('SKILL')
    expect(skill).toHaveTextContent('4 × 20 s')
    await user.click(skill)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('says the workout is done once every goal is met', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('Workout complete')).toBeInTheDocument()
  })
})

describe('Skill Tree screen', () => {
  it('shows nodes with their state and lets you open one', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('button', { name: 'Wall push-up, focus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incline push-up, locked' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Incline push-up, locked' }))
    const dialog = screen.getByRole('dialog', { name: 'Incline push-up' })
    expect(dialog).toHaveTextContent('Requires Wall push-up')
    expect(dialog).not.toHaveTextContent('Make This My Focus')
  })

  it('lets you make an available exercise your focus', async () => {
    const user = userEvent.setup()
    const done = ['push-wall', 'push-incline', 'push-knee', 'push-standard']
    render(<App storage={seed({ completed: done })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Decline push-up, available' }))
    await user.click(screen.getByRole('button', { name: 'Make This My Focus' }))
    expect(screen.getByRole('button', { name: 'Decline push-up, focus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Diamond push-up, available' })).toBeInTheDocument()
  })

  it('switches branches', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('tab', { name: 'Pull' }))
    expect(screen.getByRole('button', { name: 'Dead hang, focus' })).toBeInTheDocument()
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
    expect(screen.queryByText('You hit 3 × 10')).not.toBeInTheDocument()
    await user.click(log)
    expect(await screen.findByText('You hit 3 × 10')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Incline push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Set Focus' }))
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Wall push-up/ })).not.toBeInTheDocument()
  })

  it('"Not yet" keeps the same focus, and a 4th set does not re-open the sheet', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
    expect(screen.queryByText('You hit 3 × 10')).not.toBeInTheDocument()
    await user.click(log)
    expect(screen.queryByText('You hit 3 × 10')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wall push-up' })).toBeInTheDocument()
  })

  it('offers a Level Up button to come back to the sheet after "Not yet"', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' })
    expect(screen.queryByRole('button', { name: 'Level Up' })).not.toBeInTheDocument()
    await user.click(log); await user.click(log); await user.click(log)
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
    await user.click(screen.getByRole('button', { name: 'Level Up' }))
    expect(await screen.findByText('You hit 3 × 10')).toBeInTheDocument()
  })

  it('steps the rep count and never goes below 1', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    const value = screen.getByTestId('rep-value')
    expect(value).toHaveTextContent('10')
    await user.click(screen.getByRole('button', { name: 'Increase reps' }))
    expect(value).toHaveTextContent('11')
    for (let i = 0; i < 15; i++) await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    expect(value).toHaveTextContent('1')
  })

  it('a set below the goal counts as logged but does not fill the goal bars', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Decrease reps' }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    expect(screen.getByText('0 of 3 sets at goal')).toBeInTheDocument()
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('9')
  })

  it('remembers logged sets after the app is reopened', async () => {
    const user = userEvent.setup()
    const storage = seed()
    const first = render(<App storage={storage} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    await user.click(screen.getByRole('button', { name: 'Log Set' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText(/1 of 3 sets today/)).toBeInTheDocument()
    first.unmount()
    render(<App storage={storage} />)
    expect(await screen.findByText(/1 of 3 sets today/)).toBeInTheDocument()
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
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('10')
    await user.click(screen.getByRole('button', { name: /Edit set 1/ }))
    await user.click(screen.getByRole('button', { name: 'Decrease set value' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByLabelText('Sets logged today')).toHaveTextContent('9')
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
    await user.click(await screen.findByRole('button', { name: 'Not yet' }))
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
    const tree = screen.getByRole('group', { name: 'Push skill tree' })
    expect(tabs.closest('.tree-scroll')).toBeNull()
    expect(tree.closest('.tree-scroll')).not.toBeNull()
  })
})

describe('Skill Tree pop-ups', () => {
  it('renders the node sheet outside the fixed tree container so the tab bar cannot cover it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, focus' }))
    const dialog = screen.getByRole('dialog', { name: 'Wall push-up' })
    // a position:fixed ancestor traps the sheet's z-index below the tab bar
    expect(dialog.closest('.tree-screen')).toBeNull()
  })
})

describe('Skills tab', () => {
  const pikeDone = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
  const openSkills = async (extra: Record<string, unknown>) => {
    const user = userEvent.setup()
    render(<App storage={seed(extra)} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    return user
  }

  it('offers Start on an available skill and says what a locked skill needs', async () => {
    await openSkills({ completed: pikeDone })
    expect(screen.getByRole('button', { name: 'Start Handstand' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Start Planche' })).toBeDisabled()
    expect(screen.getByText(/Needs: Pseudo planche push-up/)).toBeInTheDocument()
  })

  it("starting a skill makes it active and puts it in that day's workout", async () => {
    const user = await openSkills({ completed: pikeDone })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    expect(screen.getByRole('button', { name: 'Stop Handstand' })).toBeInTheDocument()
    expect(screen.getByText(/Chest-to-wall handstand hold/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Chest-to-wall handstand hold/ })).toBeInTheDocument()
  })

  it('a third skill is refused until one is stopped', async () => {
    const user = await openSkills({ completed: [...pikeDone, 'push-diamond', 'push-archer', 'push-elevated-pike'] })
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Start One-arm push-up' }))
    expect(screen.getByRole('button', { name: 'Start Handstand push-up' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Stop Handstand' }))
    expect(screen.getByRole('button', { name: 'Start Handstand push-up' })).toBeEnabled()
  })
})

describe('Node sheet and level-up for skills and goals', () => {
  it('a skill step in the tree offers Train This Skill, which starts the chain', async () => {
    const user = userEvent.setup()
    const pikeDone = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike']
    render(<App storage={seed({ completed: pikeDone })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, available' }))
    await user.click(screen.getByRole('button', { name: 'Train This Skill' }))
    expect(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, focus' })).toBeInTheDocument()
  })

  it('lets you edit a goal, see it on Today, and reset it', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, focus' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Increase target' }))
    await user.click(screen.getByRole('button', { name: 'Save Goal' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 12')
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    await user.click(screen.getByRole('button', { name: 'Wall push-up, focus' }))
    await user.click(screen.getByRole('button', { name: 'Edit Goal' }))
    await user.click(screen.getByRole('button', { name: 'Reset to Default' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toHaveTextContent('3 × 10')
  })

  it('the level-up sheet points at skills a new exercise unlocks', async () => {
    const user = userEvent.setup()
    const done = ['push-wall', 'push-incline', 'push-knee', 'push-standard']
    render(<App storage={seed({ completed: done, focus: { push: 'push-pike' } })} />)
    await user.click(await screen.findByRole('button', { name: /Pike push-up/ }))
    const log = screen.getByRole('button', { name: 'Log Set' }) // the stepper starts at the goal, 8 reps
    await user.click(log); await user.click(log); await user.click(log)
    expect(await screen.findByText(/Unlocks a skill: Chest-to-wall handstand hold/)).toBeInTheDocument()
  })
})

describe('Find your level', () => {
  it('walks up each branch until the first "Not yet", then starts training there', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText(/Can you do 3 × 10 clean/)).toHaveTextContent('Wall push-up')
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText(/Can you do 3 × 10 clean/)).toHaveTextContent('Incline push-up')
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // push done
    expect(screen.getByText(/Can you do 3 × 30 s clean/)).toHaveTextContent('Dead hang')
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // pull done
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // legs done
    await user.click(screen.getByRole('button', { name: 'Not yet' })) // core done
    expect(screen.getByRole('heading', { name: "You're set" })).toBeInTheDocument()
    expect(screen.getByText(/Push: Incline push-up/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    expect(screen.queryByRole('heading', { name: 'Find your level' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Incline push-up/ })).toBeInTheDocument()
  })

  it('can be skipped, keeping the beginner exercises', async () => {
    const user = userEvent.setup()
    render(<App storage={memoryStorage()} />)
    await user.click(await screen.findByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByRole('button', { name: /Wall push-up/ })).toBeInTheDocument()
  })

  it('never completes a skill step and ends with a valid focus when everything is a Yes', async () => {
    const user = userEvent.setup()
    const store = memoryStorage()
    render(<App storage={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start' }))
    for (let i = 0; i < 60 && screen.queryByRole('button', { name: 'Yes' }); i++) {
      await user.click(screen.getByRole('button', { name: 'Yes' }))
    }
    await user.click(screen.getByRole('button', { name: 'Start Training' }))
    const saved = (await store.load()) as { completed: string[]; skillFocus: object }
    const skillIds = NODES.filter((n) => n.skill).map((n) => n.id)
    expect(saved.completed.some((id) => skillIds.includes(id))).toBe(false)
    expect(saved.completed).toContain('push-wall')
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
    await user.click(screen.getByRole('button', { name: 'Find your level again' }))
    expect(await screen.findByRole('heading', { name: 'Find your level' })).toBeInTheDocument()
  })
})
