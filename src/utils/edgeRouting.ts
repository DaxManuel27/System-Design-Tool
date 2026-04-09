import { NodeData, EdgeData, Port } from '../types'
import { getPortPosition, Point } from './geometry'

// ─── Port direction vectors ───────────────────────────────────────────────────

function portDirection(port: Port): Point {
  switch (port) {
    case 'top':    return { x: 0, y: -1 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left':   return { x: -1, y: 0 }
    case 'right':  return { x: 1, y: 0 }
  }
}

// ─── Orthogonal routing ──────────────────────────────────────────────────────

export function orthogonalPath(src: Point, tgt: Point, srcPort: Port, tgtPort: Port): string {
  const STUB = 30 // minimum stub length out of port
  const sd = portDirection(srcPort)
  const td = portDirection(tgtPort)

  // Stub endpoints
  const sx = src.x + sd.x * STUB
  const sy = src.y + sd.y * STUB
  const tx = tgt.x + td.x * STUB
  const ty = tgt.y + td.y * STUB

  // Route: source stub → elbow(s) → target stub
  // Determine mid-routing between stub ends
  const mx = (sx + tx) / 2
  const my = (sy + ty) / 2

  // If source and target stubs are on compatible axes, use a simple 2-segment path
  const srcHoriz = srcPort === 'left' || srcPort === 'right'
  const tgtHoriz = tgtPort === 'left' || tgtPort === 'right'

  if (srcHoriz && tgtHoriz) {
    // Both horizontal: route via vertical midpoint
    return `M ${src.x} ${src.y} H ${mx} V ${ty} H ${tgt.x}`
  } else if (!srcHoriz && !tgtHoriz) {
    // Both vertical: route via horizontal midpoint
    return `M ${src.x} ${src.y} V ${my} H ${tx} V ${tgt.y}`
  } else if (srcHoriz && !tgtHoriz) {
    // Source horiz, target vert: corner at (tx, sy_stub)
    return `M ${src.x} ${src.y} H ${tx} V ${tgt.y}`
  } else {
    // Source vert, target horiz: corner at (sx_stub, ty)
    return `M ${src.x} ${src.y} V ${ty} H ${tgt.x}`
  }
}

// ─── Curved (bezier) routing ─────────────────────────────────────────────────

export function curvedPath(src: Point, tgt: Point, srcPort: Port, tgtPort: Port): string {
  const CTRL = Math.max(60, Math.hypot(tgt.x - src.x, tgt.y - src.y) * 0.4)
  const sd = portDirection(srcPort)
  const td = portDirection(tgtPort)

  const c1x = src.x + sd.x * CTRL
  const c1y = src.y + sd.y * CTRL
  const c2x = tgt.x + td.x * CTRL
  const c2y = tgt.y + td.y * CTRL

  return `M ${src.x} ${src.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${tgt.x} ${tgt.y}`
}

// ─── Preview path (while drawing) ────────────────────────────────────────────

export function previewPath(src: Point, srcPort: Port, cursor: Point): string {
  const CTRL = Math.max(40, Math.hypot(cursor.x - src.x, cursor.y - src.y) * 0.4)
  const sd = portDirection(srcPort)
  const c1x = src.x + sd.x * CTRL
  const c1y = src.y + sd.y * CTRL
  return `M ${src.x} ${src.y} C ${c1x} ${c1y} ${cursor.x} ${cursor.y} ${cursor.x} ${cursor.y}`
}

// ─── Edge path resolver ──────────────────────────────────────────────────────

export function resolveEdgePath(
  edge: EdgeData,
  nodes: Record<string, NodeData>
): string | null {
  const src = nodes[edge.source]
  const tgt = nodes[edge.target]
  if (!src || !tgt) return null

  const srcPos = getPortPosition(src, edge.sourcePort)
  const tgtPos = getPortPosition(tgt, edge.targetPort)

  if (edge.routing === 'orthogonal') {
    return orthogonalPath(srcPos, tgtPos, edge.sourcePort, edge.targetPort)
  } else {
    return curvedPath(srcPos, tgtPos, edge.sourcePort, edge.targetPort)
  }
}

// ─── Edge midpoint ───────────────────────────────────────────────────────────

export function getEdgeMidpoint(
  edge: EdgeData,
  nodes: Record<string, NodeData>
): Point | null {
  const src = nodes[edge.source]
  const tgt = nodes[edge.target]
  if (!src || !tgt) return null
  const srcPos = getPortPosition(src, edge.sourcePort)
  const tgtPos = getPortPosition(tgt, edge.targetPort)
  return { x: (srcPos.x + tgtPos.x) / 2, y: (srcPos.y + tgtPos.y) / 2 }
}
