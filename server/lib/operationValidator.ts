import { NodeData, EdgeData, NodeType, EdgeType, Port } from '../../src/types'
import { NODE_TYPE_CONFIGS } from '../../src/constants/nodeTypes'

// ─── Operation Types ──────────────────────────────────────────────────────────

export type DiagramOperation =
  | { op: 'addNode';    node: NodeData }
  | { op: 'updateNode'; id: string; updates: Partial<NodeData> }
  | { op: 'removeNode'; id: string }
  | { op: 'removeNodes'; ids: string[] }
  | { op: 'addEdge';    edge: EdgeData }
  | { op: 'updateEdge'; id: string; updates: Partial<EdgeData> }
  | { op: 'removeEdge'; id: string }
  | { op: 'removeEdges'; ids: string[] }
  | { op: 'clearAll' }
  | { op: 'autoLayout' }

// ─── Validation Types ─────────────────────────────────────────────────────────

export type ValidationWarningCode =
  | 'INVALID_NODE_TYPE'      // unknown type, coerced via alias or dropped
  | 'INVALID_EDGE_TYPE'      // unknown type, coerced to 'custom'
  | 'INVALID_PORT'           // unknown port, defaulted
  | 'CLAMPED_POSITION'       // non-finite or extreme coords clamped to ±10000
  | 'EMPTY_LABEL'            // missing label, defaulted from NODE_TYPE_CONFIGS
  | 'EDGE_DANGLING'          // source or target not found — op dropped
  | 'EDGE_SELF_LOOP'         // source === target — op dropped
  | 'STALE_ID'               // id not found in working state — op dropped
  | 'NODE_MERGED'            // addNode converted to updateNode (duplicate label+type)
  | 'OP_DROPPED'             // unrecoverable error — op removed
  | 'CLEAR_WITHOUT_REPLACE'  // clearAll removed to protect existing diagram

export interface ValidationWarning {
  operationIndex: number  // index in rawOps; -1 = batch-level
  op: string
  code: ValidationWarningCode
  message: string
  transformed?: boolean   // true if op was modified rather than dropped
}

export interface ValidationResult {
  validOperations: DiagramOperation[]
  warnings: ValidationWarning[]
  rejected: boolean
  rejectionReason?: string
}

export interface ValidationConfig {
  // 'merge-by-label-type': addNode with same label+type as existing node → updateNode
  // 'allow-duplicate': always add new node
  reuseStrategy: 'merge-by-label-type' | 'allow-duplicate'
  // When true, clearAll with no following addNode ops is removed instead of applied
  guardClearWithNoReplacements: boolean
}

