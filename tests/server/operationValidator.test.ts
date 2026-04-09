import { describe, it, expect } from 'vitest'
import {
  validateOperations,
} from '../../server/lib/operationValidator'
import type {
  ValidationContext,
  ValidationConfig,
} from '../../server/lib/operationValidator'
import type { NodeData, EdgeData, NodeType } from '../../src/types'

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const defaultConfig: ValidationConfig = {
  reuseStrategy: 'merge-by-label-type',
  guardClearWithNoReplacements: true,
}

function ctx(
  nodes: Record<string, NodeData> = {},
  edges: Record<string, EdgeData> = {},
  config: ValidationConfig = defaultConfig,
): ValidationContext {
  return { existingNodes: nodes, existingEdges: edges, config }
}

function makeNode(
  id: string,
  type: NodeType = 'service',
  label = 'Test',
): NodeData {
  return { id, type, label, position: { x: 0, y: 0 }, size: { w: 160, h: 72 }, metadata: {} }
}

function makeEdge(id: string, source: string, target: string): EdgeData {
  return { id, type: 'http', source, target, sourcePort: 'bottom', targetPort: 'top', routing: 'curved' }
}

// Raw ops as they arrive after resolveTempIds — node data is nested under `node`
function rawAddNode(id: string, type: string, label: string, x = 0, y = 0) {
  return { op: 'addNode', node: { id, type, label, position: { x, y } } }
}

function rawAddEdge(id: string, source: string, target: string, type = 'http') {
  return { op: 'addEdge', edge: { id, source, target, type, sourcePort: 'bottom', targetPort: 'top', routing: 'curved' } }
}

// ─── addNode ──────────────────────────────────────────────────────────────────

describe('validateOperations — addNode', () => {
  it('accepts a valid addNode op and returns it with correct fields', () => {
    const result = validateOperations(
      [rawAddNode('n1', 'service', 'My Service', 100, 200)],
      ctx(),
    )
    expect(result.rejected).toBe(false)
    expect(result.validOperations).toHaveLength(1)
    const op = result.validOperations[0]
    expect(op.op).toBe('addNode')
    if (op.op === 'addNode') {
      expect(op.node.id).toBe('n1')
      expect(op.node.type).toBe('service')
      expect(op.node.label).toBe('My Service')
      expect(op.node.position).toEqual({ x: 100, y: 200 })
    }
  })

  it('uses NODE_TYPE_CONFIGS default size — not anything from the raw op', () => {
    const result = validateOperations([rawAddNode('n1', 'database', 'DB')], ctx())
    const op = result.validOperations[0]
    if (op.op === 'addNode') {
      // database defaultSize = { w: 140, h: 80 }
      expect(op.node.size).toEqual({ w: 140, h: 80 })
    }
  })

  it('coerces an aliased type and emits INVALID_NODE_TYPE warning', () => {
    const result = validateOperations([rawAddNode('n1', 'microservice', 'API')], ctx())
    expect(result.rejected).toBe(false)
    const op = result.validOperations[0]
    if (op.op === 'addNode') expect(op.node.type).toBe('service')
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'INVALID_NODE_TYPE', transformed: true }),
    )
  })

  it('drops addNode with an unrecognised type and emits OP_DROPPED', () => {
    const result = validateOperations([rawAddNode('n1', 'wizard', 'Magic')], ctx())
    expect(result.rejected).toBe(true)          // only op was dropped → full rejection
    expect(result.validOperations).toHaveLength(0)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ op: 'addNode', code: 'OP_DROPPED' }),
    )
  })

  it('defaults a missing label and emits EMPTY_LABEL warning', () => {
    const op = { op: 'addNode', node: { id: 'n1', type: 'gateway', position: { x: 0, y: 0 } } }
    const result = validateOperations([op], ctx())
    expect(result.rejected).toBe(false)
    const added = result.validOperations[0]
    if (added.op === 'addNode') {
      // gateway default label = 'API Gateway'
      expect(added.node.label).toBe('API Gateway')
    }
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'EMPTY_LABEL', transformed: true }),
    )
  })

  it('clamps extreme coordinates and emits CLAMPED_POSITION warning', () => {
    const result = validateOperations(
      [rawAddNode('n1', 'service', 'S', 99999, -99999)],
      ctx(),
    )
    expect(result.rejected).toBe(false)
    const op = result.validOperations[0]
    if (op.op === 'addNode') {
      expect(op.node.position.x).toBe(10000)
      expect(op.node.position.y).toBe(-10000)
    }
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'CLAMPED_POSITION', transformed: true }),
    )
  })

  it('converts addNode to updateNode when a node with same label+type already exists', () => {
    const existing = makeNode('existing-id', 'service', 'Auth Service')
    const result = validateOperations(
      [rawAddNode('n1', 'service', 'Auth Service')],
      ctx({ 'existing-id': existing }),
    )
    expect(result.rejected).toBe(false)
    const op = result.validOperations[0]
    expect(op.op).toBe('updateNode')
    if (op.op === 'updateNode') expect(op.id).toBe('existing-id')
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'NODE_MERGED', transformed: true }),
    )
  })

  it('label comparison is case-insensitive for node reuse', () => {
    const existing = makeNode('e1', 'cache', 'Redis Cache')
    const result = validateOperations(
      [rawAddNode('n1', 'cache', 'REDIS CACHE')],
      ctx({ e1: existing }),
    )
    const op = result.validOperations[0]
    expect(op.op).toBe('updateNode')
  })

  it('allow-duplicate strategy skips the merge check', () => {
    const existing = makeNode('e1', 'service', 'Auth Service')
    const result = validateOperations(
      [rawAddNode('n1', 'service', 'Auth Service')],
      ctx({ e1: existing }, {}, { ...defaultConfig, reuseStrategy: 'allow-duplicate' }),
    )
    expect(result.validOperations[0].op).toBe('addNode')
    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({ code: 'NODE_MERGED' }),
    )
  })
})

