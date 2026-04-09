import React from 'react'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { Tool, NodeData, EdgeData } from '../../types'
import { computeAlignment, computeDistribute } from '../../utils/geometry'
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/nodeTypes'
import { clamp } from '../../utils/geometry'

// ─── Sample diagram ──────────────────────────────────────────────────────────

function loadSample() {
  const { nodes: existingNodes, removeNodes, removeEdges, edges: existingEdges, addNode, addEdge } = useGraphStore.getState()
  const nodeIds = Object.keys(existingNodes)
  const edgeIds = Object.keys(existingEdges)
  if (nodeIds.length) removeNodes(nodeIds)
  if (edgeIds.length) removeEdges(edgeIds)

  const nodes: NodeData[] = [
    { id: 'client-1',   type: 'client',       label: 'Web Client',       position: { x: 80,  y: 60  }, size: { w: 80,  h: 80  }, metadata: { description: 'Browser SPA',        tags: ['frontend'] }, style: { color: '#0f3a3a', borderColor: '#14b8a6' } },
    { id: 'mobile-1',   type: 'client',       label: 'Mobile App',       position: { x: 220, y: 60  }, size: { w: 80,  h: 80  }, metadata: { description: 'iOS / Android app',  tags: ['frontend'] }, style: { color: '#0f3a3a', borderColor: '#14b8a6' } },
    { id: 'gw-1',       type: 'gateway',      label: 'API Gateway',      position: { x: 90,  y: 220 }, size: { w: 180, h: 72  }, metadata: { description: 'Rate limiting, auth, routing' },           style: { color: '#1e1b4b', borderColor: '#6366f1' } },
    { id: 'lb-1',       type: 'loadbalancer', label: 'Load Balancer',    position: { x: 110, y: 370 }, size: { w: 140, h: 72  }, metadata: {},                                                          style: { color: '#422006', borderColor: '#eab308' } },
    { id: 'svc-auth',   type: 'service',      label: 'Auth Service',     position: { x: -80, y: 510 }, size: { w: 150, h: 72  }, metadata: { description: 'JWT / OAuth2',        tags: ['auth']     }, style: { color: '#1e3a5f', borderColor: '#3b82f6' } },
    { id: 'svc-api',    type: 'service',      label: 'API Service',      position: { x: 110, y: 510 }, size: { w: 150, h: 72  }, metadata: { description: 'Core business logic', tags: ['api']      }, style: { color: '#1e3a5f', borderColor: '#3b82f6' } },
    { id: 'svc-notify', type: 'service',      label: 'Notification Svc', position: { x: 320, y: 510 }, size: { w: 160, h: 72  }, metadata: {},                                                          style: { color: '#1e3a5f', borderColor: '#3b82f6' } },
    { id: 'db-main',    type: 'database',     label: 'Main DB',          position: { x: 30,  y: 670 }, size: { w: 130, h: 80  }, metadata: { description: 'PostgreSQL primary',  tags: ['postgres'] }, style: { color: '#14532d', borderColor: '#22c55e' } },
    { id: 'cache-1',    type: 'cache',        label: 'Redis Cache',      position: { x: 210, y: 670 }, size: { w: 140, h: 72  }, metadata: { description: 'Session & query cache' },                   style: { color: '#2e1065', borderColor: '#a855f7' } },
    { id: 'queue-1',    type: 'queue',        label: 'Kafka',            position: { x: 380, y: 370 }, size: { w: 150, h: 72  }, metadata: { description: 'Event bus',           tags: ['kafka']    }, style: { color: '#431407', borderColor: '#f97316' } },
    { id: 'ext-email',  type: 'external',     label: 'Email Provider',   position: { x: 380, y: 670 }, size: { w: 150, h: 72  }, metadata: { description: 'SendGrid API',        tags: ['external'] }, style: { color: '#1a1a2e', borderColor: '#64748b' } },
  ]

  const edges: EdgeData[] = [
    { id: 'e1',  type: 'http',       source: 'client-1',   sourcePort: 'bottom', target: 'gw-1',       targetPort: 'top',    routing: 'curved', label: 'HTTPS' },
    { id: 'e2',  type: 'http',       source: 'mobile-1',   sourcePort: 'bottom', target: 'gw-1',       targetPort: 'top',    routing: 'curved' },
    { id: 'e3',  type: 'http',       source: 'gw-1',       sourcePort: 'bottom', target: 'lb-1',       targetPort: 'top',    routing: 'curved' },
    { id: 'e4',  type: 'grpc',       source: 'lb-1',       sourcePort: 'left',   target: 'svc-auth',   targetPort: 'top',    routing: 'curved' },
    { id: 'e5',  type: 'grpc',       source: 'lb-1',       sourcePort: 'bottom', target: 'svc-api',    targetPort: 'top',    routing: 'curved' },
    { id: 'e6',  type: 'event',      source: 'svc-api',    sourcePort: 'right',  target: 'queue-1',    targetPort: 'left',   routing: 'curved', label: 'publish' },
    { id: 'e7',  type: 'event',      source: 'queue-1',    sourcePort: 'bottom', target: 'svc-notify', targetPort: 'right',  routing: 'curved', label: 'consume' },
    { id: 'e8',  type: 'database',   source: 'svc-api',    sourcePort: 'bottom', target: 'db-main',    targetPort: 'top',    routing: 'curved' },
    { id: 'e9',  type: 'database',   source: 'svc-api',    sourcePort: 'right',  target: 'cache-1',    targetPort: 'left',   routing: 'curved' },
    { id: 'e10', type: 'http',       source: 'svc-notify', sourcePort: 'bottom', target: 'ext-email',  targetPort: 'top',    routing: 'curved' },
    { id: 'e11', type: 'dependency', source: 'svc-auth',   sourcePort: 'right',  target: 'cache-1',    targetPort: 'bottom', routing: 'curved', label: 'session' },
  ]

  for (const n of nodes) addNode(n)
  for (const e of edges) addEdge(e)

  const { setViewport } = useUIStore.getState()
  setTimeout(() => {
    const allNodes = Object.values(useGraphStore.getState().nodes)
    if (!allNodes.length) return
    const xs = allNodes.map(n => n.position.x)
    const ys = allNodes.map(n => n.position.y)
    const xe = allNodes.map(n => n.position.x + n.size.w)
    const ye = allNodes.map(n => n.position.y + n.size.h)
    const minX = Math.min(...xs), minY = Math.min(...ys)
    const maxX = Math.max(...xe), maxY = Math.max(...ye)
    const gw = maxX - minX, gh = maxY - minY
    const pad = 80
    const w = window.innerWidth - 480, h = window.innerHeight - 60
    const zoom = clamp(Math.min((w - pad) / gw, (h - pad) / gh), MIN_ZOOM, MAX_ZOOM)
    setViewport({ zoom, x: (w - gw * zoom) / 2 - minX * zoom + 220, y: (h - gh * zoom) / 2 - minY * zoom + 32 })
  }, 30)
}

