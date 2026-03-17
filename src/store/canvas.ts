import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type XYPosition } from '@xyflow/react'
import { create } from 'zustand'

import {
  IMAGE_COUNTS,
  IMAGE_MODELS,
  IMAGE_ORIENTATIONS,
  IMAGE_RESOLUTIONS,
  IMAGE_SIZES,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATION_CONFIG,
  VIDEO_MODELS,
} from '@/constants/ai-models'
import {
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
}

const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1,
}

const POLL_INTERVAL = 3000

interface CanvasStoreState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  contextMenu: CanvasContextMenuState
  viewport: CanvasViewport
  hydrated: boolean
  createNode: (type: CanvasNodeType, position: XYPosition) => void
  applyNodeChanges: (changes: NodeChange<CanvasNode>[]) => void
  applyEdgeChanges: (changes: EdgeChange<CanvasEdge>[]) => void
  connectNodes: (connection: Connection) => void
  reconnectEdge: (oldEdge: CanvasEdge, connection: Connection) => void
  updateNodeData: (nodeId: string, patch: CanvasNodePatch) => void
  setSelection: (nodeId: string | null, edgeId: string | null) => void
  deleteSelectedElements: () => void
  openContextMenu: (clientX: number, clientY: number) => void
  closeContextMenu: () => void
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

  if (type === CANVAS_NODE_TYPES.text) {
    return {
      id,
      type,
      position,
      data: {
        ...baseData,
        title: '文本节点',
        content: '',
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
      resolution: IMAGE_RESOLUTIONS[0]?.value ?? '1K',
      hd: false,
      watermark: false,
      storyboard: false,
      style: undefined,
      referenceImageUrl: undefined,
      outputVideos: [],
    },
  }
}

function buildEdgeId(connection: Connection) {
  return `edge-${connection.source}-${connection.target}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function sortByCreatedAt<T extends { createdAt: number }>(items: T[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

function recomputeDerivedNodes(nodes: CanvasNode[], edges: CanvasEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  return nodes.map((node) => {
    if (node.type !== CANVAS_NODE_TYPES.image && node.type !== CANVAS_NODE_TYPES.video) {
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

    if (node.type === CANVAS_NODE_TYPES.image) {
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

    const referenceImageUrl = referenceEdges
      .map(({ edge }) => nodeMap.get(edge.source))
      .find((sourceNode): sourceNode is Extract<CanvasNode, { type: 'image' }> => sourceNode?.type === CANVAS_NODE_TYPES.image)
      ?.data.outputImages[0]?.url

    return {
      ...node,
      data: {
        ...node.data,
        promptSegments,
        finalPrompt,
        referenceImageUrl,
      },
    }
  })
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

function applyPatchToNode(node: CanvasNode, patch: CanvasNodePatch): CanvasNode {
  if (node.type === CANVAS_NODE_TYPES.text) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(patch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  if (node.type === CANVAS_NODE_TYPES.image) {
    return {
      ...node,
      data: {
        ...node.data,
        ...(patch as Partial<typeof node.data>),
        errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
      },
    }
  }

  return {
    ...node,
    data: {
      ...node.data,
      ...(patch as Partial<typeof node.data>),
      errorMessage: patch.errorMessage === undefined ? node.data.errorMessage : patch.errorMessage,
    },
  }
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
    const state = useCanvasStore.getState()
    const videoNode = state.nodes.find((node) => node.id === nodeId)

    if (!videoNode || videoNode.type !== CANVAS_NODE_TYPES.video) {
      return
    }

    const nextNodes = replaceNode(state.nodes, nodeId, (node) => {
      if (node.type !== CANVAS_NODE_TYPES.video) {
        return node
      }

      if (response.status === 'completed') {
        const outputVideos: GeneratedVideoResult[] =
          response.result?.data.map((item) => ({
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
        progress: response.progress,
      })
    })

    const recomputedNodes = withRecomputedNodes(nextNodes, state.edges)
    useCanvasStore.setState({ nodes: recomputedNodes })

    if (response.status === 'completed' || response.status === 'failed') {
      return
    }
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
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

  openContextMenu: (clientX, clientY) => {
    set({
      contextMenu: {
        visible: true,
        clientX,
        clientY,
      },
    })
  },

  closeContextMenu: () => {
    set({ contextMenu: EMPTY_CONTEXT_MENU })
  },

  setViewport: (viewport) => {
    set({ viewport })
  },

  saveGraph: (viewport) => {
    const state = get()
    const nextViewport = viewport ?? state.viewport
    persistGraph(serializeGraph(state.nodes, state.edges, nextViewport))
    set({ viewport: nextViewport })
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
    if (!node || (node.type !== CANVAS_NODE_TYPES.image && node.type !== CANVAS_NODE_TYPES.video)) {
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

      const response = (await createImageGeneration({
        model: node.data.model,
        prompt: normalizedPrompt,
        size: node.data.size,
        n: node.data.count,
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

    const hasReferenceEdge = state.edges.some(
      (edge) => edge.target === nodeId && edge.data?.relationType === 'reference-image',
    )

    if (hasReferenceEdge && !node.data.referenceImageUrl) {
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
      image_urls: node.data.referenceImageUrl ? [node.data.referenceImageUrl] : undefined,
      metadata: {
        hd: node.data.hd,
        watermark: node.data.watermark,
        storyboard: node.data.storyboard,
        style: node.data.style,
        resolution: node.data.resolution,
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
