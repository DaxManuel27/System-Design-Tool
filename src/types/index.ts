// ─── Node ────────────────────────────────────────────────────────────────────

export type NodeType =
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'client'
  | 'gateway'
  | 'loadbalancer'
  | 'external'
  | 'container'
  | 'annotation'

export type Port = 'top' | 'bottom' | 'left' | 'right'

export interface NodeStyle {
  color?: string
  borderColor?: string
  opacity?: number
  textColor?: string
}

export interface NodeMetadata {
  description?: string
  tags?: string[]
  properties?: Record<string, string>
}

export interface NodeData {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  size: { w: number; h: number }
  metadata: NodeMetadata
  style?: NodeStyle
  locked?: boolean
  collapsed?: boolean
  parentId?: string
}

// ─── Edge ────────────────────────────────────────────────────────────────────

export type EdgeType =
  | 'http'
  | 'grpc'
  | 'event'
  | 'database'
  | 'dependency'
  | 'dataflow'
  | 'sync'
  | 'custom'

export type EdgeRouting = 'orthogonal' | 'curved'

export interface EdgeStyle {
  color?: string
  strokeWidth?: number
  animated?: boolean
}

export interface EdgeData {
  id: string
  type: EdgeType
  source: string
  target: string
  sourcePort: Port
  targetPort: Port
  label?: string
  routing: EdgeRouting
  waypoints?: { x: number; y: number }[]
  style?: EdgeStyle
}

// ─── Viewport ────────────────────────────────────────────────────────────────

export interface Viewport {
  x: number
  y: number
  zoom: number
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export type Tool = 'select' | 'pan' | 'connect' | 'comment'

// ─── Drawing state ───────────────────────────────────────────────────────────

export interface DrawingEdge {
  sourceId: string
  sourcePort: Port
  sourcePosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
}

// ─── Selection box ───────────────────────────────────────────────────────────

export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

// ─── Context menu ────────────────────────────────────────────────────────────

export interface ContextMenuState {
  x: number
  y: number
  targetId: string
  targetType: 'node' | 'edge' | 'canvas'
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface GraphSnapshot {
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
}

// ─── Graph store ─────────────────────────────────────────────────────────────

export interface GraphState {
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
  selectedIds: Set<string>
  history: GraphSnapshot[]
  historyIndex: number
  // Node actions
  addNode: (node: NodeData) => void
  updateNode: (id: string, updates: Partial<NodeData>) => void
  updateNodes: (updates: Array<{ id: string; updates: Partial<NodeData> }>) => void
  removeNode: (id: string) => void
  removeNodes: (ids: string[]) => void
  duplicateNodes: (ids: string[]) => void
  // Edge actions
  addEdge: (edge: EdgeData) => void
  updateEdge: (id: string, updates: Partial<EdgeData>) => void
  removeEdge: (id: string) => void
  removeEdges: (ids: string[]) => void
  // Selection
  selectIds: (ids: string[], additive?: boolean) => void
  deselectAll: () => void
  selectAll: () => void
  // History
  undo: () => void
  redo: () => void
  pushHistory: () => void
  // Clipboard
  copySelected: () => void
  paste: () => void
  // Layout
  autoLayout: () => void
  // AI batch apply — pushes one history entry for the entire AI response
  applyAIOperations: (ops: DiagramOperation[]) => void
}

// ─── AI diagram operations (mirrors server/lib/operationValidator.ts) ─────────

export type DiagramOperation =
  | { op: 'addNode';    node: NodeData }
  | { op: 'updateNode'; id: string; updates: Partial<NodeData> }
  | { op: 'removeNode'; id: string }
  | { op: 'removeNodes'; ids: string[] }
  | { op: 'addEdge';    edge: EdgeData }
  | { op: 'updateEdge'; id: string; updates: Partial<EdgeData> }
  | { op: 'removeEdge'; id: string }
  | { op: 'removeEdges'; ids: string[] }
  | { op: 'clearAll' }
  | { op: 'autoLayout' }

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'error'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  streaming?: boolean
  warningCount?: number   // number of validation warnings, shown as pill
  timestamp: number
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  abortController: AbortController | null
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  appendDelta: (id: string, delta: string) => void
  setLoading: (v: boolean) => void
  setAbortController: (c: AbortController | null) => void
  clearMessages: () => void
}

// ─── UI store ────────────────────────────────────────────────────────────────

export interface UIState {
  viewport: Viewport
  activeTool: Tool
  showGrid: boolean
  snapToGrid: boolean
  drawingEdge: DrawingEdge | null
  selectionBox: SelectionBox | null
  contextMenu: ContextMenuState | null
  hoveredNodeId: string | null
  hoveredPort: { nodeId: string; port: Port } | null
  editingLabelId: string | null
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  chatPanelOpen: boolean
  darkMode: boolean
  // Actions
  setViewport: (vp: Partial<Viewport>) => void
  setTool: (tool: Tool) => void
  toggleGrid: () => void
  toggleSnap: () => void
  setDrawingEdge: (e: DrawingEdge | null) => void
  setSelectionBox: (b: SelectionBox | null) => void
  setContextMenu: (m: ContextMenuState | null) => void
  setHoveredNode: (id: string | null) => void
  setHoveredPort: (hp: { nodeId: string; port: Port } | null) => void
  setEditingLabel: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleChatPanel: () => void
  toggleDarkMode: () => void
}
