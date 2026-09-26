# Exercise Demo Media (research, 2026-09-26)

Goal: a **small "How-to" button** on an exercise that shows a short correct-form animation. **Hidden unless a demo exists.** No custom stick figures. No searching the web mid-workout.

## Findings

| Source | Media | License | Coverage of our nodes | Verdict |
|---|---|---|---|---|
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | 2 still photos per exercise (start and end pose), 876 exercises. Not GIFs | **Public domain (Unlicense)** | Basics only. Found: push-up, incline/decline push-up, handstand push-up, chin-up, pull-up, scapular pull-up, inverted row, dips, bench dips, bodyweight squat, split squat, plank, dead bug, hanging leg raise, glute bridge. **Missing:** wall/knee/diamond/archer/pike push-up, every skill (planche, lever, muscle-up, L-sit, pistol, dragon flag) | Safe to use. Only about 1 in 5 nodes. |
| [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (1,324 GIFs, 180×180) | Animated GIFs | Media is **© Gym visual**, redistributed by that repo with permission; **you must get your own license from Gym visual** | **Good:** archer push-up, diamond, decline, incline, pike variants, lean/frog/full planche, front lever, back lever, muscle-up, L-sit, pistol squat, handstand, inverted row, skin the cat, scapular pull-up, dead bug. **Missing:** dragon flag, hollow hold, wall/knee push-up, dead hang | Best coverage, but licensing problem (below) |
| [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api) | GIFs (1,500 in the free version) | Free tier is **non-commercial + attribution**; the free endpoint is described as unstable, rate-limited and not for production. Origin of the media is not stated in what I could read | I could not fully check coverage (the API's search did not work in my test) | Not recommended |

## The Gym visual licensing problem

[Gym visual's terms](https://gymvisual.com/content/3-terms-and-conditions-of-use) say media may **not be redistributed** in any form, the license is **per account** and cannot be passed to others, and websites/apps are an allowed use *for the licensed account owner*. Copying those GIFs into your public GitHub repo, or linking to someone else's copy, is a gray area at best. I did not verify Gym visual's price. Do not treat this as legal advice.

## Decision: option 3 chosen by the user (personal use)

## Options considered

1. **Public domain only (safe, default).** Use free-exercise-db photos (2-frame flip). Button shows only on about a fifth of nodes, mostly basics.
2. **Add Gym visual GIFs by buying your own license** from Gym visual, then host them in the app. Best coverage, real cost, done properly.
3. **Personal-use gray area:** hotlink the GIFs from the dataset repo with the required credit "© Gym visual". Free and good coverage, but it may break the terms and it can disappear if that repo changes. I do not recommend it without you reading the terms yourself.

## How the app will handle it (any option)

- Each node has an optional `demo` field (`{ type: "images" | "gif", src, credit }`). No `demo` means no button.
- The button is small and lives on the exercise detail, log screen and the node sheet. Tapping opens a sheet with the media and a credit line.
- Media loads only when the button is tapped (keeps the app fast and small).
- Credits shown in the sheet and in a Settings → Credits page.
