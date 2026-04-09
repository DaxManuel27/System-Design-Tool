import React from 'react'
import { NodeData, Port } from '../../types'
import { PORT_RADIUS } from '../../constants/nodeTypes'

const PORTS: Port[] = ['top', 'bottom', 'left', 'right']

function portOffset(port: Port, w: number, h: number): { x: number; y: number } {
  switch (port) {
    case 'top':    return { x: w / 2, y: 0 }
    case 'bottom': return { x: w / 2, y: h }
    case 'left':   return { x: 0,     y: h / 2 }
    case 'right':  return { x: w,     y: h / 2 }
  }
}

interface Props {
  node: NodeData
  hoveredPort: Port | null
  onPortMouseDown: (port: Port, e: React.MouseEvent) => void
  onPortMouseUp: (port: Port, e: React.MouseEvent) => void
  visible: boolean
  isTarget: boolean
}

export const NodePorts: React.FC<Props> = ({
  node, hoveredPort, onPortMouseDown, onPortMouseUp, visible, isTarget,
}) => {
  const { w, h } = node.size
  if (!visible && !isTarget) return null

  return (
    <>
      {PORTS.map(port => {
        const { x, y } = portOffset(port, w, h)
        const isHovered = hoveredPort === port
        const r = isHovered || isTarget ? PORT_RADIUS + 2 : PORT_RADIUS
        return (
          <circle
            key={port}
            cx={x} cy={y}
            r={r}
            fill={isTarget ? 'var(--accent-subtle)' : isHovered ? 'var(--accent)' : 'var(--accent-subtle)'}
            stroke={isHovered || isTarget ? 'var(--accent)' : 'var(--accent-border)'}
            strokeWidth={isHovered || isTarget ? 1.5 : 1}
            style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
            onMouseDown={e => onPortMouseDown(port, e)}
            onMouseUp={e => onPortMouseUp(port, e)}
          />
        )
      })}
    </>
  )
}
