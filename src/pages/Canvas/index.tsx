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
    ControlButton,
} from '@xyflow/react'

import { NoteNode } from './CustomNodes/NoteNode'
import { ImageNode } from './CustomNodes/ImageNode'
import { VideoNode } from './CustomNodes/VideoNode'
import { AgentNode } from './CustomNodes/AgentNode'
import { FloatingSidebar } from './components/FloatingSidebar'
import { CanvasChatToolbar } from './components/CanvasChatToolbar'
import { CanvasContextMenu, type CanvasNodeType } from './components/CanvasContextMenu'
import { ChatDrawer } from './components/ChatDrawer'
import { NO_CHAT_PERSONA_ID } from '@/constants/chat-personas'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { AgentPresetId } from '@/constants/agent-presets'
import { useCanvasChat } from '@/hooks/useCanvasChat'
import type { ChatPersonaId } from '@/types/NoteGeneration'

import type {
    AllNodeType,
    EdgeType
} from "@/types/flow";
import { Eye, EyeOff } from 'lucide-react'

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
    const [isMiniMapVisible, setIsMiniMapVisible] = useState(true)
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
                    minZoom={0.2}
                    maxZoom={2}
                >
                    <Background />
                    <Controls>
                        <ControlButton onClick={() => setIsMiniMapVisible((prev) => !prev)}>
                            {isMiniMapVisible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                        </ControlButton>
                    </Controls>
                    {isMiniMapVisible ? <MiniMap pannable zoomable position='bottom-left' style={{ left: '48px' }} /> : null}
                </ReactFlow>
            </div>
        </CanvasContextMenu>
    )
}

const CanvasSidebar = () => {
    const addNode = useCanvasFlowStore((state) => state.addNode)
    const { screenToFlowPosition } = useReactFlow<AllNodeType, EdgeType>()

    const handleSidebarAction = useCallback((actionId: string) => {
        const centerFlowPosition = screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        })

        switch (actionId) {
            case 'create-note':
                addNode('note', centerFlowPosition)
                break
            case 'create-image':
                addNode('image', centerFlowPosition)
                break
            case 'create-video':
                addNode('video', centerFlowPosition)
                break
            default:
                if (assistantActionToPresetId[actionId]) {
                    addNode('agent', centerFlowPosition, {
                        agentPresetId: assistantActionToPresetId[actionId],
                    })
                }
                break
        }
    }, [addNode, screenToFlowPosition])

    return <FloatingSidebar onAction={handleSidebarAction} />
}

// 外部组件 - 提供 ReactFlowProvider
const CanvasPage = () => {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [selectedPersonaId, setSelectedPersonaId] = useState<ChatPersonaId>(NO_CHAT_PERSONA_ID)
    const { messages, isLoading, sendMessage } = useCanvasChat()

    return (
        <ReactFlowProvider>
            <div className="h-screen w-screen">
                <CanvasFlow />

                {/* 悬浮侧边栏：与 CanvasFlow 同级，避免节点移动时不必要重渲染。 */}
                <CanvasSidebar />

                {/* 右下圆形聊天工具栏：负责打开抽屉与切换 system 人设。 */}
                <CanvasChatToolbar
                    selectedPersonaId={selectedPersonaId}
                    onSelectPersona={setSelectedPersonaId}
                    onOpenChat={() => setIsChatOpen(true)}
                    isChatOpen={isChatOpen}
                />

                {/* 右侧抽屉聊天窗口：统一走 createChatCompletion，并使用 idb-keyval 持久化会话。 */}
                <ChatDrawer
                    open={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    messages={messages}
                    isLoading={isLoading}
                    personaId={selectedPersonaId}
                    onSend={sendMessage}
                />
            </div>
        </ReactFlowProvider>
    )
}

export default CanvasPage