// ─── addEdge ──────────────────────────────────────────────────────────────────

describe('validateOperations — addEdge', () => {
  it('accepts a valid addEdge op', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const result = validateOperations([rawAddEdge('e1', 'n1', 'n2')], ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('addEdge')
    if (result.validOperations[0].op === 'addEdge') {
      expect(result.validOperations[0].edge.id).toBe('e1')
      expect(result.validOperations[0].edge.source).toBe('n1')
      expect(result.validOperations[0].edge.target).toBe('n2')
    }
  })

  it('drops addEdge when source node does not exist and emits EDGE_DANGLING', () => {
    const nodes = { n2: makeNode('n2') }
    const result = validateOperations([rawAddEdge('e1', 'missing', 'n2')], ctx(nodes))
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'EDGE_DANGLING', op: 'addEdge' }),
    )
  })

  it('drops addEdge when target node does not exist and emits EDGE_DANGLING', () => {
    const nodes = { n1: makeNode('n1') }
    const result = validateOperations([rawAddEdge('e1', 'n1', 'missing')], ctx(nodes))
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'EDGE_DANGLING' }),
    )
  })

  it('drops addEdge when source === target and emits EDGE_SELF_LOOP', () => {
    const nodes = { n1: makeNode('n1') }
    const result = validateOperations([rawAddEdge('e1', 'n1', 'n1')], ctx(nodes))
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'EDGE_SELF_LOOP' }),
    )
  })

  it('coerces an unknown edge type to "custom" and emits INVALID_EDGE_TYPE', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const raw = { op: 'addEdge', edge: { id: 'e1', source: 'n1', target: 'n2', type: 'telepathy', sourcePort: 'bottom', targetPort: 'top', routing: 'curved' } }
    const result = validateOperations([raw], ctx(nodes))
    expect(result.rejected).toBe(false)
    if (result.validOperations[0].op === 'addEdge') {
      expect(result.validOperations[0].edge.type).toBe('custom')
    }
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'INVALID_EDGE_TYPE', transformed: true }),
    )
  })

  it('defaults an invalid port to "bottom"/"top" and emits INVALID_PORT', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const raw = { op: 'addEdge', edge: { id: 'e1', source: 'n1', target: 'n2', type: 'http', sourcePort: 'diagonal', targetPort: 'sideways', routing: 'curved' } }
    const result = validateOperations([raw], ctx(nodes))
    expect(result.rejected).toBe(false)
    if (result.validOperations[0].op === 'addEdge') {
      expect(result.validOperations[0].edge.sourcePort).toBe('bottom')
      expect(result.validOperations[0].edge.targetPort).toBe('top')
    }
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'INVALID_PORT' }))
  })
})

