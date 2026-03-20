import { useCallback } from 'react'
import {
    ReactFlowProvider,
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
} from '@xyflow/react'

import { FloatingSidebar } from './components/FloatingSidebar'

import type {
    AllNodeType,
    EdgeType
} from "@/types/flow";

// 初始节点数据
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
]

// 初始边数据
const initialEdges: EdgeType[] = [
    {
        id: 'e1-2',
        source: '1',
        target: '2',
    },
]

// 画布流组件：仅负责 ReactFlow 相关状态与渲染。
const CanvasFlow = () => {
    // 节点状态
    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    // 边状态
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    // 处理连接事件
    const onConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) => addEdge(connection, eds))
        },
        [setEdges]
    )

    return (
        <ReactFlow<AllNodeType, EdgeType>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
        >
            <Background />
            <Controls />
            <MiniMap />
        </ReactFlow>
    )
}

// 外部组件 - 提供 ReactFlowProvider
const CanvasPage = () => {
    // 侧边栏动作占位：放在页面层，避免被画布节点高频状态更新牵连。
    const handleSidebarAction = useCallback((actionId: string) => {
        console.info(`[CanvasSidebar] TODO: implement action -> ${actionId}`)
    }, [])

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
