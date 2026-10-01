import type { ReactElement } from 'react'

export type Tab = 'today' | 'tree' | 'skills' | 'progress'

const ICONS: Record<Tab, ReactElement> = {
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M3.5 9.5 H20.5 M8 3 V6.5 M16 3 V6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="2" fill="currentColor" />
    </>
  ),
  tree: (
    <>
      <path d="M12 20 V13 M12 13 L6.5 7.5 M12 13 L17.5 7.5 M12 13 V6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1.8" fill="currentColor" />
      <circle cx="6" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="4.5" r="2.2" fill="currentColor" />
      <circle cx="18" cy="6.5" r="2.2" fill="currentColor" />
    </>
  ),
  skills: <path d="M12 3.5 L14.4 9 L20.3 9.4 L15.8 13.2 L17.2 19 L12 15.9 L6.8 19 L8.2 13.2 L3.7 9.4 L9.6 9 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />,
  progress: <path d="M5 20 V13 M10 20 V9 M15 20 V11 M20 20 V5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
}

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
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">{ICONS[t.id]}</svg>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
