import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatPanel } from '../../src/components/chat/ChatPanel'
import { useChat } from '../../src/hooks/useChat'

vi.mock('../../src/hooks/useChat')

const defaultHook = {
  messages: [],
  isLoading: false,
  sendMessage: vi.fn(),
  stopGeneration: vi.fn(),
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.mocked(useChat).mockReturnValue(defaultHook)
  })

  it('renders the "AI Assistant" header', () => {
    render(<ChatPanel />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('shows the "thinking…" indicator while loading', () => {
    vi.mocked(useChat).mockReturnValue({ ...defaultHook, isLoading: true })
    render(<ChatPanel />)
    expect(screen.getByText('thinking…')).toBeInTheDocument()
  })

  it('hides the "thinking…" indicator when not loading', () => {
    render(<ChatPanel />)
    expect(screen.queryByText('thinking…')).not.toBeInTheDocument()
  })

  it('renders the message list area', () => {
    render(<ChatPanel />)
    // ChatMessageList shows its empty-state placeholder when no messages
    expect(
      screen.getByText('Describe the architecture you want to create')
    ).toBeInTheDocument()
  })

  it('renders the input textarea', () => {
    render(<ChatPanel />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
