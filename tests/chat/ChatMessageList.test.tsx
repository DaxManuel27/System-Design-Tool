import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessageList } from '../../src/components/chat/ChatMessageList'
import type { ChatMessage } from '../../src/types'

const makeMsg = (id: string, content: string): ChatMessage => ({
  id,
  role: 'user',
  content,
  timestamp: 0,
})

describe('ChatMessageList', () => {
  it('shows the empty-state placeholder when there are no messages', () => {
    render(<ChatMessageList messages={[]} />)
    expect(
      screen.getByText('Describe the architecture you want to create')
    ).toBeInTheDocument()
  })

  it('hides the empty-state placeholder when messages are present', () => {
    render(<ChatMessageList messages={[makeMsg('1', 'Hello')]} />)
    expect(
      screen.queryByText('Describe the architecture you want to create')
    ).not.toBeInTheDocument()
  })

  it('renders one message bubble per message', () => {
    const messages = [
      makeMsg('1', 'First message'),
      makeMsg('2', 'Second message'),
      makeMsg('3', 'Third message'),
    ]
    render(<ChatMessageList messages={messages} />)
    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
    expect(screen.getByText('Third message')).toBeInTheDocument()
  })

  it('renders messages in the order provided', () => {
    const messages = [makeMsg('a', 'Alpha'), makeMsg('b', 'Beta')]
    render(<ChatMessageList messages={messages} />)
    const texts = screen.getAllByText(/Alpha|Beta/).map(el => el.textContent)
    expect(texts).toEqual(['Alpha', 'Beta'])
  })
})
