import React from 'react'
import { DrawingEdge } from '../../types'
import { previewPath } from '../../utils/edgeRouting'

interface Props {
  drawingEdge: DrawingEdge
}

export const EdgePreview: React.FC<Props> = ({ drawingEdge }) => {
  const { sourcePosition, sourcePort, currentPosition } = drawingEdge
  const d = previewPath(sourcePosition, sourcePort, currentPosition)

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path
        d={d}
        fill="none"
        stroke="#5b6af0"
        strokeWidth={2}
        strokeDasharray="6 3"
        opacity={0.7}
      />
      <circle
        cx={currentPosition.x}
        cy={currentPosition.y}
        r={5}
        fill="rgba(91,106,240,0.3)"
        stroke="#5b6af0"
        strokeWidth={1.5}
      />
    </g>
  )
}
