import { useState } from 'react'
import { DEMO_CREDIT, demoUrl } from '../data/demos'
import type { ExerciseNode } from '../data/types'

export function DemoButton({ node }: { node: ExerciseNode }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = demoUrl(node.id)
  if (!src) return null
  return (
    <>
      <button className="howto" onClick={() => { setFailed(false); setOpen(true) }}>How-to</button>
      {open && (
        <>
          <div className="scrim" style={{ zIndex: 30 }} onClick={() => setOpen(false)} />
          <div className="sheet" style={{ zIndex: 31, textAlign: 'left' }} role="dialog" aria-modal="true" aria-label={`How to do ${node.name}`}>
            <div className="head">
              <h3>How to do it</h3>
              <button className="pillbtn" aria-label="Close demo" onClick={() => setOpen(false)}>Done</button>
            </div>
            <div className="demo">
              {failed ? (
                <p className="sub">Couldn't load the demo. It needs a connection the first time.</p>
              ) : (
                <img src={src} alt={`${node.name} demonstration`} width={180} height={180} onError={() => setFailed(true)} />
              )}
            </div>
            <p className="sub">{node.cue}</p>
            <p className="sub" style={{ fontSize: 11 }}>{DEMO_CREDIT}</p>
          </div>
        </>
      )}
    </>
  )
}
