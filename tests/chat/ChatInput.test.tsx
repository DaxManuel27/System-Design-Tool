import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../../src/components/chat/ChatInput'

describe('ChatInput', () => {
  let onSend: ReturnType<typeof vi.fn>
  let onStop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSend = vi.fn()
    onStop = vi.fn()
  })

  // ── Rendering ────────────────────────────────────────────────────────────────

  it('renders the textarea with placeholder text', () => {
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    expect(screen.getByPlaceholderText(/Describe your architecture/)).toBeInTheDocument()
  })

  it('renders a Send button when not loading', () => {
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('renders a Stop button when loading', () => {
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={true} />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  // ── Send behaviour ───────────────────────────────────────────────────────────

  it('Send button is disabled when textarea is empty', () => {
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('calls onSend with the trimmed input when Send is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    await user.type(screen.getByRole('textbox'), '  hello world  ')
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('hello world')
  })

  it('clears the textarea after sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(textarea).toHaveValue('')
  })

  it('does not call onSend when input is only whitespace', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    await user.type(screen.getByRole('textbox'), '   ')
    // Send button stays disabled for whitespace-only input
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  it('sends on Enter key', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    await user.type(screen.getByRole('textbox'), 'Hello{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello')
  })

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={false} />)
    await user.type(screen.getByRole('textbox'), 'Hello{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
  })

  // ── Loading state ─────────────────────────────────────────────────────────────

  it('disables textarea while loading', () => {
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={true} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('calls onStop when the Stop button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} onStop={onStop} isLoading={true} />)
    await user.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalledOnce()
  })
})