export interface ValidationContext {
  existingNodes: Record<string, NodeData>
  existingEdges: Record<string, EdgeData>
  config: ValidationConfig
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_NODE_TYPES = new Set<string>(Object.keys(NODE_TYPE_CONFIGS))

const VALID_EDGE_TYPES = new Set<string>([
  'http', 'grpc', 'event', 'database', 'dependency', 'dataflow', 'sync', 'custom',
])

const VALID_PORTS = new Set<string>(['top', 'bottom', 'left', 'right'])

const NODE_TYPE_ALIASES: Record<string, NodeType> = {
  microservice: 'service',
  app:          'service',
  api:          'gateway',
  proxy:        'gateway',
  lb:           'loadbalancer',
  balancer:     'loadbalancer',
  redis:        'cache',
  memcached:    'cache',
  kafka:        'queue',
  rabbitmq:     'queue',
  broker:       'queue',
  bucket:       'database',
  storage:      'database',
  store:        'database',
  cdn:          'external',
  user:         'client',
  browser:      'client',
  mobile:       'client',
}

const POSITION_MAX = 10_000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coerceNodeType(raw: unknown): NodeType | null {
  if (typeof raw !== 'string') return null
  const lower = raw.toLowerCase().trim()
  if (VALID_NODE_TYPES.has(lower)) return lower as NodeType
  return NODE_TYPE_ALIASES[lower] ?? null
}

function coerceEdgeType(raw: unknown): EdgeType {
  if (typeof raw === 'string' && VALID_EDGE_TYPES.has(raw.toLowerCase())) {
    return raw.toLowerCase() as EdgeType
  }
  return 'custom'
}

function coercePort(raw: unknown, fallback: Port): Port {
  if (typeof raw === 'string' && VALID_PORTS.has(raw.toLowerCase())) {
    return raw.toLowerCase() as Port
  }
  return fallback
}

function clampCoord(v: unknown): { value: number; clamped: boolean } {
  const n = typeof v === 'number' ? v : 0
  if (!isFinite(n)) return { value: 0, clamped: true }
  if (n > POSITION_MAX)  return { value: POSITION_MAX,  clamped: true }
  if (n < -POSITION_MAX) return { value: -POSITION_MAX, clamped: true }
  return { value: n, clamped: false }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// ─── Per-operation validators ─────────────────────────────────────────────────

interface OpResult {
  op: DiagramOperation | null
  warnings: ValidationWarning[]
}

function validateAddNode(
  raw: Record<string, unknown>,
  index: number,
  workingNodes: Map<string, NodeData>,
  config: ValidationConfig,
): OpResult {
  const warnings: ValidationWarning[] = []

  // Node data lives under raw.node (set by resolveTempIds); fall back to raw for defensiveness
  const rawNode: Record<string, unknown> = isRecord(raw.node) ? raw.node : raw

  // type
  const nodeType = coerceNodeType(rawNode.type)
  if (!nodeType) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'addNode', code: 'OP_DROPPED',
        message: `addNode dropped: unrecognized type "${rawNode.type}"` }],
    }
  }
  if (nodeType !== rawNode.type) {
    warnings.push({ operationIndex: index, op: 'addNode', code: 'INVALID_NODE_TYPE',
      message: `Node type "${rawNode.type}" coerced to "${nodeType}"`, transformed: true })
  }

  // label
  const typeConfig = NODE_TYPE_CONFIGS[nodeType]
  let label = typeof rawNode.label === 'string' ? rawNode.label.trim() : ''
  if (!label) {
    label = typeConfig.label
    warnings.push({ operationIndex: index, op: 'addNode', code: 'EMPTY_LABEL',
      message: `Missing label defaulted to "${label}"`, transformed: true })
  }

  // position
  const rawPos = isRecord(rawNode.position) ? rawNode.position : {}
  const cx = clampCoord(rawPos.x)
  const cy = clampCoord(rawPos.y)
  if (cx.clamped || cy.clamped) {
    warnings.push({ operationIndex: index, op: 'addNode', code: 'CLAMPED_POSITION',
      message: `Position clamped to (${cx.value}, ${cy.value})`, transformed: true })
  }

  // size — always use type defaults; AI doesn't know sizes
  const size = { w: typeConfig.defaultSize.w, h: typeConfig.defaultSize.h }

  // id — must already be a real UUID (resolved by resolveTempIds before this runs)
  const id = typeof rawNode.id === 'string' ? rawNode.id : ''

  const rawMeta = isRecord(rawNode.metadata) ? rawNode.metadata : {}
  const metadata = {
    description: typeof rawMeta.description === 'string' ? rawMeta.description : undefined,
    tags: Array.isArray(rawMeta.tags)
      ? rawMeta.tags.filter((t): t is string => typeof t === 'string')
      : [],
  }

  const node: NodeData = {
    id,
    type: nodeType,
    label,
    position: { x: cx.value, y: cy.value },
    size,
    metadata,
  }

  // Node reuse check
  if (config.reuseStrategy === 'merge-by-label-type') {
    for (const [existingId, existing] of workingNodes) {
      if (
        existing.type === nodeType &&
        existing.label.trim().toLowerCase() === label.toLowerCase()
      ) {
        warnings.push({ operationIndex: index, op: 'addNode', code: 'NODE_MERGED',
          message: `addNode for "${label}" (${nodeType}) merged into existing node — updateNode used instead`,
          transformed: true })
        return {
          op: { op: 'updateNode', id: existingId, updates: { metadata } },
          warnings,
        }
      }
    }
  }

  return { op: { op: 'addNode', node }, warnings }
}

function validateAddEdge(
  raw: Record<string, unknown>,
  index: number,
  workingNodes: Map<string, NodeData>,
  workingEdges: Map<string, EdgeData>,
): OpResult {
  const warnings: ValidationWarning[] = []

  const rawEdge = isRecord(raw.edge) ? raw.edge : raw

  const source = typeof rawEdge.source === 'string' ? rawEdge.source : ''
  const target = typeof rawEdge.target === 'string' ? rawEdge.target : ''

  if (!workingNodes.has(source)) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'addEdge', code: 'EDGE_DANGLING',
        message: `addEdge dropped: source node "${source}" not found` }],
    }
  }
  if (!workingNodes.has(target)) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'addEdge', code: 'EDGE_DANGLING',
        message: `addEdge dropped: target node "${target}" not found` }],
    }
  }
  if (source === target) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'addEdge', code: 'EDGE_SELF_LOOP',
        message: `addEdge dropped: source and target are the same node "${source}"` }],
    }
  }

  const edgeType = coerceEdgeType(rawEdge.type)
  if (edgeType !== rawEdge.type) {
    warnings.push({ operationIndex: index, op: 'addEdge', code: 'INVALID_EDGE_TYPE',
      message: `Edge type "${rawEdge.type}" coerced to "custom"`, transformed: true })
  }

  const sourcePort = coercePort(rawEdge.sourcePort, 'bottom')
  const targetPort = coercePort(rawEdge.targetPort, 'top')
  if (rawEdge.sourcePort && sourcePort !== rawEdge.sourcePort) {
    warnings.push({ operationIndex: index, op: 'addEdge', code: 'INVALID_PORT',
      message: `sourcePort "${rawEdge.sourcePort}" defaulted to "bottom"`, transformed: true })
  }
  if (rawEdge.targetPort && targetPort !== rawEdge.targetPort) {
    warnings.push({ operationIndex: index, op: 'addEdge', code: 'INVALID_PORT',
      message: `targetPort "${rawEdge.targetPort}" defaulted to "top"`, transformed: true })
  }

  const routing = rawEdge.routing === 'orthogonal' ? 'orthogonal' : 'curved'

  const edge: EdgeData = {
    id: typeof rawEdge.id === 'string' ? rawEdge.id : '',
    type: edgeType,
    source,
    target,
    sourcePort,
    targetPort,
    routing,
    label: typeof rawEdge.label === 'string' ? rawEdge.label : undefined,
  }

  return { op: { op: 'addEdge', edge }, warnings }
}

