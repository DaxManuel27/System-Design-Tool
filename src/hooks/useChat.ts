import { v4 as uuid } from 'uuid'
import { useChatStore } from '../store/chatStore'
import { useGraphStore } from '../store/graphStore'
import { serializeDiagramForAI } from '../utils/diagramSerializer'
import { DiagramOperation } from '../types'

interface ValidationResult {
  validOperations: DiagramOperation[]
  warnings: Array<{ code: string; message: string }>
  rejected: boolean
  rejectionReason?: string
}

function parseSSEEvent(part: string): { event: string; data: unknown } | null {
  const lines = part.split('\n')
  let event = ''
  let dataStr = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
  }
  if (!event || !dataStr) return null
  try {
    return { event, data: JSON.parse(dataStr) }
  } catch {
    return null
  }
}

export function useChat() {
  const { messages, isLoading, addMessage, updateMessage, appendDelta, setLoading, setAbortController } =
    useChatStore()
  const { nodes, edges, applyAIOperations } = useGraphStore()

  async function sendMessage(content: string) {
    if (isLoading || !content.trim()) return

    const userMsgId = uuid()
    addMessage({ id: userMsgId, role: 'user', content: content.trim(), timestamp: Date.now() })

    const assistantMsgId = uuid()
    addMessage({ id: assistantMsgId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() })

    const controller = new AbortController()
    setAbortController(controller)
    setLoading(true)

    // Build conversation history (all messages except the streaming assistant placeholder)
    const currentMessages = useChatStore.getState().messages
    const history = currentMessages
      .filter(m => m.role !== 'error' && m.id !== assistantMsgId)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const diagramState = serializeDiagramForAI(nodes, edges)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, diagramState }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()!
        for (const part of parts) {
          const parsed = parseSSEEvent(part)
          if (!parsed) continue
          const { event, data } = parsed

          if (event === 'text') {
            appendDelta(assistantMsgId, (data as { delta: string }).delta)
          } else if (event === 'operations') {
            const result = data as ValidationResult
            if (result.rejected) {
              updateMessage(assistantMsgId, {
                streaming: false,
                role: 'error',
                content: `Failed to apply diagram changes: ${result.rejectionReason ?? 'All operations were invalid'}`,
              })
            } else {
              if (result.validOperations.length > 0) {
                applyAIOperations(result.validOperations)
              }
              if (result.warnings.length > 0) {
                updateMessage(assistantMsgId, { warningCount: result.warnings.length })
              }
            }
          } else if (event === 'error') {
            updateMessage(assistantMsgId, {
              streaming: false,
              content: (data as { message: string }).message || 'An error occurred',
            })
          } else if (event === 'done') {
            updateMessage(assistantMsgId, { streaming: false })
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        updateMessage(assistantMsgId, { streaming: false })
      } else {
        updateMessage(assistantMsgId, {
          streaming: false,
          content: (err as Error).message || 'Connection error',
        })
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  function stopGeneration() {
    const controller = useChatStore.getState().abortController
    if (controller) {
      controller.abort()
    }
  }

  return { messages, isLoading, sendMessage, stopGeneration }
}
