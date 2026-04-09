import { create } from 'zustand'
import { Viewport, Tool, DrawingEdge, SelectionBox, ContextMenuState, UIState, Port } from '../types'
import { MIN_ZOOM, MAX_ZOOM } from '../constants/nodeTypes'
import { clamp } from '../utils/geometry'

export const useUIStore = create<UIState>((set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select',
  showGrid: true,
  snapToGrid: true,
  drawingEdge: null,
  selectionBox: null,
  contextMenu: null,
  hoveredNodeId: null,
  hoveredPort: null,
  editingLabelId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,
  chatPanelOpen: false,
  darkMode: true,

  setViewport: (vp: Partial<Viewport>) =>
    set(state => ({
      viewport: {
        x: vp.x ?? state.viewport.x,
        y: vp.y ?? state.viewport.y,
        zoom: vp.zoom !== undefined ? clamp(vp.zoom, MIN_ZOOM, MAX_ZOOM) : state.viewport.zoom,
      },
    })),

  setTool: (tool: Tool) => set({ activeTool: tool }),

  toggleGrid: () => set(state => ({ showGrid: !state.showGrid })),

  toggleSnap: () => set(state => ({ snapToGrid: !state.snapToGrid })),

  setDrawingEdge: (e: DrawingEdge | null) => set({ drawingEdge: e }),

  setSelectionBox: (b: SelectionBox | null) => set({ selectionBox: b }),

  setContextMenu: (m: ContextMenuState | null) => set({ contextMenu: m }),

  setHoveredNode: (id: string | null) => set({ hoveredNodeId: id }),

  setHoveredPort: (hp: { nodeId: string; port: Port } | null) => set({ hoveredPort: hp }),

  setEditingLabel: (id: string | null) => set({ editingLabelId: id }),

  toggleLeftPanel: () => set(state => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () => set(state => ({ rightPanelOpen: !state.rightPanelOpen })),

  toggleChatPanel: () => set(state => ({ chatPanelOpen: !state.chatPanelOpen })),

  toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),
}))