function validateUpdateNode(
  raw: Record<string, unknown>,
  index: number,
  workingNodes: Map<string, NodeData>,
): OpResult {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!workingNodes.has(id)) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'updateNode', code: 'STALE_ID',
        message: `updateNode dropped: node "${id}" not found` }],
    }
  }

  const rawUpdates = isRecord(raw.updates) ? raw.updates : {}
  const updates: Partial<NodeData> = {}

  if (typeof rawUpdates.label === 'string' && rawUpdates.label.trim()) {
    updates.label = rawUpdates.label.trim()
  }
  if (rawUpdates.type !== undefined) {
    const t = coerceNodeType(rawUpdates.type)
    if (t) updates.type = t
  }
  if (isRecord(rawUpdates.metadata)) {
    updates.metadata = {
      description: typeof rawUpdates.metadata.description === 'string'
        ? rawUpdates.metadata.description : undefined,
      tags: Array.isArray(rawUpdates.metadata.tags)
        ? rawUpdates.metadata.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
    }
  }

  return { op: { op: 'updateNode', id, updates }, warnings: [] }
}

function validateUpdateEdge(
  raw: Record<string, unknown>,
  index: number,
  workingEdges: Map<string, EdgeData>,
): OpResult {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!workingEdges.has(id)) {
    return {
      op: null,
      warnings: [{ operationIndex: index, op: 'updateEdge', code: 'STALE_ID',
        message: `updateEdge dropped: edge "${id}" not found` }],
    }
  }

  const rawUpdates = isRecord(raw.updates) ? raw.updates : {}
  const updates: Partial<EdgeData> = {}

  if (rawUpdates.label !== undefined) {
    updates.label = typeof rawUpdates.label === 'string' ? rawUpdates.label : undefined
  }
  if (rawUpdates.type !== undefined) {
    updates.type = coerceEdgeType(rawUpdates.type)
  }
  if (rawUpdates.routing === 'orthogonal' || rawUpdates.routing === 'curved') {
    updates.routing = rawUpdates.routing
  }

  return { op: { op: 'updateEdge', id, updates }, warnings: [] }
}

function validateRemoveNode(
  raw: Record<string, unknown>,
  workingNodes: Map<string, NodeData>,
): OpResult {
  const id = typeof raw.id === 'string' ? raw.id : ''
  // Silent no-op if not found — idempotent
  if (!workingNodes.has(id)) return { op: null, warnings: [] }
  return { op: { op: 'removeNode', id }, warnings: [] }
}

function validateRemoveEdge(
  raw: Record<string, unknown>,
  workingEdges: Map<string, EdgeData>,
): OpResult {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!workingEdges.has(id)) return { op: null, warnings: [] }
  return { op: { op: 'removeEdge', id }, warnings: [] }
}

function validateRemoveNodes(
  raw: Record<string, unknown>,
  workingNodes: Map<string, NodeData>,
): OpResult {
  const ids = Array.isArray(raw.ids)
    ? raw.ids.filter((id): id is string => typeof id === 'string' && workingNodes.has(id))
    : []
  if (ids.length === 0) return { op: null, warnings: [] }
  return { op: { op: 'removeNodes', ids }, warnings: [] }
}

function validateRemoveEdges(
  raw: Record<string, unknown>,
  workingEdges: Map<string, EdgeData>,
): OpResult {
  const ids = Array.isArray(raw.ids)
    ? raw.ids.filter((id): id is string => typeof id === 'string' && workingEdges.has(id))
    : []
  if (ids.length === 0) return { op: null, warnings: [] }
  return { op: { op: 'removeEdges', ids }, warnings: [] }
}

// ─── Working state updater ────────────────────────────────────────────────────

