# Up: Plan 3 of 3: Backup, How-to Demos and Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make your data safe (backup file export/import, automatic backup to a private GitHub repo), add the small How-to demo button, and clear the polish and reliability items deferred from the Plan 1 and Plan 2 reviews.

**Architecture:** Backup text format and parsing are pure (`src/engine/backup.ts`). The GitHub client (`src/store/github.ts`) takes `fetch` as a parameter so tests use an in-memory fake repo. Side effects the UI needs (fetch, saving a file, storing the GitHub config) come from a small `ServicesProvider` context, with real defaults and memory versions for tests. Demos are a static id-to-file map, hotlinked from a pinned jsDelivr URL and cached by the service worker after first view.

**Tech Stack:** unchanged (Vite, React 19, TypeScript 7, Vitest + Testing Library, idb-keyval, vite-plugin-pwa/Workbox, GitHub Pages). GitHub REST "contents" API for backup.

**Spec:** `docs/PLAN.md` sections 9b and 10b, `docs/DEMOS.md` (option 3 chosen), `docs/DECISIONS.md` (rounds 4 to 6, and both "Known minors deferred" lists). Earlier plans: `docs/superpowers/plans/2026-09-26-up-plan-1-...md`, `...-plan-2-...md`.

## Global Constraints

- App name **Up**; live at `https://choralet.github.io/up/`; code repo `Choralet/up` is **public**. No backend, no account.
- Progress stays in IndexedDB key `up.progress`. The GitHub config lives under a **separate** key `up.github` and is **never** written into a backup file or the data repo.
- The GitHub token is typed by the user into Settings. The agent never sees, creates, stores or logs a token. The data repo is **private**: `Choralet/up-data`, file `up-data.json`.
- Importing or restoring **replaces** all progress on the phone, only after an in-app confirmation sheet (never `window.confirm`).
- Demos: hotlink only, never copy media into the repo. Base URL `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/`. Credit line exactly `© Gym visual — gymvisual.com`, shown wherever a demo is shown. The button appears **only** for exercises that have a demo.
- Quiet UI, Apple-like CSS with existing variables. Text inputs and selects use at least `font-size: 16px` (stops iOS zoom on focus).
- Every commit message ends with two trailers via extra `-m` flags: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R`.
- Work in `/Users/arch/Desktop/Calisthenic`. `npm test`, `npm run build`, `npx tsc --noEmit`. App tests pin `Date` to Monday 2026-09-21 (see top of `src/App.test.tsx`; `seed()` makes an onboarded save).

## Review Focus

1. **A backup file that is not ours** (random JSON, broken JSON, empty file, a very old Up save): friendly error, nothing replaced. *(Task 2)*
2. **Token or repo problems** (wrong token 401, no write permission 403, repo missing 404, offline): a clear message in Settings, no crash, progress untouched. *(Tasks 3, 4)*
3. **The token must never leave the phone except to api.github.com**: not in the export file, not in the data repo. *(Tasks 2, 4)*
4. **Restoring from GitHub when no backup exists yet**: "No backup in this repository yet", nothing replaced. *(Task 3)*
5. **App left open past midnight**: Today, "Train anyway" and warm-up ticks move to the new day; the Log screen counts the new day. *(Task 7)*
6. **Tapping Done while a hold is running**: you choose Log / Discard / Keep going; nothing is lost silently. *(Task 8)*
7. **Double tap in Find your level** answers only one question. *(Task 9)*

## File Structure

| File | Responsibility |
|---|---|
| `src/engine/progress.ts` | sanitize: floor stored values, migrate a Plan 1 skill focus |
| `src/engine/stats.ts` | `streakDaysNeeded` |
| `src/lib/format.ts` | `plural` |
| `src/engine/backup.ts` (+test) | `exportBackup`, `parseBackup`, `BackupError` |
| `src/store/github.ts` (+test) | GitHub contents client |
| `src/test/fakeGithub.ts` | in-memory fake GitHub for tests |
| `src/store/services.tsx` | `Services`, `ServicesProvider`, `useServices`, real and memory services |
| `src/store/ProgressContext.tsx` | + `replaceProgress` |
| `src/ui/ConfirmSheet.tsx` | generic in-app confirmation |
| `src/ui/SettingsScreen.tsx`, `GithubSection.tsx`, `AutoBackup.tsx` | backup UI |
| `src/data/demos.ts`, `src/ui/DemoButton.tsx` | How-to demos |
| `src/lib/useToday.ts` | re-render on a new day |
| `src/ui/HoldTimer.tsx`, `LogScreen.tsx` | wake-lock race, Done during a hold, ring dot |
| `src/ui/Onboarding.tsx`, `TreeView.tsx`, `App.tsx`, `index.html` | polish and accessibility |
| `docs/BACKUP.md` | how to make the GitHub token |

---

### Task 1: Deferred engine and wording fixes

**Files:** Modify `src/engine/progress.ts`, `src/engine/progress.test.ts`, `src/engine/stats.ts`, `src/engine/stats.test.ts`, `src/lib/format.ts`, `src/lib/lib.test.ts`, `src/ui/ProgressScreen.tsx`, `src/ui/SkillsScreen.tsx`, `src/App.test.tsx`

**Interfaces:** Produces `streakDaysNeeded(schedule: DayType[]): number` (stats.ts) and `plural(n: number, word: string): string` (format.ts). `sanitizeProgress` signature unchanged.

- [ ] **Step 1: Failing tests**

Append to `src/engine/progress.test.ts`:

```ts
describe('sanitizeProgress, Plan 3 repairs', () => {
  it('floors stored fractional set values and drops ones below 1', () => {
    const p = sanitizeProgress(g2, {
      logs: [
        { nodeId: 'a', value: 9.7, date: '2026-09-26', at: 1 },
        { nodeId: 'a', value: 0.5, date: '2026-09-26', at: 2 },
      ],
    })
    expect(p.logs.map((l) => l.value)).toEqual([9])
  })
  it('moves a skill step stored as branch focus (Plan 1 save) into the active skills', () => {
    const p = sanitizeProgress(g2, { completed: ['a'], focus: { push: 's1' } })
    expect(p.focus.push).toBe('b')
    expect(p.skillFocus).toEqual({ sk: 's1' })
  })
  it('does not migrate a skill focus when two skills are already active', () => {
    const p = sanitizeProgress(g2, { completed: ['a'], focus: { push: 's1' }, skillFocus: { k2: 'k2', k3: 'k3' } })
    expect(p.skillFocus).toEqual({ k2: 'k2', k3: 'k3' })
  })
})
```

Append to `src/engine/stats.test.ts` (and add `streakDaysNeeded` to its import from `./stats`):

```ts
describe('streakDaysNeeded', () => {
  it('is 2 with two or more planned days, otherwise 1', () => {
    expect(streakDaysNeeded(['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'])).toBe(2)
    expect(streakDaysNeeded(['push', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'])).toBe(1)
    expect(streakDaysNeeded(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'])).toBe(1)
  })
})
```

Append to `src/lib/lib.test.ts` (add `plural` to the `./format` import):

```ts
describe('plural', () => {
  it('uses the singular only for 1', () => {
    expect(plural(1, 'step')).toBe('1 step')
    expect(plural(0, 'step')).toBe('0 steps')
    expect(plural(3, 'step')).toBe('3 steps')
  })
})
```

Append to `src/App.test.tsx`:

```tsx
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
```

Run: `npx vitest run` → Expected: the new tests FAIL (`plural`/`streakDaysNeeded` not functions, wording missing, sanitize repairs missing).

- [ ] **Step 2: Implement**

`src/lib/format.ts`, append:

```ts
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
```

`src/engine/stats.ts`: add above `weeklyStreak`, and use it inside `weeklyStreak` (replace the two lines computing `planned` and `need` with `const need = streakDaysNeeded(schedule)`):

```ts
/** Logged days a week needs to count toward the streak: 2, or 1 if fewer than 2 days are planned. */
export function streakDaysNeeded(schedule: DayType[]): number {
  return Math.max(1, Math.min(2, schedule.filter((d) => d !== 'rest').length))
}
```

`src/engine/progress.ts`, inside `sanitizeProgress`:

1. Replace the `logs` computation so values are floored before validation:

```ts
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs
        .filter(
          (l): l is SetLog =>
            !!l && typeof l === 'object' &&
            typeof (l as SetLog).nodeId === 'string' && byId.has((l as SetLog).nodeId) &&
            Number.isFinite((l as SetLog).value) &&
            typeof (l as SetLog).date === 'string' && typeof (l as SetLog).at === 'number',
        )
        .map((l) => ({ nodeId: l.nodeId, value: Math.floor(l.value), date: l.date, at: l.at }))
        .filter((l) => l.value >= 1)
    : []
```

2. Directly after the `for (const chain of Object.keys(rawSkill)) { ... }` loop, add the Plan 1 skill-focus migration:

```ts
  // Plan 1 saves could hold a skill step as a branch focus: carry it over as an active skill when there is room
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    if (!n?.skill || n.skill in skillFocus || Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) continue
    const step = !done.has(n.id) && isUnlocked(n, done) ? n.id : firstStep(nodes, done, n.skill)
    if (step) skillFocus[n.skill] = step
  }
```

`src/ui/ProgressScreen.tsx`: import `streakDaysNeeded` from `'../engine/stats'` and `plural` from `'../lib/format'`; replace the sentence `Train on 2 days in a week to keep it going.` with `` {`Train on ${plural(streakDaysNeeded(progress.schedule), 'day')} in a week to keep it going.`} `` (keep the rest of the sentence). Replace `{done} of {total} steps` (the visible line, not the Ring label) with `{done} of {plural(total, 'step')}`.

`src/ui/SkillsScreen.tsx`: import `plural`; replace `{s.done} of {s.total} steps` with `{s.done} of {plural(s.total, 'step')}`; directly after the Library `<div className="hdr">Library</div>` add:

```tsx
      {activeCount >= MAX_ACTIVE_SKILLS && <p className="sub" style={{ margin: '12px 4px 0' }}>Stop an active skill to start another.</p>}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit` → Expected: all PASS.

```bash
git add -A && git commit -m "fix: floor stored values, migrate Plan 1 skill focus, streak rule text, step wording" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 2: Backup file export and import

**Files:** Create `src/engine/backup.ts`, `src/engine/backup.test.ts`, `src/store/services.tsx`, `src/ui/ConfirmSheet.tsx`. Modify `src/store/ProgressContext.tsx`, `src/ui/SettingsScreen.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.

**Interfaces:**
- `exportBackup(progress: Progress, now?: Date): string`; `parseBackup(text: string, nodes: ExerciseNode[]): Progress` (throws `BackupError` with a user-facing `message`); `class BackupError extends Error`.
- `interface GithubConfig { owner: string; repo: string; token: string; lastBackupAt?: number; lastError?: string }` (declared in services.tsx, used by Task 3/4).
- `interface Services { fetch: typeof fetch; saveFile(name: string, text: string): Promise<void>; github: { load(): Promise<GithubConfig | null>; save(cfg: GithubConfig | null): Promise<void> } }`; `realServices`; `memoryServices(over?: Partial<Services>): Services & { saved: { name: string; text: string }[] }`; `<ServicesProvider value>`; `useServices()`.
- `ProgressValue.replaceProgress(p: Progress): void`.
- `App({ storage?, services? })`.
- `<ConfirmSheet title message? actions onCancel />` with `actions: { label: string; onClick(): void; tone?: 'primary' | 'danger' | 'plain' }[]`.

- [ ] **Step 1: Failing tests**

`src/engine/backup.test.ts`:

```ts
import { NODES } from '../data/nodes'
import { BackupError, exportBackup, parseBackup } from './backup'
import { initialProgress, logSet } from './progress'

describe('backup file', () => {
  const progress = logSet({ ...initialProgress(NODES), completed: ['push-wall'], onboarded: true }, 'push-incline', 10, '2026-09-21', 1)

  it('round-trips progress through the text format', () => {
    const text = exportBackup(progress, new Date('2026-09-21T10:00:00Z'))
    const data = JSON.parse(text)
    expect(data.app).toBe('up')
    expect(data.version).toBe(1)
    expect(data.exportedAt).toBe('2026-09-21T10:00:00.000Z')
    const back = parseBackup(text, NODES)
    expect(back.completed).toEqual(['push-wall'])
    expect(back.logs).toHaveLength(1)
    expect(back.onboarded).toBe(true)
  })

  it('rejects files that are not Up backups with a friendly message', () => {
    for (const bad of ['', 'not json', '{}', '[]', '{"app":"other","progress":{}}', '{"app":"up"}', 'null']) {
      expect(() => parseBackup(bad, NODES), bad).toThrow(BackupError)
    }
    expect(() => parseBackup('nope', NODES)).toThrow("This file isn't an Up backup.")
  })

  it('cleans what it imports (unknown ids dropped)', () => {
    const text = JSON.stringify({ app: 'up', version: 1, progress: { completed: ['push-wall', 'ghost'] } })
    expect(parseBackup(text, NODES).completed).toEqual(['push-wall'])
  })

  it('never includes anything but progress', () => {
    const data = JSON.parse(exportBackup(progress))
    expect(Object.keys(data).sort()).toEqual(['app', 'exportedAt', 'progress', 'version'])
  })
})
```

Append to `src/App.test.tsx` (add `import { memoryServices } from './store/services'` at the top):

```tsx
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
```

Run: `npx vitest run` → Expected: FAIL (modules missing, no buttons).

- [ ] **Step 2: Backup module**

`src/engine/backup.ts`:

```ts
import type { ExerciseNode } from '../data/types'
import { sanitizeProgress, type Progress } from './progress'

export class BackupError extends Error {}

/** The backup text: only progress, never settings or tokens. */
export function exportBackup(progress: Progress, now: Date = new Date()): string {
  return JSON.stringify({ app: 'up', version: 1, exportedAt: now.toISOString(), progress }, null, 2)
}

export function parseBackup(text: string, nodes: ExerciseNode[]): Progress {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError("This file isn't an Up backup.")
  }
  const d = data as { app?: unknown; progress?: unknown } | null
  if (!d || typeof d !== 'object' || d.app !== 'up' || !d.progress || typeof d.progress !== 'object') {
    throw new BackupError("This file isn't an Up backup.")
  }
  return { ...sanitizeProgress(nodes, d.progress), onboarded: true }
}
```

- [ ] **Step 3: Services, provider action, confirm sheet**

`src/store/services.tsx`:

```tsx
import { createContext, useContext } from 'react'
import { del, get, set } from 'idb-keyval'

export interface GithubConfig {
  owner: string
  repo: string
  token: string
  lastBackupAt?: number
  lastError?: string
}

export interface Services {
  fetch: typeof fetch
  saveFile(name: string, text: string): Promise<void>
  github: {
    load(): Promise<GithubConfig | null>
    save(cfg: GithubConfig | null): Promise<void>
  }
}

const GITHUB_KEY = 'up.github'

export const realServices: Services = {
  fetch: (...args) => fetch(...args),
  async saveFile(name, text) {
    const file = new File([text], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') throw e
      }
      return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  github: {
    load: async () => ((await get(GITHUB_KEY)) as GithubConfig | undefined) ?? null,
    save: async (cfg) => (cfg ? set(GITHUB_KEY, cfg) : del(GITHUB_KEY)),
  },
}

/** Services for tests: files are collected in `saved`, GitHub config lives in memory. */
export function memoryServices(over: Partial<Services> = {}): Services & { saved: { name: string; text: string }[] } {
  const saved: { name: string; text: string }[] = []
  let cfg: GithubConfig | null = null
  return {
    saved,
    fetch: () => Promise.reject(new Error('no network in tests')),
    saveFile: async (name, text) => {
      saved.push({ name, text })
    },
    github: {
      load: async () => cfg,
      save: async (c) => {
        cfg = c
      },
    },
    ...over,
  }
}

const Ctx = createContext<Services>(realServices)
export const ServicesProvider = Ctx.Provider
export const useServices = () => useContext(Ctx)
```

`src/store/ProgressContext.tsx`: add `replaceProgress(p: Progress): void` to `ProgressValue` (comment: `/** swap in progress from a backup; the caller has already cleaned it */`) and to `value`: `replaceProgress: (p) => setProgress(p),`.

`src/ui/ConfirmSheet.tsx`:

```tsx
interface Action {
  label: string
  onClick: () => void
  tone?: 'primary' | 'danger' | 'plain'
}

export function ConfirmSheet({ title, message, actions, onCancel }: { title: string; message?: string; actions: Action[]; onCancel: () => void }) {
  return (
    <>
      <div className="scrim" onClick={onCancel} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        {actions.map((a) => (
          <button
            key={a.label}
            className={a.tone === 'primary' ? 'cta' : 'cta sec'}
            style={a.tone === 'danger' ? { color: 'var(--skill)' } : undefined}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
        <button className="cta sec" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}
```

`src/App.tsx`: import `ServicesProvider, realServices, type Services` from `'./store/services'`; change the default export to:

```tsx
export default function App({ storage = idbStorage, services = realServices }: { storage?: ProgressStorage; services?: Services }) {
  return (
    <ServicesProvider value={services}>
      <ProgressProvider storage={storage} nodes={NODES}>
        <Shell />
      </ProgressProvider>
    </ServicesProvider>
  )
}
```

- [ ] **Step 4: Settings backup section**

In `src/ui/SettingsScreen.tsx`:

1. Imports: `useRef, useState` from `'react'`; `BackupError, exportBackup, parseBackup` from `'../engine/backup'`; `type Progress` from `'../engine/progress'`; `plural` from `'../lib/format'`; `localDate` from `'../lib/time'`; `useServices` from `'../store/services'`; `ConfirmSheet` from `'./ConfirmSheet'`.
2. Get `nodes, replaceProgress` from `useProgress()` as well, `const services = useServices()`, and add state:

```tsx
  const [pending, setPending] = useState<Progress | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportFile = async () => {
    try {
      await services.saveFile(`up-backup-${localDate()}.json`, exportBackup(progress))
      setMessage(null)
    } catch {
      setMessage("Couldn't save the file.")
    }
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPending(parseBackup(await file.text(), nodes))
      setMessage(null)
    } catch (e) {
      setMessage(e instanceof BackupError ? e.message : "Couldn't read that file.")
    }
    if (fileInput.current) fileInput.current.value = ''
  }
```

3. Before the `<div className="hdr">Level</div>` line insert:

```tsx
        <div className="hdr">Backup</div>
        <button className="cta sec" onClick={exportFile}>Export Backup File</button>
        <button className="cta sec" onClick={() => fileInput.current?.click()}>Import Backup File</button>
        <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Import backup file" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        {message && <p className="sub" role="status">{message}</p>}
        <p className="sub">Your progress lives on this phone. Export a file now and then, or connect GitHub below.</p>
```

4. After the closing `</div>` of `.screen` (still inside the outer `.log` div) add:

```tsx
      {pending && (
        <ConfirmSheet
          title="Replace your progress?"
          message={`This backup has ${plural(pending.completed.length, 'finished exercise')} and ${plural(pending.logs.length, 'logged set')}. It replaces everything on this phone.`}
          actions={[{ label: 'Replace', tone: 'danger', onClick: () => { replaceProgress(pending); setPending(null); setMessage('Backup restored.') } }]}
          onCancel={() => setPending(null)}
        />
      )}
```

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build` → Expected: all PASS.

```bash
git add -A && git commit -m "feat: backup file export and import with confirmation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 3: GitHub backup client

**Files:** Create `src/store/github.ts`, `src/store/github.test.ts`, `src/test/fakeGithub.ts`.

**Interfaces:** `BACKUP_PATH = 'up-data.json'`; `class GithubError extends Error`; `githubCheck(cfg, f): Promise<void>`; `githubBackup(cfg, text, f): Promise<void>`; `githubRestore(cfg, f): Promise<string>`; `toBase64(text)`, `fromBase64(b64)`. `cfg` is `Pick<GithubConfig, 'owner' | 'repo' | 'token'>`. Test helper `fakeGithub(opts?: { repoExists?: boolean; status?: number; offline?: boolean })` returns `{ fetch, calls, text(): string | null }`.

- [ ] **Step 1: Fake and failing tests**

`src/test/fakeGithub.ts`:

```ts
import { fromBase64 } from '../store/github'

interface Call { method: string; url: string; auth: string | null; body?: Record<string, unknown> }

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** An in-memory GitHub repo that speaks just enough of the contents API. */
export function fakeGithub(opts: { repoExists?: boolean; status?: number; offline?: boolean } = {}) {
  let file: { sha: string; content: string } | null = null
  const calls: Call[] = []
  const f = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    const headers = new Headers(init.headers)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url, auth: headers.get('Authorization'), body })
    if (opts.offline) throw new TypeError('Failed to fetch')
    if (opts.status) return json(opts.status, { message: 'error' })
    if (opts.repoExists === false) return json(404, { message: 'Not Found' })
    if (url.endsWith('/contents/up-data.json')) {
      if (method === 'GET') return file ? json(200, { sha: file.sha, content: file.content, encoding: 'base64' }) : json(404, { message: 'Not Found' })
      if (method === 'PUT') {
        if (file && body?.sha !== file.sha) return json(409, { message: 'sha mismatch' })
        const created = !file
        file = { sha: `sha${calls.length}`, content: String(body?.content) }
        return json(created ? 201 : 200, {})
      }
    }
    return json(200, { full_name: 'x/y' })
  }
  return { fetch: f as typeof fetch, calls, text: () => (file ? fromBase64(file.content) : null) }
}
```

`src/store/github.test.ts`:

```ts
import { fakeGithub } from '../test/fakeGithub'
import { fromBase64, githubBackup, githubCheck, GithubError, githubRestore, toBase64 } from './github'

const cfg = { owner: 'me', repo: 'up-data', token: 't0ken' }

describe('base64 helpers', () => {
  it('round-trips unicode text', () => {
    const s = 'Handstand ✓ × 3 — ok'
    expect(fromBase64(toBase64(s))).toBe(s)
  })
  it('handles large text', () => {
    const s = 'x'.repeat(200_000)
    expect(fromBase64(toBase64(s))).toBe(s)
  })
})

describe('githubBackup / githubRestore', () => {
  it('creates the file, then updates it with the current sha, and restores it', async () => {
    const gh = fakeGithub()
    await githubBackup(cfg, '{"a":1}', gh.fetch)
    expect(gh.text()).toBe('{"a":1}')
    await githubBackup(cfg, '{"a":2}', gh.fetch)
    expect(gh.text()).toBe('{"a":2}')
    expect(await githubRestore(cfg, gh.fetch)).toBe('{"a":2}')
  })
  it('sends the token only to api.github.com, as a Bearer header', async () => {
    const gh = fakeGithub()
    await githubBackup(cfg, '{}', gh.fetch)
    for (const c of gh.calls) {
      expect(c.url.startsWith('https://api.github.com/repos/me/up-data')).toBe(true)
      expect(c.auth).toBe('Bearer t0ken')
    }
  })
  it('restore with no backup yet says so', async () => {
    await expect(githubRestore(cfg, fakeGithub().fetch)).rejects.toThrow('No backup in this repository yet.')
  })
  it('explains common errors', async () => {
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 401 }).fetch)).rejects.toThrow('GitHub rejected the token')
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 403 }).fetch)).rejects.toThrow('not allowed to write')
    await expect(githubBackup(cfg, '{}', fakeGithub({ repoExists: false }).fetch)).rejects.toThrow('Repository not found')
    await expect(githubBackup(cfg, '{}', fakeGithub({ offline: true }).fetch)).rejects.toThrow("Couldn't reach GitHub")
    await expect(githubBackup(cfg, '{}', fakeGithub({ status: 500 }).fetch)).rejects.toBeInstanceOf(GithubError)
  })
  it('githubCheck passes for a reachable repo and fails for a missing one', async () => {
    await expect(githubCheck(cfg, fakeGithub().fetch)).resolves.toBeUndefined()
    await expect(githubCheck(cfg, fakeGithub({ repoExists: false }).fetch)).rejects.toThrow('Repository not found')
  })
})
```

Run: `npx vitest run src/store/github.test.ts` → Expected: FAIL (`./github` missing).

- [ ] **Step 2: Implement**

`src/store/github.ts`:

```ts
import type { GithubConfig } from './services'

