import React, { useCallback, useState } from 'react'
import { EdgeData } from '../../types'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { resolveEdgePath, getEdgeMidpoint } from '../../utils/edgeRouting'
import { EdgePath } from './EdgePath'
import { EdgeLabel } from './EdgeLabel'
import { EDGE_TYPE_CONFIGS } from '../../constants/nodeTypes'

interface Props {
  edge: EdgeData
  isSelected: boolean
}

export const EdgeRenderer: React.FC<Props> = ({ edge, isSelected }) => {
  const { nodes, selectIds, removeEdge, updateEdge } = useGraphStore()
  const { setContextMenu, setEditingLabel } = useUIStore()
  const [hovered, setHovered] = useState(false)

  const pathD = resolveEdgePath(edge, nodes)
  const midpoint = getEdgeMidpoint(edge, nodes)
  const cfg = EDGE_TYPE_CONFIGS[edge.type]

  if (!pathD || !midpoint) return null

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      selectIds([edge.id], true)
    } else {
      selectIds([edge.id])
    }
  }, [edge.id])

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    selectIds([edge.id])
    setEditingLabel(edge.id)
  }, [edge.id])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: edge.id, targetType: 'edge' })
  }, [edge.id])

  return (
    <g
      onClick={handleClick}
      onDoubleClick={handleDblClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <EdgePath
        id={edge.id}
        pathD={pathD}
        edge={edge}
        selected={isSelected}
        hovered={hovered}
        bidirectional={cfg.bidirectional ?? false}
      />
      <EdgeLabel
        edgeId={edge.id}
        edge={edge}
        midpoint={midpoint}
        selected={isSelected}
      />
    </g>
  )
}
