export function LogScreen({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  return (
    <div className="log">
      <div className="screen">
        <button className="close" onClick={onClose}>Done</button>
        <div>{nodeId}</div>
      </div>
    </div>
  )
}