// ─── updateNode / updateEdge ──────────────────────────────────────────────────

describe('validateOperations — updateNode', () => {
  it('passes updateNode when the id exists', () => {
    const nodes = { n1: makeNode('n1', 'service', 'Old Name') }
    const raw = { op: 'updateNode', id: 'n1', updates: { label: 'New Name' } }
    const result = validateOperations([raw], ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('updateNode')
  })

  it('drops updateNode and emits STALE_ID when the id is unknown', () => {
    const raw = { op: 'updateNode', id: 'ghost', updates: { label: 'X' } }
    const result = validateOperations([raw], ctx())
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'STALE_ID', op: 'updateNode' }),
    )
  })
})

describe('validateOperations — updateEdge', () => {
  it('passes updateEdge when the id exists', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const edges = { e1: makeEdge('e1', 'n1', 'n2') }
    const raw = { op: 'updateEdge', id: 'e1', updates: { label: 'HTTP call' } }
    const result = validateOperations([raw], ctx(nodes, edges))
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('updateEdge')
  })

  it('drops updateEdge and emits STALE_ID when the id is unknown', () => {
    const raw = { op: 'updateEdge', id: 'ghost', updates: { label: 'X' } }
    const result = validateOperations([raw], ctx())
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'STALE_ID', op: 'updateEdge' }),
    )
  })
})

// ─── removeNode / removeEdge ──────────────────────────────────────────────────

describe('validateOperations — removeNode / removeEdge', () => {
  it('passes removeNode when the id exists', () => {
    const nodes = { n1: makeNode('n1') }
    const result = validateOperations([{ op: 'removeNode', id: 'n1' }], ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('removeNode')
  })

  it('silently drops removeNode when the id is unknown (no warning)', () => {
    const result = validateOperations([{ op: 'removeNode', id: 'ghost' }], ctx())
    // All ops dropped → batch rejection, but NO STALE_ID warning
    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({ code: 'STALE_ID' }),
    )
  })

  it('passes removeEdge when the id exists', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const edges = { e1: makeEdge('e1', 'n1', 'n2') }
    const result = validateOperations([{ op: 'removeEdge', id: 'e1' }], ctx(nodes, edges))
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('removeEdge')
  })

  it('silently drops removeEdge when the id is unknown (no warning)', () => {
    const result = validateOperations([{ op: 'removeEdge', id: 'ghost' }], ctx())
    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({ code: 'STALE_ID' }),
    )
  })
})

describe('validateOperations — removeNodes / removeEdges', () => {
  it('filters removeNodes to only known ids', () => {
    const nodes = { n1: makeNode('n1'), n2: makeNode('n2') }
    const raw = { op: 'removeNodes', ids: ['n1', 'ghost', 'n2'] }
    const result = validateOperations([raw], ctx(nodes))
    expect(result.rejected).toBe(false)
    if (result.validOperations[0].op === 'removeNodes') {
      expect(result.validOperations[0].ids).toEqual(['n1', 'n2'])
    }
  })

  it('silently drops removeNodes when all ids are unknown', () => {
    const raw = { op: 'removeNodes', ids: ['a', 'b'] }
    const result = validateOperations([raw], ctx())
    expect(result.validOperations).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
    expect(result.rejected).toBe(true)
  })
})

// ─── clearAll / autoLayout ────────────────────────────────────────────────────

describe('validateOperations — clearAll / autoLayout', () => {
  it('passes autoLayout unconditionally', () => {
    const result = validateOperations([{ op: 'autoLayout' }], ctx())
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('autoLayout')
  })

  it('passes clearAll when the diagram is already empty', () => {
    // No existing nodes → guard does not trigger
    const result = validateOperations([{ op: 'clearAll' }], ctx())
    expect(result.rejected).toBe(false)
    expect(result.validOperations[0].op).toBe('clearAll')
  })

  it('passes clearAll when addNode ops follow it', () => {
    const nodes = { n1: makeNode('n1') }
    const ops = [{ op: 'clearAll' }, rawAddNode('n2', 'service', 'New Node')]
    const result = validateOperations(ops, ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations.some(op => op.op === 'clearAll')).toBe(true)
  })
})

