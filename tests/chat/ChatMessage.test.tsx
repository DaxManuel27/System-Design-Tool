import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../../src/components/chat/ChatMessage'
import type { ChatMessage as ChatMessageType } from '../../src/types'

const base: ChatMessageType = { id: '1', role: 'user', content: 'Hello', timestamp: 0 }

describe('ChatMessage', () => {
  // ── Content rendering ────────────────────────────────────────────────────────

  it('renders user message content', () => {
    render(<ChatMessage message={{ ...base, role: 'user' }} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders assistant message content', () => {
    render(<ChatMessage message={{ ...base, role: 'assistant' }} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders error message content', () => {
    render(<ChatMessage message={{ ...base, role: 'error' }} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  // ── Streaming cursor ─────────────────────────────────────────────────────────

  it('shows streaming cursor when streaming is true', () => {
    const { container } = render(
      <ChatMessage message={{ ...base, role: 'assistant', streaming: true }} />
    )
    // The cursor is the only <span> inside the component
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('hides streaming cursor when streaming is false', () => {
    const { container } = render(
      <ChatMessage message={{ ...base, role: 'assistant', streaming: false }} />
    )
    expect(container.querySelector('span')).not.toBeInTheDocument()
  })

  it('hides streaming cursor when streaming is undefined', () => {
    const { container } = render(
      <ChatMessage message={{ ...base, role: 'assistant' }} />
    )
    expect(container.querySelector('span')).not.toBeInTheDocument()
  })

  // ── Warning pill ─────────────────────────────────────────────────────────────

  it('shows singular "adjustment" pill when warningCount is 1', () => {
    render(<ChatMessage message={{ ...base, role: 'assistant', warningCount: 1 }} />)
    expect(screen.getByText('1 adjustment made')).toBeInTheDocument()
  })

  it('shows plural "adjustments" pill when warningCount is 3', () => {
    render(<ChatMessage message={{ ...base, role: 'assistant', warningCount: 3 }} />)
    expect(screen.getByText('3 adjustments made')).toBeInTheDocument()
  })

  it('does not show warning pill when warningCount is 0', () => {
    render(<ChatMessage message={{ ...base, role: 'assistant', warningCount: 0 }} />)
    expect(screen.queryByText(/adjustments? made/)).not.toBeInTheDocument()
  })

  it('does not show warning pill when warningCount is undefined', () => {
    render(<ChatMessage message={{ ...base, role: 'assistant' }} />)
    expect(screen.queryByText(/adjustments? made/)).not.toBeInTheDocument()
  })
})
