import { NODE_R } from '../engine/layout'
import { edgePath, LABEL_Y } from './TreeView'

describe('edgePath', () => {
  it('a straight line goes up to the node above (its label sits over the line)', () => {
    expect(edgePath({ x: 50, y: 200 }, { x: 50, y: 100 }, 2)).toMatch(new RegExp(`50 ${100 + NODE_R}$`))
  })

  it('a slanted line stops under the label of the node above, so it never crosses the text', () => {
    const end = 100 + NODE_R + LABEL_Y + 10 + 4
    expect(edgePath({ x: 50, y: 200 }, { x: 120, y: 100 }, 2)).toMatch(new RegExp(`120 ${end}$`))
  })
})
