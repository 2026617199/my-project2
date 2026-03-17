import type { Edge, Node, XYPosition } from '@xyflow/react'

export const CANVAS_NODE_TYPES = {
  text: 'text',
  image: 'image',
  video: 'video',
  agent: 'agent',
} as const

export type CanvasNodeType = (typeof CANVAS_NODE_TYPES)[keyof typeof CANVAS_NODE_TYPES]

export type NodeExecutionStatus = 'idle' | 'queued' | 'running' | 'success' | 'error'
export type EdgeRelationType = 'prompt' | 'reference-image' | 'agent-output'

export interface PromptSegment {
  edgeId: string
  sourceNodeId: string
  content: string
  createdAt: number
}

export interface GeneratedImageResult {
  url: string
  revisedPrompt?: string
}

export interface GeneratedVideoResult {
  url: string
  format?: string
}

interface BaseCanvasNodeData extends Record<string, unknown> {
  title: string
  createdAt: number
  status: NodeExecutionStatus
  progress: number
  errorMessage?: string
}

export interface TextNodeData extends BaseCanvasNodeData {
  content: string
  width?: number
  height?: number
}

interface BaseMediaNodeData extends BaseCanvasNodeData {
  prompt: string
  finalPrompt: string
  promptSegments: PromptSegment[]
}

export interface ImageNodeData extends BaseMediaNodeData {
  model: string
  size: string
  resolution: string
  orientation: string
  count: number
  taskId?: string
  outputImages: GeneratedImageResult[]
}

export interface VideoNodeData extends BaseMediaNodeData {
  model: string
  aspectRatio: string
  duration: number
  resolution: string
  hd: boolean
  watermark: boolean
  storyboard: boolean
  style?: string
  taskId?: string
  referenceImageUrl?: string
  outputVideos: GeneratedVideoResult[]
}

export interface AgentNodeData extends BaseMediaNodeData {
  agentType: 'novel-to-script'
  roleDefinition: string
  outputText: string
  model: string
  taskId?: string
}

export type CanvasNodeData = TextNodeData | ImageNodeData | VideoNodeData | AgentNodeData

export type TextCanvasNode = Node<TextNodeData, 'text'>
export type ImageCanvasNode = Node<ImageNodeData, 'image'>
export type VideoCanvasNode = Node<VideoNodeData, 'video'>
export type AgentCanvasNode = Node<AgentNodeData, 'agent'>

export type CanvasNode = TextCanvasNode | ImageCanvasNode | VideoCanvasNode | AgentCanvasNode

export interface CanvasEdgeData extends Record<string, unknown> {
  relationType: EdgeRelationType
  createdAt: number
}

export type CanvasEdge = Edge<CanvasEdgeData, 'semantic'>

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasContextMenuState {
  visible: boolean
  clientX: number
  clientY: number
}

export interface CanvasPersistedState {
  version: number
  savedAt: number
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: CanvasViewport
}

export interface CreateNodePayload {
  type: CanvasNodeType
  position: XYPosition
}

export const CANVAS_STORAGE_KEY = 'interactive-ai-canvas/v1'
export const CANVAS_STORAGE_VERSION = 1

export function isMediaNodeType(type?: string | null): type is 'image' | 'video' {
  return type === CANVAS_NODE_TYPES.image || type === CANVAS_NODE_TYPES.video
}

export function getConnectionRelation(
  sourceType?: string | null,
  targetType?: string | null,
): EdgeRelationType | null {
  if (
    sourceType === CANVAS_NODE_TYPES.text &&
    (isMediaNodeType(targetType) || targetType === CANVAS_NODE_TYPES.agent)
  ) {
    return 'prompt'
  }

  if (sourceType === CANVAS_NODE_TYPES.image && targetType === CANVAS_NODE_TYPES.video) {
    return 'reference-image'
  }

  if (sourceType === CANVAS_NODE_TYPES.agent && targetType === CANVAS_NODE_TYPES.text) {
    return 'agent-output'
  }

  return null
}

export function canConnectNodes(sourceType?: string | null, targetType?: string | null) {
  return getConnectionRelation(sourceType, targetType) !== null
}
