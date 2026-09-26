export function SettingsScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="log">
      <div className="screen">
        <button className="close" onClick={onClose}>Done</button>
        <h1 className="large">Settings</h1>
      </div>
    </div>
  )
}
