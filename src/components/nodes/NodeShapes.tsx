import React from 'react'
import { NodeType, NodeData } from '../../types'
import { NODE_TYPE_CONFIGS } from '../../constants/nodeTypes'

interface ShapeProps {
  node: NodeData
  selected: boolean
  hovered: boolean
}

const SELECTED_GLOW = 'drop-shadow(0 0 5px rgba(180,180,180,0.5))'

function getColors(node: NodeData) {
  const cfg = NODE_TYPE_CONFIGS[node.type]
  return {
    fill: node.style?.color ?? cfg.defaultColor,
    stroke: node.style?.borderColor ?? cfg.defaultBorder,
    text: cfg.textColor,
  }
}

// ─── Service: rounded rect, blue ─────────────────────────────────────────────
const ServiceShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const { fill, stroke } = getColors(node)
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <rect x={0} y={0} width={w} height={h} rx={10} ry={10}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        opacity={node.style?.opacity ?? 1} />
      {hovered && !selected && (
        <rect x={0} y={0} width={w} height={h} rx={10} ry={10}
          fill="none" stroke={stroke} strokeWidth={2} opacity={0.5} />
      )}
      {/* Cloud icon */}
      <g transform={`translate(10, ${h / 2 - 8})`} fill={stroke} opacity={0.8}>
        <path d="M14 4.5a5 5 0 0 0-9.9 1A4 4 0 0 0 4 13h10a3 3 0 0 0 0-6 .5.5 0 0 1 0-1 5 5 0 0 0 0-.5z"
          transform="scale(0.9)" />
      </g>
    </g>
  )
}

// ─── Database: cylinder, green ────────────────────────────────────────────────
const DatabaseShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const rx = w / 2
  const ry = 12
  const { fill, stroke } = getColors(node)
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      {/* Body */}
      <path
        d={`M 0 ${ry} Q 0 0 ${rx} 0 Q ${w} 0 ${w} ${ry} L ${w} ${h - ry} Q ${w} ${h} ${rx} ${h} Q 0 ${h} 0 ${h - ry} Z`}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        opacity={node.style?.opacity ?? 1}
      />
      {/* Top ellipse */}
      <ellipse cx={rx} cy={ry} rx={rx} ry={ry}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5} />
      {/* Highlight top rim */}
      <ellipse cx={rx} cy={ry} rx={rx - 2} ry={ry - 2}
        fill="none" stroke={stroke} strokeWidth={0.5} opacity={0.4} />
      {/* DB lines */}
      <ellipse cx={rx} cy={ry * 1.8} rx={rx - 4} ry={ry * 0.5}
        fill="none" stroke={stroke} strokeWidth={0.5} opacity={0.3} />
    </g>
  )
}

// ─── Queue: hexagon, orange ───────────────────────────────────────────────────
const QueueShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const cx = w / 2, cy = h / 2
  const rx = w / 2, ry = h / 2
  const { fill, stroke } = getColors(node)
  // Horizontal hexagon points
  const pts = [
    `${cx - rx} ${cy}`,
    `${cx - rx * 0.5} ${cy - ry}`,
    `${cx + rx * 0.5} ${cy - ry}`,
    `${cx + rx} ${cy}`,
    `${cx + rx * 0.5} ${cy + ry}`,
    `${cx - rx * 0.5} ${cy + ry}`,
  ].join(' ')
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <polygon points={pts} fill={fill} stroke={stroke}
        strokeWidth={selected ? 2 : 1.5} opacity={node.style?.opacity ?? 1} />
      {/* Queue icon: parallel lines */}
      <g transform={`translate(${cx - 14}, ${cy - 8})`} stroke={stroke} strokeWidth={1.5} opacity={0.8}>
        <line x1={2} y1={4}  x2={26} y2={4} />
        <line x1={2} y1={9}  x2={26} y2={9} />
        <line x1={2} y1={14} x2={26} y2={14} />
      </g>
    </g>
  )
}

