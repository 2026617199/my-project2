import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { create } from 'zustand'

import { createImageGeneration, createVideoGeneration, getImageTaskStatus, getVideoTaskStatus } from '@/api/ai'
import { getAgentPresetById, type AgentPresetId } from '@/constants/agent-presets'
import type { AllNodeType, EdgeType, ImageGenerationNode, VideoGenerationNode } from '@/types/flow'
import { GenerationStatus } from '@/constants/enum'

// ==================== 持久化配置 ====================

const CANVAS_STORAGE_KEY = 'canvas-flow-data'
const CANVAS_STORAGE_VERSION = 1

type CanvasPersistedState = {
  version: number
  savedAt: number
  nodes: AllNodeType[]
  edges: EdgeType[]
  nodeIdCounters: { note: number; image: number; video: number; agent: number }
}

/**
 * 节点类型标识符
 */
type NodeType = 'note' | 'image' | 'video' | 'agent'
type NodePosition = { x: number; y: number }
type AddNodeOptions = {
  agentPresetId?: AgentPresetId
}

/**
 * 基于最后一个节点计算新节点位置
 */
const getNextNodePosition = (nodes: AllNodeType[]) => {
  const lastNode = nodes[nodes.length - 1]
  const fallbackPosition = { x: 220, y: 180 }

  return lastNode
    ? {
        x: lastNode.position.x + 40,
        y: lastNode.position.y + 40,
      }
    : fallbackPosition
}

type CanvasFlowState = {
  nodes: AllNodeType[]
  edges: EdgeType[]
  // 各类型节点的自增计数器
  nodeIdCounters: { note: number; image: number; video: number; agent: number }
  // 是否已完成数据恢复
  hydrated: boolean

  // === 基础流程事件 ===
  onNodesChange: (changes: NodeChange<AllNodeType>[]) => void
  onEdgesChange: (changes: EdgeChange<EdgeType>[]) => void
  onConnect: (connection: Connection) => void

  // === 持久化操作 ===
  /** 保存当前图状态到 localStorage */
  saveGraph: () => void
  /** 从 localStorage 恢复图状态 */
  hydrateGraph: () => void
  /** 重置到上次保存的状态 */
  resetToSavedGraph: () => void

  // === 通用节点操作 ===
  /** 获取下一个指定类型的节点 ID（自增） */
  getNextNodeId: (nodeType: NodeType) => string
  /** 创建节点 */
  addNode: (nodeType: NodeType, position?: NodePosition, options?: AddNodeOptions) => string
  /** 更新便签编辑态 */
  setNoteNodeEditing: (nodeId: string, isEditing: boolean) => void
  /** 更新便签内容 */
  updateNoteNodeContent: (nodeId: string, content: string) => void
  /** 调整便签节点尺寸 */
  resizeNoteNode: (nodeId: string, width: number, height: number) => void
  /** 复制节点 */
  duplicateNode: (nodeId: string) => void
  /** 删除节点及其关联边 */
  deleteNode: (nodeId: string) => void
  /** 更新图片节点数据（局部字段 patch） */
  updateImageNodeData: (nodeId: string, patch: Partial<ImageGenerationNode>) => void
  /** 创建图片生成任务并启动轮询 */
  startImageGeneration: (nodeId: string, payload: any) => Promise<void>
  /** 手动停止图片轮询（防止内存泄露） */
  stopImagePolling: (nodeId: string) => void
  /** 更新视频节点数据（局部字段 patch） */
  updateVideoNodeData: (nodeId: string, patch: Partial<VideoGenerationNode>) => void
  /** 创建视频生成任务并启动轮询 */
  startVideoGeneration: (nodeId: string, payload: any) => Promise<void>
  /** 手动停止视频轮询（防止内存泄露） */
  stopVideoPolling: (nodeId: string) => void
}

// ==================== 图片生成轮询支持 ====================

// 轮询频率（2 秒）
const IMAGE_POLL_INTERVAL = 2000
// 轮询控制器：用于中止旧轮询
const imagePollingControllers = new Map<string, AbortController>()
// 视频轮询频率（2 秒）
const VIDEO_POLL_INTERVAL = 2000
// 视频轮询控制器：用于中止旧轮询
const videoPollingControllers = new Map<string, AbortController>()

/**
 * 可中断等待函数
 */
