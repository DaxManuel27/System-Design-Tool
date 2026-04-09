import React from 'react'
import { EdgeData } from '../../types'
import { EDGE_TYPE_CONFIGS } from '../../constants/nodeTypes'

interface Props {
  id: string
  pathD: string
  edge: EdgeData
  selected: boolean
  hovered: boolean
  bidirectional: boolean
}

export const EdgePath: React.FC<Props> = ({ id, pathD, edge, selected, hovered, bidirectional }) => {
  const cfg = EDGE_TYPE_CONFIGS[edge.type]
  const color = edge.style?.color ?? cfg.color
  const strokeWidth = edge.style?.strokeWidth ?? cfg.strokeWidth
  const dashArray = cfg.strokeDasharray
  const animated = edge.style?.animated ?? cfg.animated

  const markerId = `arrow-${id}`
  const markerStartId = bidirectional ? `arrow-start-${id}` : undefined

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth={10} markerHeight={7}
          refX={9} refY={3.5}
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
        {bidirectional && (
          <marker
            id={`arrow-start-${id}`}
            markerWidth={10} markerHeight={7}
            refX={1} refY={3.5}
            orient="auto-start-reverse"
          >
            <polygon points="10 0, 0 3.5, 10 7" fill={color} />
          </marker>
        )}
      </defs>

      {/* Hit area */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={selected ? 'var(--accent)' : hovered ? color : color}
        opacity={selected ? 1 : hovered ? 0.9 : 0.7}
        strokeWidth={selected ? strokeWidth + 1 : strokeWidth}
        strokeDasharray={selected ? undefined : dashArray}
        markerEnd={`url(#${markerId})`}
        markerStart={bidirectional ? `url(#${markerStartId})` : undefined}
        className={animated ? 'edge-animated' : undefined}
        style={{ transition: 'stroke 0.1s' }}
      />
    </>
  )
}
