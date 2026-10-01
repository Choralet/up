import { useState } from 'react'
import { Icon } from './Icon'

interface Props {
  number: number
  unit: string
  initial: number
  onSave: (value: number) => void
  onRemove: () => void
  onClose: () => void
}

/** Sheet for fixing one logged set: change its value or remove it. */
export function SetSheet({ number, unit, initial, onSave, onRemove, onClose }: Props) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet center" role="dialog" aria-modal="true" aria-label={`Set ${number}`}>
        <div className="eyebrow">Set {number}</div>
        <div className="big md" data-testid="set-value">{value}{unit}</div>
        <div className="steps tight">
          <button aria-label="Decrease set value" onClick={() => setValue((v) => Math.max(1, v - 1))}><Icon name="minus" size={28} /></button>
          <button aria-label="Increase set value" onClick={() => setValue((v) => v + 1)}><Icon name="plus" size={28} /></button>
        </div>
        <button className="cta" onClick={() => onSave(value)}>Save</button>
        <button className="cta sec danger" onClick={onRemove}>Remove Set</button>
        <button className="cta sec" onClick={onClose}>Cancel</button>
      </div>
    </>
  )
}