// ─── Cache: rounded rect, purple ─────────────────────────────────────────────
const CacheShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const { fill, stroke } = getColors(node)
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <rect x={0} y={0} width={w} height={h} rx={8} ry={8}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        opacity={node.style?.opacity ?? 1} />
      {/* Lightning bolt */}
      <g transform={`translate(10, ${h / 2 - 10})`} fill={stroke} opacity={0.8}>
        <path d="M13 2L4.5 13H11l-2 9L21 10H14L13 2z" transform="scale(0.75)" />
      </g>
    </g>
  )
}

// ─── Client/User: circle, teal ────────────────────────────────────────────────
const ClientShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const r = Math.min(w, h) / 2
  const cx = w / 2, cy = h / 2
  const { fill, stroke } = getColors(node)
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <circle cx={cx} cy={cy} r={r}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        opacity={node.style?.opacity ?? 1} />
      {/* Person icon */}
      <g transform={`translate(${cx - 10}, ${cy - 12})`} fill={stroke} opacity={0.85}>
        <circle cx={10} cy={6} r={4} />
        <path d="M2 20c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeWidth={1.5} stroke={stroke} fill="none" />
      </g>
    </g>
  )
}

// ─── Gateway: trapezoid, indigo ───────────────────────────────────────────────
const GatewayShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const TAPER = 18
  const { fill, stroke } = getColors(node)
  const pts = `${TAPER},0 ${w - TAPER},0 ${w},${h} 0,${h}`
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <polygon points={pts} fill={fill} stroke={stroke}
        strokeWidth={selected ? 2 : 1.5} opacity={node.style?.opacity ?? 1} />
      {/* Gateway symbol: diamond + arrow */}
      <g transform={`translate(${w / 2 - 10}, ${h / 2 - 8})`} fill="none" stroke={stroke} strokeWidth={1.5} opacity={0.8}>
        <polygon points="10,0 20,8 10,16 0,8" fill={stroke} opacity={0.3} />
        <line x1={10} y1={4} x2={10} y2={12} />
        <polyline points="7,9 10,12 13,9" />
      </g>
    </g>
  )
}

