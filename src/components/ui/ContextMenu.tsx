import React, { useEffect, useRef } from 'react'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { EDGE_TYPE_CONFIGS } from '../../constants/nodeTypes'
import { EdgeType } from '../../types'

export const ContextMenu: React.FC = () => {
  const { contextMenu, setContextMenu } = useUIStore()
  const { nodes, edges, removeNode, removeEdge, duplicateNodes, updateNode, updateEdge } = useGraphStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!contextMenu) return null

  const { x, y, targetId, targetType } = contextMenu
  const node = targetType === 'node' ? nodes[targetId] : null
  const edge = targetType === 'edge' ? edges[targetId] : null

  const close = () => setContextMenu(null)

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 9999,
    minWidth: 188,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '4px 0',
    boxShadow: '0 8px 28px var(--shadow)',
  }

  const itemBase: React.CSSProperties = {
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--text-1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    userSelect: 'none',
    transition: 'background 0.08s',
  }

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

  const sectionLabel = (text: string) => (
    <div style={{ padding: '4px 14px 2px', fontSize: 10, color: 'var(--text-3)', userSelect: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {text}
    </div>
  )

  const MenuItem: React.FC<{
    onClick: () => void
    danger?: boolean
    highlight?: boolean
    children: React.ReactNode
  }> = ({ onClick, danger, highlight, children }) => (
    <div
      style={{ ...itemBase, color: danger ? 'var(--danger)' : highlight ? 'var(--accent)' : 'var(--text-1)' }}
      onMouseDown={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </div>
  )

  const items: React.ReactNode[] = []

  if (node) {
    items.push(
      <MenuItem key="dup" onClick={() => { duplicateNodes([targetId]); close() }}>Duplicate</MenuItem>,
      <MenuItem key="lock" onClick={() => { updateNode(targetId, { locked: !node.locked }); close() }}>
        {node.locked ? 'Unlock' : 'Lock'}
      </MenuItem>,
      divider,
      <MenuItem key="del" onClick={() => { removeNode(targetId); close() }} danger>Delete</MenuItem>,
    )
  }

  if (edge) {
    items.push(
      sectionLabel('Routing'),
      <MenuItem key="orth" highlight={edge.routing === 'orthogonal'}
        onClick={() => { updateEdge(targetId, { routing: 'orthogonal' }); close() }}>
        Orthogonal
      </MenuItem>,
      <MenuItem key="curv" highlight={edge.routing === 'curved'}
        onClick={() => { updateEdge(targetId, { routing: 'curved' }); close() }}>
        Curved
      </MenuItem>,
      divider,
      sectionLabel('Edge type'),
    )
    for (const [type, cfg] of Object.entries(EDGE_TYPE_CONFIGS)) {
      items.push(
        <div
          key={`type-${type}`}
          style={{
            ...itemBase,
            color: edge.type === type ? cfg.color : 'var(--text-1)',
          }}
          onMouseDown={() => { updateEdge(targetId, { type: type as EdgeType }); close() }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ width: 12, height: 2, background: cfg.color, display: 'inline-block', borderRadius: 1 }} />
          {cfg.label}
        </div>
      )
    }
    items.push(
      divider,
      <MenuItem key="rev"
        onClick={() => {
          updateEdge(targetId, {
            source: edge.target, sourcePort: edge.targetPort,
            target: edge.source, targetPort: edge.sourcePort,
          })
          close()
        }}>
        Reverse direction
      </MenuItem>,
      <MenuItem key="del" onClick={() => { removeEdge(targetId); close() }} danger>Delete</MenuItem>,
    )
  }

  if (targetType === 'canvas') {
    items.push(
      <MenuItem key="selall" onClick={() => { useGraphStore.getState().selectAll(); close() }}>Select all</MenuItem>,
      <MenuItem key="paste" onClick={() => { useGraphStore.getState().paste(); close() }}>Paste</MenuItem>,
      divider,
      <MenuItem key="layout" onClick={() => { useGraphStore.getState().autoLayout(); close() }}>Auto layout</MenuItem>,
    )
  }

  return (
    <div ref={menuRef} className="context-menu" style={menuStyle}>
      {items}
    </div>
  )
}