// ─── Shared button component ─────────────────────────────────────────────────

interface ToolBtnProps {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  small?: boolean
}

const ToolBtn: React.FC<ToolBtnProps> = ({ active, onClick, title, children, danger, disabled, small }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: small ? 28 : 30, height: 30, borderRadius: 5,
      border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
      background: active ? 'var(--accent-subtle)' : 'transparent',
      color: disabled ? 'var(--text-3)' : active ? 'var(--accent)' : danger ? 'var(--danger)' : 'var(--text-2)',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      transition: 'color 0.1s, background 0.1s, border-color 0.1s',
      flexShrink: 0,
    }}
    onMouseEnter={e => {
      if (!disabled) (e.currentTarget as HTMLButtonElement).style.background =
        active ? 'var(--accent-subtle)' : 'var(--bg-surface-hover)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background =
        active ? 'var(--accent-subtle)' : 'transparent'
    }}
  >
    {children}
  </button>
)

const Divider = () => (
  <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />
)

const TOOLS: Array<{ tool: Tool; icon: string; label: string; key: string }> = [
  { tool: 'select',  icon: '↖',  label: 'Select (V)',  key: 'V' },
  { tool: 'pan',     icon: '✋', label: 'Pan (H)',     key: 'H' },
  { tool: 'connect', icon: '⟶', label: 'Connect (C)', key: 'C' },
  { tool: 'comment', icon: '📝', label: 'Comment (N)', key: 'N' },
]

