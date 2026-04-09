import { NodeType, EdgeType } from '../types'

export interface NodeTypeConfig {
  type: NodeType
  label: string
  category: string
  defaultSize: { w: number; h: number }
  defaultColor: string
  defaultBorder: string
  textColor: string
  description: string
}

export const NODE_TYPE_CONFIGS: Record<NodeType, NodeTypeConfig> = {
  service: {
    type: 'service',
    label: 'Service',
    category: 'Compute',
    defaultSize: { w: 160, h: 72 },
    defaultColor: '#1e3a5f',
    defaultBorder: '#3b82f6',
    textColor: '#93c5fd',
    description: 'A microservice or application component',
  },
  database: {
    type: 'database',
    label: 'Database',
    category: 'Storage',
    defaultSize: { w: 140, h: 80 },
    defaultColor: '#14532d',
    defaultBorder: '#22c55e',
    textColor: '#86efac',
    description: 'A relational or NoSQL data store',
  },
  queue: {
    type: 'queue',
    label: 'Queue/Broker',
    category: 'Messaging',
    defaultSize: { w: 150, h: 72 },
    defaultColor: '#431407',
    defaultBorder: '#f97316',
    textColor: '#fdba74',
    description: 'A message queue or event broker',
  },
  cache: {
    type: 'cache',
    label: 'Cache',
    category: 'Storage',
    defaultSize: { w: 150, h: 72 },
    defaultColor: '#2e1065',
    defaultBorder: '#a855f7',
    textColor: '#d8b4fe',
    description: 'An in-memory cache layer',
  },
  client: {
    type: 'client',
    label: 'Client/User',
    category: 'External',
    defaultSize: { w: 80, h: 80 },
    defaultColor: '#0f3a3a',
    defaultBorder: '#14b8a6',
    textColor: '#5eead4',
    description: 'End user or client application',
  },
  gateway: {
    type: 'gateway',
    label: 'API Gateway',
    category: 'Networking',
    defaultSize: { w: 160, h: 72 },
    defaultColor: '#1e1b4b',
    defaultBorder: '#6366f1',
    textColor: '#a5b4fc',
    description: 'API gateway or reverse proxy',
  },
  loadbalancer: {
    type: 'loadbalancer',
    label: 'Load Balancer',
    category: 'Networking',
    defaultSize: { w: 140, h: 72 },
    defaultColor: '#422006',
    defaultBorder: '#eab308',
    textColor: '#fde047',
    description: 'Distributes traffic across instances',
  },
  external: {
    type: 'external',
    label: 'External System',
    category: 'External',
    defaultSize: { w: 160, h: 72 },
    defaultColor: '#1a1a2e',
    defaultBorder: '#64748b',
    textColor: '#94a3b8',
    description: 'Third-party or external service',
  },
  container: {
    type: 'container',
    label: 'Container/Group',
    category: 'Layout',
    defaultSize: { w: 320, h: 240 },
    defaultColor: 'transparent',
    defaultBorder: '#374151',
    textColor: '#9ca3af',
    description: 'Groups related components together',
  },
  annotation: {
    type: 'annotation',
    label: 'Annotation',
    category: 'Layout',
    defaultSize: { w: 200, h: 100 },
    defaultColor: '#451a03',
    defaultBorder: '#f59e0b',
    textColor: '#fcd34d',
    description: 'A sticky note or comment',
  },
}

export const NODE_CATEGORIES = ['Compute', 'Storage', 'Messaging', 'Networking', 'External', 'Layout'] as const

export interface EdgeTypeConfig {
  type: EdgeType
  label: string
  color: string
  strokeWidth: number
  strokeDasharray?: string
  animated?: boolean
  bidirectional?: boolean
  description: string
}

export const EDGE_TYPE_CONFIGS: Record<EdgeType, EdgeTypeConfig> = {
  http: {
    type: 'http',
    label: 'HTTP/REST',
    color: '#3b82f6',
    strokeWidth: 2,
    description: 'HTTP or REST API call',
  },
  grpc: {
    type: 'grpc',
    label: 'gRPC',
    color: '#a855f7',
    strokeWidth: 2,
    description: 'gRPC remote procedure call',
  },
  event: {
    type: 'event',
    label: 'Event/Message',
    color: '#f97316',
    strokeWidth: 2,
    strokeDasharray: '8 4',
    description: 'Async message or event',
  },
  database: {
    type: 'database',
    label: 'DB Query',
    color: '#22c55e',
    strokeWidth: 1.5,
    strokeDasharray: '4 2',
    description: 'Database read/write query',
  },
  dependency: {
    type: 'dependency',
    label: 'Dependency',
    color: '#64748b',
    strokeWidth: 1,
    description: 'Logical dependency relationship',
  },
  dataflow: {
    type: 'dataflow',
    label: 'Dataflow',
    color: '#06b6d4',
    strokeWidth: 2,
    strokeDasharray: '10 4',
    animated: true,
    description: 'Data stream or pipeline flow',
  },
  sync: {
    type: 'sync',
    label: 'Sync',
    color: '#f43f5e',
    strokeWidth: 2,
    bidirectional: true,
    description: 'Bidirectional synchronization',
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    color: '#94a3b8',
    strokeWidth: 1.5,
    description: 'Custom relationship',
  },
}

export const GRID_SIZE = 20
export const SNAP_SIZE = 8
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5
export const ZOOM_STEP = 0.1
export const PORT_RADIUS = 5
export const PORT_HIT_RADIUS = 12
