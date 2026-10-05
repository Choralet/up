import { EQUIPMENT } from '../data/trees'
import { Icon } from './Icon'

/** Equipment you can tick (the floor is always there). */
export const PICKABLE = Object.keys(EQUIPMENT).filter((c) => c !== 'floor')

/** Tick rows for what you own. `null` = not set: nothing ticked, and the first tick sets it. */
export function EquipmentPicker({ value, onChange }: { value: string[] | null; onChange: (kit: string[]) => void }) {
  const have = new Set(value ?? [])
  return (
    <div className="group" role="group" aria-label="My equipment">
      {PICKABLE.map((code) => {
        const on = have.has(code)
        return (
          <button key={code} className="check pick" role="checkbox" aria-checked={on} aria-label={EQUIPMENT[code]}
            onClick={() => onChange(on ? [...have].filter((c) => c !== code) : [...have, code])}>
            <span className="box" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
            <span className="lbl">{EQUIPMENT[code]}</span>
          </button>
        )
      })}
    </div>
  )
}
