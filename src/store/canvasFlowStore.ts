import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { create } from 'zustand'

import type { AllNodeType, EdgeType, NoteNodeData } from '@/types/flow'

type CanvasFlowState = {
  nodes: AllNodeType[]
  edges: EdgeType[]
  // 记录 note 节点的自增计数器
  noteIdCounter: number

  onNodesChange: (changes: NodeChange<AllNodeType>[]) => void
  onEdgesChange: (changes: EdgeChange<EdgeType>[]) => void
  onConnect: (connection: Connection) => void

  addNoteNode: () => void
  updateNoteNode: (nodeId: string, patch: Partial<NoteNodeData>) => void
  setNodeEditing: (nodeId: string, isEditing: boolean) => void
  duplicateNoteNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  // 直接更新 Node 级别的尺寸（width/height 由 React Flow 的 NodeResizer 使用）
  resizeNoteNode: (nodeId: string, width: number, height: number) => void
  // 自增获取新 note 节点 ID
  getNextNoteId: () => string
}

// 初始图数据：保留默认节点，兼容现有演示流程。
const initialNodes: AllNodeType[] = [
  {
    id: '1',
    position: { x: 100, y: 100 },
    data: { label: '节点 1' },
    type: 'default',
  },
  {
    id: '2',
    position: { x: 400, y: 100 },
    data: { label: '节点 2' },
    type: 'default',
  },
  {
    id: 'note-initial-1',
    type: 'noteNode',
    position: { x: 120, y: 280 },
    width: 280,
    height: 180,
    data: {
      content: '便签 1：可作为流程备注与上下文说明。',
      inputHandleId: 'input',
      outputHandleId: 'output',
      isEditing: false,
      createdAt: Date.now(),
    },
  },
  {
    id: 'note-initial-2',
    type: 'noteNode',
    position: { x: 520, y: 280 },
    width: 280,
    height: 180,
    data: {
      content: '便签 2：默认与便签 1 建立连接（output -> input）。',
      inputHandleId: 'input',
      outputHandleId: 'output',
      isEditing: false,
      createdAt: Date.now(),
    },
  },
]

const initialEdges: EdgeType[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
  {
    id: 'e-note-initial-1-note-initial-2',
    source: 'note-initial-1',
    target: 'note-initial-2',
    sourceHandle: 'output',
    targetHandle: 'input',
  },
]


export const useCanvasFlowStore = create<CanvasFlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  noteIdCounter: 3, // 初始已有 note-initial-1, note-initial-2

  getNextNoteId: () => {
    const current = get().noteIdCounter
    const nextId = `note-${current}`
    set({ noteIdCounter: current + 1 })
    return nextId
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as AllNodeType[],
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as EdgeType[],
    }))
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }))
  },

  addNoteNode: () => {
    const nextId = get().getNextNoteId()
    const currentNodes = get().nodes

    // 简单布局策略：相对最后一个节点做偏移，避免重叠。
    const lastNode = currentNodes[currentNodes.length - 1]
    const fallbackPosition = { x: 220, y: 180 }
    const nextPosition = lastNode
      ? {
        x: lastNode.position.x + 40,
        y: lastNode.position.y + 40,
      }
      : fallbackPosition

    const noteNode: AllNodeType = {
      id: nextId,
      type: 'noteNode',
      position: nextPosition,
      width: 280,
      height: 180,
      data: {
        content: '',
        inputHandleId: 'input',
        outputHandleId: 'output',
        isEditing: true,
        createdAt: Date.now(),
      },
    }

    set((state) => ({
      nodes: [...state.nodes, noteNode],
    }))
  },

  updateNoteNode: (nodeId, patch) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'noteNode') {
          return node
        }

        return {
          ...node,
          data: {
            ...node.data,
            ...patch,
          },
        }
      }) as AllNodeType[],
    }))
  },

  // TODO 全量map更新存在性能问题，后续可以考虑增量更新或局部状态管理优化。
  resizeNoteNode: (nodeId, width, height) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'noteNode') {
          return node
        }
        return { ...node, width, height }
      }) as AllNodeType[],
    }))
  },

  setNodeEditing: (nodeId, isEditing) => {
    get().updateNoteNode(nodeId, { isEditing })
  },

  duplicateNoteNode: (nodeId) => {
    const currentNode = get().nodes.find(
      (node) => node.id === nodeId && node.type === 'noteNode',
    )

    if (!currentNode || currentNode.type !== 'noteNode') {
      return
    }

    const duplicatedNode: AllNodeType = {
      // 复制节点信息，然后是后面的覆盖前面的属性
      ...currentNode,
      id: get().getNextNoteId(),
      position: {
        x: currentNode.position.x + 40,
        y: currentNode.position.y + 40,
      },
      data: {
        ...currentNode.data,
        isEditing: false,
        createdAt: Date.now(),
      },
    }

    set((state) => {
      return {
        nodes: [...state.nodes, duplicatedNode],
      }
    })
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    }))
  },
}))