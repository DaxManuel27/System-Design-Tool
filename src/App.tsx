import React from 'react'
import { Canvas } from './components/canvas/Canvas'
import { NodePalette } from './components/panels/NodePalette'
import { PropertiesInspector } from './components/panels/PropertiesInspector'
import { Toolbar } from './components/toolbar/Toolbar'
import { ContextMenu } from './components/ui/ContextMenu'
import { ChatPanel } from './components/chat/ChatPanel'
import { useKeyboard } from './hooks/useKeyboard'
import { useUIStore } from './store/uiStore'

const App: React.FC = () => {
  useKeyboard()
  const { leftPanelOpen, rightPanelOpen, chatPanelOpen, darkMode } = useUIStore()

  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
        color: 'var(--text-1)',
      }}
    >
      <Toolbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {leftPanelOpen && <NodePalette />}

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
          <Canvas />
        </div>

        {rightPanelOpen && <PropertiesInspector />}
      </div>

      {chatPanelOpen && <ChatPanel />}

      <ContextMenu />
    </div>
  )
}

export default App