const wait = (ms: number, signal?: AbortSignal) => {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, ms)

    const handleAbort = () => {
      window.clearTimeout(timer)
      resolve()
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

/**
 * 更新图片节点数据的通用辅助函数
 */
const updateImageNodeInList = (
  nodes: AllNodeType[],
  nodeId: string,
  updater: (data: ImageGenerationNode) => ImageGenerationNode
) => {
  return nodes.map((node) => {
    if (node.id !== nodeId || node.type !== 'imageNode') {
      return node
    }

    return {
      ...node,
      data: updater(node.data as ImageGenerationNode),
    }
  })
}

/**
 * 更新视频节点数据的通用辅助函数
 */
const updateVideoNodeInList = (
  nodes: AllNodeType[],
  nodeId: string,
  updater: (data: VideoGenerationNode) => VideoGenerationNode
) => {
  return nodes.map((node) => {
    if (node.id !== nodeId || node.type !== 'videoNode') {
      return node
    }

    return {
      ...node,
      data: updater(node.data as VideoGenerationNode),
    }
  })
}

/**
 * 停止某个节点的图片轮询
 */
const stopImagePollingInternal = (nodeId: string) => {
  const controller = imagePollingControllers.get(nodeId)
  if (controller) {
    controller.abort()
  }
  imagePollingControllers.delete(nodeId)
}

/**
 * 停止某个节点的视频轮询
 */
const stopVideoPollingInternal = (nodeId: string) => {
  const controller = videoPollingControllers.get(nodeId)
  if (controller) {
    controller.abort()
  }
  videoPollingControllers.delete(nodeId)
}

/**
 * 兼容多种视频响应结构，提取标准化结果
 */
const extractVideoResult = (response: any) => {
  if (response?.result?.data?.length) {
    return response.result
  }

  const metadataUrl = response?.metadata?.url
  if (metadataUrl) {
    return {
      type: 'video',
      data: [
        {
          url: metadataUrl,
          format: response?.metadata?.format ?? 'mp4',
        },
      ],
    }
  }

  return {
    type: 'video',
    data: [],
  }
}

/**
 * 图片生成轮询逻辑
 */
const pollImageGeneration = async (
  taskId: string,
  nodeId: string,
  signal: AbortSignal,
  setState: (updater: (state: CanvasFlowState) => Partial<CanvasFlowState>) => void,
  getState: () => CanvasFlowState
) => {
  try {
    while (true) {
      await wait(IMAGE_POLL_INTERVAL, signal)
      if (signal.aborted) {
        return
      }

      const response: any = await getImageTaskStatus(taskId)

      const currentNode = getState().nodes.find((node) => node.id === nodeId)
      if (!currentNode || currentNode.type !== 'imageNode') {
        stopImagePollingInternal(nodeId)
        return
      }

      setState((state) => ({
        nodes: updateImageNodeInList(state.nodes, nodeId, (data) => {
          if (response.status === 'completed') {
            return {
              ...data,
              status: GenerationStatus.COMPLETED,
              progress: 100,
              task_id: response.id ?? taskId,
              result: response.result,
              error: undefined,
            }
          }

          if (response.status === 'failed') {
            return {
              ...data,
              status: GenerationStatus.FAILED,
              progress: response.progress ?? 0,
              task_id: response.id ?? taskId,
              error: response.error ?? {
                code: 'UNKNOWN_ERROR',
                message: '生成失败，请稍后再试',
              },
            }
          }

          return {
            ...data,
            status: GenerationStatus.IN_PROGRESS,
            progress: response.progress ?? 0,
            task_id: response.id ?? taskId,
          }
        }),
      }))

      if (response.status === 'completed' || response.status === 'failed') {
        stopImagePollingInternal(nodeId)
        return
      }
    }
  } catch (pollError) {
    console.error('图片生成轮询失败:', pollError)
    stopImagePollingInternal(nodeId)
    setState((state) => ({
      nodes: updateImageNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        status: GenerationStatus.FAILED,
        error: {
          code: 'POLL_ERROR',
          message: '轮询失败，请稍后再试',
        },
      })),
    }))
  }
}

/**
 * 视频生成轮询逻辑
 */
