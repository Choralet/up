import { useState } from 'react'
import { NODES } from './data/nodes'
import { useToday } from './lib/useToday'
import { ProgressProvider, useProgress } from './store/ProgressContext'
import { ServicesProvider, realServices, type Services } from './store/services'
import { idbStorage, type ProgressStorage } from './store/storage'
import { AutoBackup } from './ui/AutoBackup'
import { LogScreen } from './ui/LogScreen'
import { Onboarding } from './ui/Onboarding'
import { ProgressScreen } from './ui/ProgressScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { SkillsScreen } from './ui/SkillsScreen'
import { TabBar, type Tab } from './ui/TabBar'
import { TodayScreen } from './ui/TodayScreen'
import { TreeScreen } from './ui/TreeScreen'

function Shell() {
  const { progress } = useProgress()
  const today = useToday()
  const [tab, setTab] = useState<Tab>('today')
  const [logId, setLogId] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  // screens behind a full-screen overlay are inert, so VoiceOver cannot wander into them
  const overlay = !!logId || settings || !progress.onboarded
  return (
    <div className="app">
      <div inert={overlay}>
        {tab === 'today' && <TodayScreen key={today} settingsOpen={settings} onOpen={setLogId} onSettings={() => setSettings(true)} />}
        {tab === 'tree' && <TreeScreen onLog={setLogId} />}
        {tab === 'skills' && <SkillsScreen onLog={setLogId} />}
        {tab === 'progress' && <ProgressScreen />}
        <TabBar tab={tab} onChange={setTab} />
      </div>
      {/* not keyed by day: a hold or sheet open at midnight must survive; sets use the date at tap time */}
      {logId && <LogScreen key={logId} nodeId={logId} onClose={() => setLogId(null)} />}
      {settings && <SettingsScreen onClose={() => setSettings(false)} />}
      {!progress.onboarded && <Onboarding />}
      <AutoBackup />
    </div>
  )
}

export default function App({ storage = idbStorage, services = realServices }: { storage?: ProgressStorage; services?: Services }) {
  return (
    <ServicesProvider value={services}>
      <ProgressProvider storage={storage} nodes={NODES}>
        <Shell />
      </ProgressProvider>
    </ServicesProvider>
  )
}
