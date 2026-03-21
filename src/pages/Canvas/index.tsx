import { useCallback } from 'react'
import {
    ReactFlowProvider,
    ReactFlow,
    Background,
    Controls,
    MiniMap,
} from '@xyflow/react'

import { NoteNode } from './CustomNodes/NoteNode'
import { FloatingSidebar } from './components/FloatingSidebar'
import { useCanvasFlowStore } from '@/store/canvasFlowStore'

import type {
    AllNodeType,
    EdgeType
} from "@/types/flow";

// 自定义节点映射：以模块级常量定义，避免高频渲染时重复创建对象。
const nodeTypes = {
    noteNode: NoteNode,
}

// 画布流组件：仅负责 ReactFlow 相关状态与渲染。
const CanvasFlow = () => {
    // 通过 zustand 读取图状态，避免业务动作散落在多个组件。
    const nodes = useCanvasFlowStore((state) => state.nodes)
    const edges = useCanvasFlowStore((state) => state.edges)
    const onNodesChange = useCanvasFlowStore((state) => state.onNodesChange)
    const onEdgesChange = useCanvasFlowStore((state) => state.onEdgesChange)
    const onConnect = useCanvasFlowStore((state) => state.onConnect)

    console.log("CanvasFlow 重新渲染")
    // 说明：连接事件由 store action 处理，这里不再创建局部回调。
    return (
        <ReactFlow<AllNodeType, EdgeType>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            nodesDraggable
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
    const addNoteNode = useCanvasFlowStore((state) => state.addNoteNode)

    // 侧边栏动作处理：保留页面层调度，避免与高频画布渲染耦合。
    const handleSidebarAction = useCallback((actionId: string) => {
        if (actionId === 'create') {
            addNoteNode()
            return
        }
    }, [addNoteNode])

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