export const BACKUP_PATH = 'up-data.json'

export class GithubError extends Error {}

type Cfg = Pick<GithubConfig, 'owner' | 'repo' | 'token'>

const repoUrl = (c: Cfg) => `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`
const fileUrl = (c: Cfg) => `${repoUrl(c)}/contents/${BACKUP_PATH}`
const headers = (c: Cfg) => ({
  Authorization: `Bearer ${c.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

function explain(status: number): string {
  if (status === 401) return 'GitHub rejected the token. Check it, or make a new one.'
  if (status === 403) return 'The token is not allowed to write to this repository. Give it "Contents: Read and write".'
  if (status === 404) return 'Repository not found. Check the owner and name, and that the token can see it.'
  return `GitHub error ${status}. Try again later.`
}

async function call(f: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await f(url, { ...init, cache: 'no-store' })
  } catch {
    throw new GithubError("Couldn't reach GitHub. Check your connection.")
  }
}

export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Throws a GithubError unless the repository is reachable with this token. */
export async function githubCheck(c: Cfg, f: typeof fetch): Promise<void> {
  const r = await call(f, repoUrl(c), { headers: headers(c) })
  if (!r.ok) throw new GithubError(explain(r.status))
}

/** The backup file's sha and base64 content, or null when the repo exists but has no backup yet. */
async function current(c: Cfg, f: typeof fetch): Promise<{ sha: string; content: string } | null> {
  const r = await call(f, fileUrl(c), { headers: headers(c) })
  if (r.status === 404) {
    await githubCheck(c, f) // tells "no file yet" apart from "no repo"
    return null
  }
  if (!r.ok) throw new GithubError(explain(r.status))
  const body = (await r.json()) as { sha: string; content: string }
  return { sha: body.sha, content: body.content }
}

export async function githubBackup(c: Cfg, text: string, f: typeof fetch): Promise<void> {
  const cur = await current(c, f)
  const r = await call(f, fileUrl(c), {
    method: 'PUT',
    headers: { ...headers(c), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Up backup ${new Date().toISOString()}`, content: toBase64(text), ...(cur ? { sha: cur.sha } : {}) }),
  })
  if (!r.ok) throw new GithubError(explain(r.status))
}

