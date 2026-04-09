import { v4 as uuid } from 'uuid'

// ─── Tool Definition ──────────────────────────────────────────────────────────

export const UPDATE_DIAGRAM_TOOL = {
  name: 'update_diagram',
  description:
    'Apply one or more structured operations to the system design diagram. ' +
    'Always call this tool when the user requests any structural change to the diagram. ' +
    'addNode ops must appear before any addEdge ops that reference them in the same call.',
  input_schema: {
    type: 'object' as const,
    properties: {
      operations: {
        type: 'array',
        description: 'Ordered list of diagram operations to apply sequentially.',
        items: {
          type: 'object',
          properties: {
            op: {
              type: 'string',
              enum: [
                'addNode', 'updateNode', 'removeNode', 'removeNodes',
                'addEdge',  'updateEdge', 'removeEdge', 'removeEdges',
                'clearAll', 'autoLayout',
              ],
            },
            // addNode
            node: {
              type: 'object',
              description: 'Required for addNode.',
              properties: {
                tempId:   { type: 'string', description: 'Short semantic identifier scoped to this response only (e.g. "redis-cache"). Used in addEdge source/target within the same call.' },
                type:     { type: 'string', enum: ['service','database','queue','cache','client','gateway','loadbalancer','external','container','annotation'] },
                label:    { type: 'string', description: 'Human-readable name.' },
                position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x','y'] },
                metadata: { type: 'object', properties: { description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } },
              },
              required: ['tempId', 'type', 'label', 'position'],
            },
            // addEdge / updateEdge fields
            edge: {
              type: 'object',
              description: 'Required for addEdge.',
              properties: {
                source:     { type: 'string', description: 'Real node ID or tempId from this same call.' },
                target:     { type: 'string', description: 'Real node ID or tempId from this same call.' },
                type:       { type: 'string', enum: ['http','grpc','event','database','dependency','dataflow','sync','custom'] },
                sourcePort: { type: 'string', enum: ['top','bottom','left','right'] },
                targetPort: { type: 'string', enum: ['top','bottom','left','right'] },
                routing:    { type: 'string', enum: ['orthogonal','curved'] },
                label:      { type: 'string' },
              },
              required: ['source', 'target', 'type'],
            },
            // updateNode / removeNode / updateEdge / removeEdge
            id:      { type: 'string', description: 'Real diagram ID. Required for updateNode, updateEdge, removeNode, removeEdge.' },
            ids:     { type: 'array', items: { type: 'string' }, description: 'Required for removeNodes, removeEdges.' },
            updates: { type: 'object', description: 'Partial fields to update. Required for updateNode, updateEdge.' },
          },
          required: ['op'],
        },
      },
    },
    required: ['operations'] as string[],
  },
}

// ─── tempId resolution ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Walk the raw AI operations, assign real UUIDs to new nodes and edges,
 * and resolve tempId references in addEdge source/target fields.
 * Returns a new array with real IDs in place — ready for validateOperations.
 */
export function resolveTempIds(rawOps: unknown[]): unknown[] {
  const tempIdMap = new Map<string, string>()

  return rawOps.map(rawOp => {
    if (!isRecord(rawOp)) return rawOp

    if (rawOp.op === 'addNode' && isRecord(rawOp.node)) {
      const tempId = typeof rawOp.node.tempId === 'string' ? rawOp.node.tempId : null
      const realId = uuid()
      if (tempId) tempIdMap.set(tempId, realId)
      // Remove tempId, inject real id
      const { tempId: _drop, ...rest } = rawOp.node as Record<string, unknown>
      return { ...rawOp, node: { ...rest, id: realId } }
    }

    if (rawOp.op === 'addEdge' && isRecord(rawOp.edge)) {
      const source = typeof rawOp.edge.source === 'string' ? rawOp.edge.source : ''
      const target = typeof rawOp.edge.target === 'string' ? rawOp.edge.target : ''
      return {
        ...rawOp,
        edge: {
          ...rawOp.edge,
          id: uuid(),
          source: tempIdMap.get(source) ?? source,
          target: tempIdMap.get(target) ?? target,
        },
      }
    }

    return rawOp
  })
}
