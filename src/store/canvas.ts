import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type XYPosition } from '@xyflow/react'
import { create } from 'zustand'
import { message } from 'antd'

import {
  IMAGE_COUNTS,
  IMAGE_MODELS,
  IMAGE_ORIENTATIONS,
  IMAGE_RESOLUTIONS,
  IMAGE_SIZES,
  TEXT_MODELS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATION_CONFIG,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
} from '@/constants/ai-models'
import { PROMPT_ROLE_DEFINITION } from '@/constants/prompts'
import {
  createChatCompletion,
  createImageGeneration,
  createVideoGeneration,
  getImageTaskStatus,
  getVideoTaskStatus,
} from '@/api/ai'
import type { ImageGenerationResponse } from '@/types/ImageGeneration'
import type { VideoTaskStatusResponse } from '@/types/VideoGeneration'
import {
  CANVAS_NODE_TYPES,
  CANVAS_STORAGE_KEY,
  CANVAS_STORAGE_VERSION,
  canConnectNodes,
  type CanvasContextMenuState,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeData,
  type CanvasNodeType,
  type CanvasPersistedState,
  type CanvasViewport,
  type EdgeRelationType,
  type GeneratedImageResult,
  type GeneratedVideoResult,
  type ImageNodeData,
  type PromptSegment,
  type VideoNodeData,
  getConnectionRelation,
} from '@/types/canvas'

const EMPTY_CONTEXT_MENU: CanvasContextMenuState = {
  visible: false,
  clientX: 0,
  clientY: 0,
  sourceNodeId: undefined,
  isConnectionMenu: false,
}

const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1,
}

const POLL_INTERVAL = 3000

const VIEWPORT_EPSILON = 0.0001

interface CanvasStoreState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  contextMenu: CanvasContextMenuState
  viewport: CanvasViewport
  hydrated: boolean
  createNode: (type: CanvasNodeType, position: XYPosition) => void
  createNodeAtRandom: (type: CanvasNodeType) => void
  applyNodeChanges: (changes: NodeChange<CanvasNode>[]) => void
  applyEdgeChanges: (changes: EdgeChange<CanvasEdge>[]) => void
  connectNodes: (connection: Connection) => void
  reconnectEdge: (oldEdge: CanvasEdge, connection: Connection) => void
  updateNodeData: (nodeId: string, patch: CanvasNodePatch) => void
  setSelection: (nodeId: string | null, edgeId: string | null) => void
  deleteSelectedElements: () => void
  openContextMenu: (clientX: number, clientY: number, sourceNodeId?: string, isConnectionMenu?: boolean) => void
  closeContextMenu: () => void
  createNodeAndConnect: (sourceNodeId: string, targetNodeType: CanvasNodeType, position: XYPosition) => void
  setViewport: (viewport: CanvasViewport) => void
  saveGraph: (viewport?: CanvasViewport) => void
  hydrateGraph: () => void
  resetToSavedGraph: () => void
  runNode: (nodeId: string) => Promise<void>
}

type CanvasNodePatch = Partial<CanvasNodeData>

