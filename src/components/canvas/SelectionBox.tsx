import React from 'react'
import { SelectionBox as SB } from '../../types'

interface Props {
  box: SB
}

export const SelectionBoxOverlay: React.FC<Props> = ({ box }) => {
  const x = Math.min(box.startX, box.endX)
  const y = Math.min(box.startY, box.endY)
  const w = Math.abs(box.endX - box.startX)
  const h = Math.abs(box.endY - box.startY)

  return (
    <rect
      x={x} y={y} width={w} height={h}
      fill="var(--accent-subtle)"
      stroke="var(--accent-border)"
      strokeWidth={1}
      strokeDasharray="4 2"
      style={{ pointerEvents: 'none' }}
    />
  )
}
