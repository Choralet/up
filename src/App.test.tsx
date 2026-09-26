import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { NODES } from './data/nodes'
import { memoryStorage } from './store/storage'
import { memoryServices } from './store/services'
import { onboardingTuning } from './ui/Onboarding'
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
    await user.click(screen.getByRole('button', { name: 'Decline push-up, unlocked' }))
    await user.click(screen.getByRole('button', { name: 'Make This My Focus' }))
    expect(screen.getByRole('button', { name: 'Decline push-up, focus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Diamond push-up, unlocked' })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, unlocked, skill' }))
    await user.click(screen.getByRole('button', { name: 'Train This Skill' }))
    expect(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, focus, skill' })).toBeInTheDocument()
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
    expect(await screen.findByText(/Unlocks .*Chest-to-wall handstand hold/)).toBeInTheDocument()
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

describe('Progress tab', () => {
  const log = (date: string, nodeId: string, value: number, at: number) => ({ nodeId, value, date, at })

  it('shows a ring per branch, the weekly streak and personal bests', async () => {
    const user = userEvent.setup()
    const logs = [
      log('2026-09-14', 'push-wall', 10, 1), log('2026-09-16', 'push-wall', 12, 2),
      log('2026-09-07', 'push-wall', 9, 0), log('2026-09-09', 'push-wall', 8, 0),
    ]
    render(<App storage={seed({ completed: ['push-wall', 'push-incline'], logs })} />)
    await user.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(screen.getByText('2 week streak')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Push: 2 of 19 steps' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pull: 0 of 13 steps' })).toBeInTheDocument()
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
    const pikeDone = ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike', 'push-diamond', 'push-archer']
    render(<App storage={seed({ completed: pikeDone })} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.getAllByText(/0 of 1 step(?!s)/).length).toBeGreaterThan(0) // One-arm push-up, Pistol and Dragon flag are one-step chains
    await user.click(screen.getByRole('button', { name: 'Start Handstand' }))
    await user.click(screen.getByRole('button', { name: 'Start One-arm push-up' }))
    expect(screen.getByText('Stop an active skill to start another.')).toBeInTheDocument()
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
    expect(JSON.parse(services.saved[0].text).progress.completed).toEqual(['push-wall'])
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
    expect(JSON.parse(gh.text()!).progress.completed).toEqual(['push-wall'])
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
    await user.click(await screen.findByRole('button', { name: 'Train Pull anyway' }))
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
    vi.setSystemTime(new Date(WEDNESDAY.getTime() + 31_000))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    return user
  }

  it('asks, and "Log It" saves the hold', async () => {
    const user = await startHang()
    expect(screen.getByRole('dialog', { name: 'A hold is running' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log It' }))
    expect(await screen.findByText(/1 of 3 sets today/)).toBeInTheDocument()
  })

  it('"Discard" closes without saving', async () => {
    const user = await startHang()
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(await screen.findByText(/0 of 3 sets today/)).toBeInTheDocument()
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
    await user.dblClick(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText(/Can you do 3 × 10 clean/)).toHaveTextContent('Incline push-up')
  })

  it('tree nodes say "unlocked" and mark skills', async () => {
    const user = userEvent.setup()
    render(<App storage={seed({ completed: ['push-wall', 'push-incline', 'push-knee', 'push-standard', 'push-pike'] })} />)
    await user.click(await screen.findByRole('button', { name: 'Tree' }))
    expect(screen.getByRole('button', { name: 'Decline push-up, unlocked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chest-to-wall handstand hold, unlocked, skill' })).toBeInTheDocument()
  })

  it('the rep count is announced and the screens behind an overlay are inert', async () => {
    const user = userEvent.setup()
    const { container } = render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: /Wall push-up/ }))
    expect(screen.getByTestId('rep-value')).toHaveAttribute('aria-live', 'polite')
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
    const logs = [1, 2, 3].map((at) => ({ nodeId: 'pull-hang', value: 30, date: '2026-09-23', at }))
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
    expect(dialog).toHaveTextContent('Frog stand, toes touching')
    const link = within(dialog).getByRole('link', { name: /Watch in video/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=J2JHDavNZB4&t=49s')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('Train This starts a ready skill and it shows in that day\'s workout', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee'] })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    await user.click(screen.getByRole('button', { name: 'Train This' }))
    expect(screen.getByRole('button', { name: /^2\. Frog stand, training/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('button', { name: /Frog stand, toes touching/ })).toBeInTheDocument()
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
    expect(dialog).toHaveTextContent('Frog stand')
    expect(within(dialog).queryByRole('button', { name: 'Train This' })).not.toBeInTheDocument()
  })

  it('explains when two skills are already active', async () => {
    const user = await openRoadmap({ completed: ['push-wall', 'push-incline', 'push-knee', 'pull-hang'], skillFocus: { 'hollow-hang': 'rm-hollow-hang-1', 'butchers-block': 'rm-butcher' } })
    await user.click(screen.getByRole('button', { name: /^2\. Frog stand, ready/ }))
    expect(screen.getByRole('button', { name: 'Train This' })).toBeDisabled()
    expect(screen.getByText('Two skills are already active. Stop one in My Skills first.')).toBeInTheDocument()
  })

  it('My Skills keeps its library to the tree skills, and roadmap skills do not appear in the tree', async () => {
    const user = userEvent.setup()
    render(<App storage={seed()} />)
    await user.click(await screen.findByRole('button', { name: 'Skills' }))
    expect(screen.queryByRole('button', { name: 'Start Frog stand' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tree' }))
    expect(screen.queryByRole('button', { name: /Frog stand/ })).not.toBeInTheDocument()
  })
})