function createNodeId(type: CanvasNodeType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createNodeFactory(type: CanvasNodeType, position: XYPosition): CanvasNode {
  const id = createNodeId(type)
  const baseData = {
    createdAt: Date.now(),
    status: 'idle' as const,
    progress: 0,
    errorMessage: undefined,
  }

  if (type === CANVAS_NODE_TYPES.agent) {
    return {
      id,
      type,
      position,
      data: {
        ...baseData,
        title: '小说改剧本',
        agentType: 'novel-to-script',
        prompt: '',
        finalPrompt: '',
        promptSegments: [],
        outputText: '',
        model: TEXT_MODELS[0]?.model ?? '',
      },
    }
  }
  if (type === CANVAS_NODE_TYPES.text) {
    return {
      id,
      type,
      position,
      data: {
        ...baseData,
        title: '文本节点',
        content: '',
        width: 320,
        height: 160,
      },
    }
  }

  if (type === CANVAS_NODE_TYPES.image) {
    return {
      id,
      type,
      position,
      data: {
        ...baseData,
        title: '图片节点',
        prompt: '',
        finalPrompt: '',
        promptSegments: [],
        model: IMAGE_MODELS[0]?.model ?? '',
        size: IMAGE_SIZES[2]?.value ?? '1024x1024',
        resolution: IMAGE_RESOLUTIONS[0]?.value ?? '1K',
        orientation: IMAGE_ORIENTATIONS[0]?.value ?? 'landscape',
        count: IMAGE_COUNTS[0]?.value ?? 1,
        referenceImageUrls: [],
        uploadedReferenceImageUrls: [],
        dismissedAutoReferenceImageUrls: [],
        outputImages: [],
      },
    }
  }

  return {
    id,
    type,
    position,
    data: {
      ...baseData,
      title: '视频节点',
      prompt: '',
      finalPrompt: '',
      promptSegments: [],
      model: VIDEO_MODELS[0]?.model ?? '',
      aspectRatio: VIDEO_ASPECT_RATIOS[0]?.value ?? '16:9',
      duration: VIDEO_DURATION_CONFIG.defaultValue,
      resolution: VIDEO_RESOLUTIONS[0]?.value ?? '720p',
      audio: true,
      cameraFixed: false,
      referenceImageUrls: [],
      uploadedReferenceImageUrls: [],
      dismissedAutoReferenceImageUrls: [],
      outputVideos: [],
    },
  }
}

function getRandomFlowPosition(viewport: CanvasViewport): XYPosition {
  const canvasHeight = Math.max(window.innerHeight - 65, 480)
  const canvasWidth = Math.max(window.innerWidth, 640)
  const paddingX = 170
  const paddingY = 120
  const safeMinScreenX = paddingX
  const safeMaxScreenX = Math.max(paddingX + 1, canvasWidth - paddingX)
  const safeMinScreenY = paddingY
  const safeMaxScreenY = Math.max(paddingY + 1, canvasHeight - paddingY)

  const screenX = safeMinScreenX + Math.random() * (safeMaxScreenX - safeMinScreenX)
  const screenY = safeMinScreenY + Math.random() * (safeMaxScreenY - safeMinScreenY)

  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  }
}
function buildEdgeId(connection: Connection) {
  return `edge-${connection.source}-${connection.target}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function extractChatText(response: any): string {
  const content = response?.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    const merged = content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text
        }

        return ''
      })
      .join('\n')
      .trim()

    return merged
  }

  return ''
}
function sortByCreatedAt<T extends { createdAt: number }>(items: T[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a === b) {
    return true
  }

  if (a.length !== b.length) {
    return false
  }

  return a.every((item, index) => item === b[index])
}

function arePromptSegmentsEqual(a: PromptSegment[], b: PromptSegment[]) {
  if (a === b) {
    return true
  }

  if (a.length !== b.length) {
    return false
  }

  return a.every((item, index) => {
    const other = b[index]
    return (
      item.edgeId === other.edgeId &&
      item.sourceNodeId === other.sourceNodeId &&
      item.content === other.content &&
      item.createdAt === other.createdAt
    )
  })
}

function uniqueUrls(urls: string[]) {
  const normalized = urls
    .map((item) => item.trim())
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

function buildNovelToScriptPrompt(content: string) {
  return [
    '你是一名专业编剧，请将输入的小说内容改写成可拍摄的中文影视剧本。',
    '输出要求：',
    '1) 使用标准剧本结构（场景标题、人物名、对白、动作描述）。',
    '2) 保留原始情节主线，不随意新增关键设定。',
    '3) 优先提高镜头可拍性与对白自然度。',
    '4) 直接输出剧本文本，不要解释过程。',
    '',
    '小说内容：',
    content,
  ].join('\n')
}
function recomputeDerivedNodes(nodes: CanvasNode[], edges: CanvasEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  let hasChanged = false

  const nextNodes = nodes.map((node) => {
    if (
      node.type !== CANVAS_NODE_TYPES.image &&
      node.type !== CANVAS_NODE_TYPES.video &&
      node.type !== CANVAS_NODE_TYPES.agent
    ) {
      return node
    }

    const promptSegments = sortByCreatedAt(
      edges
        .filter((edge) => edge.target === node.id && edge.data?.relationType === 'prompt')
        .map((edge) => {
          const sourceNode = nodeMap.get(edge.source)
          const content = sourceNode?.type === CANVAS_NODE_TYPES.text ? sourceNode.data.content.trim() : ''

          return {
            edgeId: edge.id,
            sourceNodeId: edge.source,
            content,
            createdAt: edge.data?.createdAt ?? 0,
          } satisfies PromptSegment
        })
        .filter((segment) => segment.content),
    )

    const ownPrompt = node.data.prompt.trim()
    const upstreamPrompt = promptSegments.map((segment) => segment.content).join('\n\n')
    const finalPrompt = [upstreamPrompt, ownPrompt].filter(Boolean).join('\n\n')

    if (node.type === CANVAS_NODE_TYPES.agent) {
      const shouldReuseNode =
        node.data.finalPrompt === finalPrompt &&
        arePromptSegmentsEqual(node.data.promptSegments, promptSegments)

      if (shouldReuseNode) {
        return node
      }

      hasChanged = true
      return {
        ...node,
        data: {
          ...node.data,
          promptSegments,
          finalPrompt,
        },
      }
    }
    const referenceEdges = sortByCreatedAt(
      edges
        .filter((edge) => edge.target === node.id && edge.data?.relationType === 'reference-image')
        .map((edge) => ({
          edge,
          createdAt: edge.data?.createdAt ?? 0,
        })),
    )

    const autoReferenceImageUrl = referenceEdges
      .map(({ edge }) => nodeMap.get(edge.source))
      .find((sourceNode): sourceNode is Extract<CanvasNode, { type: 'image' }> => sourceNode?.type === CANVAS_NODE_TYPES.image)
      ?.data.outputImages[0]?.url

    const legacyReferenceImageUrl =
      typeof (node.data as { referenceImageUrl?: unknown }).referenceImageUrl === 'string'
        ? ((node.data as { referenceImageUrl?: string }).referenceImageUrl ?? '').trim()
        : ''

    const uploadedReferenceImageUrls = uniqueUrls([
      ...(Array.isArray(node.data.uploadedReferenceImageUrls) ? node.data.uploadedReferenceImageUrls : []),
      ...(legacyReferenceImageUrl ? [legacyReferenceImageUrl] : []),
    ])

    const dismissedAutoReferenceImageUrls = uniqueUrls(
      Array.isArray(node.data.dismissedAutoReferenceImageUrls)
        ? node.data.dismissedAutoReferenceImageUrls
        : [],
    )

    const normalizedAutoReferenceImageUrl = autoReferenceImageUrl?.trim()
    const shouldIncludeAutoReference =
      !!normalizedAutoReferenceImageUrl &&
      !dismissedAutoReferenceImageUrls.includes(normalizedAutoReferenceImageUrl)

    const referenceImageUrls = uniqueUrls([
      ...(shouldIncludeAutoReference && normalizedAutoReferenceImageUrl
        ? [normalizedAutoReferenceImageUrl]
        : []),
      ...uploadedReferenceImageUrls,
    ])

    const shouldReuseNode =
      node.data.finalPrompt === finalPrompt &&
      arePromptSegmentsEqual(node.data.promptSegments, promptSegments) &&
      areStringArraysEqual(node.data.referenceImageUrls, referenceImageUrls) &&
      areStringArraysEqual(node.data.uploadedReferenceImageUrls, uploadedReferenceImageUrls) &&
      areStringArraysEqual(node.data.dismissedAutoReferenceImageUrls, dismissedAutoReferenceImageUrls)

    if (shouldReuseNode) {
      return node
    }

    hasChanged = true
    if (node.type === CANVAS_NODE_TYPES.image) {
      return {
        ...node,
        data: {
          ...node.data,
          promptSegments,
          finalPrompt,
          referenceImageUrls,
          uploadedReferenceImageUrls,
          dismissedAutoReferenceImageUrls,
        },
      }
    }

    return {
      ...node,
      data: {
        ...node.data,
        promptSegments,
        finalPrompt,
        referenceImageUrls,
        uploadedReferenceImageUrls,
        dismissedAutoReferenceImageUrls,
      },
    }
  })

  return hasChanged ? nextNodes : nodes
}

function serializeGraph(nodes: CanvasNode[], edges: CanvasEdge[], viewport: CanvasViewport): CanvasPersistedState {
  return {
    version: CANVAS_STORAGE_VERSION,
    savedAt: Date.now(),
    nodes,
    edges,
    viewport,
  }
}

function loadPersistedGraph() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(CANVAS_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as CanvasPersistedState
    if (parsed.version !== CANVAS_STORAGE_VERSION) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function persistGraph(state: CanvasPersistedState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(state))
}

function replaceNode(nodes: CanvasNode[], nodeId: string, updater: (node: CanvasNode) => CanvasNode) {
  return nodes.map((node) => (node.id === nodeId ? updater(node) : node))
}

function compactPatch(patch: CanvasNodePatch) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as CanvasNodePatch
}

function applyPatchToNode(node: CanvasNode, patch: CanvasNodePatch): CanvasNode {
  const normalizedPatch = compactPatch(patch)

  if (node.type === CANVAS_NODE_TYPES.text) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(normalizedPatch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  if (node.type === CANVAS_NODE_TYPES.image) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(normalizedPatch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  if (node.type === CANVAS_NODE_TYPES.video) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(normalizedPatch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  if (node.type === CANVAS_NODE_TYPES.agent) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(normalizedPatch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  return node
}

function withRecomputedNodes(nodes: CanvasNode[], edges: CanvasEdge[]) {
  return recomputeDerivedNodes(nodes, edges)
}

function updateStatusPatch<T extends ImageNodeData | VideoNodeData>(
  node: Extract<CanvasNode, { data: T }>,
  patch: Partial<T>,
): Extract<CanvasNode, { data: T }> {
  return {
    ...node,
    data: {
      ...node.data,
      ...patch,
    },
  }
}

async function pollImageGeneration(taskId: string, nodeId: string) {
  while (true) {
    await wait(POLL_INTERVAL)
    const response = (await getImageTaskStatus(taskId)) as ImageGenerationResponse
    const state = useCanvasStore.getState()
    const imageNode = state.nodes.find((node) => node.id === nodeId)

    if (!imageNode || imageNode.type !== CANVAS_NODE_TYPES.image) {
      return
    }

    const nextNodes = replaceNode(state.nodes, nodeId, (node) => {
      if (node.type !== CANVAS_NODE_TYPES.image) {
        return node
      }

      if (response.status === 'completed') {
        const outputImages: GeneratedImageResult[] =
          response.result?.data.map((item) => ({
            url: item.url,
          })) ?? []

        return updateStatusPatch(node, {
          status: 'success',
          progress: 100,
          taskId: response.id,
          outputImages,
          errorMessage: undefined,
        })
      }

      if (response.status === 'failed') {
        return updateStatusPatch(node, {
          status: 'error',
          progress: response.progress ?? node.data.progress,
          errorMessage: response.error?.message ?? '图片生成失败',
        })
      }

      return updateStatusPatch(node, {
        status: 'running',
        progress: response.progress ?? node.data.progress,
        taskId: response.id,
      })
    })

    const recomputedNodes = withRecomputedNodes(nextNodes, state.edges)
    useCanvasStore.setState({ nodes: recomputedNodes })

    if (response.status === 'completed' || response.status === 'failed') {
      return
    }
  }
}

async function pollVideoGeneration(taskId: string, nodeId: string) {
  while (true) {
    await wait(POLL_INTERVAL)
    const response = (await getVideoTaskStatus(taskId)) as VideoTaskStatusResponse
    const result = response.result
    const hasResult = result !== null && result !== undefined
    const state = useCanvasStore.getState()
    const videoNode = state.nodes.find((node) => node.id === nodeId)

    if (!videoNode || videoNode.type !== CANVAS_NODE_TYPES.video) {
      return
    }

    const nextNodes = replaceNode(state.nodes, nodeId, (node) => {
      if (node.type !== CANVAS_NODE_TYPES.video) {
        return node
      }

      if (hasResult) {
        const outputVideos: GeneratedVideoResult[] =
          result.data.map((item) => ({
            url: item.url,
            format: item.format,
          })) ?? []

        return updateStatusPatch(node, {
          status: 'success',
          progress: 100,
          outputVideos,
          errorMessage: undefined,
        })
      }

      if (response.status === 'failed') {
        return updateStatusPatch(node, {
          status: 'error',
          progress: response.progress ?? node.data.progress,
          errorMessage: response.error?.message ?? '视频生成失败',
        })
      }

      return updateStatusPatch(node, {
        status: 'running',
        progress: response.progress ?? node.data.progress,
      })
    })

    const recomputedNodes = withRecomputedNodes(nextNodes, state.edges)
    useCanvasStore.setState({ nodes: recomputedNodes })

    if (hasResult || response.status === 'failed') {
      return
    }
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function isSameViewport(a: CanvasViewport, b: CanvasViewport) {
  return (
    Math.abs(a.x - b.x) < VIEWPORT_EPSILON &&
    Math.abs(a.y - b.y) < VIEWPORT_EPSILON &&
    Math.abs(a.zoom - b.zoom) < VIEWPORT_EPSILON
  )
}
export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  contextMenu: EMPTY_CONTEXT_MENU,
  viewport: DEFAULT_VIEWPORT,
  hydrated: false,

  createNode: (type, position) => {
    const nextNodes = withRecomputedNodes([...get().nodes, createNodeFactory(type, position)], get().edges)
    set({ nodes: nextNodes, selectedNodeId: nextNodes.at(-1)?.id ?? null, selectedEdgeId: null, contextMenu: EMPTY_CONTEXT_MENU })
  },

  createNodeAtRandom: (type) => {
    const position = getRandomFlowPosition(get().viewport)
    const nextNode = createNodeFactory(type, position)
    const nextNodes = withRecomputedNodes([...get().nodes, nextNode], get().edges)
    set({
      nodes: nextNodes,
      selectedNodeId: nextNode.id,
      selectedEdgeId: null,
      contextMenu: EMPTY_CONTEXT_MENU,
    })
  },

  applyNodeChanges: (changes) => {
    const nextNodes = withRecomputedNodes(applyNodeChanges(changes, get().nodes) as CanvasNode[], get().edges)
    set({ nodes: nextNodes })
  },

  applyEdgeChanges: (changes) => {
    const nextEdges = applyEdgeChanges(changes, get().edges) as CanvasEdge[]
    const nextNodes = withRecomputedNodes(get().nodes, nextEdges)
    set({ edges: nextEdges, nodes: nextNodes })
  },

  connectNodes: (connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    const sourceNode = get().nodes.find((node) => node.id === connection.source)
    const targetNode = get().nodes.find((node) => node.id === connection.target)

    if (!sourceNode || !targetNode) {
      return
    }

    const relationType = getConnectionRelation(sourceNode.type, targetNode.type)
    if (!relationType) {
      return
    }

    const alreadyHasReferenceImage =
      relationType === 'reference-image' &&
      get().edges.some(
        (edge) =>
          edge.target === connection.target &&
          edge.data?.relationType === 'reference-image',
      )

    if (alreadyHasReferenceImage) {
      return
    }

    const nextEdge: CanvasEdge = {
      id: buildEdgeId(connection),
      type: 'semantic',
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: {
        relationType,
        createdAt: Date.now(),
      },
      animated: relationType === 'reference-image',
      deletable: true,
      selectable: true,
      reconnectable: true,
    }

    const nextEdges = addEdge(nextEdge, get().edges) as CanvasEdge[]
    const nextNodes = withRecomputedNodes(get().nodes, nextEdges)
    set({ edges: nextEdges, nodes: nextNodes, selectedEdgeId: nextEdge.id, selectedNodeId: null })
  },

  reconnectEdge: (oldEdge, connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    const sourceNode = get().nodes.find((node) => node.id === connection.source)
    const targetNode = get().nodes.find((node) => node.id === connection.target)
    if (!sourceNode || !targetNode || !canConnectNodes(sourceNode.type, targetNode.type)) {
      return
    }

    const relationType = getConnectionRelation(sourceNode.type, targetNode.type) as EdgeRelationType

    const nextEdges = get().edges.map((edge) =>
      edge.id === oldEdge.id
        ? {
            ...edge,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            data: {
              relationType,
              createdAt: oldEdge.data?.createdAt ?? Date.now(),
            },
            animated: relationType === 'reference-image',
          }
        : edge,
    ) as CanvasEdge[]
    const nextNodes = withRecomputedNodes(get().nodes, nextEdges)
    set({ edges: nextEdges, nodes: nextNodes })
  },

  updateNodeData: (nodeId, patch) => {
    const nextNodes = replaceNode(get().nodes, nodeId, (node) => applyPatchToNode(node, patch))

    set({ nodes: withRecomputedNodes(nextNodes, get().edges) })
  },

  setSelection: (nodeId, edgeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: edgeId })
  },

  deleteSelectedElements: () => {
    const { selectedNodeId, selectedEdgeId } = get()
    const nextNodes = selectedNodeId ? get().nodes.filter((node) => node.id !== selectedNodeId) : get().nodes
    const nextEdges = get().edges.filter((edge) => edge.id !== selectedEdgeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId)
    set({
      nodes: withRecomputedNodes(nextNodes, nextEdges),
      edges: nextEdges,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },

  openContextMenu: (clientX, clientY, sourceNodeId, isConnectionMenu) => {
    set({
      contextMenu: {
        visible: true,
        clientX,
        clientY,
        sourceNodeId,
        isConnectionMenu: isConnectionMenu ?? false,
      },
    })
  },

  closeContextMenu: () => {
    set({ contextMenu: EMPTY_CONTEXT_MENU })
  },

  createNodeAndConnect: (sourceNodeId, targetNodeType, position) => {
    const sourceNode = get().nodes.find((node) => node.id === sourceNodeId)
    if (!sourceNode) {
      return
    }

    // Create the new node
    const newNode = createNodeFactory(targetNodeType, position)

    // Validate connection
    if (!canConnectNodes(sourceNode.type, targetNodeType)) {
      return
    }

    const relationType = getConnectionRelation(sourceNode.type, targetNodeType)
    if (!relationType) {
      return
    }

    // For reference-image connections, check if target already has one
    const alreadyHasReferenceImage =
      relationType === 'reference-image' &&
      get().edges.some(
        (edge) =>
          edge.target === newNode.id &&
          edge.data?.relationType === 'reference-image',
      )

    if (alreadyHasReferenceImage) {
      return
    }

    // Create the edge connecting source to new node
    const newEdge: CanvasEdge = {
      id: buildEdgeId({
        source: sourceNodeId,
        target: newNode.id,
        sourceHandle: null,
        targetHandle: null,
      }),
      type: 'semantic',
      source: sourceNodeId,
      target: newNode.id,
      sourceHandle: null,
      targetHandle: null,
      data: {
        relationType,
        createdAt: Date.now(),
      },
      animated: relationType === 'reference-image',
      deletable: true,
      selectable: true,
      reconnectable: true,
    }

    const nextNodes = withRecomputedNodes([...get().nodes, newNode], [...get().edges, newEdge])
    const nextEdges = [...get().edges, newEdge]

    set({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeId: newNode.id,
      selectedEdgeId: null,
      contextMenu: EMPTY_CONTEXT_MENU,
    })
  },

  setViewport: (viewport) => {
    const currentViewport = get().viewport
    if (isSameViewport(currentViewport, viewport)) {
      return
    }

    set({ viewport })
  },

  saveGraph: (viewport) => {
    const state = get()
    const nextViewport = viewport ?? state.viewport
    persistGraph(serializeGraph(state.nodes, state.edges, nextViewport))

    if (!isSameViewport(state.viewport, nextViewport)) {
      set({ viewport: nextViewport })
    }
  },

  hydrateGraph: () => {
    if (get().hydrated) {
      return
    }

    const persisted = loadPersistedGraph()
    if (!persisted) {
      set({ hydrated: true })
      return
    }

    set({
      nodes: withRecomputedNodes(persisted.nodes, persisted.edges),
      edges: persisted.edges,
      viewport: persisted.viewport,
      hydrated: true,
    })
  },

  resetToSavedGraph: () => {
    const persisted = loadPersistedGraph()
    if (!persisted) {
      set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null })
      return
    }

    set({
      nodes: withRecomputedNodes(persisted.nodes, persisted.edges),
      edges: persisted.edges,
      viewport: persisted.viewport,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },

  runNode: async (nodeId) => {
    const state = get()
    const node = state.nodes.find((item) => item.id === nodeId)
    if (
      !node ||
      (node.type !== CANVAS_NODE_TYPES.image &&
        node.type !== CANVAS_NODE_TYPES.video &&
        node.type !== CANVAS_NODE_TYPES.agent)
    ) {
      return
    }

    const normalizedPrompt = node.data.finalPrompt.trim()
    if (!normalizedPrompt) {
      get().updateNodeData(nodeId, {
        status: 'error',
        errorMessage: '请先填写提示词，或连接至少一个文本节点。',
      })
      return
    }

    if (node.type === CANVAS_NODE_TYPES.image) {
      get().updateNodeData(nodeId, {
        status: 'queued',
        progress: 0,
        errorMessage: undefined,
      })

      const hasReferenceEdge = state.edges.some(
        (edge) => edge.target === nodeId && edge.data?.relationType === 'reference-image',
      )

      if (hasReferenceEdge && node.data.referenceImageUrls.length === 0) {
        get().updateNodeData(nodeId, {
          status: 'error',
          errorMessage: '当前已连接图片节点，但上游图片尚未生成成功，无法作为参考图。',
        })
        return
      }

      const response = (await createImageGeneration({
        model: node.data.model,
        prompt: normalizedPrompt,
        size: node.data.size,
        n: node.data.count,
        image_urls: node.data.referenceImageUrls.length > 0 ? node.data.referenceImageUrls : undefined,
        metadata: {
          resolution: node.data.resolution,
          orientation: node.data.orientation,
        },
      })) as ImageGenerationResponse

      get().updateNodeData(nodeId, {
        status: response.status === 'failed' ? 'error' : 'running',
        progress: response.progress ?? 0,
        taskId: response.id,
        errorMessage: response.error?.message,
      })

      if (response.status === 'failed') {
        return
      }

      await pollImageGeneration(response.id, nodeId)
      return
    }

    if (node.type === CANVAS_NODE_TYPES.agent) {
      get().updateNodeData(nodeId, {
        status: 'queued',
        progress: 0,
        errorMessage: undefined,
      })

      try {
        get().updateNodeData(nodeId, {
          status: 'running',
          progress: 25,
        })

        const response = await createChatCompletion({
          // model: node.data.model || TEXT_MODELS[0]?.model,
          // TODO: 目前先固定使用 deepseek-v3.2，后续根据 agentType 支持更多模型
          model: 'deepseek-v3.2',
          messages: [
            {
              role: 'system',
              content: PROMPT_ROLE_DEFINITION,
            },
            {
              role: 'user',
              content: buildNovelToScriptPrompt(node.data.finalPrompt),
            },
          ],
          temperature: 0.6,
        })

        const generatedText = extractChatText(response)
        if (!generatedText) {
          get().updateNodeData(nodeId, {
            status: 'error',
            progress: 0,
            errorMessage: '智能体未返回有效文本，请稍后重试。',
          })
          message.error('智能体未返回有效文本，请稍后重试。')
          return
        }

        const freshState = get()
        const refreshedAgent = freshState.nodes.find((item) => item.id === nodeId)
        if (!refreshedAgent || refreshedAgent.type !== CANVAS_NODE_TYPES.agent) {
          return
        }

        const resultTextNode = createNodeFactory(CANVAS_NODE_TYPES.text, {
          x: refreshedAgent.position.x + 360 + Math.random() * 60,
          y: refreshedAgent.position.y + (Math.random() * 160 - 80),
        })

        const completedAgentNodes = replaceNode(freshState.nodes, nodeId, (currentNode) => {
          if (currentNode.type !== CANVAS_NODE_TYPES.agent) {
            return currentNode
          }

          return applyPatchToNode(currentNode, {
            status: 'success',
            progress: 100,
            outputText: generatedText,
            errorMessage: undefined,
          })
        })

        const nextNodes = withRecomputedNodes(
          replaceNode([...completedAgentNodes, resultTextNode], resultTextNode.id, (textNode) => {
            if (textNode.type !== CANVAS_NODE_TYPES.text) {
              return textNode
            }

            return applyPatchToNode(textNode, {
              title: '剧本结果',
              content: generatedText,
            })
          }),
          freshState.edges,
        )

        const relationType = getConnectionRelation(CANVAS_NODE_TYPES.agent, CANVAS_NODE_TYPES.text)
        const nextEdges = relationType
          ? (addEdge(
              {
                id: buildEdgeId({
                  source: nodeId,
                  target: resultTextNode.id,
                  sourceHandle: null,
                  targetHandle: null,
                }),
                sourceHandle: null,
                targetHandle: null,
                type: 'semantic',
                source: nodeId,
                target: resultTextNode.id,
                data: {
                  relationType,
                  createdAt: Date.now(),
                },
                animated: false,
                deletable: true,
                selectable: true,
                reconnectable: true,
              },
              freshState.edges,
            ) as CanvasEdge[])
          : freshState.edges

        set({
          nodes: withRecomputedNodes(nextNodes, nextEdges),
          edges: nextEdges,
          selectedNodeId: resultTextNode.id,
          selectedEdgeId: null,
        })

        message.success('剧本生成完成，已创建结果文本节点。')
      } catch {
        get().updateNodeData(nodeId, {
          status: 'error',
          progress: 0,
          errorMessage: '智能体执行失败，请检查网络或稍后重试。',
        })
        message.error('智能体执行失败，请检查网络或稍后重试。')
      }

      return
    }

    const hasReferenceEdge = state.edges.some(
      (edge) => edge.target === nodeId && edge.data?.relationType === 'reference-image',
    )

    if (hasReferenceEdge && node.data.referenceImageUrls.length === 0) {
      get().updateNodeData(nodeId, {
        status: 'error',
        errorMessage: '当前已连接图片节点，但上游图片尚未生成成功，无法作为参考图。',
      })
      return
    }

    get().updateNodeData(nodeId, {
      status: 'queued',
      progress: 0,
      errorMessage: undefined,
    })

    const response = (await createVideoGeneration({
      model: node.data.model,
      prompt: normalizedPrompt,
      duration: node.data.duration,
      aspect_ratio: node.data.aspectRatio,
      image_urls: node.data.referenceImageUrls.length > 0 ? node.data.referenceImageUrls : undefined,
      metadata: {
        resolution: node.data.resolution,
        audio: node.data.audio,
        camerafixed: node.data.cameraFixed,
      },
    })) as { id: string; status?: string; progress?: number; error?: { message?: string } }

    get().updateNodeData(nodeId, {
      status: response.status === 'failed' ? 'error' : 'running',
      progress: response.progress ?? 0,
      taskId: response.id,
      errorMessage: response.error?.message,
    })

    if (response.status === 'failed') {
      return
    }

    await pollVideoGeneration(response.id, nodeId)
  },
}))
