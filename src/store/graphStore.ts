import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { NodeData, EdgeData, GraphState, GraphSnapshot, DiagramOperation } from '../types'
import { hierarchicalLayout } from '../utils/layout'

const MAX_HISTORY = 100

let clipboard: NodeData[] = []

function snapshot(nodes: Record<string, NodeData>, edges: Record<string, EdgeData>): GraphSnapshot {
  return {
    nodes: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { ...v, metadata: { ...v.metadata }, style: v.style ? { ...v.style } : undefined }])),
    edges: Object.fromEntries(Object.entries(edges).map(([k, v]) => [k, { ...v, style: v.style ? { ...v.style } : undefined }])),
  }
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: {},
  edges: {},
  selectedIds: new Set(),
  history: [],
  historyIndex: -1,

  // ─── History ────────────────────────────────────────────────────────────────

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const snap = snapshot(nodes, edges)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snap)
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const idx = historyIndex - 1
    const snap = history[idx]
    set({ nodes: snap.nodes, edges: snap.edges, historyIndex: idx, selectedIds: new Set() })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const idx = historyIndex + 1
    const snap = history[idx]
    set({ nodes: snap.nodes, edges: snap.edges, historyIndex: idx, selectedIds: new Set() })
  },

  // ─── Nodes ──────────────────────────────────────────────────────────────────

  addNode: (node: NodeData) => {
    get().pushHistory()
    set(state => ({ nodes: { ...state.nodes, [node.id]: node } }))
  },

  updateNode: (id: string, updates: Partial<NodeData>) => {
    set(state => {
      const existing = state.nodes[id]
      if (!existing) return state
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...existing, ...updates },
        },
      }
    })
  },

  updateNodes: (updates) => {
    set(state => {
      const next = { ...state.nodes }
      for (const { id, updates: u } of updates) {
        if (next[id]) next[id] = { ...next[id], ...u }
      }
      return { nodes: next }
    })
  },

  removeNode: (id: string) => {
    get().pushHistory()
    set(state => {
      const nodes = { ...state.nodes }
      delete nodes[id]
      // Also remove edges connected to this node
      const edges = Object.fromEntries(
        Object.entries(state.edges).filter(([, e]) => e.source !== id && e.target !== id)
      )
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { nodes, edges, selectedIds }
    })
  },

  removeNodes: (ids: string[]) => {
    get().pushHistory()
    const idSet = new Set(ids)
    set(state => {
      const nodes = Object.fromEntries(Object.entries(state.nodes).filter(([id]) => !idSet.has(id)))
      const edges = Object.fromEntries(
        Object.entries(state.edges).filter(([, e]) => !idSet.has(e.source) && !idSet.has(e.target))
      )
      const selectedIds = new Set([...state.selectedIds].filter(id => !idSet.has(id)))
      return { nodes, edges, selectedIds }
    })
  },

  duplicateNodes: (ids: string[]) => {
    get().pushHistory()
    set(state => {
      const OFFSET = 24
      const newNodes: Record<string, NodeData> = { ...state.nodes }
      const idMap = new Map<string, string>()
      for (const id of ids) {
        const n = state.nodes[id]
        if (!n) continue
        const newId = uuid()
        idMap.set(id, newId)
        newNodes[newId] = {
          ...n,
          id: newId,
          position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
          metadata: { ...n.metadata },
          style: n.style ? { ...n.style } : undefined,
        }
      }
      // Duplicate edges between the duplicated nodes
      const newEdges: Record<string, EdgeData> = { ...state.edges }
      for (const edge of Object.values(state.edges)) {
        if (idMap.has(edge.source) && idMap.has(edge.target)) {
          const newId = uuid()
          newEdges[newId] = {
            ...edge,
            id: newId,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          }
        }
      }
      const newSelectedIds = new Set([...idMap.values()])
      return { nodes: newNodes, edges: newEdges, selectedIds: newSelectedIds }
    })
  },

  // ─── Edges ──────────────────────────────────────────────────────────────────

  addEdge: (edge: EdgeData) => {
    get().pushHistory()
    set(state => ({ edges: { ...state.edges, [edge.id]: edge } }))
  },

  updateEdge: (id: string, updates: Partial<EdgeData>) => {
    set(state => {
      const existing = state.edges[id]
      if (!existing) return state
      return { edges: { ...state.edges, [id]: { ...existing, ...updates } } }
    })
  },

  removeEdge: (id: string) => {
    get().pushHistory()
    set(state => {
      const edges = { ...state.edges }
      delete edges[id]
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { edges, selectedIds }
    })
  },

  removeEdges: (ids: string[]) => {
    get().pushHistory()
    const idSet = new Set(ids)
    set(state => ({
      edges: Object.fromEntries(Object.entries(state.edges).filter(([id]) => !idSet.has(id))),
      selectedIds: new Set([...state.selectedIds].filter(id => !idSet.has(id))),
    }))
  },

  // ─── Selection ──────────────────────────────────────────────────────────────

  selectIds: (ids: string[], additive = false) => {
    set(state => ({
      selectedIds: additive
        ? new Set([...state.selectedIds, ...ids])
        : new Set(ids),
    }))
  },

  deselectAll: () => {
    set({ selectedIds: new Set() })
  },

  selectAll: () => {
    set(state => ({
      selectedIds: new Set([...Object.keys(state.nodes), ...Object.keys(state.edges)]),
    }))
  },

  // ─── Clipboard ──────────────────────────────────────────────────────────────

  copySelected: () => {
    const { nodes, selectedIds } = get()
    clipboard = [...selectedIds]
      .map(id => nodes[id])
      .filter(Boolean)
  },

  paste: () => {
    if (!clipboard.length) return
    get().pushHistory()
    const OFFSET = 32
    set(state => {
      const newNodes: Record<string, NodeData> = { ...state.nodes }
      const newSelectedIds = new Set<string>()
      for (const n of clipboard) {
        const newId = uuid()
        newNodes[newId] = {
          ...n,
          id: newId,
          position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
          metadata: { ...n.metadata },
          style: n.style ? { ...n.style } : undefined,
        }
        newSelectedIds.add(newId)
      }
      return { nodes: newNodes, selectedIds: newSelectedIds }
    })
  },

  // ─── Auto layout ────────────────────────────────────────────────────────────

  autoLayout: () => {
    get().pushHistory()
    const { nodes, edges } = get()
    const nodeList = Object.values(nodes)
    const edgeList = Object.values(edges)
    const positions = hierarchicalLayout(nodeList, edgeList)
    set(state => {
      const next = { ...state.nodes }
      for (const { id, x, y } of positions) {
        if (next[id]) next[id] = { ...next[id], position: { x, y } }
      }
      return { nodes: next }
    })
  },

  applyAIOperations: (ops: DiagramOperation[]) => {
    get().pushHistory()
    let needsAutoLayout = false
    set(state => {
      let nodes = { ...state.nodes }
      let edges = { ...state.edges }
      for (const op of ops) {
        if (op.op === 'addNode') {
          nodes = { ...nodes, [op.node.id]: op.node }
        } else if (op.op === 'updateNode') {
          if (nodes[op.id]) {
            nodes = { ...nodes, [op.id]: { ...nodes[op.id], ...op.updates } }
          }
        } else if (op.op === 'removeNode') {
          const next = { ...nodes }
          delete next[op.id]
          nodes = next
          edges = Object.fromEntries(
            Object.entries(edges).filter(([, e]) => e.source !== op.id && e.target !== op.id)
          )
        } else if (op.op === 'removeNodes') {
          const idSet = new Set(op.ids)
          nodes = Object.fromEntries(Object.entries(nodes).filter(([id]) => !idSet.has(id)))
          edges = Object.fromEntries(
            Object.entries(edges).filter(([, e]) => !idSet.has(e.source) && !idSet.has(e.target))
          )
        } else if (op.op === 'addEdge') {
          edges = { ...edges, [op.edge.id]: op.edge }
        } else if (op.op === 'updateEdge') {
          if (edges[op.id]) {
            edges = { ...edges, [op.id]: { ...edges[op.id], ...op.updates } }
          }
        } else if (op.op === 'removeEdge') {
          const next = { ...edges }
          delete next[op.id]
          edges = next
        } else if (op.op === 'removeEdges') {
          const idSet = new Set(op.ids)
          edges = Object.fromEntries(Object.entries(edges).filter(([id]) => !idSet.has(id)))
        } else if (op.op === 'clearAll') {
          nodes = {}
          edges = {}
        } else if (op.op === 'autoLayout') {
          needsAutoLayout = true
        }
      }
      return { nodes, edges }
    })
    if (needsAutoLayout) {
      get().autoLayout()
    }
  },
}))
