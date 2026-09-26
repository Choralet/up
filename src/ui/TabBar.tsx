export type Tab = 'today' | 'tree' | 'skills' | 'progress'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tree', label: 'Tree' },
  { id: 'skills', label: 'Skills' },
  { id: 'progress', label: 'Progress' },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <i aria-hidden="true" />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
