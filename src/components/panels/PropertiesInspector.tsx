import React, { useState } from 'react'
import { useGraphStore } from '../../store/graphStore'
import { NODE_TYPE_CONFIGS, EDGE_TYPE_CONFIGS } from '../../constants/nodeTypes'
import { NodeData, EdgeData, EdgeType } from '../../types'

// ─── Shared field components ─────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
    letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase',
  }}>
    {children}
  </div>
)

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 5,
      padding: '5px 8px',
      fontSize: 12,
      color: 'var(--text-1)',
      outline: 'none',
      transition: 'border-color 0.1s',
      ...props.style,
    }}
    onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--accent-border)' }}
    onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)' }}
  />
)

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{
      width: '100%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 5,
      padding: '5px 8px',
      fontSize: 12,
      color: 'var(--text-1)',
      outline: 'none',
      resize: 'vertical',
      minHeight: 56,
      fontFamily: 'inherit',
      transition: 'border-color 0.1s',
      ...props.style,
    }}
    onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--accent-border)' }}
    onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--border)' }}
  />
)

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 10, paddingBottom: 6,
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </div>
    {children}
  </div>
)

// ─── Node inspector ──────────────────────────────────────────────────────────

const NodeInspector: React.FC<{ node: NodeData }> = ({ node }) => {
  const { updateNode } = useGraphStore()
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const cfg = NODE_TYPE_CONFIGS[node.type]

  const update = (patch: Partial<NodeData>) => updateNode(node.id, patch)
  const updateStyle = (patch: Partial<NodeData['style']>) =>
    updateNode(node.id, { style: { ...node.style, ...patch } })
  const updateMeta = (patch: Partial<NodeData['metadata']>) =>
    updateNode(node.id, { metadata: { ...node.metadata, ...patch } })

  const addProperty = () => {
    if (!newKey.trim()) return
    updateMeta({ properties: { ...(node.metadata.properties ?? {}), [newKey]: newVal } })
    setNewKey(''); setNewVal('')
  }

  const removeProperty = (key: string) => {
    const props = { ...(node.metadata.properties ?? {}) }
    delete props[key]
    updateMeta({ properties: props })
  }

  return (
    <div>
      {/* Type badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20,
        background: cfg.defaultColor,
        border: `1px solid ${cfg.defaultBorder}`,
        marginBottom: 16,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.defaultBorder }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.textColor }}>{cfg.label}</span>
      </div>

      <Section title="Identity">
        <Label>Label</Label>
        <Input
          value={node.label}
          onChange={e => update({ label: e.target.value })}
          style={{ marginBottom: 8 }}
        />
        <Label>Description</Label>
        <TextArea
          value={node.metadata.description ?? ''}
          onChange={e => updateMeta({ description: e.target.value })}
          style={{ marginBottom: 8 }}
          rows={2}
        />
        <Label>Tags (comma-separated)</Label>
        <Input
          value={(node.metadata.tags ?? []).join(', ')}
          onChange={e => updateMeta({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
        />
      </Section>

      <Section title="Appearance">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <Label>Fill</Label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color"
                value={node.style?.color ?? cfg.defaultColor}
                onChange={e => updateStyle({ color: e.target.value })}
                style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }}
              />
              <Input value={node.style?.color ?? cfg.defaultColor}
                onChange={e => updateStyle({ color: e.target.value })}
                style={{ flex: 1 }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Label>Border</Label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color"
                value={node.style?.borderColor ?? cfg.defaultBorder}
                onChange={e => updateStyle({ borderColor: e.target.value })}
                style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }}
              />
              <Input value={node.style?.borderColor ?? cfg.defaultBorder}
                onChange={e => updateStyle({ borderColor: e.target.value })}
                style={{ flex: 1 }} />
            </div>
          </div>
        </div>
        <Label>Opacity</Label>
        <input
          type="range" min={0.2} max={1} step={0.05}
          value={node.style?.opacity ?? 1}
          onChange={e => updateStyle({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
      </Section>

      <Section title="Position & Size">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'X', val: Math.round(node.position.x), set: (v: number) => update({ position: { ...node.position, x: v } }) },
            { label: 'Y', val: Math.round(node.position.y), set: (v: number) => update({ position: { ...node.position, y: v } }) },
            { label: 'W', val: Math.round(node.size.w), set: (v: number) => update({ size: { ...node.size, w: v } }) },
            { label: 'H', val: Math.round(node.size.h), set: (v: number) => update({ size: { ...node.size, h: v } }) },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <Label>{label}</Label>
              <Input type="number"
                value={val}
                onChange={e => set(parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Properties">
        {Object.entries(node.metadata.properties ?? {}).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <Input value={k} readOnly style={{ flex: 0.8, color: 'var(--text-2)' }} />
            <Input value={v}
              onChange={e => updateMeta({
                properties: { ...(node.metadata.properties ?? {}), [k]: e.target.value }
              })}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => removeProperty(k)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-2)',
                cursor: 'pointer', fontSize: 16, padding: '0 2px',
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <Input placeholder="key" value={newKey} onChange={e => setNewKey(e.target.value)}
            style={{ flex: 0.8 }}
            onKeyDown={e => e.key === 'Enter' && addProperty()}
          />
          <Input placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && addProperty()}
          />
          <button
            onClick={addProperty}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 5, color: 'var(--accent)', cursor: 'pointer',
              fontSize: 18, padding: '0 8px', flexShrink: 0,
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >+</button>
        </div>
      </Section>
    </div>
  )
}

// ─── Edge inspector ──────────────────────────────────────────────────────────

const EdgeInspector: React.FC<{ edge: EdgeData }> = ({ edge }) => {
  const { updateEdge } = useGraphStore()
  const cfg = EDGE_TYPE_CONFIGS[edge.type]

  const update = (patch: Partial<EdgeData>) => updateEdge(edge.id, patch)
  const updateStyle = (patch: Partial<EdgeData['style']>) =>
    updateEdge(edge.id, { style: { ...edge.style, ...patch } })

  return (
    <div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20,
        background: 'var(--bg-surface)', border: `1px solid ${cfg.color}`,
        marginBottom: 16,
      }}>
        <div style={{ width: 14, height: 2, background: cfg.color, borderRadius: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
      </div>

      <Section title="Edge">
        <Label>Label</Label>
        <Input
          value={edge.label ?? ''}
          onChange={e => update({ label: e.target.value })}
          placeholder="Optional label"
          style={{ marginBottom: 8 }}
        />
        <Label>Type</Label>
        <select
          value={edge.type}
          onChange={e => update({ type: e.target.value as EdgeType })}
          style={{
            width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '5px 8px', fontSize: 12, color: 'var(--text-1)',
            marginBottom: 8, outline: 'none',
          }}
        >
          {Object.values(EDGE_TYPE_CONFIGS).map(c => (
            <option key={c.type} value={c.type}>{c.label}</option>
          ))}
        </select>
        <Label>Routing</Label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['orthogonal', 'curved'] as const).map(r => (
            <button key={r}
              onClick={() => update({ routing: r })}
              style={{
                flex: 1, padding: '5px 0', fontSize: 11, cursor: 'pointer',
                background: edge.routing === r ? 'var(--accent-subtle)' : 'transparent',
                border: `1px solid ${edge.routing === r ? 'var(--accent-border)' : 'var(--border)'}`,
                borderRadius: 5,
                color: edge.routing === r ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: edge.routing === r ? 600 : 400,
                transition: 'all 0.1s',
              }}
            >
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Style">
        <Label>Color</Label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <input type="color"
            value={edge.style?.color ?? cfg.color}
            onChange={e => updateStyle({ color: e.target.value })}
            style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }}
          />
          <Input value={edge.style?.color ?? cfg.color}
            onChange={e => updateStyle({ color: e.target.value })}
          />
        </div>
        <Label>Stroke width</Label>
        <input type="range" min={0.5} max={6} step={0.5}
          value={edge.style?.strokeWidth ?? cfg.strokeWidth}
          onChange={e => updateStyle({ strokeWidth: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
          cursor: 'pointer', fontSize: 12, color: 'var(--text-2)',
        }}>
          <input type="checkbox"
            checked={edge.style?.animated ?? false}
            onChange={e => updateStyle({ animated: e.target.checked })}
            style={{ accentColor: 'var(--accent)' }}
          />
          Animated flow
        </label>
      </Section>
    </div>
  )
}

// ─── Multi-selection summary ──────────────────────────────────────────────────

const MultiInspector: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>
    <div style={{ fontSize: 24, marginBottom: 10 }}>◈</div>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>{count} items selected</div>
    <div style={{ fontSize: 11 }}>Select a single item to inspect</div>
  </div>
)

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyInspector: React.FC = () => (
  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
    <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>⬡</div>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>No selection</div>
    <div style={{ fontSize: 11 }}>Click a node or edge to inspect</div>
  </div>
)

// ─── Main panel ──────────────────────────────────────────────────────────────

export const PropertiesInspector: React.FC = () => {
  const { nodes, edges, selectedIds } = useGraphStore()
  const selected = [...selectedIds]

  return (
    <div style={{
      width: 256,
      height: '100%',
      background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Properties
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
        {selected.length === 0 && <EmptyInspector />}
        {selected.length === 1 && (
          nodes[selected[0]]
            ? <NodeInspector node={nodes[selected[0]]} />
            : edges[selected[0]]
              ? <EdgeInspector edge={edges[selected[0]]} />
              : <EmptyInspector />
        )}
        {selected.length > 1 && <MultiInspector count={selected.length} />}
      </div>
    </div>
  )
}