const pollVideoGeneration = async (
  taskId: string,
  nodeId: string,
  signal: AbortSignal,
  setState: (updater: (state: CanvasFlowState) => Partial<CanvasFlowState>) => void,
  getState: () => CanvasFlowState
) => {
  try {
    while (true) {
      await wait(VIDEO_POLL_INTERVAL, signal)
      if (signal.aborted) {
        return
      }

      const response: any = await getVideoTaskStatus(taskId)

      const currentNode = getState().nodes.find((node) => node.id === nodeId)
      if (!currentNode || currentNode.type !== 'videoNode') {
        stopVideoPollingInternal(nodeId)
        return
      }

      setState((state) => ({
        nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => {
          if (response.status === 'completed') {
            return {
              ...data,
              status: GenerationStatus.COMPLETED,
              progress: 100,
              task_id: response.id ?? taskId,
              result: extractVideoResult(response),
              error: undefined,
            }
          }

          if (response.status === 'failed') {
            return {
              ...data,
              status: GenerationStatus.FAILED,
              progress: response.progress ?? 0,
              task_id: response.id ?? taskId,
              error: response.error ?? {
                code: 'UNKNOWN_ERROR',
                message: '生成失败，请稍后再试',
              },
            }
          }

          return {
            ...data,
            status: GenerationStatus.IN_PROGRESS,
            progress: response.progress ?? 0,
            task_id: response.id ?? taskId,
          }
        }),
      }))

      if (response.status === 'completed' || response.status === 'failed') {
        stopVideoPollingInternal(nodeId)
        return
      }
    }
  } catch (pollError) {
    console.error('视频生成轮询失败:', pollError)
    stopVideoPollingInternal(nodeId)
    setState((state) => ({
      nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        status: GenerationStatus.FAILED,
        error: {
          code: 'POLL_ERROR',
          message: '轮询失败，请稍后再试',
        },
      })),
    }))
  }
}

