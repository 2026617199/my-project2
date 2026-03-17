import { useCallback, useEffect, useState } from 'react'
import {
    Background,
    BackgroundVariant,
    ColorMode,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react'
import { Layout } from 'antd'

import { CanvasActionBar } from './components/CanvasActionBar'
import { CanvasContextMenu } from './components/CanvasContextMenu'
import { CanvasHeader } from './components/CanvasHeader'
import { canvasEdgeTypes } from './CustomEdges'
import { canvasNodeTypes } from './CustomNodes'
import { useCanvasConnection } from './hooks/useCanvasConnection'
import { useCanvasContextMenu } from './hooks/useCanvasContextMenu'
import { useCanvasViewportSync } from './hooks/useCanvasViewportSync'

import CanvasLeftToolbar from '@/components/CanvasLeftToolbar'
import { useCanvasStore } from '@/store/canvas'
import { CANVAS_NODE_TYPES, type CanvasEdge, type CanvasNode } from '@/types/canvas'

// 外部组件 - 提供 ReactFlowProvider 和工具栏
export default function CanvasPage() {
    const [colorMode, setColorMode] = useState<ColorMode>('light')
    const [paneClickDistance, setPaneClickDistance] = useState<number>(1)

    return (
        <Layout className="h-screen w-screen overflow-hidden">
            <CanvasHeader
                colorMode={colorMode}
                paneClickDistance={paneClickDistance}
                onColorModeChange={setColorMode}
                onPaneClickDistanceChange={setPaneClickDistance}
            />

            <ReactFlowProvider>
                <CanvasEditor colorMode={colorMode} paneClickDistance={paneClickDistance} />
            </ReactFlowProvider>
        </Layout>
    )
}

function CanvasEditor({ colorMode, paneClickDistance }: { colorMode: ColorMode; paneClickDistance: number }) {
    const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
    const nodes = useCanvasStore((state) => state.nodes)
    const edges = useCanvasStore((state) => state.edges)
    const contextMenu = useCanvasStore((state) => state.contextMenu)
    const viewport = useCanvasStore((state) => state.viewport)
    const applyNodeChanges = useCanvasStore((state) => state.applyNodeChanges)
    const applyEdgeChanges = useCanvasStore((state) => state.applyEdgeChanges)
    const connectNodes = useCanvasStore((state) => state.connectNodes)
    const reconnectExistingEdge = useCanvasStore((state) => state.reconnectEdge)
    const createNode = useCanvasStore((state) => state.createNode)
    const createNodeAtRandom = useCanvasStore((state) => state.createNodeAtRandom)
    const createNodeAndConnect = useCanvasStore((state) => state.createNodeAndConnect)
    const openContextMenu = useCanvasStore((state) => state.openContextMenu)
    const closeContextMenu = useCanvasStore((state) => state.closeContextMenu)
    const setSelection = useCanvasStore((state) => state.setSelection)
    const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements)
    const setViewport = useCanvasStore((state) => state.setViewport)
    const saveGraph = useCanvasStore((state) => state.saveGraph)
    const hydrateGraph = useCanvasStore((state) => state.hydrateGraph)
    const resetToSavedGraph = useCanvasStore((state) => state.resetToSavedGraph)

    useEffect(() => {
        hydrateGraph()
    }, [hydrateGraph])

    const { isProgrammaticViewportSyncRef } = useCanvasViewportSync({ reactFlow, viewport })

    const {
        allowedConnectionTargetTypes,
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        isValidConnection,
        suppressNextPaneClickRef,
    } = useCanvasConnection({
        nodes,
        edges,
        contextMenuSourceNodeId: contextMenu.sourceNodeId,
        connectNodes,
        openContextMenu,
    })

    const { handleCreateNode, handlePaneContextMenu } = useCanvasContextMenu({
        contextMenu,
        allowedConnectionTargetTypes,
        reactFlow,
        openContextMenu,
        closeContextMenu,
        setSelection,
        createNode,
        createNodeAndConnect,
    })

    const handleSave = useCallback(() => {
        saveGraph(reactFlow.getViewport())
    }, [reactFlow, saveGraph])

    const handleCreateFromToolbar = useCallback(
        (type: keyof typeof CANVAS_NODE_TYPES) => {
            createNodeAtRandom(type)
        },
        [createNodeAtRandom],
    )

    return (
        <div className="relative h-[calc(100vh-65px)] w-full">
            <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2 sm:left-4">
                <CanvasLeftToolbar
                    onCreateNode={handleCreateFromToolbar}
                    onCreateNovelAgent={() => createNodeAtRandom(CANVAS_NODE_TYPES.agent)}
                />
            </div>

            <CanvasActionBar onReset={resetToSavedGraph} onSave={handleSave} />

            <ReactFlow<CanvasNode, CanvasEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={canvasNodeTypes}
                edgeTypes={canvasEdgeTypes}
                colorMode={colorMode}
                paneClickDistance={paneClickDistance}
                fitView
                nodesConnectable
                edgesReconnectable
                deleteKeyCode={['Delete', 'Backspace']}
                multiSelectionKeyCode={['Meta', 'Control']}
                onNodesChange={applyNodeChanges}
                onEdgesChange={applyEdgeChanges}
                onConnect={handleConnect}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onReconnect={reconnectExistingEdge}
                onPaneClick={() => {
                    if (suppressNextPaneClickRef.current) {
                        return
                    }

                    closeContextMenu()
                }}
                onPaneContextMenu={handlePaneContextMenu}
                onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                    setSelection(selectedNodes[0]?.id ?? null, selectedEdges[0]?.id ?? null)
                }}
                onMove={(_, nextViewport) => {
                    if (isProgrammaticViewportSyncRef.current) {
                        return
                    }

                    setViewport(nextViewport)
                }}
                isValidConnection={isValidConnection}
                style={{
                    background:
                        'radial-gradient(circle at top, rgba(191,219,254,0.42), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(240,249,255,0.96) 100%)',
                }}
            >
                <MiniMap pannable zoomable className="rounded-2xl! border! border-slate-200! bg-white/90!" />
                <Controls className="rounded-2xl! border! border-slate-200! bg-white/90!" />
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(100,116,139,0.35)" />
                {/* <ReactFlowDevTools position="top-left" /> */}
            </ReactFlow>

            <CanvasContextMenu
                visible={contextMenu.visible}
                clientX={contextMenu.clientX}
                clientY={contextMenu.clientY}
                isConnectionMenu={contextMenu.isConnectionMenu}
                allowedConnectionTargetTypes={allowedConnectionTargetTypes}
                onCreateNode={handleCreateNode}
                onDeleteSelected={deleteSelectedElements}
                onClose={closeContextMenu}
            />
        </div>
    )
}