export async function githubRestore(c: Cfg, f: typeof fetch): Promise<string> {
  const cur = await current(c, f)
  if (!cur) throw new GithubError('No backup in this repository yet.')
  return fromBase64(cur.content)
}
```

Note: the contents API returns base64 content inline for files up to 1 MB. A year of training logs is roughly 200 KB, so this lasts for years; revisit if the file ever passes 1 MB.

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit` → Expected: PASS.

```bash
git add -A && git commit -m "feat: GitHub contents client for backup and restore" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 4: GitHub backup in Settings, with automatic backup

**Files:** Create `src/ui/GithubSection.tsx`, `src/ui/AutoBackup.tsx`. Modify `src/ui/SettingsScreen.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`.

**Interfaces:** `<GithubSection onRestore(p: Progress) />` (Settings passes a function that opens its existing confirm sheet); `<AutoBackup />` (no props, rendered once in `Shell`). Automatic backup runs when the page becomes hidden, only if GitHub is connected and progress changed since the last successful backup; it records `lastBackupAt` or `lastError` in the config.

- [ ] **Step 1: Failing tests**

Append to `src/App.test.tsx` (add `import { fakeGithub } from './test/fakeGithub'`):

```tsx
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
    expect(await services.github.load()).toBeNull()
    expect(screen.getByLabelText('Token')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx` → Expected: FAIL.

- [ ] **Step 2: GithubSection**

`src/ui/GithubSection.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { exportBackup, parseBackup } from '../engine/backup'
import type { Progress } from '../engine/progress'
import { githubBackup, githubCheck, githubRestore } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices, type GithubConfig } from '../store/services'