// ─── LoadBalancer: diamond, yellow ────────────────────────────────────────────
const LoadBalancerShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const cx = w / 2, cy = h / 2
  const { fill, stroke } = getColors(node)
  const pts = `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <polygon points={pts} fill={fill} stroke={stroke}
        strokeWidth={selected ? 2 : 1.5} opacity={node.style?.opacity ?? 1} />
      {/* LB arrows */}
      <g transform={`translate(${cx - 14}, ${cy - 8})`} stroke={stroke} strokeWidth={1.5} opacity={0.8}>
        <line x1={4} y1={8} x2={16} y2={4} />
        <line x1={4} y1={8} x2={16} y2={8} />
        <line x1={4} y1={8} x2={16} y2={12} />
        <polyline points="12,2 16,4 12,6" fill="none" />
        <polyline points="12,6 16,8 12,10" fill="none" />
        <polyline points="12,10 16,12 12,14" fill="none" />
      </g>
    </g>
  )
}

// ─── External system: dashed border, gray ─────────────────────────────────────
const ExternalShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const { fill, stroke } = getColors(node)
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={selected ? undefined : '6 3'}
        opacity={node.style?.opacity ?? 1} />
      {/* Globe icon */}
      <g transform={`translate(10, ${h / 2 - 8})`} fill="none" stroke={stroke} strokeWidth={1.2} opacity={0.7}>
        <circle cx={8} cy={8} r={7} />
        <ellipse cx={8} cy={8} rx={4} ry={7} />
        <line x1={1} y1={8} x2={15} y2={8} />
        <line x1={2} y1={4} x2={14} y2={4} />
        <line x1={2} y1={12} x2={14} y2={12} />
      </g>
    </g>
  )
}

// ─── Container: transparent group ────────────────────────────────────────────
const ContainerShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const { stroke } = getColors(node)
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} rx={12} ry={12}
        fill="var(--accent-subtle)"
        stroke={selected ? 'var(--accent)' : (hovered ? stroke : 'var(--border-strong)')}
        strokeWidth={selected ? 1.5 : 1}
        strokeDasharray={selected ? undefined : '8 4'}
        opacity={node.style?.opacity ?? 1} />
      {/* Top label bar */}
      <rect x={0} y={0} width={w} height={28} rx={12} ry={12}
        fill={selected ? 'var(--accent-subtle)' : 'transparent'}
        style={{ pointerEvents: 'none' }} />
      <rect x={0} y={14} width={w} height={14}
        fill={selected ? 'var(--accent-subtle)' : 'transparent'}
        style={{ pointerEvents: 'none' }} />
    </g>
  )
}

// ─── Annotation: sticky note, yellow ─────────────────────────────────────────
const AnnotationShape: React.FC<ShapeProps> = ({ node, selected, hovered }) => {
  const { w, h } = node.size
  const { fill, stroke } = getColors(node)
  const FOLD = 16
  return (
    <g filter={selected ? SELECTED_GLOW : undefined}>
      <path
        d={`M 0 0 H ${w - FOLD} L ${w} ${FOLD} V ${h} H 0 Z`}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5}
        opacity={node.style?.opacity ?? 1} />
      {/* Corner fold */}
      <path
        d={`M ${w - FOLD} 0 L ${w - FOLD} ${FOLD} L ${w} ${FOLD}`}
        fill="none" stroke={stroke} strokeWidth={1} opacity={0.5} />
      {/* Lines */}
      {[20, 30, 40, 50].filter(y => y < h - 12).map(y => (
        <line key={y} x1={10} y1={y} x2={w - 14} y2={y}
          stroke={stroke} strokeWidth={0.8} opacity={0.25} />
      ))}
    </g>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────
export const NodeLabel: React.FC<{ node: NodeData; editing: boolean }> = ({ node, editing }) => {
  const { w, h } = node.size
  const cfg = NODE_TYPE_CONFIGS[node.type]
  const textColor = node.style?.textColor ?? cfg.textColor

  if (node.type === 'client') {
    return (
      <text x={w / 2} y={h + 16} textAnchor="middle"
        fill={textColor} fontSize={11} fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {editing ? '' : node.label}
      </text>
    )
  }

  if (node.type === 'container') {
    return (
      <text x={16} y={19} fill={textColor} fontSize={11} fontWeight={600}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {editing ? '' : node.label}
      </text>
    )
  }

  return (
    <text x={node.type === 'annotation' ? 10 : w / 2}
      y={node.type === 'annotation' ? 14 : h / 2 + 4}
      textAnchor={node.type === 'annotation' ? 'start' : 'middle'}
      fill={textColor} fontSize={12} fontWeight={500}
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {editing ? '' : node.label}
    </text>
  )
}

// ─── Icon label (type name) ───────────────────────────────────────────────────
export const NodeTypeLabel: React.FC<{ node: NodeData }> = ({ node }) => {
  const { w, h } = node.size
  const cfg = NODE_TYPE_CONFIGS[node.type]
  if (node.type === 'container' || node.type === 'annotation' || node.type === 'client') return null
  return (
    <text x={w / 2} y={h - 6} textAnchor="middle"
      fill={cfg.defaultBorder} fontSize={9} fontWeight={400} opacity={0.55}
      style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {cfg.label}
    </text>
  )
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

export const NodeShape: React.FC<ShapeProps> = (props) => {
  switch (props.node.type) {
    case 'service':      return <ServiceShape {...props} />
    case 'database':     return <DatabaseShape {...props} />
    case 'queue':        return <QueueShape {...props} />
    case 'cache':        return <CacheShape {...props} />
    case 'client':       return <ClientShape {...props} />
    case 'gateway':      return <GatewayShape {...props} />
    case 'loadbalancer': return <LoadBalancerShape {...props} />
    case 'external':     return <ExternalShape {...props} />
    case 'container':    return <ContainerShape {...props} />
    case 'annotation':   return <AnnotationShape {...props} />
    default:             return <ServiceShape {...props} />
  }
}