function applyToWorkingState(
  op: DiagramOperation,
  workingNodes: Map<string, NodeData>,
  workingEdges: Map<string, EdgeData>,
): void {
  switch (op.op) {
    case 'addNode':
      workingNodes.set(op.node.id, op.node)
      break
    case 'updateNode': {
      const n = workingNodes.get(op.id)
      if (n) workingNodes.set(op.id, { ...n, ...op.updates })
      break
    }
    case 'removeNode':
      workingNodes.delete(op.id)
      // Also remove connected edges from working state
      for (const [id, e] of workingEdges) {
        if (e.source === op.id || e.target === op.id) workingEdges.delete(id)
      }
      break
    case 'removeNodes':
      for (const id of op.ids) {
        workingNodes.delete(id)
        for (const [eid, e] of workingEdges) {
          if (e.source === id || e.target === id) workingEdges.delete(eid)
        }
      }
      break
    case 'addEdge':
      workingEdges.set(op.edge.id, op.edge)
      break
    case 'updateEdge': {
      const e = workingEdges.get(op.id)
      if (e) workingEdges.set(op.id, { ...e, ...op.updates })
      break
    }
    case 'removeEdge':
      workingEdges.delete(op.id)
      break
    case 'removeEdges':
      for (const id of op.ids) workingEdges.delete(id)
      break
    case 'clearAll':
      workingNodes.clear()
      workingEdges.clear()
      break
    case 'autoLayout':
      break
  }
}

// ─── Batch-level rules ────────────────────────────────────────────────────────

function applyBatchLevelRules(
  validOps: DiagramOperation[],
  warnings: ValidationWarning[],
  ctx: ValidationContext,
): ValidationResult {
  if (validOps.length === 0) {
    return {
      validOperations: [],
      warnings,
      rejected: true,
      rejectionReason: 'All operations were invalid or the batch was empty',
    }
  }

  // clearAll protection: if clearAll appears with no addNode after it, and
  // the existing diagram has nodes, remove the clearAll to protect user data
  if (ctx.config.guardClearWithNoReplacements) {
    let clearIdx = -1
    for (let i = validOps.length - 1; i >= 0; i--) {
      if (validOps[i].op === 'clearAll') { clearIdx = i; break }
    }
    if (clearIdx !== -1) {
      const hasAddNodeAfterClear = validOps
        .slice(clearIdx + 1)
        .some(op => op.op === 'addNode')

      if (!hasAddNodeAfterClear && Object.keys(ctx.existingNodes).length > 0) {
        validOps.splice(clearIdx, 1)
        warnings.push({
          operationIndex: -1,
          op: 'clearAll',
          code: 'CLEAR_WITHOUT_REPLACE',
          message: 'clearAll was removed: no replacement nodes were provided and the existing diagram would be lost',
        })
      }
    }
  }

  return { validOperations: validOps, warnings, rejected: false }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function validateOperations(
  rawOps: unknown[],
  ctx: ValidationContext,
): ValidationResult {
  const workingNodes = new Map(Object.entries(ctx.existingNodes))
  const workingEdges = new Map(Object.entries(ctx.existingEdges))
  const validOps: DiagramOperation[] = []
  const warnings: ValidationWarning[] = []

  for (let i = 0; i < rawOps.length; i++) {
    const raw = rawOps[i]
    if (!isRecord(raw) || typeof raw.op !== 'string') {
      warnings.push({ operationIndex: i, op: String(raw), code: 'OP_DROPPED',
        message: `Operation at index ${i} is not a valid object` })
      continue
    }

    let result: OpResult

    switch (raw.op) {
      case 'addNode':
        result = validateAddNode(raw, i, workingNodes, ctx.config)
        break
      case 'addEdge':
        result = validateAddEdge(raw, i, workingNodes, workingEdges)
        break
      case 'updateNode':
        result = validateUpdateNode(raw, i, workingNodes)
        break
      case 'updateEdge':
        result = validateUpdateEdge(raw, i, workingEdges)
        break
      case 'removeNode':
        result = validateRemoveNode(raw, workingNodes)
        break
      case 'removeEdge':
        result = validateRemoveEdge(raw, workingEdges)
        break
      case 'removeNodes':
        result = validateRemoveNodes(raw, workingNodes)
        break
      case 'removeEdges':
        result = validateRemoveEdges(raw, workingEdges)
        break
      case 'clearAll':
      case 'autoLayout':
        result = { op: { op: raw.op }, warnings: [] }
        break
      default:
        result = {
          op: null,
          warnings: [{ operationIndex: i, op: raw.op, code: 'OP_DROPPED',
            message: `Unknown operation "${raw.op}"` }],
        }
    }

    warnings.push(...result.warnings)
    if (result.op) {
      applyToWorkingState(result.op, workingNodes, workingEdges)
      validOps.push(result.op)
    }
  }

  return applyBatchLevelRules(validOps, warnings, ctx)
}