export const useCanvasFlowStore = create<CanvasFlowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeIdCounters: { note: 1, image: 1, video: 1, agent: 1 },
  hydrated: false,

  // ==================== 持久化方法实现 ====================

  /**
   * 保存当前图状态到 localStorage
   */
  saveGraph: () => {
    const state = get()
    const data: CanvasPersistedState = {
      version: CANVAS_STORAGE_VERSION,
      savedAt: Date.now(),
      nodes: state.nodes,
      edges: state.edges,
      nodeIdCounters: state.nodeIdCounters,
    }
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(data))
  },

  /**
   * 从 localStorage 恢复图状态
   */
  hydrateGraph: () => {
    if (get().hydrated) return

    try {
      const raw = localStorage.getItem(CANVAS_STORAGE_KEY)
      if (!raw) {
        set({ hydrated: true })
        return
      }

      const data = JSON.parse(raw) as CanvasPersistedState
      if (data.version !== CANVAS_STORAGE_VERSION) {
        set({ hydrated: true })
        return
      }

      set({
        nodes: data.nodes,
        edges: data.edges,
        nodeIdCounters: data.nodeIdCounters,
        hydrated: true,
      })
    } catch {
      set({ hydrated: true })
    }
  },

  /**
   * 重置到上次保存的状态
   */
  resetToSavedGraph: () => {
    try {
      const raw = localStorage.getItem(CANVAS_STORAGE_KEY)
      if (!raw) {
        set({ nodes: [], edges: [] })
        return
      }

      const data = JSON.parse(raw) as CanvasPersistedState
      if (data.version !== CANVAS_STORAGE_VERSION) {
        set({ nodes: [], edges: [] })
        return
      }

      set({
        nodes: data.nodes,
        edges: data.edges,
        nodeIdCounters: data.nodeIdCounters,
      })
    } catch {
      set({ nodes: [], edges: [] })
    }
  },

  // ==================== 通用方法实现 ====================

  /**
   * 获取下一个指定类型的节点 ID
    * @param nodeType 节点类型：'note' | 'image' | 'video' | 'agent'
   * @returns 新的节点 ID，如 'note-3', 'image-1' 等
   */
  getNextNodeId: (nodeType: NodeType) => {
    const current = get().nodeIdCounters[nodeType]
    const nextId = `${nodeType}-${current}`
    set((state) => ({
      nodeIdCounters: {
        ...state.nodeIdCounters,
        [nodeType]: current + 1,
      },
    }))
    return nextId
  },

  /**
   * 创建新节点（统一入口）
   */
  addNode: (nodeType: NodeType, position?: NodePosition, options?: AddNodeOptions) => {
    const nextId = get().getNextNodeId(nodeType)
    const currentNodes = get().nodes
    const nextPosition = position ?? getNextNodePosition(currentNodes)
    const agentPreset = getAgentPresetById(options?.agentPresetId)
    let newNode: AllNodeType

    if (nodeType === 'note') {
      newNode = {
        id: nextId,
        type: 'noteNode',
        position: nextPosition,
        width: 280,
        height: 180,
        data: {
          content: '',
          isEditing: true,
          createdAt: Date.now(),
        },
      }
    } else if (nodeType === 'image') {
      newNode = {
        id: nextId,
        type: 'imageNode',
        position: nextPosition,
        data: {
          model: 'dall-e-3',
          prompt: '',
          promptDraft: '',
          promptDraftHtml: '<p></p>',
          uploadedUrls: [],
          templateId: 'none',
          status: GenerationStatus.COMPLETED,
          progress: 0,
          result: {
            type: 'image',
            data: [],
          },
          createdAt: Date.now(),
        },
      }
    } else if (nodeType === 'agent') {
      newNode = {
        id: nextId,
        type: 'agentNode',
        position: nextPosition,
        data: {
          model: agentPreset.model,
          messages: [
            {
              role: 'system',
              content: agentPreset.systemPrompt,
            },
          ],
          agentPresetId: agentPreset.id,
          createdAt: Date.now(),
        },
      }
    } else {
      newNode = {
        id: nextId,
        type: 'videoNode',
        position: nextPosition,
        data: {
          model: 'genai-video',
          prompt: '',
          promptDraft: '',
          promptDraftHtml: '<p></p>',
          aspect_ratio: '16:9',
          uploadedUrls: [],
          templateId: 'none',
          status: GenerationStatus.COMPLETED,
          progress: 0,
          metadata: { size: '1280x720' },
          result: {
            type: 'video',
            data: [],
          },
          createdAt: Date.now(),
        },
      }
    }

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }))

    return nextId
  },

  /**
   * 更新便签节点编辑态
   */
  setNoteNodeEditing: (nodeId: string, isEditing: boolean) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'noteNode') {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            isEditing,
          },
        }
      }),
    }))
  },

  /**
   * 更新便签节点内容
   */
  updateNoteNodeContent: (nodeId: string, content: string) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'noteNode') {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            content,
          },
        }
      }),
    }))
  },

  /**
   * 调整便签节点尺寸
   * @param nodeId 便签节点 ID
   * @param width 新宽度
   * @param height 新高度
   */
  resizeNoteNode: (nodeId: string, width: number, height: number) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'noteNode') {
          return node
        }
        return { ...node, width, height }
      }),
    }))
  },

  /**
   * 复制节点
   * @param nodeId 要复制的节点 ID
   */
  duplicateNode: (nodeId: string) => {
    const currentNode = get().nodes.find((node) => node.id === nodeId)

    if (!currentNode) {
      return
    }

    // 识别节点类型
    let nodeType: NodeType = 'note'
    if (currentNode.type === 'imageNode') {
      nodeType = 'image'
    } else if (currentNode.type === 'videoNode') {
      nodeType = 'video'
    } else if (currentNode.type === 'agentNode') {
      nodeType = 'agent'
    }

    const newId = get().getNextNodeId(nodeType)
    let duplicatedNode: AllNodeType

    if (currentNode.type === 'noteNode') {
      duplicatedNode = {
        id: newId,
        type: currentNode.type,
        position: {
          x: currentNode.position.x + 40,
          y: currentNode.position.y + 40,
        },
        width: currentNode.width,
        height: currentNode.height,
        data: {
          ...currentNode.data,
          isEditing: false,
          createdAt: Date.now(),
        },
        selected: false,
        dragging: false,
      }
    } else {
      duplicatedNode = {
        id: newId,
        type: currentNode.type,
        position: {
          x: currentNode.position.x + 40,
          y: currentNode.position.y + 40,
        },
        data: {
          ...currentNode.data,
          createdAt: Date.now(),
        },
      }
    }

    set((state) => {
      const nodes = state.nodes.map((node) => ({
        ...node,
        selected: false,
      }))

      return {
        nodes: [
          ...nodes,
          {
            ...duplicatedNode,
            selected: true,
            dragging: false,
          },
        ],
      }
    })
  },

  /**
   * 删除节点及其关联的所有边
   * @param nodeId 要删除的节点 ID
   */
  deleteNode: (nodeId: string) => {
    const targetNode = get().nodes.find((node) => node.id === nodeId)
    if (targetNode?.type === 'imageNode') {
      stopImagePollingInternal(nodeId)
    }
    if (targetNode?.type === 'videoNode') {
      stopVideoPollingInternal(nodeId)
    }
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }))
  },

  /**
   * 更新图片节点数据（局部 patch）
   */
  updateImageNodeData: (nodeId, patch) => {
    set((state) => ({
      nodes: updateImageNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        ...patch,
      })),
    }))
  },

  /**
   * 创建图片生成任务并启动轮询
   */
  startImageGeneration: async (nodeId, payload) => {
    // 先中止旧轮询，避免并发任务冲突
    stopImagePollingInternal(nodeId)

    // 更新节点输入参数与状态
    set((state) => ({
      nodes: updateImageNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        ...payload,
        status: GenerationStatus.QUEUED,
        progress: 0,
        error: undefined,
        result: {
          type: 'image',
          data: [],
        },
      })),
    }))

    try {
      const response: any = await createImageGeneration(payload)
      const taskId = response?.id

      if (!taskId) {
        throw new Error('任务 ID 为空')
      }

      // 标记为生成中并记录任务 ID
      set((state) => ({
        nodes: updateImageNodeInList(state.nodes, nodeId, (data) => ({
          ...data,
          task_id: taskId,
          status: GenerationStatus.IN_PROGRESS,
          progress: response?.progress ?? 0,
        })),
      }))

      const controller = new AbortController()
      imagePollingControllers.set(nodeId, controller)
      pollImageGeneration(taskId, nodeId, controller.signal, set, get)
    } catch (startError) {
      console.error('创建图片生成任务失败:', startError)
      set((state) => ({
        nodes: updateImageNodeInList(state.nodes, nodeId, (data) => ({
          ...data,
          status: GenerationStatus.FAILED,
          error: {
            code: 'CREATE_TASK_FAILED',
            message: '创建任务失败，请稍后再试',
          },
        })),
      }))
      throw startError
    }
  },

  /**
   * 手动停止图片轮询
   */
  stopImagePolling: (nodeId) => {
    stopImagePollingInternal(nodeId)
  },

  /**
   * 更新视频节点数据（局部 patch）
   */
  updateVideoNodeData: (nodeId, patch) => {
    set((state) => ({
      nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        ...patch,
      })),
    }))
  },

  /**
   * 创建视频生成任务并启动轮询
   */
  startVideoGeneration: async (nodeId, payload) => {
    // 先中止旧轮询，避免并发任务冲突
    stopVideoPollingInternal(nodeId)

    // 更新节点输入参数与状态
    set((state) => ({
      nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => ({
        ...data,
        ...payload,
        status: GenerationStatus.QUEUED,
        progress: 0,
        error: undefined,
        result: {
          type: 'video',
          data: [],
        },
      })),
    }))

    try {
      const response: any = await createVideoGeneration(payload)
      const taskId = response?.id

      if (!taskId) {
        throw new Error('任务 ID 为空')
      }

      // 标记为生成中并记录任务 ID
      set((state) => ({
        nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => ({
          ...data,
          task_id: taskId,
          status: GenerationStatus.IN_PROGRESS,
          progress: response?.progress ?? 0,
        })),
      }))

      const controller = new AbortController()
      videoPollingControllers.set(nodeId, controller)
      pollVideoGeneration(taskId, nodeId, controller.signal, set, get)
    } catch (startError) {
      console.error('创建视频生成任务失败:', startError)
      set((state) => ({
        nodes: updateVideoNodeInList(state.nodes, nodeId, (data) => ({
          ...data,
          status: GenerationStatus.FAILED,
          error: {
            code: 'CREATE_TASK_FAILED',
            message: '创建任务失败，请稍后再试',
          },
        })),
      }))
      throw startError
    }
  },

  /**
   * 手动停止视频轮询
   */
  stopVideoPolling: (nodeId) => {
    stopVideoPollingInternal(nodeId)
  },

  // ==================== 流程事件处理 ====================

  /**
   * 处理节点变化事件（位置、尺寸、删除等）
   */
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }))
  },

  /**
   * 处理边变化事件
   */
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },

  /**
   * 处理新连接创建事件
   */
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }))
  },
}))