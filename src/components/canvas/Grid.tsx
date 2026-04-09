import React from 'react'
import { Viewport } from '../../types'
import { GRID_SIZE } from '../../constants/nodeTypes'

interface Props {
  viewport: Viewport
}

export const GridDefs: React.FC<Props> = ({ viewport }) => {
  const { x, y, zoom } = viewport
  const scaledGrid = GRID_SIZE * zoom
  const offsetX = ((x % scaledGrid) + scaledGrid) % scaledGrid
  const offsetY = ((y % scaledGrid) + scaledGrid) % scaledGrid
  const dotR = Math.max(0.5, zoom * 0.65)

  return (
    <defs>
      <pattern
        id="dot-grid"
        x={offsetX}
        y={offsetY}
        width={scaledGrid}
        height={scaledGrid}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={0} cy={0} r={dotR} fill="var(--grid-dot)" />
      </pattern>
    </defs>
  )
}

export const GridBackground: React.FC = () => (
  <rect
    x={0} y={0}
    width="100%" height="100%"
    fill="url(#dot-grid)"
    style={{ pointerEvents: 'none' }}
  />
)
