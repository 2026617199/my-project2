import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type FinalConnectionState,
    type InternalNode,
    useReactFlow,
    ControlButton,
} from '@xyflow/react'
import { Eye, EyeOff } from 'lucide-react'

import { nodeTypes } from '../constants/canvasConfig'
import { CanvasContextMenu, type CanvasNodeType } from './CanvasContextMenu'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'
import type { AllNodeType, EdgeType } from '@/types/flow'

// 画布流组件：仅负责 ReactFlow 相关状态与渲染。
export const CanvasFlow = () => {
    // 通过 zustand 读取图状态，避免业务动作散落在多个组件。
    const nodes = useCanvasFlowStore((state) => state.nodes)
    const edges = useCanvasFlowStore((state) => state.edges)
    const hydrated = useCanvasFlowStore((state) => state.hydrated)
    const onNodesChange = useCanvasFlowStore((state) => state.onNodesChange)
    const onEdgesChange = useCanvasFlowStore((state) => state.onEdgesChange)
    const onConnect = useCanvasFlowStore((state) => state.onConnect)
    const addNode = useCanvasFlowStore((state) => state.addNode)
    const hydrateGraph = useCanvasFlowStore((state) => state.hydrateGraph)
    const { screenToFlowPosition } = useReactFlow<AllNodeType, EdgeType>()

    // 页面加载时恢复数据
    useEffect(() => {
        hydrateGraph()
    }, [hydrateGraph])

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

    const handleConnectStart = useCallback(
        (_, params) => {
            if (!params?.nodeId || !params?.handleType) {
                pendingConnectRef.current = null
                return
            }

            pendingConnectRef.current = {
                nodeId: params.nodeId,
                handleId: params.handleId ?? null,
                handleType: params.handleType,
            }
        },
        []
    )

    const handleConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState<InternalNode>) => {
            if (connectionState.isValid) {
                pendingConnectRef.current = null
                return
            }

            // 防止用户在非画布区域释放连接线时意外触发菜单,比如在侧边栏或其他 UI 上。我觉得这个没有必要要，反而会有性能问题
            // if (event.target instanceof Element && !event.target.closest('.react-flow__pane')) {
            //     pendingConnectRef.current = null
            //     return
            // }

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
                    colorMode='dark'
                >
                    <Background />
                    <Controls>
                        <ControlButton onClick={() => setIsMiniMapVisible((prev) => !prev)}>
                            {isMiniMapVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </ControlButton>
                    </Controls>
                    {isMiniMapVisible ? (
                        <MiniMap pannable zoomable position="bottom-left" style={{ left: '48px' }} />
                    ) : null}
                </ReactFlow>
            </div>
        </CanvasContextMenu>
    )
}