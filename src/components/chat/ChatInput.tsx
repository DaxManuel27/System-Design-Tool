import React, { useState, useRef, useCallback } from 'react'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  isLoading: boolean
}

export const ChatInput: React.FC<Props> = ({ onSend, onStop, isLoading }) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      padding: '8px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-panel)',
    }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Describe your architecture… (Enter to send, Shift+Enter for newline)"
        disabled={isLoading}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '7px 10px',
          color: 'var(--text-1)',
          fontSize: 13,
          lineHeight: 1.5,
          outline: 'none',
          fontFamily: 'inherit',
          overflow: 'hidden',
          minHeight: 34,
          maxHeight: 120,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-border)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      />
      {isLoading ? (
        <button
          onClick={onStop}
          title="Stop generation"
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          title="Send (Enter)"
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid var(--accent-border)',
            background: value.trim() ? 'var(--accent-subtle)' : 'transparent',
            color: value.trim() ? 'var(--accent)' : 'var(--text-3)',
            fontSize: 12,
            fontWeight: 600,
            cursor: value.trim() ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.1s, color 0.1s',
          }}
        >
          Send
        </button>
      )}
    </div>
  )
}
