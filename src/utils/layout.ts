import { NodeData, EdgeData } from '../types'
import { SNAP_SIZE } from '../constants/nodeTypes'

// ─── Sugiyama-style hierarchical layout ──────────────────────────────────────
// Simplified top-down layout: rank nodes by topological depth, then space them.

function buildAdjacency(
  nodes: NodeData[],
  edges: EdgeData[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
  }
  return adj
}

function topoRank(nodes: NodeData[], edges: EdgeData[]): Map<string, number> {
  const inDegree = new Map<string, number>()
  const adj = buildAdjacency(nodes, edges)
  for (const n of nodes) inDegree.set(n.id, 0)
  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const rank = new Map<string, number>()
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) { queue.push(id); rank.set(id, 0) }
  }

  while (queue.length) {
    const curr = queue.shift()!
    for (const next of (adj.get(curr) ?? [])) {
      const newRank = (rank.get(curr) ?? 0) + 1
      if ((rank.get(next) ?? -1) < newRank) {
        rank.set(next, newRank)
      }
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1)
      if (inDegree.get(next) === 0) queue.push(next)
    }
  }

  // Assign rank 0 to any unreached nodes
  for (const n of nodes) {
    if (!rank.has(n.id)) rank.set(n.id, 0)
  }

  return rank
}

export function hierarchicalLayout(
  nodes: NodeData[],
  edges: EdgeData[]
): Array<{ id: string; x: number; y: number }> {
  if (!nodes.length) return []

  const skip = nodes.filter(n => n.type === 'container' || n.type === 'annotation')
  const layoutNodes = nodes.filter(n => n.type !== 'container' && n.type !== 'annotation')

  if (!layoutNodes.length) return []

  const ranks = topoRank(layoutNodes, edges)
  const maxRank = Math.max(...[...ranks.values()])

  // Group by rank
  const byRank = new Map<number, NodeData[]>()
  for (let r = 0; r <= maxRank; r++) byRank.set(r, [])
  for (const n of layoutNodes) {
    const r = ranks.get(n.id) ?? 0
    byRank.get(r)!.push(n)
  }

  const H_GAP = 60
  const V_GAP = 80

  const results: Array<{ id: string; x: number; y: number }> = []

  let currentY = 80
  for (let r = 0; r <= maxRank; r++) {
    const group = byRank.get(r) ?? []
    if (!group.length) continue

    const totalW = group.reduce((s, n) => s + n.size.w, 0) + H_GAP * (group.length - 1)
    let currentX = -totalW / 2

    const maxH = Math.max(...group.map(n => n.size.h))

    for (const n of group) {
      results.push({
        id: n.id,
        x: Math.round(currentX / SNAP_SIZE) * SNAP_SIZE,
        y: Math.round(currentY / SNAP_SIZE) * SNAP_SIZE,
      })
      currentX += n.size.w + H_GAP
    }
    currentY += maxH + V_GAP
  }

  return results
}
