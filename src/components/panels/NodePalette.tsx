import React, { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { NODE_TYPE_CONFIGS, NODE_CATEGORIES } from '../../constants/nodeTypes'
import { NodeType } from '../../types'
import { useGraphStore } from '../../store/graphStore'
import { useUIStore } from '../../store/uiStore'
import { screenToGraph, snapPoint } from '../../utils/geometry'
import { SNAP_SIZE } from '../../constants/nodeTypes'

interface PaletteItemProps {
  type: NodeType
}

const PaletteItem: React.FC<PaletteItemProps> = ({ type }) => {
  const cfg = NODE_TYPE_CONFIGS[type]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('nodeType', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleClick = () => {
    const { addNode } = useGraphStore.getState()
    const { viewport } = useUIStore.getState()
    const canvasEl = document.querySelector('svg[data-canvas]') as SVGSVGElement | null
    const rect = canvasEl?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const gp = screenToGraph(cx, cy, viewport)
    const snapped = snapPoint(gp, SNAP_SIZE)
    addNode({
      id: uuid(),
      type,
      label: cfg.label,
      position: { x: snapped.x - cfg.defaultSize.w / 2, y: snapped.y - cfg.defaultSize.h / 2 },
      size: cfg.defaultSize,
      metadata: {},
      style: { color: cfg.defaultColor, borderColor: cfg.defaultBorder },
    })
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      title={`Click to add ${cfg.label} to canvas`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 5,
        cursor: 'grab',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Color swatch */}
      <svg width={24} height={18} style={{ flexShrink: 0 }}>
        <rect
          x={1} y={type === 'client' ? 3 : 1}
          width={22} height={type === 'client' ? 12 : 16}
          rx={type === 'client' ? 8 : 3}
          fill={cfg.defaultColor}
          stroke={cfg.defaultBorder}
          strokeWidth={1.5}
        />
      </svg>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{cfg.label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>{cfg.description.slice(0, 30)}</div>
      </div>
    </div>
  )
}

export const NodePalette: React.FC = () => {
  const [search, setSearch] = useState('')

  const filtered = Object.values(NODE_TYPE_CONFIGS).filter(cfg =>
    cfg.label.toLowerCase().includes(search.toLowerCase()) ||
    cfg.description.toLowerCase().includes(search.toLowerCase()) ||
    cfg.category.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = NODE_CATEGORIES.map(cat => ({
    cat,
    items: filtered.filter(cfg => cfg.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{
      width: 220,
      height: '100%',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase',
        }}>
          Components
        </div>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 5,
            padding: '5px 10px',
            fontSize: 12,
            color: 'var(--text-1)',
            outline: 'none',
            transition: 'border-color 0.1s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {byCategory.map(({ cat, items }) => (
          <div key={cat}>
            <div style={{
              padding: '8px 10px 4px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {cat}
            </div>
            {items.map(cfg => (
              <PaletteItem key={cfg.type} type={cfg.type} />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        fontSize: 10,
        color: 'var(--text-3)',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Click to add · Drag to place
      </div>
    </div>
  )
}
