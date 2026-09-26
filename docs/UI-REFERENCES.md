# UI Design References

Goal: an **Apple-like** app: calm, clear, native-feeling, with game moments that are rewarding but never noisy.

## Official Apple guidance (primary source, read before designing)

- [Human Interface Guidelines: home](https://developer.apple.com/design/human-interface-guidelines)
- [Workouts pattern](https://developer.apple.com/design/human-interface-guidelines/patterns/workouts/): what a workout experience should do
- [Activity rings](https://developer.apple.com/design/human-interface-guidelines/components/status/activity-rings/): the ring look. Rules: always on a black background, never recolor or filter the official rings. For our own branch rings, make **our own** ring-style component so we don't imitate Apple's official one.
- [Apple Design Awards](https://developer.apple.com/design/awards/): browse winners for the current bar of quality
- Note: my search did not surface iOS 26 / Liquid Glass material. Check the HIG "Materials" page and Xcode's latest SDK docs before building.

## Apps to study

| App | Study it for |
|---|---|
| **Apple Fitness** (built in) | Rings, big numbers, dark cards, celebratory award moments |
| **[Gentler Streak](https://developer.apple.com/news/?id=3m0ht22s)** (Apple Design Award 2024) | Soft palette, friendly copy, rest days that don't punish; [Sketch blog write-up](https://www.sketch.com/blog/gentler-streak/), [UX teardown](https://pixso.net/articles/gentler/) |
| **Duolingo** | The path/tree of nodes, the level-up celebration, streak framing (borrow structure, not the loudness) |
| **Strava** | Trophy case, personal bests, progress bars ([case study](https://trophy.so/blog/strava-gamification-case-study)) |
| **Streaks / Fitbod / Strong** | Fast logging: big steppers, pre-filled last values (check on the App Store) |
| **Calistack / Fitloop** | Direct competitors: what to do better ([Calistack](https://www.calistack.com/), [Fitloop](https://apps.apple.com/us/app/id1474941254)) |

More reading: [Fitness App UI principles (Stormotion)](https://stormotion.io/blog/fitness-app-ux/).

## Design principles for this app

1. **Native first.** System font (SF Pro), SF Symbols, standard sheets, tab bar and navigation. Don't fight the platform.
2. **Big and thumb-friendly.** Logging must work one-handed, mid-workout, with sweaty hands.
3. **Numbers are the hero.** Large rounded numerals for reps and goals.
4. **Color = branch.** One accent per branch (Push, Pull, Legs, Core), used sparingly on a neutral background.
5. **Celebrate quietly.** Level-up gets a spring animation + haptic + one short line, not confetti spam. Respect Reduce Motion.
6. **Dark and light mode**, Dynamic Type and VoiceOver from day one.
7. **Forgiving tone.** Copy like "Not yet, keep going", never guilt.

## Next design step (needs your approval)

Make 3 static mockups (Today, Skill Tree, Level Up) in light and dark, then refine before writing app code.
