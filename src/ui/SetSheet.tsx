import { useState, type CSSProperties } from 'react'

interface Props {
  number: number
  unit: string
  initial: number
  color: string
  onSave: (value: number) => void
  onRemove: () => void
  onClose: () => void
}

/** Sheet for fixing one logged set: change its value or remove it. */
export function SetSheet({ number, unit, initial, color, onSave, onRemove, onClose }: Props) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet center" role="dialog" aria-modal="true" aria-label={`Set ${number}`} style={{ '--accent': color } as CSSProperties}>
        <div className="eyebrow">Set {number}</div>
        <div className="big" style={{ fontSize: 64, margin: '8px 0' }} data-testid="set-value">{value}{unit}</div>
        <div className="steps" style={{ margin: '8px 0 12px' }}>
          <button aria-label="Decrease set value" onClick={() => setValue((v) => Math.max(1, v - 1))}>−</button>
          <button aria-label="Increase set value" onClick={() => setValue((v) => v + 1)}>+</button>
        </div>
        <button className="cta" style={{ background: 'var(--accent)' }} onClick={() => onSave(value)}>Save</button>
        <button className="cta sec" style={{ color: 'var(--skill)' }} onClick={onRemove}>Remove Set</button>
        <button className="cta sec" onClick={onClose}>Cancel</button>
      </div>
    </>
  )
}