export const Toolbar: React.FC = () => {
  const {
    nodes, edges, selectedIds,
    undo, redo, removeNodes, removeEdges,
    updateNodes, autoLayout, duplicateNodes, history, historyIndex,
  } = useGraphStore()
  const {
    activeTool, setTool,
    viewport, setViewport,
    showGrid, toggleGrid,
    snapToGrid, toggleSnap,
    toggleLeftPanel, toggleRightPanel,
    leftPanelOpen, rightPanelOpen,
    chatPanelOpen, toggleChatPanel,
    darkMode, toggleDarkMode,
  } = useUIStore()

  const selected = [...selectedIds]
  const selectedNodes = selected.filter(id => nodes[id])
  const selectedEdges = selected.filter(id => edges[id])
  const hasSelected = selected.length > 0
  const hasMultiNodes = selectedNodes.length >= 2

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const zoomPct = Math.round(viewport.zoom * 100)

  const setZoom = (z: number) => {
    const w = window.innerWidth, h = window.innerHeight
    const newZoom = clamp(z, MIN_ZOOM, MAX_ZOOM)
    setViewport({
      zoom: newZoom,
      x: w / 2 - (w / 2 - viewport.x) * (newZoom / viewport.zoom),
      y: h / 2 - (h / 2 - viewport.y) * (newZoom / viewport.zoom),
    })
  }

  const fitToScreen = () => {
    const nodeList = Object.values(nodes)
    if (!nodeList.length) { setViewport({ x: 0, y: 0, zoom: 1 }); return }
    const xs = nodeList.map(n => n.position.x)
    const ys = nodeList.map(n => n.position.y)
    const xe = nodeList.map(n => n.position.x + n.size.w)
    const ye = nodeList.map(n => n.position.y + n.size.h)
    const minX = Math.min(...xs), minY = Math.min(...ys)
    const maxX = Math.max(...xe), maxY = Math.max(...ye)
    const gw = maxX - minX, gh = maxY - minY
    const pad = 80
    const w = window.innerWidth - 440, h = window.innerHeight - 60
    const zoom = clamp(Math.min((w - pad) / gw, (h - pad) / gh), MIN_ZOOM, MAX_ZOOM)
    setViewport({
      zoom,
      x: (w - gw * zoom) / 2 - minX * zoom + 220,
      y: (h - gh * zoom) / 2 - minY * zoom + 32,
    })
  }

  const align = (dir: Parameters<typeof computeAlignment>[1]) => {
    const ns = selectedNodes.map(id => nodes[id]).filter(Boolean)
    const updates = computeAlignment(ns, dir)
    updateNodes(updates.map(u => ({
      id: u.id,
      updates: {
        position: {
          x: u.x ?? nodes[u.id].position.x,
          y: u.y ?? nodes[u.id].position.y,
        },
      },
    })))
  }

  const distribute = (dir: 'horizontal' | 'vertical') => {
    const ns = selectedNodes.map(id => nodes[id]).filter(Boolean)
    const updates = computeDistribute(ns, dir)
    updateNodes(updates.map(u => ({
      id: u.id,
      updates: {
        position: {
          x: u.x ?? nodes[u.id].position.x,
          y: u.y ?? nodes[u.id].position.y,
        },
      },
    })))
  }

  return (
    <div style={{
      height: 48,
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: 2,
      flexShrink: 0,
      zIndex: 50,
    }}>
      {/* App name */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'var(--accent)',
        marginRight: 6, letterSpacing: '-0.03em',
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: 'none',
      }}>
        SysDesign
      </div>

      <Divider />

      {/* Panel toggles */}
      <ToolBtn title="Toggle palette" active={leftPanelOpen} onClick={toggleLeftPanel}>⧉</ToolBtn>
      <ToolBtn title="Toggle inspector" active={rightPanelOpen} onClick={toggleRightPanel}>⧇</ToolBtn>
      <ToolBtn title="Toggle AI chat" active={chatPanelOpen} onClick={toggleChatPanel}>
        <span style={{ fontSize: 12 }}>AI</span>
      </ToolBtn>

      <Divider />

      {/* Tools */}
      {TOOLS.map(({ tool, icon, label }) => (
        <ToolBtn key={tool} active={activeTool === tool} onClick={() => setTool(tool)} title={label}>
          {icon}
        </ToolBtn>
      ))}

      <Divider />

      {/* Undo/Redo */}
      <ToolBtn title="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>↩</ToolBtn>
      <ToolBtn title="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}>↪</ToolBtn>

      <Divider />

      {/* Zoom */}
      <ToolBtn title="Zoom out" onClick={() => setZoom(viewport.zoom / 1.2)}>−</ToolBtn>
      <div
        style={{
          fontSize: 11, color: 'var(--text-2)', minWidth: 40, textAlign: 'center',
          userSelect: 'none', cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}
        onDoubleClick={() => setZoom(1)}
        title="Double-click to reset zoom"
      >
        {zoomPct}%
      </div>
      <ToolBtn title="Zoom in" onClick={() => setZoom(viewport.zoom * 1.2)}>+</ToolBtn>
      <ToolBtn title="Fit to screen" onClick={fitToScreen}>⊡</ToolBtn>

      <Divider />

      {/* Grid / Snap */}
      <ToolBtn title="Toggle grid" active={showGrid} onClick={toggleGrid}>⊞</ToolBtn>
      <ToolBtn title="Toggle snap to grid" active={snapToGrid} onClick={toggleSnap}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>SNAP</span>
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn title="Align left" onClick={() => align('left')} disabled={!hasMultiNodes}>⫻</ToolBtn>
      <ToolBtn title="Center horizontal" onClick={() => align('center-h')} disabled={!hasMultiNodes}>⬔</ToolBtn>
      <ToolBtn title="Align right" onClick={() => align('right')} disabled={!hasMultiNodes}>⫺</ToolBtn>
      <ToolBtn title="Align top" onClick={() => align('top')} disabled={!hasMultiNodes}>⌅</ToolBtn>
      <ToolBtn title="Center vertical" onClick={() => align('center-v')} disabled={!hasMultiNodes}>⌆</ToolBtn>
      <ToolBtn title="Align bottom" onClick={() => align('bottom')} disabled={!hasMultiNodes}>⌤</ToolBtn>

      <Divider />

      <ToolBtn title="Distribute horizontal" onClick={() => distribute('horizontal')} disabled={selectedNodes.length < 3}>⇔</ToolBtn>
      <ToolBtn title="Distribute vertical" onClick={() => distribute('vertical')} disabled={selectedNodes.length < 3}>⇕</ToolBtn>

      <Divider />

      <ToolBtn title="Auto layout" onClick={autoLayout}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>AUTO</span>
      </ToolBtn>

      <div style={{ flex: 1 }} />

      {/* Selection info */}
      {hasSelected && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 8, userSelect: 'none' }}>
          {selected.length} selected
        </div>
      )}

      {/* Delete */}
      {hasSelected && (
        <ToolBtn title="Delete selected (⌫)" danger onClick={() => {
          if (selectedNodes.length) removeNodes(selectedNodes)
          if (selectedEdges.length) removeEdges(selectedEdges)
        }}>
          ✕
        </ToolBtn>
      )}

      {hasSelected && <Divider />}

      {/* Theme toggle */}
      <ToolBtn title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleDarkMode}>
        <span style={{ fontSize: 12 }}>{darkMode ? '○' : '●'}</span>
      </ToolBtn>

      <Divider />

      {/* Sample / Clear */}
      <button
        title="Load sample diagram"
        onClick={loadSample}
        style={{
          fontSize: 11, fontWeight: 500, padding: '4px 10px',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          borderRadius: 5, color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Sample
      </button>
      <button
        title="Clear canvas"
        onClick={() => {
          const { nodes: ns, edges: es, removeNodes: rn, removeEdges: re } = useGraphStore.getState()
          const nids = Object.keys(ns), eids = Object.keys(es)
          if (nids.length) rn(nids)
          if (eids.length) re(eids)
        }}
        style={{
          fontSize: 11, fontWeight: 500, padding: '4px 10px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 5, color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'border-color 0.1s, color 0.1s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.color = 'var(--text-1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-2)'
        }}
      >
        Clear
      </button>
    </div>
  )
}
