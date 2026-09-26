interface Action {
  label: string
  onClick: () => void
  tone?: 'primary' | 'danger' | 'plain'
}

export function ConfirmSheet({ title, message, actions, onCancel }: { title: string; message?: string; actions: Action[]; onCancel: () => void }) {
  return (
    <>
      <div className="scrim" onClick={onCancel} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        {actions.map((a) => (
          <button
            key={a.label}
            className={a.tone === 'primary' ? 'cta' : 'cta sec'}
            style={a.tone === 'danger' ? { color: 'var(--skill)' } : undefined}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
        <button className="cta sec" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}