export function GithubSection({ onRestore }: { onRestore: (p: Progress) => void }) {
  const { progress, nodes } = useProgress()
  const services = useServices()
  const [cfg, setCfg] = useState<GithubConfig | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ owner: '', repo: '', token: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    services.github.load().then((c) => { setCfg(c); setLoaded(true) }, () => setLoaded(true))
  }, [services])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      const next = { owner: form.owner.trim(), repo: form.repo.trim(), token: form.token.trim() }
      await githubCheck(next, services.fetch)
      await services.github.save(next)
      setCfg(next)
      setForm({ owner: '', repo: '', token: '' })
    })

  const backUp = () =>
    run(async () => {
      await githubBackup(cfg!, exportBackup(progress), services.fetch)
      const next = { ...cfg!, lastBackupAt: Date.now(), lastError: undefined }
      await services.github.save(next)
      setCfg(next)
    })

  const restore = () => run(async () => onRestore(parseBackup(await githubRestore(cfg!, services.fetch), nodes)))

  const disconnect = () => run(async () => { await services.github.save(null); setCfg(null) })

  if (!loaded) return null
  return (
    <>
      <div className="hdr">GitHub backup</div>
      {cfg ? (
        <div className="card">
          <b>Connected to {cfg.owner}/{cfg.repo}</b>
          <div className="sub" style={{ marginTop: 4 }}>
            {cfg.lastBackupAt ? `Last backup: ${new Date(cfg.lastBackupAt).toLocaleString()}` : 'No backup yet.'} Backs up automatically when you leave the app.
          </div>
          {cfg.lastError && <div className="sub" style={{ color: 'var(--skill)', marginTop: 4 }}>Last automatic backup failed: {cfg.lastError}</div>}
          <button className="cta" disabled={busy} onClick={backUp}>Back Up Now</button>
          <button className="cta sec" disabled={busy} onClick={restore}>Restore from GitHub</button>
          <button className="cta sec" style={{ color: 'var(--skill)' }} disabled={busy} onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <div className="card form">
          <p className="sub" style={{ marginTop: 0 }}>Saves a copy of your progress to a private GitHub repository. See docs/BACKUP.md for making the token.</p>
          <label>GitHub owner<input aria-label="GitHub owner" autoCapitalize="none" autoCorrect="off" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label>
          <label>Repository<input aria-label="Repository" autoCapitalize="none" autoCorrect="off" value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} /></label>
          <label>Token<input aria-label="Token" type="password" autoComplete="off" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></label>
          <button className="cta" disabled={busy || !form.owner || !form.repo || !form.token} onClick={connect}>Connect</button>
        </div>
      )}
      {error && <p className="sub" role="alert" style={{ color: 'var(--skill)' }}>{error}</p>}
    </>
  )
}
```

Append to `src/styles.css`:

```css
.form label { display: block; font-size: 13px; color: var(--label2); margin: 10px 0 0; }
.form input { display: block; width: 100%; margin-top: 4px; font: inherit; font-size: 16px; color: var(--label); background: var(--fill); border: 0; border-radius: 10px; padding: 10px 12px; }
```

In `src/ui/SettingsScreen.tsx`: import `GithubSection` and render it right after the backup paragraph added in Task 2:

```tsx
        <GithubSection onRestore={(p) => setPending(p)} />
