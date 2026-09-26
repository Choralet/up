# Up: App Plan (v3, now a web app)

> Status: **planning + design mockups. No app code yet.** App name: **Up**.
> Mockups: [mockups/index.html](mockups/index.html). Answers so far: [DECISIONS.md](DECISIONS.md).

## 1. The idea in one sentence

A **web app** (installed on your iPhone home screen) that turns calisthenics into a **skill tree**. Each muscle group has its own chain of exercises. Following a **daily workout plan**, you log sets, and when you hit a goal the app **suggests** leveling up to the next harder variation. Skills (handstand, planche, muscle-up...) are trained inside the same workouts.

## 2. Why this works

Calisthenics gets harder by **changing the exercise**, not adding weight. Standard rule from real programs: hit about 3×8–12 clean reps (or 30 s holds), then move to the next variation. The app makes that visible and satisfying. See [RESEARCH.md](RESEARCH.md).

## 3. Core concept

| Game term | In the app |
|---|---|
| **Branch** | Push, Pull, Legs, Core. Each is its own **branching tree**, tracked **separately** |
| **Node** | One exercise variation (e.g. "Diamond Push-up"). Has `requires` (parents) and leads to children |
| **Node states** | Locked → Available → **Focus** (what you train now) → Completed |
| **Skill nodes** | Pink diamonds near the top of a branch (Tuck planche, HSPU, One-arm...). Same tree, same rules |
| **Goal** | e.g. 3×10 reps, or 3×30 s hold. Editable |
| **Level-up suggestion** | Goal met → the app shows the newly unlocked nodes and **suggests one** → you pick your next focus or say "Not yet" |
| **Active skill** | You mark up to 2 skill chains active. They appear in the daily plan's skill block. The **Skills tab is a filtered view** of the same tree nodes |
| **Weekly streak** | Forgiving, weekly not daily |

## 3b. The skill tree is a real graph (not a list)

Because progressions branch (after a standard push-up you can go Diamond, Decline or Pike), the data is a **graph**:

- A node unlocks when **all its parents are completed** (`requires: [ids]`).
- Several nodes can be **Available** at once. You choose one **Focus** node per branch, and the app suggests the best one.
- Layout: bottom = beginner, top = hardest. Skills sit at the top as capstones. Pan and zoom on the phone.
- Tap a node to see what it requires, what it unlocks, its goal and form cues.
- Mockups 4, 5 and 6 show this: [mockups/index.html](mockups/index.html).
- Skill prerequisites stay **soft**: you may see a dashed "recommended" link, never a hard lock.

## 4. Onboarding: "Find your level" (about 2 minutes)

Since you install and test your level in the app:

1. For each branch, the app walks up the chain one step at a time: *"Can you do 8 clean Knee Push-ups?"* → Yes → next harder → ... → first "Not yet" is your **starting node**.
2. Each answer can be a real attempt (log reps) or a quick yes/no. Skippable, and you can change it later.
3. Pick your workout days and 1–2 skills. Done.

## 5. Workout plan (per day, easy to follow)

Default schedule: **3 days a week: Push, Pull, Legs + Core** (e.g. Mon/Wed/Fri). You can choose your days. Optional later: 6-day split (each twice).

Each day is one screen with the same shape:

| Block | Content | Time |
|---|---|---|
| 1. Warm-up | Short checklist (shoulders, wrists, hips) | 5 min |
| 2. **Skill** | Your selected skill for that day, first while fresh. Holds or few quality reps | 10–15 min |
| 3. Main | Current node of each branch trained that day, 3 sets each | 25–30 min |
| 4. Finish | Core or accessory | 5–10 min |

Which skills land on which day (from research):

| Day | Skills that fit |
|---|---|
| **Push** | Handstand, Handstand push-up, Planche, One-arm push-up |
| **Pull** | Muscle-up, Front lever, Back lever, One-arm pull-up, Human flag |
| **Legs + Core** | Pistol squat, L-sit, Dragon flag |

Example, **Push Day**: Warm-up → **Skill: Handstand, Chest-to-wall hold 4×20 s** → Diamond push-up 3×10 → Negative dip 3×8 → Pike push-up 3×8 → Plank 3×30 s.

The app then **records** everything: skill sets count toward that skill's steps, and main sets count toward branch progress.

## 6. Logging (kept simple)

- **Reps:** big number stepper, last value pre-filled, one tap to log.
- **Holds** (dead hang, planche lean, L-sit...): a built-in **hold timer**. Start, it counts up, stop, logs seconds.
- **No rest timer** (your choice), no notes in v1.
- Level-up suggestion appears after a logged set meets the goal.

