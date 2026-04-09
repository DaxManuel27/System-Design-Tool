import { NodeData, Port, Viewport } from '../types'
import { SNAP_SIZE } from '../constants/nodeTypes'

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// ─── Coordinate transforms ────────────────────────────────────────────────────

export function screenToGraph(screenX: number, screenY: number, vp: Viewport): Point {
  return {
    x: (screenX - vp.x) / vp.zoom,
    y: (screenY - vp.y) / vp.zoom,
  }
}

export function graphToScreen(graphX: number, graphY: number, vp: Viewport): Point {
  return {
    x: graphX * vp.zoom + vp.x,
    y: graphY * vp.zoom + vp.y,
  }
}

// ─── Snap to grid ────────────────────────────────────────────────────────────

export function snapToGrid(v: number, size: number = SNAP_SIZE): number {
  return Math.round(v / size) * size
}

export function snapPoint(p: Point, size: number = SNAP_SIZE): Point {
  return { x: snapToGrid(p.x, size), y: snapToGrid(p.y, size) }
}

// ─── Node geometry ───────────────────────────────────────────────────────────

export function getNodeRect(node: NodeData): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.size.w,
    h: node.size.h,
  }
}

export function getNodeCenter(node: NodeData): Point {
  return {
    x: node.position.x + node.size.w / 2,
    y: node.position.y + node.size.h / 2,
  }
}

export function getPortPosition(node: NodeData, port: Port): Point {
  const { x, y } = node.position
  const { w, h } = node.size
  switch (port) {
    case 'top':    return { x: x + w / 2, y }
    case 'bottom': return { x: x + w / 2, y: y + h }
    case 'left':   return { x,             y: y + h / 2 }
    case 'right':  return { x: x + w,      y: y + h / 2 }
  }
}

export function getNearestPort(node: NodeData, point: Point): Port {
  const ports: Port[] = ['top', 'bottom', 'left', 'right']
  let best: Port = 'top'
  let bestDist = Infinity
  for (const port of ports) {
    const pp = getPortPosition(node, port)
    const d = distanceSq(pp, point)
    if (d < bestDist) { bestDist = d; best = port }
  }
  return best
}

// ─── Rect operations ─────────────────────────────────────────────────────────

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  )
}

export function getBoundingBox(nodes: NodeData[]): Rect | null {
  if (!nodes.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + n.size.w)
    maxY = Math.max(maxY, n.position.y + n.size.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ─── Math helpers ────────────────────────────────────────────────────────────

export function distanceSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt(distanceSq(a, b))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─── Alignment ───────────────────────────────────────────────────────────────

export type AlignDirection = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
export type DistributeDirection = 'horizontal' | 'vertical'

export function computeAlignment(
  nodes: NodeData[],
  dir: AlignDirection
): Array<{ id: string; x?: number; y?: number }> {
  if (nodes.length < 2) return []
  const boxes = nodes.map(n => getNodeRect(n))

  const results: Array<{ id: string; x?: number; y?: number }> = []
  switch (dir) {
    case 'left': {
      const minX = Math.min(...boxes.map(b => b.x))
      nodes.forEach(n => results.push({ id: n.id, x: minX }))
      break
    }
    case 'right': {
      const maxX = Math.max(...boxes.map(b => b.x + b.w))
      nodes.forEach((n, i) => results.push({ id: n.id, x: maxX - boxes[i].w }))
      break
    }
    case 'center-h': {
      const avgX = boxes.reduce((s, b) => s + b.x + b.w / 2, 0) / boxes.length
      nodes.forEach((n, i) => results.push({ id: n.id, x: avgX - boxes[i].w / 2 }))
      break
    }
    case 'top': {
      const minY = Math.min(...boxes.map(b => b.y))
      nodes.forEach(n => results.push({ id: n.id, y: minY }))
      break
    }
    case 'bottom': {
      const maxY = Math.max(...boxes.map(b => b.y + b.h))
      nodes.forEach((n, i) => results.push({ id: n.id, y: maxY - boxes[i].h }))
      break
    }
    case 'center-v': {
      const avgY = boxes.reduce((s, b) => s + b.y + b.h / 2, 0) / boxes.length
      nodes.forEach((n, i) => results.push({ id: n.id, y: avgY - boxes[i].h / 2 }))
      break
    }
  }
  return results
}

export function computeDistribute(
  nodes: NodeData[],
  dir: DistributeDirection
): Array<{ id: string; x?: number; y?: number }> {
  if (nodes.length < 3) return []
  const sorted = [...nodes].sort((a, b) =>
    dir === 'horizontal'
      ? a.position.x - b.position.x
      : a.position.y - b.position.y
  )
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const results: Array<{ id: string; x?: number; y?: number }> = []

  if (dir === 'horizontal') {
    const totalSpan = (last.position.x + last.size.w) - first.position.x
    const totalNodeW = sorted.reduce((s, n) => s + n.size.w, 0)
    const gap = (totalSpan - totalNodeW) / (sorted.length - 1)
    let cursor = first.position.x
    for (const n of sorted) {
      results.push({ id: n.id, x: cursor })
      cursor += n.size.w + gap
    }
  } else {
    const totalSpan = (last.position.y + last.size.h) - first.position.y
    const totalNodeH = sorted.reduce((s, n) => s + n.size.h, 0)
    const gap = (totalSpan - totalNodeH) / (sorted.length - 1)
    let cursor = first.position.y
    for (const n of sorted) {
      results.push({ id: n.id, y: cursor })
      cursor += n.size.h + gap
    }
  }
  return results
}