// ─── Batch-level rules ────────────────────────────────────────────────────────

describe('validateOperations — batch-level rules', () => {
  it('rejects the entire batch when there are no raw ops', () => {
    const result = validateOperations([], ctx())
    expect(result.rejected).toBe(true)
    expect(result.validOperations).toHaveLength(0)
    expect(result.rejectionReason).toBeTruthy()
  })

  it('rejects the batch when every op is invalid', () => {
    const result = validateOperations(
      [rawAddNode('n1', 'wizard', 'Magic'), { op: 'updateNode', id: 'ghost', updates: {} }],
      ctx(),
    )
    expect(result.rejected).toBe(true)
    expect(result.validOperations).toHaveLength(0)
  })

  it('returns partial success when only some ops are invalid', () => {
    const nodes = { n1: makeNode('n1') }
    const ops = [
      rawAddNode('n2', 'service', 'Good Node'),      // valid
      { op: 'updateNode', id: 'ghost', updates: {} }, // invalid → dropped
    ]
    const result = validateOperations(ops, ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations).toHaveLength(1)
    expect(result.validOperations[0].op).toBe('addNode')
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'STALE_ID' }),
    )
  })

  it('removes clearAll and emits CLEAR_WITHOUT_REPLACE when diagram has nodes but no addNode follows', () => {
    const nodes = { n1: makeNode('n1') }
    // clearAll alone — no addNode after it
    const ops = [{ op: 'clearAll' }, rawAddEdge('e1', 'n1', 'n1')] // edge is self-loop → dropped too
    // Provide a valid op alongside so batch isn't fully rejected
    const validOps = [{ op: 'autoLayout' }, { op: 'clearAll' }]
    const result = validateOperations(validOps, ctx(nodes))
    expect(result.rejected).toBe(false)
    expect(result.validOperations.every(op => op.op !== 'clearAll')).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'CLEAR_WITHOUT_REPLACE', operationIndex: -1 }),
    )
  })

  it('drops non-object ops and emits OP_DROPPED', () => {
    const result = validateOperations(['not an object', 42, null], ctx())
    expect(result.rejected).toBe(true)
    expect(result.warnings.every(w => w.code === 'OP_DROPPED')).toBe(true)
  })

  it('drops unknown op strings and emits OP_DROPPED', () => {
    const result = validateOperations([{ op: 'doSomethingRandom' }], ctx())
    expect(result.rejected).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'OP_DROPPED' }),
    )
  })
})

// ─── Working state progression ────────────────────────────────────────────────

describe('validateOperations — working state progression', () => {
  it('allows addEdge to reference a node added earlier in the same batch', () => {
    // Both nodes are new — not in existingNodes
    const ops = [
      rawAddNode('n1', 'client', 'Browser'),
      rawAddNode('n2', 'service', 'API'),
      rawAddEdge('e1', 'n1', 'n2'),
    ]
    const result = validateOperations(ops, ctx())
    expect(result.rejected).toBe(false)
    expect(result.validOperations).toHaveLength(3)
    expect(result.validOperations[2].op).toBe('addEdge')
  })

  it('detects NODE_MERGED against a node added earlier in the same batch', () => {
    // First op adds "Auth Service", second op tries to add the same label+type
    const ops = [
      rawAddNode('n1', 'service', 'Auth Service'),
      rawAddNode('n2', 'service', 'Auth Service'), // duplicate within batch
    ]
    const result = validateOperations(ops, ctx())
    expect(result.rejected).toBe(false)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'NODE_MERGED' }),
    )
    // Second op should be converted to updateNode targeting n1
    const secondOp = result.validOperations[1]
    expect(secondOp.op).toBe('updateNode')
    if (secondOp.op === 'updateNode') expect(secondOp.id).toBe('n1')
  })
})
