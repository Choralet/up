import { useMemo, useState } from 'react'
import { DAY_BRANCHES, DAY_LABEL, HAND_BALANCE_SKILLS, PLAN_DAYS, WARMUP, WEEKDAYS, WRIST_PREP } from '../data/schedule'
import { EQUIPMENT } from '../data/trees'
import { SKILLS } from '../data/skills'
import type { DayType, ExerciseNode } from '../data/types'
import { goalMet, todayState, todaysValues } from '../engine/progress'
import { buildWorkout, estimateMinutes, nextTrainingDay, workoutDone, type MainItem } from '../engine/workout'
import { FinishSheet } from './FinishSheet'
import { gearText, goalText } from '../lib/format'
import { localDate, weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { AchievementCard } from './AchievementCard'
import { BackupNotice } from './BackupNotice'
import { BRANCH_META, accentStyle, nodeAccent } from './branches'
import { trackById } from '../data/tracks'
import { Icon, type IconName } from './Icon'
import { skillName } from '../data/names'
import { BranchBadges, BranchLevel, Streak } from './Level'

const ANYWAY_LABEL: Record<Exclude<DayType, 'rest'>, string> = { push: 'Push', pull: 'Pull', legs: 'Legs + Core', full: 'Full Body' }
const ANYWAY_ACCENT = { push: 'push', pull: 'pull', legs: 'legs', full: 'push' } as const

/** "Needs Dip bars, Rings or Parallettes" plus a tip when a household stand-in works. */
export function needsText(options: string[][]): string {
  const text = `Next needs ${options.map((o) => gearText(o, EQUIPMENT)).join(' or ')}.`
  const all = options.flat()
  const tip = all.includes('pt') || all.includes('dip') ? ' Two sturdy chairs work as parallettes.' : all.includes('low') || all.includes('box') ? ' A sturdy table or chair counts.' : ''
  return text + tip
}

export function TodayScreen({ onOpen, onSettings, settingsOpen = false }: { onOpen: (nodeId: string) => void; onSettings: () => void; settingsOpen?: boolean }) {
  const { nodes, progress, setDayPick, toggleWarm, setPlan, setSettings } = useProgress()
  const now = new Date()
  const today = localDate(now)
  // saved per date, so it survives tab switches and reloads, and a new day starts fresh
  const { pick, warm } = todayState(progress, today)
  const weekday = weekdayIndex(now)
  const day = pick ?? progress.schedule[weekday]
  const workout = useMemo(() => buildWorkout(nodes, progress, day, SKILLS, progress.settings.length, today), [nodes, progress, day, today])
  const next = nextTrainingDay(progress.schedule, weekday)
  const heading = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const [finishing, setFinishing] = useState(false)
  const unit = (node: ExerciseNode) => (node.goal.type === 'hold' ? ' s' : '')

  const quest = (node: ExerciseNode, tag?: string, keep = false) => {
    const values = todaysValues(progress, node.id, today)
    const logged = values.length
    const met = goalMet(node.goal, values)
    const status = logged === 0
      ? goalText(node.goal)
      : `${goalText(node.goal)} · ${Math.min(logged, node.goal.sets)} of ${node.goal.sets} sets · best ${Math.max(...values)}${unit(node)}`
    const icon: IconName = met ? 'check' : node.kind === 'skill' ? 'bolt' : node.branch
    return (
      <button className={`quest${node.kind === 'skill' ? ' skill' : ''}${keep ? ' keep' : ''}`} key={`${tag ?? 'main'}:${node.id}`} style={nodeAccent(node)} onClick={() => onOpen(node.id)}>
        <span className="qicon" aria-hidden="true"><Icon name={icon} /></span>
        <span className="t">
          {(tag || node.kind === 'skill') && <span className={`tag${tag ? ' extra' : ''}`}>{tag ?? skillName(node.skill!, node.id)}</span>}
          <b>{node.name}</b>
          <span>{status}</span>
        </span>
        {met ? <span className="tick" role="img" aria-label="Goal reached"><Icon name="check" /></span>
          : logged >= node.goal.sets ? <span className="tick done" role="img" aria-label="Sets done"><Icon name="check" /></span>
          : <Icon name="chevron" className="chev" />}
      </button>
    )
  }
  const anyLogged = progress.logs.some((l) => l.date === today)
  const accent = day === 'rest' ? 'push' : day === 'full' ? 'push' : DAY_BRANCHES[day][0]
  const handBalance = Object.keys(progress.skillFocus).some((c) => HAND_BALANCE_SKILLS.includes(c))
  const warmup = day === 'rest' ? [] : [...(handBalance ? [WRIST_PREP] : []), ...WARMUP[day]]
  const trainAnyway = PLAN_DAYS[progress.settings.plan] as Exclude<DayType, 'rest'>[]

  const mainRow = (m: MainItem) => {
    const t = trackById(m.track)!
    const rows = []
    if (m.node) rows.push(quest(m.node, m.keep ? `${t.name} · Keep building` : t.name, m.keep))
    if (m.needs) {
      rows.push(
        <div className="quest flat" key={`needs:${m.track}`} style={accentStyle(t.branch)}>
          <span className="qicon" aria-hidden="true"><Icon name="dots" /></span>
          <span className="t"><span className="tag extra">{t.name}</span><b>{m.node ? 'Nothing new you can do yet' : 'Nothing you can do yet'}</b><span>{needsText(m.needs)}</span></span>
        </div>,
      )
    } else if (!m.node) {
      rows.push(
        <div className="quest flat" key={m.track} style={accentStyle(t.branch)}>
          <span className="qicon" aria-hidden="true"><Icon name="check" /></span>
          <span className="t"><span className="tag extra">{t.name}</span><b>{BRANCH_META[t.branch].label}</b><span>Track complete</span></span>
        </div>,
      )
    }
    return rows
  }
  const pairs = [...new Set(workout.main.map((m) => m.pair).filter((n): n is number => !!n))]
  const pairName = (n: number) => workout.main.filter((m) => m.pair === n).map((m) => trackById(m.track)!.name).join(' + ')

  return (
    <div className="screen">
      <div className="todaytop">
        {day === 'full' && <BranchBadges />}
        {day !== 'rest' && day !== 'full' && DAY_BRANCHES[day].map((b) => <BranchLevel key={b} branch={b} />)}
        {day === 'rest' && <span className="spacer" />}
        <Streak />
      </div>
      <div className="head">
        <div>
          <div className="sub">{heading}</div>
          <h1 className="large">{DAY_LABEL[day]}</h1>
          {day !== 'rest' && workout.main.length + workout.skill.length > 0 && (
            <div className="sub">{workout.session ? `Session ${workout.session} · ` : ''}About {estimateMinutes(workout)} min</div>
          )}
        </div>
        <button className="gear" aria-label="Settings" onClick={onSettings}><Icon name="gear" size={22} /></button>
      </div>
      <BackupNotice refresh={settingsOpen} onOpen={onSettings} />
      <AchievementCard />
      {progress.settings.offerFullBody && (
        <div className="card offer" role="region" aria-label="Try full body">
          <b>Try full body, 3 days a week?</b>
          <div className="sub">Every session trains pull, push, legs and core, so each muscle and your skills get 3 sessions a week instead of 1, and pulling matches pushing. Your days stay the same.</div>
          <div className="stack">
            <button className="cta" onClick={() => setPlan('full')}>Switch to Full Body</button>
            <button className="cta sec" onClick={() => setSettings({ offerFullBody: false })}>Keep Push / Pull / Legs</button>
          </div>
        </div>
      )}

      {day === 'rest' ? (
        <>
          <div className="card">
            <b>Recovery is part of the plan.</b>
            <div className="sub">
              {next ? `Next: ${WEEKDAYS[(weekday + next.daysAhead) % 7]} · ${DAY_LABEL[next.day]}` : 'No training days are scheduled. Set some in Settings.'}
            </div>
          </div>
          <div className="hdr">Feeling fresh?</div>
          <div className="stack">
            {trainAnyway.map((d) => (
              <button key={d} className="cta sec" style={accentStyle(ANYWAY_ACCENT[d])} aria-label={`Train ${ANYWAY_LABEL[d]} Anyway`} onClick={() => setDayPick(d)}>
                Train {ANYWAY_LABEL[d]} Anyway
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {pick && (
            <button className="pillbtn" onClick={() => setDayPick(null)}>Back to {DAY_LABEL[progress.schedule[weekday]]}</button>
          )}
          <div className="hdr">Warm-up</div>
          <div className="group">
            {warmup.map((item) => {
              const key = `${day}:${item.name}`
              const on = warm.includes(key)
              return (
                <button key={key} className="check" role="checkbox" aria-checked={on} aria-label={item.name} onClick={() => toggleWarm(key)}>
                  <span className="box" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
                  <span className="lbl">{item.name}</span>
                  <span className="amount">{item.amount}</span>
                </button>
              )
            })}
          </div>

          {workout.skill.length > 0 && (
            <>
              <div className="hdr">Skill</div>
              <div className="quests">{workout.skill.map((n) => quest(n))}</div>
            </>
          )}

          {day === 'full' ? (
            <>
              {pairs.length > 0 && <p className="note">Pairs: one set of each exercise, rest, repeat.</p>}
              {pairs.map((n) => (
                <div key={n}>
                  <h2 className="hdr">Pair {n} · {pairName(n)}</h2>
                  <div className="quests">{workout.main.filter((m) => m.pair === n).flatMap(mainRow)}</div>
                </div>
              ))}
              {workout.extra.some((e) => e.role === 'core') && (
                <>
                  <h2 className="hdr">Core</h2>
                  <div className="quests">{workout.extra.filter((e) => e.role === 'core').map((e) => quest(e.node, trackById(e.node.track!)?.name ?? 'Core'))}</div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="hdr">Strength</div>
              <div className="quests">{workout.main.flatMap(mainRow)}</div>
            </>
          )}
          {workout.extra.some((e) => day !== 'full' || e.role !== 'core') && (
            <>
              <h2 className="hdr">Also Today</h2>
              <div className="quests">
                {workout.extra.filter((e) => day !== 'full' || e.role !== 'core').map((e) => quest(e.node, e.role === 'volume' ? 'Volume' : e.role === 'accessory' ? `Accessory · ${trackById(e.track!)!.name}` : 'Core finisher'))}
              </div>
            </>
          )}
          {workoutDone(workout, progress, today) && <div className="done-banner">Workout complete</div>}
          {anyLogged && <button className="cta" style={accentStyle(accent)} onClick={() => setFinishing(true)}>Finish Workout</button>}
        </>
      )}
      {finishing && <div className="contents" style={day !== 'rest' ? accentStyle(accent) : undefined}><FinishSheet today={today} onClose={() => setFinishing(false)} /></div>}
    </div>
  )
}
