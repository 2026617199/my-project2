import { useCallback, useRef, useState } from 'react'
import {
    ReactFlowProvider,
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type FinalConnectionState,
    type InternalNode,
    useReactFlow,
} from '@xyflow/react'

import { NoteNode } from './CustomNodes/NoteNode'
import { ImageNode } from './CustomNodes/ImageNode'
import { VideoNode } from './CustomNodes/VideoNode'
import { AgentNode } from './CustomNodes/AgentNode'
import { FloatingSidebar } from './components/FloatingSidebar'
import { CanvasContextMenu, type CanvasNodeType } from './components/CanvasContextMenu'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { AgentPresetId } from '@/constants/agent-presets'

import type {
    AllNodeType,
    EdgeType
} from "@/types/flow";
// import DevTools from './DevTools'

/**
 * 自定义节点类型映射
 * 以模块级常量定义，避免高频渲染时重复创建对象
 * 支持四种节点类型：noteNode、imageNode、videoNode、agentNode
 */
const nodeTypes = {
    noteNode: NoteNode,
    imageNode: ImageNode,
    videoNode: VideoNode,
    agentNode: AgentNode,
}

const assistantActionToPresetId: Record<string, AgentPresetId> = {
    'novel-to-script-agent': 'novel-to-script-agent',
    'short-video-script-agent': 'short-video-script-agent',
}

// 画布流组件：仅负责 ReactFlow 相关状态与渲染。
const CanvasFlow = () => {
    // 通过 zustand 读取图状态，避免业务动作散落在多个组件。
    const nodes = useCanvasFlowStore((state) => state.nodes)
    const edges = useCanvasFlowStore((state) => state.edges)
    const onNodesChange = useCanvasFlowStore((state) => state.onNodesChange)
    const onEdgesChange = useCanvasFlowStore((state) => state.onEdgesChange)
    const onConnect = useCanvasFlowStore((state) => state.onConnect)
    const addNode = useCanvasFlowStore((state) => state.addNode)
    const { screenToFlowPosition } = useReactFlow<AllNodeType, EdgeType>()

    const contextMenuTriggerRef = useRef<HTMLDivElement | null>(null)
    const [menuScreenPosition, setMenuScreenPosition] = useState({ x: 0, y: 0 })
    const pendingConnectRef = useRef<{
        nodeId: string
        handleId: string | null
        handleType: 'source' | 'target'
    } | null>(null)

    const openContextMenuAt = useCallback((x: number, y: number) => {
        setMenuScreenPosition({ x, y })
        const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
        })
        contextMenuTriggerRef.current?.dispatchEvent(contextMenuEvent)
    }, [])

    const handlePaneContextMenu = useCallback((event) => {
        pendingConnectRef.current = null
        setMenuScreenPosition({ x: event.clientX, y: event.clientY })
    }, [])

    const handleConnectStart = useCallback((_, params) => {
        if (!params?.nodeId || !params?.handleType) {
            pendingConnectRef.current = null
            return
        }

        pendingConnectRef.current = {
            nodeId: params.nodeId,
            handleId: params.handleId ?? null,
            handleType: params.handleType,
        }
    }, [])

    const handleConnectEnd = useCallback(
        (
            event: MouseEvent | TouchEvent,
            connectionState: FinalConnectionState<InternalNode>
        ) => {
            if (connectionState.isValid) {
                pendingConnectRef.current = null
                return
            }

            if (event.target instanceof Element && !event.target.closest('.react-flow__pane')) {
                pendingConnectRef.current = null
                return
            }

            const pointer = 'changedTouches' in event ? event.changedTouches[0] : event
            if (!pointer) {
                pendingConnectRef.current = null
                return
            }

            openContextMenuAt(pointer.clientX, pointer.clientY)
        },
        [openContextMenuAt]
    )

    const handleCreateNodeFromMenu = useCallback(
        (nodeType: CanvasNodeType) => {
            const flowPosition = screenToFlowPosition(menuScreenPosition)
            const newNodeId = addNode(nodeType, flowPosition)

            const pendingConnect = pendingConnectRef.current
            if (!pendingConnect) {
                return
            }

            if (pendingConnect.handleType === 'source') {
                onConnect({
                    source: pendingConnect.nodeId,
                    sourceHandle: pendingConnect.handleId ?? 'output',
                    target: newNodeId,
                    targetHandle: 'input',
                })
            } else {
                onConnect({
                    source: newNodeId,
                    sourceHandle: 'output',
                    target: pendingConnect.nodeId,
                    targetHandle: pendingConnect.handleId ?? 'input',
                })
            }

            pendingConnectRef.current = null
        },
        [addNode, menuScreenPosition, onConnect, screenToFlowPosition]
    )

    // console.log("CanvasFlow 重新渲染")
    // 说明：连接事件由 store action 处理，这里不再创建局部回调。
    return (
        <CanvasContextMenu onCreateNode={handleCreateNodeFromMenu}>
            <div ref={contextMenuTriggerRef} className="h-full w-full">
                <ReactFlow<AllNodeType, EdgeType>
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onConnectStart={handleConnectStart}
                    onPaneContextMenu={handlePaneContextMenu}
                    onConnectEnd={handleConnectEnd}
                    nodeTypes={nodeTypes}
                    nodesDraggable
                    fitView
                >
                    <Background />
                    <Controls />
                    <MiniMap pannable zoomable />
                    {/* <DevTools /> */}
                </ReactFlow>
            </div>
        </CanvasContextMenu>
    )
}

// 外部组件 - 提供 ReactFlowProvider
const CanvasPage = () => {
    const addNode = useCanvasFlowStore((state) => state.addNode)

    // 侧边栏动作处理：保留页面层调度，避免与高频画布渲染耦合。
    const handleSidebarAction = useCallback((actionId: string) => {
        switch (actionId) {
            case 'create-note':
                addNode('note')
                break
            case 'create-image':
                addNode('image')
                break
            case 'create-video':
                addNode('video')
                break
            default:
                if (assistantActionToPresetId[actionId]) {
                    addNode('agent', undefined, { agentPresetId: assistantActionToPresetId[actionId] })
                }
                break
        }
    }, [addNode])

    return (
        <ReactFlowProvider>
            <div className="h-screen w-screen">
                <CanvasFlow />

                {/* 悬浮侧边栏：与 CanvasFlow 同级，避免节点移动时不必要重渲染。 */}
                <FloatingSidebar onAction={handleSidebarAction} />
            </div>
        </ReactFlowProvider>
    )
}

export default CanvasPage
