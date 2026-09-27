import { useRef, useState } from 'react'
import { BackupError, exportBackup, parseBackup } from '../engine/backup'
import { WORKOUT_LENGTHS, type Progress } from '../engine/progress'
import { plural } from '../lib/format'
import { localDate } from '../lib/time'
import { scheduleIcs } from '../lib/ics'
import { useServices } from '../store/services'
import { ConfirmSheet } from './ConfirmSheet'
import { GithubSection } from './GithubSection'
import { DAY_LABEL, DAY_TYPES, WEEKDAYS } from '../data/schedule'
import type { DayType } from '../data/types'
import { useProgress } from '../store/ProgressContext'

const LENGTH_LABEL = { short: 'Short', standard: 'Standard', full: 'Full' } as const
const LENGTH_HINT = {
  short: 'About 20 minutes: your skill and the first two exercises of the day.',
  standard: 'About 35 minutes: every exercise of the day, plus a core finisher on Push and Pull days.',
  full: 'About 50 minutes: Standard plus the variation you just finished, for extra volume.',
} as const

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { progress, nodes, setDayType, restartOnboarding, replaceProgress, setSettings } = useProgress()
  const services = useServices()
  const [askRedo, setAskRedo] = useState(false)
  const [remindAt, setRemindAt] = useState('18:00')
  const addReminders = async () => {
    try {
      await services.saveFile('up-training.ics', scheduleIcs(progress.schedule, remindAt), 'text/calendar')
    } catch {
      setMessage("Couldn't create the calendar file.")
    }
  }
  const [pending, setPending] = useState<{ progress: Progress; after?: () => void } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportFile = async () => {
    try {
      if (await services.saveFile(`up-backup-${localDate()}.json`, exportBackup(progress))) setSettings({ lastExportAt: Date.now() })
      setMessage(null)
    } catch {
      setMessage("Couldn't save the file.")
    }
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 5_000_000) {
      setMessage('That file is too big to be an Up backup.')
      if (fileInput.current) fileInput.current.value = ''
      return
    }
    try {
      setPending({ progress: parseBackup(await file.text(), nodes) })
      setMessage(null)
    } catch (e) {
      setMessage(e instanceof BackupError ? e.message : "Couldn't read that file.")
    }
    if (fileInput.current) fileInput.current.value = ''
  }
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

        <div className="hdr">Workout Length</div>
        <div className="seg" role="radiogroup" aria-label="Workout Length">
          {WORKOUT_LENGTHS.map((l) => (
            <button key={l} role="radio" aria-checked={progress.settings.length === l} className={progress.settings.length === l ? 'on' : ''} onClick={() => setSettings({ length: l })}>
              {LENGTH_LABEL[l]}
            </button>
          ))}
        </div>
        <p className="sub" style={{ margin: '0 4px' }}>{LENGTH_HINT[progress.settings.length]}</p>

        <div className="hdr">Reminders</div>
        <div className="group">
          <label className="row selrow">
            <span className="t"><b>Reminder time</b><span>On your training days</span></span>
            <input type="time" aria-label="Reminder time" value={remindAt} onChange={(e) => setRemindAt(e.target.value || '18:00')} />
          </label>
        </div>
        <button className="cta sec" onClick={addReminders}>Add Reminders to Calendar</button>
        <p className="sub" style={{ margin: '0 4px' }}>Opens a calendar file: add it to Apple Calendar to get an alert each training day. Add it again after you change your schedule.</p>

        <div className="hdr">Hold Timer</div>
        <div className="group">
          <button className="row switchrow" role="switch" aria-checked={progress.settings.holdSound} aria-label="Sound at Hold Goal" onClick={() => setSettings({ holdSound: !progress.settings.holdSound })}>
            <span className="t"><b>Sound at Hold Goal</b><span>A soft tone when a hold reaches its goal</span></span>
            <span className={`switch${progress.settings.holdSound ? ' on' : ''}`} aria-hidden="true" />
          </button>
        </div>

        <div className="hdr">Backup</div>
        <button className="cta sec" onClick={exportFile}>Export Backup File</button>
        {progress.settings.lastExportAt && <p className="sub status">Last exported: {new Date(progress.settings.lastExportAt).toLocaleString()}</p>}
        <button className="cta sec" onClick={() => fileInput.current?.click()}>Import Backup File</button>
        <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Import backup file" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        {message && <p className="sub status" role="status">{message}</p>}
        <p className="sub">Your progress lives on this phone. Export a file now and then, or connect GitHub below.</p>
        <GithubSection onRestore={(p, after) => setPending({ progress: p, after })} />
        <div className="hdr">Level</div>
        <button className="cta sec" onClick={() => setAskRedo(true)}>Find Your Level Again</button>
      </div>
      {askRedo && (
        <ConfirmSheet
          title="Find your level again?"
          message="Your progress stays. The questions can only move you up, and nothing changes until you finish."
          actions={[{ label: 'Start', tone: 'primary', onClick: () => { setAskRedo(false); restartOnboarding(); onClose() } }]}
          onCancel={() => setAskRedo(false)}
        />
      )}
      {pending && (
        <ConfirmSheet
          title="Replace your progress?"
          message={`This backup has ${plural(pending.progress.completed.length, 'finished exercise')} and ${plural(pending.progress.logs.length, 'logged set')}. It replaces everything on this phone.`}
          actions={[{ label: 'Replace', tone: 'danger', onClick: () => { replaceProgress({ ...pending.progress, settings: progress.settings, day: progress.day }); pending.after?.(); setPending(null); setMessage('Backup restored.') } }]}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
