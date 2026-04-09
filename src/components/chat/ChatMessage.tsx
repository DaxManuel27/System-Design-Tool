import React from 'react'
import { ChatMessage as ChatMessageType } from '../../types'

interface Props {
  message: ChatMessageType
}

export const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      padding: '4px 12px',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        background: isUser
          ? 'var(--accent-subtle)'
          : isError
          ? 'rgba(239, 68, 68, 0.12)'
          : 'var(--bg-surface)',
        border: isUser
          ? '1px solid var(--accent-border)'
          : isError
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : '1px solid var(--border)',
        color: isError ? '#f87171' : 'var(--text-1)',
        fontSize: 13,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
        {message.streaming && (
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 13,
            background: 'var(--accent)',
            marginLeft: 2,
            verticalAlign: 'text-bottom',
            animation: 'blink 1s step-end infinite',
          }} />
        )}
      </div>
      {typeof message.warningCount === 'number' && message.warningCount > 0 && (
        <div style={{
          marginTop: 4,
          fontSize: 11,
          padding: '2px 7px',
          borderRadius: 10,
          background: 'rgba(234, 179, 8, 0.15)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          color: '#fbbf24',
          userSelect: 'none',
        }}>
          {message.warningCount} adjustment{message.warningCount > 1 ? 's' : ''} made
        </div>
      )}
    </div>
  )
}