## 7. Screens (customizable, see below)

1. **Today**: workout for today, week strip, Start button
2. **Log set**: rep stepper and hold timer variants, with a small **How-to** button (only if a demo exists)
3. **Skill Tree**: one branch at a time, vertical path of nodes
4. **Level-up suggestion**: sheet with Level up / Not yet
5. **Skills**: your active skills and steps, plus the library
6. **Progress**: branch rings, weekly streak, personal bests
7. **Schedule**: choose days, skills
8. **Onboarding: Find your level**

**Customizable in the app (your request):** training days, which 1–2 skills are active, which node is your focus, and every goal (reps, seconds, sets). Nothing is fixed.

Mockups of the key ones: [mockups/index.html](mockups/index.html).

## 8. Game feel: quiet

Rings, subtle haptics, one short line at level-up, no confetti, no leaderboards. A few small badges later (v2).

## 9. Tech direction (web app)

- **React + TypeScript + Vite**, built as a **PWA** (installable, works offline via a service worker)
- **Apple-like look** with our own CSS: system font stack (`-apple-system`), rounded cards, sheets, dark mode, safe-area insets. Tree drawn as **SVG**.
- Hosted free on **GitHub Pages** (public repo; the repo holds only code, never your data)
- **Data lives on your phone** (IndexedDB), no account
- Nodes, prerequisites and demo links in **bundled JSON**
- Level-up logic is pure and unit-tested (Vitest). UI is checked in a real browser at phone size.
- Data model sketch: `Node (id, branch, isSkill, requires[], goalType, goal, cues, demo?)`; `Progress (state per node, focus per branch, activeSkills)`; `WorkoutPlan (day → blocks)`; `SetLog (nodeId, reps/seconds, date)`

## 9b. Saving your data ("on GitHub")

**Important:** GitHub Pages only serves files. It **cannot store your workout data**. Your data is stored in the phone's browser storage. To meet your goal of not losing it:

| Layer | What | Default |
|---|---|---|
| Local | IndexedDB in the home-screen app | Always on |
| Export / Import | Save a JSON backup file, restore it later | Always available |
| **GitHub backup** (recommended) | Button "Back up to GitHub" writes `up-data.json` into a **separate private repo** using a fine-grained token limited to that one repo. "Restore from GitHub" reads it back. Works across devices | Optional, you set it up once |

Token risk: the token is stored on your phone only. Scope it to one repo, contents read/write only. It is a personal-use tradeoff, and I recommend it over a paid server.

Note: iOS can clear web storage in rare cases (very low space, or the app not being used for a long time), so the backup matters.

## 9c. What a web app can NOT do on iPhone

- **No Apple Health**, no home-screen **widgets**, no real haptics (mostly unsupported on iOS web). Removed from the roadmap.
- Screen can sleep during a hold. The timer uses timestamps, and we use the Wake Lock API where supported.
- Reminders/notifications are possible only in limited ways. Not in v1.

## 10. Getting it on your iPhone

1. We publish to `https://<your-github-name>.github.io/up/`.
2. On iPhone open it in **Safari** → Share → **Add to Home Screen**. It opens full-screen like an app.
3. **No Xcode, no SideStore, no 7-day expiry, no $99.** Updates appear the next time you open it.

Your GitHub CLI is already logged in as **Choralet**, so I can create the repo and set up publishing when we build.

## 10b. How-to demos (small button)

See [DEMOS.md](DEMOS.md). Short version: good GIF sources exist, but the ones with good calisthenics coverage are © Gym visual and need a license. A safe public-domain set covers only about a fifth of the nodes. The button only appears when a demo exists. **Your decision needed.**

## 11. Milestones

| # | Milestone | Result |
|---|---|---|
| 0 | Plan, research, references | Done |
| 1 | Mockups + name | Done, awaiting your final OK on this plan |
| 2 | Project setup: Vite/React/TS, GitHub repo, auto-deploy to Pages | **Done** |
| 3 | Data (node graph JSON) + level-up logic, tested | **Done** |
| 4 | Today, Log (reps + hold timer), Skill Tree, Level-up screens | **Done** (Plan 1) |
| 5 | Skills, Find-your-level onboarding, customizing days/skills/goals | Full v1 |
| 6 | Backup: export/import, then GitHub backup | Data safe |
| 7 | How-to demos (per your choice) | Optional button |
| 8 | Polish (dark mode, accessibility, offline) | Apple-feeling |

Apple Health and widgets are dropped (web app). 

## 12. Still open

See the end of the chat message and [DECISIONS.md](DECISIONS.md).
