import { NodeData, EdgeData } from '../types'

interface SerializedDiagram {
  nodeCount: number
  edgeCount: number
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null
  nodes: Array<{ id: string; type: string; label: string; position: { x: number; y: number }; metadata?: unknown }>
  edges: Array<{ id: string; type: string; source: string; target: string; label?: string }>
}

export function serializeDiagramForAI(
  nodes: Record<string, NodeData>,
  edges: Record<string, EdgeData>
): SerializedDiagram {
  const nodeList = Object.values(nodes)
  const edgeList = Object.values(edges)

  let boundingBox: SerializedDiagram['boundingBox'] = null
  if (nodeList.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodeList) {
      minX = Math.min(minX, n.position.x)
      minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + (n.size?.w ?? 0))
      maxY = Math.max(maxY, n.position.y + (n.size?.h ?? 0))
    }
    boundingBox = { minX, minY, maxX, maxY }
  }

  return {
    nodeCount: nodeList.length,
    edgeCount: edgeList.length,
    boundingBox,
    nodes: nodeList.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      position: n.position,
      ...(n.metadata && Object.keys(n.metadata).length > 0 ? { metadata: n.metadata } : {}),
    })),
    edges: edgeList.map(e => ({
      id: e.id,
      type: e.type,
      source: e.source,
      target: e.target,
      ...(e.label ? { label: e.label } : {}),
    })),
  }
}
