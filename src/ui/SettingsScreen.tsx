import { DAY_LABEL, DAY_TYPES, WEEKDAYS } from '../data/schedule'
import type { DayType } from '../data/types'
import { useProgress } from '../store/ProgressContext'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { progress, setDayType, restartOnboarding } = useProgress()
  return (
    <div className="log">
      <div className="screen" style={{ textAlign: 'left' }}>
        <button className="close" onClick={onClose}>Done</button>
        <h1 className="large">Settings</h1>

        <div className="hdr">Weekly schedule</div>
        <div className="group">
          {WEEKDAYS.map((name, i) => (
            <label className="row selrow" key={name}>
              <span className="t"><b>{name}</b></span>
              <select aria-label={name} value={progress.schedule[i]} onChange={(e) => setDayType(i, e.target.value as DayType)}>
                {DAY_TYPES.map((t) => <option key={t} value={t}>{DAY_LABEL[t].replace(' Day', '')}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="sub">Default is Monday Push, Wednesday Pull, Friday Legs + Core. Change any day you like.</p>

        <div className="hdr">Level</div>
        <button className="cta sec" onClick={() => { restartOnboarding(); onClose() }}>Find your level again</button>
      </div>
    </div>
  )
}
