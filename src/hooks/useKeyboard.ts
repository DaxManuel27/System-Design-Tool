import { useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useUIStore } from '../store/uiStore'

export function useKeyboard() {
  const { setTool, activeTool } = useUIStore()

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Don't intercept when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const meta = e.metaKey || e.ctrlKey

      // Tools
      if (!meta) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); return
          case 'h': setTool('pan'); return
          case 'c': setTool('connect'); return
          case 'n': setTool('comment'); return
        }
      }

      // Delete/Backspace: remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const { selectedIds, nodes, edges, removeNodes, removeEdges } = useGraphStore.getState()
        const nodeIds = [...selectedIds].filter(id => nodes[id])
        const edgeIds = [...selectedIds].filter(id => edges[id])
        if (nodeIds.length) removeNodes(nodeIds)
        if (edgeIds.length) removeEdges(edgeIds)
        return
      }

      // Undo/Redo
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); useGraphStore.getState().undo(); return }
      if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); useGraphStore.getState().redo(); return }

      // Copy/Paste/Duplicate
      if (meta && e.key === 'c') { e.preventDefault(); useGraphStore.getState().copySelected(); return }
      if (meta && e.key === 'v') { e.preventDefault(); useGraphStore.getState().paste(); return }
      if (meta && e.key === 'd') {
        e.preventDefault()
        const { selectedIds } = useGraphStore.getState()
        useGraphStore.getState().duplicateNodes([...selectedIds])
        return
      }

      // Select all
      if (meta && e.key === 'a') { e.preventDefault(); useGraphStore.getState().selectAll(); return }

      // Escape: deselect / cancel tool
      if (e.key === 'Escape') {
        useGraphStore.getState().deselectAll()
        useUIStore.getState().setDrawingEdge(null)
        useUIStore.getState().setContextMenu(null)
        useUIStore.getState().setEditingLabel(null)
        return
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [setTool, activeTool])
}
