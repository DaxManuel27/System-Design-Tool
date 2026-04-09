import { Router, Request, Response } from 'express'
import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from '@google/generative-ai'
import { buildSystemPrompt } from '../lib/systemPrompt'
import { resolveTempIds } from '../lib/diagramTools'
import { validateOperations, ValidationContext } from '../lib/operationValidator'

export const chatRouter = Router()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Gemini function declaration — mirrors the Anthropic tool schema.
// Swap chat.ts back to Anthropic when ready (see diagramTools.ts for that definition).
const UPDATE_DIAGRAM_FUNCTION = {
  name: 'update_diagram',
  description:
    'Apply one or more structured operations to the system design diagram. ' +
    'Call this whenever the user requests structural changes. ' +
    'All addNode ops must appear before addEdge ops that reference them.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      operations: {
        type: SchemaType.ARRAY,
        description: 'Ordered list of diagram operations.',
        items: {
          type: SchemaType.OBJECT,
          description:
            'A single operation. The "op" field determines the type. ' +
            'Possible values: addNode | addEdge | updateNode | updateEdge | ' +
            'removeNode | removeEdge | removeNodes | removeEdges | clearAll | autoLayout',
          properties: {
            op: { type: SchemaType.STRING },
            // addNode
            node: {
              type: SchemaType.OBJECT,
              description:
                'For addNode: { tempId (short semantic string), type, label, position: {x,y}, metadata? }. ' +
                'Node types: service | database | queue | cache | client | gateway | loadbalancer | external | container | annotation',
              properties: {
                tempId:   { type: SchemaType.STRING },
                type:     { type: SchemaType.STRING },
                label:    { type: SchemaType.STRING },
                position: { type: SchemaType.OBJECT, properties: { x: { type: SchemaType.NUMBER }, y: { type: SchemaType.NUMBER } } },
                metadata: { type: SchemaType.OBJECT, properties: { description: { type: SchemaType.STRING }, tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } } },
              },
            },
            // addEdge
            edge: {
              type: SchemaType.OBJECT,
              description:
                'For addEdge: { source, target, type, sourcePort?, targetPort?, routing?, label? }. ' +
                'source/target: real node ID or tempId from this call. ' +
                'Edge types: http | grpc | event | database | dependency | dataflow | sync | custom. ' +
                'Ports: top | bottom | left | right. Routing: orthogonal | curved.',
              properties: {
                source:     { type: SchemaType.STRING },
                target:     { type: SchemaType.STRING },
                type:       { type: SchemaType.STRING },
                sourcePort: { type: SchemaType.STRING },
                targetPort: { type: SchemaType.STRING },
                routing:    { type: SchemaType.STRING },
                label:      { type: SchemaType.STRING },
              },
            },
            id:      { type: SchemaType.STRING,  description: 'Real diagram ID — for updateNode, updateEdge, removeNode, removeEdge.' },
            ids:     { type: SchemaType.ARRAY,   description: 'Array of real IDs — for removeNodes, removeEdges.', items: { type: SchemaType.STRING } },
            updates: { type: SchemaType.OBJECT,  description: 'Partial fields — for updateNode, updateEdge.' },
          },
          required: ['op'],
        },
      },
    },
    required: ['operations'],
  },
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────

chatRouter.post('/', async (req: Request, res: Response) => {
  // ── Parse request ─────────────────────────────────────────────────────────
  const { message, messages, diagramState } = req.body as {
    message?: string
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>
    diagramState?: { nodes?: Record<string, unknown>; edges?: Record<string, unknown> }
  }

  // Accept either a single `message` string or a full `messages` history array
  let history: Array<{ role: 'user' | 'assistant'; content: string }>
  if (Array.isArray(messages) && messages.length > 0) {
    history = messages
  } else if (typeof message === 'string' && message.trim()) {
    history = [{ role: 'user', content: message.trim() }]
  } else {
    res.status(400).json({ error: 'Request must include `message` (string) or `messages` (array).' })
    return
  }

  // serializeDiagramForAI sends nodes/edges as arrays; normalize to records keyed by id
  // so both buildSystemPrompt and validateOperations can do id-based lookups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toRecord(input: unknown): Record<string, any> {
    if (Array.isArray(input)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Object.fromEntries((input as any[]).map((item: any) => [item.id, item]))
    }
    if (input && typeof input === 'object') return input as Record<string, unknown>
    return {}
  }
  const nodes = toRecord(diagramState?.nodes)
  const edges = toRecord(diagramState?.edges)

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  let aborted = false
  req.on('close', () => { aborted = true })

  // ── Build Gemini model with system prompt + tool ───────────────────────────
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt({ nodes, edges }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ functionDeclarations: [UPDATE_DIAGRAM_FUNCTION as any] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  })

  // Convert history to Gemini format.
  // Gemini uses 'model' for assistant turns; all but the last message go into history.
  const geminiHistory = history.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))
  const lastMessage = history[history.length - 1].content

  try {
    const chat = model.startChat({ history: geminiHistory })
    // 30s timeout guards against the SDK hanging on API errors (e.g. 429)
    const streamResult = await Promise.race([
      chat.sendMessageStream(lastMessage),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timed out after 30s')), 30_000)
      ),
    ])

    let pendingFunctionCall: { name: string; args: Record<string, unknown> } | null = null

    for await (const chunk of streamResult.stream) {
      if (aborted) break

      const parts = chunk.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.text) {
          sendSSE(res, 'text', { delta: part.text })
        }
        if (part.functionCall) {
          pendingFunctionCall = {
            name: part.functionCall.name,
            args: (part.functionCall.args ?? {}) as Record<string, unknown>,
          }
          sendSSE(res, 'tool_start', { toolName: part.functionCall.name })
        }
      }
    }

    // Process function call after stream completes
    if (pendingFunctionCall && !aborted) {
      const rawOps = Array.isArray(pendingFunctionCall.args.operations)
        ? pendingFunctionCall.args.operations
        : []
      const resolved = resolveTempIds(rawOps as unknown[])
      const ctx: ValidationContext = {
        existingNodes: nodes,
        existingEdges: edges,
        config: {
          reuseStrategy: 'merge-by-label-type',
          guardClearWithNoReplacements: true,
        },
      }
      const validationResult = validateOperations(resolved, ctx)
      sendSSE(res, 'operations', validationResult)
    }

    if (!aborted) {
      sendSSE(res, 'done', {})
    }
  } catch (err) {
    if (!aborted) {
      const msg = err instanceof Error ? err.message : 'Internal server error'
      sendSSE(res, 'error', { message: msg })
    }
  } finally {
    res.end()
  }
})
