import React, { useState, useCallback } from 'react'
import { useChat } from '../../hooks/useChat'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'

export const ChatPanel: React.FC = () => {
  const [panelHeight, setPanelHeight] = useState(300)
  const { messages, isLoading, sendMessage, stopGeneration } = useChat()

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = panelHeight

    const onMove = (ev: MouseEvent) => {
      setPanelHeight(Math.min(600, Math.max(160, startH - (ev.clientY - startY))))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [panelHeight])

  return (
    <div style={{
      height: panelHeight,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-panel)',
      borderTop: '1px solid var(--border)',
      position: 'relative',
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          cursor: 'ns-resize',
          zIndex: 10,
        }}
      />

      {/* Header */}
      <div style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', userSelect: 'none' }}>
          AI Assistant
        </span>
        {isLoading && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', userSelect: 'none' }}>
            thinking…
          </span>
        )}
      </div>

      <ChatMessageList messages={messages} />
      <ChatInput onSend={sendMessage} onStop={stopGeneration} isLoading={isLoading} />
    </div>
  )
}
