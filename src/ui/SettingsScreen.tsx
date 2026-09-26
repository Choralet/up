import { useRef, useState } from 'react'
import { BackupError, exportBackup, parseBackup } from '../engine/backup'
import type { Progress } from '../engine/progress'
import { plural } from '../lib/format'
import { localDate } from '../lib/time'
import { useServices } from '../store/services'
import { ConfirmSheet } from './ConfirmSheet'
import { GithubSection } from './GithubSection'
import { DAY_LABEL, DAY_TYPES, WEEKDAYS } from '../data/schedule'
import type { DayType } from '../data/types'
import { useProgress } from '../store/ProgressContext'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { progress, nodes, setDayType, restartOnboarding, replaceProgress } = useProgress()
  const services = useServices()
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

        <div className="hdr">Backup</div>
        <button className="cta sec" onClick={exportFile}>Export Backup File</button>
        <button className="cta sec" onClick={() => fileInput.current?.click()}>Import Backup File</button>
        <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Import backup file" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        {message && <p className="sub" role="status">{message}</p>}
        <p className="sub">Your progress lives on this phone. Export a file now and then, or connect GitHub below.</p>
        <GithubSection onRestore={(p) => setPending(p)} />
        <div className="hdr">Level</div>
        <button className="cta sec" onClick={() => { restartOnboarding(); onClose() }}>Find your level again</button>
      </div>
      {pending && (
        <ConfirmSheet
          title="Replace your progress?"
          message={`This backup has ${plural(pending.completed.length, 'finished exercise')} and ${plural(pending.logs.length, 'logged set')}. It replaces everything on this phone.`}
          actions={[{ label: 'Replace', tone: 'danger', onClick: () => { replaceProgress(pending); setPending(null); setMessage('Backup restored.') } }]}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
