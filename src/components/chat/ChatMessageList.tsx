import React, { useEffect, useRef } from 'react'
import { ChatMessage as ChatMessageType } from '../../types'
import { ChatMessage } from './ChatMessage'

interface Props {
  messages: ChatMessageType[]
}

export const ChatMessageList: React.FC<Props> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '8px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {messages.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: 13,
          userSelect: 'none',
          padding: '24px 12px',
          textAlign: 'center',
        }}>
          Describe the architecture you want to create
        </div>
      )}
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
