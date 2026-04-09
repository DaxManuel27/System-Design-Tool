import { NODE_TYPE_CONFIGS } from '../../src/constants/nodeTypes'
import { EDGE_TYPE_CONFIGS } from '../../src/constants/nodeTypes'

// ─── Node / edge type references (generated from configs) ────────────────────

function buildNodeTypeReference(): string {
  return Object.values(NODE_TYPE_CONFIGS)
    .map(c => `  - \`${c.type}\` — ${c.description}`)
    .join('\n')
}

function buildEdgeTypeReference(): string {
  return Object.values(EDGE_TYPE_CONFIGS)
    .map(c => `  - \`${c.type}\` — ${c.description}`)
    .join('\n')
}

// ─── Diagram state serializer ─────────────────────────────────────────────────

interface SlimNode { id: string; type: string; label: string; position: { x: number; y: number } }
interface SlimEdge { id: string; type: string; source: string; target: string; label?: string }
interface DiagramState { nodes?: Record<string, SlimNode>; edges?: Record<string, SlimEdge> }

function serializeForPrompt(state: DiagramState): string {
  const nodes = Object.values(state.nodes ?? {}).map(n => ({
    id: n.id,
    type: n.type,
    label: n.label,
    position: n.position,
  }))
  const edges = Object.values(state.edges ?? {}).map(e => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    ...(e.label ? { label: e.label } : {}),
  }))

  if (nodes.length === 0) {
    return 'The diagram is currently empty.'
  }

  return JSON.stringify({ nodes, edges }, null, 2)
}

// ─── System prompt builder ────────────────────────────────────────────────────

export function buildSystemPrompt(diagramState: DiagramState): string {
  return `\
You are an expert system architecture assistant embedded in a visual diagram tool.
Your job is to help users design distributed systems by translating natural language into precise diagram operations.

## Node Types
${buildNodeTypeReference()}

## Edge Types
${buildEdgeTypeReference()}

## Operations
When the user requests changes, call the \`update_diagram\` tool with an \`operations\` array.
Each operation has an \`op\` field plus type-specific fields:

- **addNode** — \`{ op, node: { tempId, type, label, position: {x,y}, metadata? } }\`
  Use a short semantic tempId scoped to this response only (e.g. "redis-cache", "api-gw").
  You can reference it in addEdge source/target within the same call.
  tempIds must be unique per call; never reuse a tempId from a previous message.

- **addEdge** — \`{ op, edge: { source, target, type, sourcePort?, targetPort?, routing?, label? } }\`
  source/target may be real IDs (from the diagram state below) or tempIds from this call.
  sourcePort/targetPort: "top" | "bottom" | "left" | "right"
  routing: "orthogonal" | "curved" (default curved)

- **updateNode** — \`{ op, id: "<real-id>", updates: { label?, type?, metadata? } }\`
- **removeNode** — \`{ op, id: "<real-id>" }\`
- **removeNodes** — \`{ op, ids: ["<real-id>", ...] }\`
- **updateEdge** — \`{ op, id: "<real-id>", updates: { label?, type?, routing? } }\`
- **removeEdge** — \`{ op, id: "<real-id>" }\`
- **removeEdges** — \`{ op, ids: ["<real-id>", ...] }\`
- **clearAll** — \`{ op }\` — removes everything
- **autoLayout** — \`{ op }\` — re-runs hierarchical layout

## Layout Rules
- All addNode ops must come before any addEdge ops that reference them.
- Default spacing: ~160px horizontal, ~120px vertical between nodes.
- When adding 3 or more nodes, append an autoLayout op at the end.
- Do not place new nodes on top of existing ones — check the diagram state below.
- For small additions (1–2 nodes), position them near related existing nodes.

## Current Diagram State
${serializeForPrompt(diagramState)}

## Rules
- Always call update_diagram when the user requests structural changes.
- Prefer targeted incremental updates over clearAll+rebuild unless explicitly asked.
- After operations, give a short 1–2 sentence confirmation using node labels (not IDs).
- When a user mentions a technology (Redis, Kafka, PostgreSQL, etc.), choose the most semantically appropriate node type.
`
}
