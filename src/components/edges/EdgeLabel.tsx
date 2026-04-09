import React, { useState, useRef, useEffect } from 'react'
import { Point } from '../../utils/geometry'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { EDGE_TYPE_CONFIGS } from '../../constants/nodeTypes'
import { EdgeData } from '../../types'

interface Props {
  edgeId: string
  edge: EdgeData
  midpoint: Point
  selected: boolean
}

export const EdgeLabel: React.FC<Props> = ({ edgeId, edge, midpoint, selected }) => {
  const { updateEdge } = useGraphStore()
  const { editingLabelId, setEditingLabel } = useUIStore()
  const isEditing = editingLabelId === edgeId
  const [value, setValue] = useState(edge.label ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const cfg = EDGE_TYPE_CONFIGS[edge.type]
  const color = edge.style?.color ?? cfg.color

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
      setValue(edge.label ?? '')
    }
  }, [isEditing])

  const commit = () => {
    updateEdge(edgeId, { label: value })
    setEditingLabel(null)
  }

  if (!edge.label && !isEditing && !selected) return null

  return (
    <g transform={`translate(${midpoint.x}, ${midpoint.y})`}>
      {isEditing ? (
        <foreignObject x={-50} y={-14} width={100} height={28}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditingLabel(null)
              e.stopPropagation()
            }}
            style={{
              width: '100%', height: '100%',
              background: 'var(--bg-panel)',
              border: `1px solid ${color}`,
              borderRadius: 4,
              color: 'var(--text-1)',
              fontSize: 11,
              padding: '2px 6px',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </foreignObject>
      ) : edge.label ? (
        <>
          <rect
            x={-edge.label.length * 3.5 - 6}
            y={-10}
            width={edge.label.length * 7 + 12}
            height={20}
            rx={4}
            fill="var(--bg-panel)"
            stroke={color}
            strokeWidth={0.8}
            opacity={0.9}
            style={{ cursor: 'pointer' }}
            onDoubleClick={e => { e.stopPropagation(); setEditingLabel(edgeId) }}
          />
          <text
            textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize={11}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {edge.label}
          </text>
        </>
      ) : selected ? (
        <circle
          cx={0} cy={0} r={4}
          fill="var(--bg-panel)" stroke="var(--accent-border)" strokeWidth={1}
          style={{ cursor: 'pointer' }}
          onDoubleClick={e => { e.stopPropagation(); setEditingLabel(edgeId) }}
        />
      ) : null}
    </g>
  )
}
