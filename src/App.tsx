import { useState } from 'react'
import { NODES } from './data/nodes'
import { ProgressProvider } from './store/ProgressContext'
import { idbStorage, type ProgressStorage } from './store/storage'
import { LogScreen } from './ui/LogScreen'
import { TabBar, type Tab } from './ui/TabBar'
import { TodayScreen } from './ui/TodayScreen'
import { TreeScreen } from './ui/TreeScreen'

function Shell() {
  const [tab, setTab] = useState<Tab>('today')
  const [logId, setLogId] = useState<string | null>(null)
  return (
    <div className="app">
      {tab === 'today' ? <TodayScreen onOpen={setLogId} /> : <TreeScreen onLog={setLogId} />}
      <TabBar tab={tab} onChange={setTab} />
      {logId && <LogScreen nodeId={logId} onClose={() => setLogId(null)} />}
    </div>
  )
}

export default function App({ storage = idbStorage }: { storage?: ProgressStorage }) {
  return (
    <ProgressProvider storage={storage} nodes={NODES}>
      <Shell />
    </ProgressProvider>
  )
}
