import React, { useRef, useCallback, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { NODE_TYPE_CONFIGS } from '../../constants/nodeTypes'
import { NodeRenderer } from '../nodes/NodeRenderer'
import { EdgeRenderer } from '../edges/EdgeRenderer'
import { EdgePreview } from '../edges/EdgePreview'
import { SelectionBoxOverlay } from './SelectionBox'
import { GridDefs, GridBackground } from './Grid'
import { Minimap } from '../minimap/Minimap'
import { screenToGraph, getNodeRect, rectsIntersect, snapPoint } from '../../utils/geometry'
import { SNAP_SIZE, MIN_ZOOM, MAX_ZOOM } from '../../constants/nodeTypes'
import { clamp } from '../../utils/geometry'

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Track actual container size for grid / minimap calculations
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const { nodes, edges, selectedIds, selectIds, deselectAll, addNode } = useGraphStore()
  const {
    viewport, setViewport,
    activeTool, showGrid,
    drawingEdge, setDrawingEdge,
    selectionBox, setSelectionBox,
    setContextMenu,
    snapToGrid: snap,
  } = useUIStore()

  // ─── Measure container ────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    if (r.width > 0) setSize({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [])

  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mx: 0, my: 0, vx: 0, vy: 0 })
  const isSpacePressedRef = useRef(false)
  const selBoxStartRef = useRef({ x: 0, y: 0 })

  // Space key for pan override
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); isSpacePressedRef.current = true }
    }
    const onUp = (e: KeyboardEvent) => { if (e.key === ' ') isSpacePressedRef.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [])

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const { x, y, zoom } = viewport
    const factor = e.ctrlKey ? 0.02 : 0.001
    const delta = -e.deltaY * factor
    const newZoom = clamp(zoom * (1 + delta * 5), MIN_ZOOM, MAX_ZOOM)
    const rect = svgRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const newX = cx - (cx - x) * (newZoom / zoom)
    const newY = cy - (cy - y) * (newZoom / zoom)
    setViewport({ x: newX, y: newY, zoom: newZoom })
  }, [viewport, setViewport])

  // Attach wheel as non-passive so preventDefault works
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ─── Pan ──────────────────────────────────────────────────────────────────

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanningRef.current = true
    panStartRef.current = { mx: clientX, my: clientY, vx: viewport.x, vy: viewport.y }
  }, [viewport])

  // ─── Mouse down on canvas ─────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const isPanTool = activeTool === 'pan' || isSpacePressedRef.current
    if (e.button === 1) { e.preventDefault(); startPan(e.clientX, e.clientY); return }
    if (e.button !== 0) return
    if (isPanTool) { startPan(e.clientX, e.clientY); return }
    if (drawingEdge) { setDrawingEdge(null); return }

    if (activeTool === 'select') {
      const rect = svgRef.current!.getBoundingClientRect()
      const gp = screenToGraph(e.clientX - rect.left, e.clientY - rect.top, viewport)
      deselectAll()
      selBoxStartRef.current = { x: gp.x, y: gp.y }
      setSelectionBox({ startX: gp.x, startY: gp.y, endX: gp.x, endY: gp.y })
    }
  }, [activeTool, drawingEdge, viewport, startPan, deselectAll, setDrawingEdge, setSelectionBox])

  // ─── Mouse move on canvas ─────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.mx
      const dy = e.clientY - panStartRef.current.my
      setViewport({ x: panStartRef.current.vx + dx, y: panStartRef.current.vy + dy })
      return
    }

    if (drawingEdge) {
      const gp = screenToGraph(e.clientX - rect.left, e.clientY - rect.top, viewport)
      setDrawingEdge({ ...drawingEdge, currentPosition: gp })
      return
    }

    if (selectionBox) {
      const gp = screenToGraph(e.clientX - rect.left, e.clientY - rect.top, viewport)
      setSelectionBox({ ...selectionBox, endX: gp.x, endY: gp.y })
    }
  }, [drawingEdge, selectionBox, viewport, setViewport, setDrawingEdge, setSelectionBox])

  // ─── Mouse up ─────────────────────────────────────────────────────────────

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false

    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX)
      const maxX = Math.max(selectionBox.startX, selectionBox.endX)
      const minY = Math.min(selectionBox.startY, selectionBox.endY)
      const maxY = Math.max(selectionBox.startY, selectionBox.endY)
      const selRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }

      if (selRect.w > 4 || selRect.h > 4) {
        const hit = Object.values(nodes).filter(n => rectsIntersect(getNodeRect(n), selRect))
        if (hit.length) selectIds(hit.map(n => n.id))
      }
      setSelectionBox(null)
    }
  }, [selectionBox, nodes, selectIds, setSelectionBox])

  useEffect(() => {
    const onUp = () => { isPanningRef.current = false }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  // ─── Context menu ─────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: '', targetType: 'canvas' })
  }, [setContextMenu])

  // ─── Drop from palette ────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('nodeType')
    if (!nodeType) return
    const rect = svgRef.current!.getBoundingClientRect()
    const gp = screenToGraph(e.clientX - rect.left, e.clientY - rect.top, viewport)
    const snapped = snap ? snapPoint(gp, SNAP_SIZE) : gp
    const cfg = NODE_TYPE_CONFIGS[nodeType as keyof typeof NODE_TYPE_CONFIGS]
    if (!cfg) return
    addNode({
      id: uuid(),
      type: nodeType as any,
      label: cfg.label,
      position: { x: snapped.x - cfg.defaultSize.w / 2, y: snapped.y - cfg.defaultSize.h / 2 },
      size: cfg.defaultSize,
      metadata: {},
      style: { color: cfg.defaultColor, borderColor: cfg.defaultBorder },
    })
  }, [viewport, snap, addNode])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }

  const isPanCursor = activeTool === 'pan' || isSpacePressedRef.current

  // Containers first so they render behind regular nodes
  const sortedNodes = Object.values(nodes).sort((a, b) => {
    if (a.type === 'container') return -1
    if (b.type === 'container') return 1
    return 0
  })

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', userSelect: 'none' }}
    >
      <svg
        ref={svgRef}
        data-canvas
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          background: 'var(--bg-canvas)',
          cursor: isPanCursor ? 'grab'
            : activeTool === 'connect' ? 'crosshair'
            : activeTool === 'comment' ? 'text'
            : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Grid pattern definition (defs only) */}
        {showGrid && <GridDefs viewport={viewport} />}
        {/* Grid background fill — outside transform group so it covers the whole SVG */}
        {showGrid && <GridBackground />}

        {/* Graph content — everything inside here is in graph coordinate space */}
        <g transform={transform}>
          {/* Edges behind nodes */}
          {Object.values(edges).map(edge => (
            <EdgeRenderer
              key={edge.id}
              edge={edge}
              isSelected={selectedIds.has(edge.id)}
            />
          ))}

          {/* Live edge preview */}
          {drawingEdge && <EdgePreview drawingEdge={drawingEdge} />}

          {/* Nodes */}
          {sortedNodes.map(node => (
            <NodeRenderer
              key={node.id}
              node={node}
              isSelected={selectedIds.has(node.id)}
              isDrawingTarget={drawingEdge !== null && drawingEdge.sourceId !== node.id}
            />
          ))}

          {/* Rubber-band selection */}
          {selectionBox && <SelectionBoxOverlay box={selectionBox} />}
        </g>
      </svg>

      <Minimap canvasSize={size} />

      {/* Empty state guide */}
      {Object.keys(nodes).length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          color: 'var(--text-3)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>⬡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
            Start building your diagram
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8 }}>
            <div>Drag components from the left panel onto the canvas</div>
            <div>Hover a node and drag a port to connect</div>
            <div>Use{' '}
              <kbd style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3, fontSize: 10, color: 'var(--text-2)' }}>V</kbd>
              {' '}select{' '}
              <kbd style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3, fontSize: 10, color: 'var(--text-2)' }}>C</kbd>
              {' '}connect{' '}
              <kbd style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 3, fontSize: 10, color: 'var(--text-2)' }}>H</kbd>
              {' '}pan
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