```

- [ ] **Step 3: AutoBackup**

`src/ui/AutoBackup.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { exportBackup } from '../engine/backup'
import { githubBackup } from '../store/github'
import { useProgress } from '../store/ProgressContext'
import { useServices } from '../store/services'

/** When the app goes to the background, back up to GitHub if connected and something changed. */
export function AutoBackup() {
  const { progress } = useProgress()
  const services = useServices()
  const latest = useRef(progress)
  latest.current = progress
  const sent = useRef<string | null>(null)

  useEffect(() => {
    const onChange = async () => {
      if (document.visibilityState !== 'hidden') return
      const cfg = await services.github.load().catch(() => null)
      if (!cfg) return
      const key = JSON.stringify(latest.current)
      if (key === sent.current) return
      try {
        await githubBackup(cfg, exportBackup(latest.current), services.fetch)
        sent.current = key
        await services.github.save({ ...cfg, lastBackupAt: Date.now(), lastError: undefined })
      } catch (e) {
        await services.github.save({ ...cfg, lastError: (e as Error).message }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [services])

  return null
}
```

In `src/App.tsx` `Shell`, render `<AutoBackup />` as the last child inside `<div className="app">` (import it).

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build` → Expected: PASS.

```bash
git add -A && git commit -m "feat: GitHub backup in Settings with automatic backup when leaving the app" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 5: How-to demo button

**Files:** Create `src/data/demos.ts`, `src/ui/DemoButton.tsx`. Modify `src/data/nodes.test.ts`, `src/ui/LogScreen.tsx`, `src/ui/NodeSheet.tsx`, `vite.config.ts`, `src/App.test.tsx`, `src/styles.css`.

**Interfaces:** `demoUrl(nodeId: string): string | null`; `DEMO_CREDIT`; `DEMO_IDS: string[]`; `<DemoButton node />` renders nothing when there is no demo.

- [ ] **Step 1: Failing tests**

Append to `src/data/nodes.test.ts` inside the main describe (import `DEMO_IDS, demoUrl` from `'./demos'`):

```ts
  it('every demo belongs to a known exercise and points at the pinned CDN', () => {
    const ids = new Set(NODES.map((n) => n.id))
    for (const id of DEMO_IDS) {
      expect(ids.has(id), id).toBe(true)
      expect(demoUrl(id)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\/exercises-dataset@7455efa[0-9a-f]+\/videos\/\d{4}-\w+\.gif$/)
    }
    expect(demoUrl('push-wall')).toBeNull()
  })
```

Append to `src/App.test.tsx`:

```tsx
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
```

Run: `npx vitest run` → Expected: FAIL.

- [ ] **Step 2: Demo data**

`src/data/demos.ts` (only exact or near-exact matches, checked against the dataset names on 2026-09-26; a GIF showing a harder or different move is worse than none):

```ts
const BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

export const DEMO_CREDIT = '© Gym visual — gymvisual.com'

/** exercise id -> GIF file in the dataset. Hotlinked for personal use (docs/DEMOS.md, option 3). */
const FILES: Record<string, string> = {
  'push-incline': '0493-B1EVP9F.gif',
  'push-knee': '3211-ZOuKWir.gif',
  'push-standard': '0662-I4hDWkc.gif',
  'push-diamond': '0283-soIB2rj.gif',
  'push-decline': '0279-i5cEhka.gif',
  'push-archer': '3294-A9qxk2F.gif',
  'push-wall-hspu': '0471-rQxwMxO.gif',
  'push-hs-free': '3302-XooAdhl.gif',
  'pull-scap': '0688-uTBt1HV.gif',
  'pull-row': '0499-bZGHsAZ.gif',
  'pull-pullup': '0652-lBDjFxJ.gif',
  'pull-chin': '1326-T2mxWqc.gif',
  'pull-archer': '3293-72BC5Za.gif',
  'pull-mu': '0631-yJUHKTn.gif',
  'legs-split': '2368-9E25EOx.gif',
  'legs-pistol': '1759-nqs5HGV.gif',
  'core-deadbug': '0276-iny3m5y.gif',
  'core-leg-raise': '0472-I3tsCnC.gif',
  'core-lsit': '3419-UpWmA5E.gif',
}

export const DEMO_IDS = Object.keys(FILES)

export function demoUrl(nodeId: string): string | null {
  return FILES[nodeId] ? BASE + FILES[nodeId] : null
}
```

- [ ] **Step 3: DemoButton and placement**

`src/ui/DemoButton.tsx`:

```tsx
import { useState } from 'react'
import { DEMO_CREDIT, demoUrl } from '../data/demos'
import type { ExerciseNode } from '../data/types'

export function DemoButton({ node }: { node: ExerciseNode }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = demoUrl(node.id)
  if (!src) return null
  return (
    <>
      <button className="howto" onClick={() => { setFailed(false); setOpen(true) }}>How-to</button>
      {open && (
        <>
          <div className="scrim" style={{ zIndex: 30 }} onClick={() => setOpen(false)} />
          <div className="sheet" style={{ zIndex: 31, textAlign: 'left' }} role="dialog" aria-modal="true" aria-label={`How to do ${node.name}`}>
            <div className="head">
              <h3>How to do it</h3>
              <button className="pillbtn" aria-label="Close demo" onClick={() => setOpen(false)}>Done</button>
            </div>
            <div className="demo">
              {failed ? (
                <p className="sub">Couldn't load the demo. It needs a connection the first time.</p>
              ) : (
                <img src={src} alt={`${node.name} demonstration`} width={180} height={180} onError={() => setFailed(true)} />
              )}
            </div>
            <p className="sub">{node.cue}</p>
            <p className="sub" style={{ fontSize: 11 }}>{DEMO_CREDIT}</p>
          </div>
        </>
      )}
    </>
  )
}
```

Append to `src/styles.css`:

```css
.howto { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; min-height: 30px; border-radius: 999px; background: var(--fill); color: var(--blue); font-size: 13px; font-weight: 600; }
.howto::before { content: ''; border-left: 7px solid var(--blue); border-top: 4.5px solid transparent; border-bottom: 4.5px solid transparent; }
.demo { display: grid; place-items: center; min-height: 220px; margin: 12px 0; border-radius: 16px; background: #fff; }
.demo img { width: 200px; height: 200px; image-rendering: auto; }
```

`src/ui/LogScreen.tsx`: import `DemoButton`; inside the `.pills` div after the goal pill add `<DemoButton node={node} />`.

`src/ui/NodeSheet.tsx`: import `DemoButton`; inside `.pills` after the Skill pill add `<DemoButton node={node} />`.

`vite.config.ts`: inside `workbox`, next to `globPatterns`, add runtime caching so a viewed demo also works offline:

```ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\//,
            handler: 'CacheFirst',
            options: { cacheName: 'demos', expiration: { maxEntries: 60, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build` → Expected: PASS; the build output still lists `sw.js`.

```bash
git add -A && git commit -m "feat: How-to demo button for exercises with a matching GIF" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 6: New day while the app is open

**Files:** Create `src/lib/useToday.ts`. Modify `src/App.tsx`, `src/App.test.tsx`.

**Interfaces:** `useToday(): string` (local `YYYY-MM-DD`, re-checked every minute, on `visibilitychange` and on window `focus`). `Shell` keys `TodayScreen` and `LogScreen` by the day so their local state (Train anyway, warm-up ticks, rep stepper) resets on a new day.

- [ ] **Step 1: Failing test**

Append to `src/App.test.tsx`:

```tsx
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
```

Run: `npx vitest run src/App.test.tsx` → Expected: FAIL (still "Pull Day").

- [ ] **Step 2: Implement**

`src/lib/useToday.ts`:

```ts
import { useEffect, useState } from 'react'
import { localDate } from './time'

/** Today's local date; updates when the app comes back to the foreground or the minute ticks over midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => localDate())
  useEffect(() => {
    const check = () => setToday(localDate())
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
```

`src/App.tsx` `Shell`: `const today = useToday()` (import it); change the two renders to

```tsx
      {tab === 'today' && <TodayScreen key={today} onOpen={setLogId} onSettings={() => setSettings(true)} />}
      ...
      {logId && <LogScreen key={`${logId}:${today}`} nodeId={logId} onClose={() => setLogId(null)} />}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit` → Expected: PASS.

```bash
git add -A && git commit -m "fix: Today and Log follow the date when the app stays open past midnight" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 7: Hold timer: Done during a hold, wake lock, ring dot

**Files:** Modify `src/ui/HoldTimer.tsx`, `src/ui/HoldTimer.test.tsx`, `src/ui/LogScreen.tsx`, `src/App.test.tsx`.

**Interfaces:** `HoldTimer` gains optional `onRunningChange?: (startedAt: number | null) => void`. `LogScreen` asks before closing while a hold runs.

- [ ] **Step 1: Failing tests**

In the existing test `'moves the ring smoothly…'` add `await act(async () => { vi.advanceTimersByTime(16) })` right after the Start click, before the first `offset()` sample (at 0:00 there is no arc any more).

Then append to `src/ui/HoldTimer.test.tsx` (inside the existing describe):

```tsx
  it('draws no progress arc at 0:00', () => {
    render(<HoldTimer target={30} onStop={() => {}} />)
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1)
  })

  it('releases a wake lock that is granted after the hold already stopped', async () => {
    const release = vi.fn(() => Promise.resolve())
    let grant: (v: unknown) => void = () => {}
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => new Promise((r) => { grant = r }) } })
    render(<HoldTimer target={30} onStop={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop and Log' })) })
    await act(async () => { grant({ release }) })
    expect(release).toHaveBeenCalled()
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
  })
```

Append to `src/App.test.tsx`:

```tsx
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
```

Run: `npx vitest run` → Expected: FAIL.

- [ ] **Step 2: Implement**

`src/ui/HoldTimer.tsx`:
1. Signature: `export function HoldTimer({ target, onStop, onRunningChange }: { target: number; onStop: (seconds: number) => void; onRunningChange?: (startedAt: number | null) => void })`.
2. Add `const running = useRef(false)` next to `lock`.
3. Replace `start` and `stop` with:

```tsx
  const start = async () => {
    const now = Date.now()
    running.current = true
    setElapsed(0)
    setStartedAt(now)
    onRunningChange?.(now)
    try {
      const l = (await navigator.wakeLock?.request('screen')) ?? null
      // the hold may have stopped (or the screen closed) while the lock was being granted
      if (running.current) lock.current = l
      else void l?.release().catch(() => {})
    } catch {
      /* wake lock unsupported or denied: the timer still works */
    }
  }

  const stop = () => {
    if (startedAt === null) return
    const seconds = Math.floor((Date.now() - startedAt) / 1000)
    running.current = false
    setStartedAt(null)
    onRunningChange?.(null)
    void lock.current?.release().catch(() => {})
    lock.current = null
    onStop(seconds)
  }
```

4. Change the unmount cleanup to `useEffect(() => () => { running.current = false; void lock.current?.release().catch(() => {}) }, [])`.
5. Render the progress arc only when there is progress: wrap the second `<circle>` as `{progress > 0 && (<circle ... />)}`.

`src/ui/LogScreen.tsx`:
1. Imports: `ConfirmSheet` from `'./ConfirmSheet'`, `formatClock` from `'../lib/time'` (merge with the existing `localDate` import).
2. State: `const [holdStart, setHoldStart] = useState<number | null>(null)` and `const [askClose, setAskClose] = useState(false)`.
3. Done button: `onClick={() => (holdStart !== null ? setAskClose(true) : onClose())}`.
4. HoldTimer: `<HoldTimer target={node.goal.target} onStop={(s) => record(s)} onRunningChange={setHoldStart} />`.
5. Before `{editN >= 0 && (` add:

```tsx
      {askClose && holdStart !== null && (
        <ConfirmSheet
          title="A hold is running"
          message={`${formatClock((Date.now() - holdStart) / 1000)} so far. Log it before you leave?`}
          actions={[
            { label: 'Log It', tone: 'primary', onClick: () => { const s = Math.floor((Date.now() - holdStart) / 1000); if (s >= 1) log(nodeId, s); onClose() } },
            { label: 'Discard', tone: 'danger', onClick: onClose },
          ]}
          onCancel={() => setAskClose(false)}
        />
      )}
```

"Log It" saves the set directly and closes; if that set completes the goal, the Level Up button waits on the Log screen next time (no sheet pops up during leaving).

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit` → Expected: PASS.

```bash
git add -A && git commit -m "fix: ask before leaving a running hold, release late wake locks, no ring dot at 0:00" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 8: Onboarding double tap, accessibility, status bar

**Files:** Modify `src/ui/Onboarding.tsx` (rewrite), `src/ui/TreeView.tsx`, `src/ui/LogScreen.tsx`, `src/App.tsx`, `index.html`, `src/App.test.tsx`.

**Interfaces:** `Onboarding` exports `onboardingTuning = { answerLockMs: 350 }` (tests set it to 0 so fast scripted taps work; one test keeps it to prove double taps are ignored). Tree node accessible names become `"<name>, <locked|unlocked|focus|completed>"` plus `", skill"` for skill steps.

- [ ] **Step 1: Update tree names in existing tests, then write failing tests**

```bash
sed -i '' "s/Chest-to-wall handstand hold, available/Chest-to-wall handstand hold, unlocked, skill/; s/Chest-to-wall handstand hold, focus/Chest-to-wall handstand hold, focus, skill/; s/, available'/, unlocked'/g" src/App.test.tsx
grep -n "available'" src/App.test.tsx || echo "no stale tree names"
```

Expected: `no stale tree names`.

At the top of `src/App.test.tsx` import `onboardingTuning` from `'./ui/Onboarding'`, and add to the existing top-level `beforeEach`: `onboardingTuning.answerLockMs = 0`.

Append:

```tsx
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
    expect(screen.getByRole('button', { name: 'Diamond push-up, unlocked' })).toBeInTheDocument()
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
```

Run: `npx vitest run` → Expected: the new tests FAIL, and every earlier test still PASSES after the sed.

- [ ] **Step 2: Onboarding rewrite (no auto-advance effect, answer lock)**

`src/ui/Onboarding.tsx`:

```tsx
import { useRef, useState } from 'react'
import { BRANCHES } from '../engine/graph'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

/** Ignore a second tap this soon after an answer (a double tap would otherwise answer the next question). */
export const onboardingTuning = { answerLockMs: 350 }

/** step -1 = intro, 0..3 = one branch each, 4 = summary */
export function Onboarding() {
  const { progress, byId, levelUp, finishOnboarding } = useProgress()
  const [step, setStep] = useState(-1)
  const lastAnswer = useRef(-Infinity)

  // skip branches with nothing left to ask, so no empty frame is ever drawn
  let s = step
  while (s >= 0 && s < BRANCHES.length && !progress.focus[BRANCHES[s]]) s++
  const branch = s >= 0 && s < BRANCHES.length ? BRANCHES[s] : null
  const node = branch ? byId.get(progress.focus[branch]!) : undefined

  const answer = (fn: () => void) => () => {
    const now = Date.now()
    if (now - lastAnswer.current < onboardingTuning.answerLockMs) return
    lastAnswer.current = now
    fn()
  }

  let body
  if (s === -1) {
    body = (
      <>
        <h1 className="large">Find your level</h1>
        <p className="sub" style={{ margin: '8px 0 24px' }}>
          Answer a few quick questions so Up starts each muscle group at the right exercise. It takes about a minute.
        </p>
        <button className="cta" onClick={() => setStep(0)}>Start</button>
        <button className="cta sec" onClick={finishOnboarding}>Skip for now</button>
      </>
    )
  } else if (branch && node) {
    body = (
      <>
        <div className="eyebrow">{BRANCH_META[branch].label} · {s + 1} of {BRANCHES.length}</div>
        <h1 className="large" style={{ fontSize: 26, margin: '8px 0' }}>{node.name}</h1>
        <p style={{ fontSize: 17, margin: '8px 0' }}>Can you do {goalText(node.goal)} clean {node.name}?</p>
        <p className="sub">{node.cue}</p>
        <button className="cta" style={{ marginTop: 24 }} onClick={answer(() => levelUp(node.id, null))}>Yes</button>
        <button className="cta sec" onClick={answer(() => setStep(s + 1))}>Not yet</button>
      </>
    )
  } else {
    body = (
      <>
        <h1 className="large">You're set</h1>
        <div className="group">
          {BRANCHES.map((b) => {
            const id = progress.focus[b]
            return (
              <div className="row" key={b}>
                <span className="t"><b>{BRANCH_META[b].label}: {id ? byId.get(id)!.name : 'Complete'}</b></span>
              </div>
            )
          })}
        </div>
        <button className="cta" onClick={finishOnboarding}>Start Training</button>
      </>
    )
  }

  return (
    <div className="log onboarding" role="dialog" aria-modal="true" aria-label="Find your level">
      <div className="screen" style={{ textAlign: 'left' }}>{body}</div>
    </div>
  )
}
```

- [ ] **Step 3: Tree names, rep announcement, inert background, status bar**

`src/ui/TreeView.tsx`: add `const WORD = { locked: 'locked', available: 'unlocked', focus: 'focus', completed: 'completed' } as const` above the component and change the node `aria-label` to `` `${node.name}, ${WORD[state]}${isSkill ? ', skill' : ''}` ``.

`src/ui/LogScreen.tsx`: add `aria-live="polite"` to the `<div className="big" data-testid="rep-value">`.

`src/App.tsx` `Shell`: compute `const overlay = !!logId || settings || !progress.onboarded` and wrap the four tab screens and `<TabBar>` in `<div inert={overlay}>…</div>`; the overlays (`LogScreen`, `SettingsScreen`, `Onboarding`) and `<AutoBackup />` stay outside that div.

`index.html`: change the status bar meta to `<meta name="apple-mobile-web-app-status-bar-style" content="default" />` (readable in light and dark mode).

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build` → Expected: PASS.

```bash
git add -A && git commit -m "fix: onboarding ignores double taps, clearer tree names, inert background, announced reps, readable status bar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
```

---

### Task 9: Data repo, token guide, browser check, docs, deploy

**Files:** Create `docs/BACKUP.md`. Modify `AGENTS.md`, `docs/PLAN.md`, `docs/DECISIONS.md`.

- [ ] **Step 1: Create the private data repo** (approved by the user in round 4)

```bash
gh repo create Choralet/up-data --private --add-readme --description "Private backup of the Up app's progress"
gh repo view Choralet/up-data --json visibility --jq .visibility
```

Expected: `PRIVATE`.

- [ ] **Step 2: Write `docs/BACKUP.md`**

A short, plain-language guide: (1) on github.com open Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token; (2) name "Up backup", expiration of your choice (you will need a new token when it expires); (3) Repository access: **Only select repositories → up-data**; (4) Permissions → Repository permissions → **Contents: Read and write** (Metadata read-only is added automatically); (5) Generate, copy; (6) in Up: Today → gear → GitHub backup → owner `Choralet`, repository `up-data`, paste the token → Connect → Back Up Now. Explain: the token stays on the phone, only goes to api.github.com, can only touch `up-data`; backups happen automatically when you leave the app; restore on a new phone with the same steps and "Restore from GitHub". Add the file-export alternative.

- [ ] **Step 3: Browser check** with the Chrome DevTools driver used in Plans 1 and 2 (390×844 mobile, pinned Monday). Check: Settings shows Backup and GitHub sections with no horizontal overflow; typing into the token field does not zoom (font-size ≥ 16px computed); Export works (in headless Chrome it falls back to the download link, no error); How-to on Incline push-up loads the GIF (`img.naturalWidth > 0`) and shows the credit; the tree names; no console errors. Look at 2–3 GIFs (screenshot the demo sheet) to confirm they show the right move; remove any mapping that does not, and re-run `npx vitest run`.

- [ ] **Step 4: Docs**

`AGENTS.md` "Current status": Plans 1–3 built and deployed; list backup (file + GitHub, `docs/BACKUP.md`), demos, polish; next steps are whatever the user reports from real iPhone use. `docs/PLAN.md` milestones 6–8 marked **Done (Plan 3)**. `docs/DECISIONS.md`: add a "Plan 3 built" section (auto-backup on leaving the app, import replaces with confirmation, 19 demos hotlinked from a pinned commit, `Choralet/up-data` created private) and mark the deferred minors from both reviews as fixed.

- [ ] **Step 5: Commit, push, verify deploy**

```bash
git add -A && git commit -m "docs: backup guide; mark Plan 3 done" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FqSb45E33wccDyoPGpdD6R"
git push
```

Watch the run for the pushed commit to success and check the live bundle name equals the local `dist/assets/index-*.js`.

- [ ] **Step 6: Hand over**

Tell the user how to set up GitHub backup (point to `docs/BACKUP.md`, the token step is theirs), how to export a file, and to try How-to on an exercise that has one (for example Push-up or Pull-up).
