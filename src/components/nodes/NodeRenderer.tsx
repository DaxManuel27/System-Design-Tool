import React, { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { NodeData, Port } from '../../types'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { NodeShape, NodeLabel, NodeTypeLabel } from './NodeShapes'
import { NodePorts } from './NodePorts'
import { ResizeHandles, ResizeHandle } from './ResizeHandles'
import { getPortPosition, snapToGrid } from '../../utils/geometry'
import { SNAP_SIZE } from '../../constants/nodeTypes'

interface Props {
  node: NodeData
  isSelected: boolean
  isDrawingTarget: boolean
}

const MIN_W = 60, MIN_H = 40

export const NodeRenderer: React.FC<Props> = ({ node, isSelected, isDrawingTarget }) => {
  const { updateNode, updateNodes, selectIds, pushHistory } = useGraphStore()
  const {
    activeTool, viewport, snapToGrid: snap, drawingEdge,
    setDrawingEdge, setHoveredNode, setHoveredPort, hoveredNodeId, hoveredPort,
    editingLabelId, setEditingLabel, setContextMenu,
  } = useUIStore()

  // Local visual state during drag/resize (avoids lag from store round-trips)
  const [localPos, setLocalPos] = useState({ x: node.position.x, y: node.position.y })
  const [localSize, setLocalSize] = useState({ w: node.size.w, h: node.size.h })

  // Refs to avoid stale closures in event handlers
  const localPosRef  = useRef(localPos)
  const localSizeRef = useRef(localSize)
  const isDraggingRef   = useRef(false)
  const isResizingRef   = useRef<ResizeHandle | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState(node.label)

  const isHovered = hoveredNodeId === node.id
  const isEditing = editingLabelId === node.id

  // Keep refs in sync with state
  useEffect(() => { localPosRef.current = localPos }, [localPos])
  useEffect(() => { localSizeRef.current = localSize }, [localSize])

  // Sync from store when not interacting
  useEffect(() => {
    if (!isDraggingRef.current && !isResizingRef.current) {
      setLocalPos(node.position)
      setLocalSize(node.size)
    }
  }, [node.position.x, node.position.y, node.size.w, node.size.h])

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
      setEditValue(node.label)
    }
  }, [isEditing, node.label])

  // ─── Label commit ─────────────────────────────────────────────────────────

  const commitLabel = useCallback(() => {
    const val = editValue.trim() || node.label
    updateNode(node.id, { label: val })
    setEditingLabel(null)
  }, [editValue, node.id, node.label, updateNode, setEditingLabel])

  // ─── Port mouse handlers ──────────────────────────────────────────────────

  const handlePortMouseDown = useCallback((port: Port, e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeTool !== 'connect' && activeTool !== 'select') return
    const srcPos = getPortPosition({ ...node, position: localPosRef.current, size: localSizeRef.current }, port)
    setDrawingEdge({ sourceId: node.id, sourcePort: port, sourcePosition: srcPos, currentPosition: srcPos })
  }, [node.id, activeTool, setDrawingEdge])

  const handlePortMouseUp = useCallback((port: Port, e: React.MouseEvent) => {
    e.stopPropagation()
    const de = drawingEdge
    if (!de || de.sourceId === node.id) return
    const { addEdge } = useGraphStore.getState()
    addEdge({
      id: uuid(),
      type: 'http',
      source: de.sourceId,
      sourcePort: de.sourcePort,
      target: node.id,
      targetPort: port,
      routing: 'curved',
      label: '',
    })
    setDrawingEdge(null)
  }, [drawingEdge, node.id, setDrawingEdge])

  // ─── Node drag ────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan') return
    if (activeTool === 'connect') return
    if (node.locked) return
    if (e.button !== 0) return
    e.stopPropagation()

    if (!isSelected) {
      if (e.shiftKey || e.metaKey || e.ctrlKey) selectIds([node.id], true)
      else selectIds([node.id])
    }

    isDraggingRef.current = true

    const startMx = e.clientX
    const startMy = e.clientY
    const startNx = localPosRef.current.x
    const startNy = localPosRef.current.y
    const zoom    = viewport.zoom

    // Capture start positions for all currently-selected nodes
    const { selectedIds: selIds, nodes: allNodes } = useGraphStore.getState()
    const startPositions = new Map(
      [...selIds].filter(id => id !== node.id && allNodes[id]).map(id => [
        id,
        { ...allNodes[id].position },
      ])
    )

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startMx) / zoom
      const dy = (me.clientY - startMy) / zoom
      const nx = snap ? snapToGrid(startNx + dx, SNAP_SIZE) : startNx + dx
      const ny = snap ? snapToGrid(startNy + dy, SNAP_SIZE) : startNy + dy
      setLocalPos({ x: nx, y: ny })

      // Move co-selected nodes
      if (selIds.size > 1) {
        const updates = [...selIds]
          .filter(id => id !== node.id && allNodes[id] && !allNodes[id].locked)
          .map(id => {
            const sp = startPositions.get(id) ?? allNodes[id].position
            return {
              id,
              updates: {
                position: {
                  x: snap ? snapToGrid(sp.x + dx, SNAP_SIZE) : sp.x + dx,
                  y: snap ? snapToGrid(sp.y + dy, SNAP_SIZE) : sp.y + dy,
                },
              },
            }
          })
        if (updates.length) updateNodes(updates)
      }
    }

    const onUp = () => {
      isDraggingRef.current = false
      // localPosRef.current holds the FINAL position set during onMove
      const finalPos = localPosRef.current
      pushHistory()
      updateNode(node.id, { position: finalPos })
      // Persist co-selected node positions
      if (selIds.size > 1) {
        const { nodes: currentNodes } = useGraphStore.getState()
        const updates = [...selIds]
          .filter(id => id !== node.id && currentNodes[id])
          .map(id => ({ id, updates: { position: currentNodes[id].position } }))
        if (updates.length) updateNodes(updates)
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [activeTool, isSelected, node.id, node.locked, viewport.zoom, snap, selectIds, updateNode, updateNodes, pushHistory])

  // ─── Resize ───────────────────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation()
    isResizingRef.current = handle

    const startMx = e.clientX
    const startMy = e.clientY
    const startX  = localPosRef.current.x
    const startY  = localPosRef.current.y
    const startW  = localSizeRef.current.w
    const startH  = localSizeRef.current.h
    const zoom    = viewport.zoom

    const onMove = (me: MouseEvent) => {
      const h  = isResizingRef.current!
      const dx = (me.clientX - startMx) / zoom
      const dy = (me.clientY - startMy) / zoom
      let { x, y, w, h: height } = { x: startX, y: startY, w: startW, h: startH }

      if (h.includes('e'))  w      = Math.max(MIN_W, startW + dx)
      if (h.includes('s'))  height = Math.max(MIN_H, startH + dy)
      if (h.includes('w')) { const nw = Math.max(MIN_W, startW - dx); x = startX + startW - nw; w = nw }
      if (h.includes('n')) { const nh = Math.max(MIN_H, startH - dy); y = startY + startH - nh; height = nh }

      if (snap) {
        x = snapToGrid(x, SNAP_SIZE); y = snapToGrid(y, SNAP_SIZE)
        w = snapToGrid(w, SNAP_SIZE); height = snapToGrid(height, SNAP_SIZE)
      }

      setLocalPos({ x, y })
      setLocalSize({ w, h: height })
    }

    const onUp = () => {
      isResizingRef.current = null
      pushHistory()
      updateNode(node.id, {
        position: localPosRef.current,
        size: localSizeRef.current,
      })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [node.id, viewport.zoom, snap, updateNode, pushHistory])

  // ─── Context menu ─────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: node.id, targetType: 'node' })
  }, [node.id, setContextMenu])

  // ─── Double-click: edit label ─────────────────────────────────────────────

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLabel(node.id)
  }, [node.id, setEditingLabel])

  const { x, y } = localPos
  const { w, h } = localSize
  const showPorts = (isHovered || isSelected) && activeTool !== 'pan'

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{
        cursor: activeTool === 'pan' ? 'grab'
          : node.locked ? 'not-allowed'
          : 'move',
      }}
      onMouseEnter={() => setHoveredNode(node.id)}
      onMouseLeave={() => { setHoveredNode(null); setHoveredPort(null) }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDblClick}
      onContextMenu={handleContextMenu}
    >
      {/* Shape */}
      <NodeShape
        node={{ ...node, size: { w, h } }}
        selected={isSelected}
        hovered={isHovered}
      />

      {/* Labels */}
      <NodeLabel node={{ ...node, size: { w, h } }} editing={isEditing} />
      <NodeTypeLabel node={{ ...node, size: { w, h } }} />

      {/* Inline label editor */}
      {isEditing && (
        <foreignObject
          x={node.type === 'annotation' ? 8 : node.type === 'client' ? -40 : w / 2 - 60}
          y={node.type === 'container' ? 4 : node.type === 'client' ? h + 2 : h / 2 - 14}
          width={node.type === 'annotation' ? w - 16 : 120}
          height={28}
        >
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => {
              if (e.key === 'Enter') commitLabel()
              if (e.key === 'Escape') setEditingLabel(null)
              e.stopPropagation()
            }}
            style={{
              width: '100%', height: '100%',
              background: 'var(--bg-panel)',
              border: '1px solid var(--accent-border)',
              borderRadius: 4,
              color: 'var(--text-1)',
              fontSize: 12,
              fontWeight: 500,
              padding: '2px 6px',
              outline: 'none',
              textAlign: node.type === 'annotation' ? 'left' : 'center',
              fontFamily: 'inherit',
            }}
          />
        </foreignObject>
      )}

      {/* Lock icon */}
      {node.locked && (
        <g transform={`translate(${w - 16}, 4)`} opacity={0.6} style={{ pointerEvents: 'none' }}>
          <rect x={0} y={3} width={10} height={8} rx={1} fill="var(--text-2)" />
          <path d="M2 3 V1.5 a3 3 0 0 1 6 0 V3" fill="none" stroke="var(--text-2)" strokeWidth={1.2} />
        </g>
      )}

      {/* Resize handles (only when selected & unlocked) */}
      {isSelected && !node.locked && node.type !== 'client' && (
        <ResizeHandles w={w} h={h} onHandleMouseDown={handleResizeMouseDown} />
      )}

      {/* Port indicators */}
      <NodePorts
        node={{ ...node, size: { w, h } }}
        hoveredPort={hoveredNodeId === node.id ? (hoveredPort?.port ?? null) : null}
        onPortMouseDown={handlePortMouseDown}
        onPortMouseUp={handlePortMouseUp}
        visible={showPorts}
        isTarget={isDrawingTarget}
      />
    </g>
  )
}
