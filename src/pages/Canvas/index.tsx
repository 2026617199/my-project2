import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
    Background,
    BackgroundVariant,
    ColorMode,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Connection,
    type Edge,
} from '@xyflow/react'
import { SaveOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Layout, Select, Slider, Space, Tooltip, Typography } from 'antd'

import { canvasEdgeTypes } from './CustomEdges'
import { canvasNodeTypes } from './CustomNodes'

import CanvasLeftToolbar from '@/components/CanvasLeftToolbar'
import { useCanvasStore } from '@/store/canvas'
import { CANVAS_NODE_TYPES, canConnectNodes, type CanvasEdge, type CanvasNode } from '@/types/canvas'

// 外部组件 - 提供 ReactFlowProvider 和工具栏
export default function CanvasPage() {
    const [colorMode, setColorMode] = useState<ColorMode>('light')
    const [paneClickDistance, setPaneClickDistance] = useState<number>(1)

    return (
        <Layout className="h-screen w-screen overflow-hidden">
            <Layout.Header className="z-10 flex items-center justify-between border-b! border-slate-200! bg-white/80! px-4! py-2 backdrop-blur-sm!">
                <Space align="center" size="large">
                    <div>
                        <Typography.Text strong className="block text-lg text-slate-900">
                            画布编辑器
                        </Typography.Text>
                        <Typography.Text type="secondary" className="text-xs">
                            右键空白区创建节点，连接文本 / 图片 / 视频，让生成链路在画布里流动起来。
                        </Typography.Text>
                    </div>
                </Space>
                <Space align="center" size="middle">
                    <div className="flex items-center gap-2">
                        <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
                            点击阈值:
                        </Typography.Text>
                        <Slider
                            min={0}
                            max={100}
                            value={paneClickDistance}
                            onChange={(value) => setPaneClickDistance(value)}
                            className="w-24"
                        />
                        <Typography.Text type="secondary" className="w-6 text-xs">
                            {paneClickDistance}
                        </Typography.Text>
                    </div>
                    <Select
                        value={colorMode}
                        onChange={(value) => setColorMode(value as ColorMode)}
                        options={[
                            { value: 'dark', label: '深色' },
                            { value: 'light', label: '浅色' },
                            { value: 'system', label: '跟随系统' },
                        ]}
                        className="w-28"
                    />
                </Space>
            </Layout.Header>

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

    useEffect(() => {
        reactFlow.setViewport(viewport, { duration: 0 })
    }, [reactFlow, viewport])

    const handleConnect = useCallback(
        (connection: Connection) => {
            connectNodes(connection)
        },
        [connectNodes],
    )

    const isValidConnection = useCallback(
        (connection: Edge | Connection) => {
            if (!connection.source || !connection.target) {
                return false
            }

            const sourceNode = nodes.find((node) => node.id === connection.source)
            const targetNode = nodes.find((node) => node.id === connection.target)

            if (!sourceNode || !targetNode || !canConnectNodes(sourceNode.type, targetNode.type)) {
                return false
            }

            return !(
                sourceNode.type === CANVAS_NODE_TYPES.image &&
                targetNode.type === CANVAS_NODE_TYPES.video &&
                edges.some(
                    (edge) =>
                        edge.target === targetNode.id &&
                        edge.data?.relationType === 'reference-image' &&
                        edge.id !== ('id' in connection ? connection.id : undefined),
                )
            )
        },
        [edges, nodes],
    )

    const handlePaneContextMenu = useCallback(
        (event: MouseEvent | ReactMouseEvent<Element, MouseEvent>) => {
            event.preventDefault()
            openContextMenu(event.clientX, event.clientY)
            setSelection(null, null)
        },
        [openContextMenu, setSelection],
    )

    const handleCreateNode = useCallback(
        (type: keyof typeof CANVAS_NODE_TYPES) => {
            const position = reactFlow.screenToFlowPosition({ x: contextMenu.clientX, y: contextMenu.clientY })
            createNode(type, position)
        },
        [contextMenu.clientX, contextMenu.clientY, createNode, reactFlow],
    )

    const handleSave = useCallback(() => {
        saveGraph(reactFlow.getViewport())
    }, [reactFlow, saveGraph])

    const handleCreateFromToolbar = useCallback(
        (type: keyof typeof CANVAS_NODE_TYPES) => {
            createNodeAtRandom(type)
        },
        [createNodeAtRandom],
    )

    const menuItems = useMemo(
        () => [
            {
                key: CANVAS_NODE_TYPES.text,
                icon: <PlusOutlined />,
                label: '创建文本节点',
                onClick: () => handleCreateNode(CANVAS_NODE_TYPES.text),
            },
            {
                key: CANVAS_NODE_TYPES.image,
                icon: <PlusOutlined />,
                label: '创建图片节点',
                onClick: () => handleCreateNode(CANVAS_NODE_TYPES.image),
            },
            {
                key: CANVAS_NODE_TYPES.video,
                icon: <PlusOutlined />,
                label: '创建视频节点',
                onClick: () => handleCreateNode(CANVAS_NODE_TYPES.video),
            },
            { type: 'divider' as const },
            {
                key: 'delete-selected',
                icon: <DeleteOutlined />,
                label: '删除当前选中元素',
                onClick: () => deleteSelectedElements(),
            },
        ],
        [deleteSelectedElements, handleCreateNode],
    )

    return (
        <div className="relative h-[calc(100vh-65px)] w-full" onClick={closeContextMenu}>
            <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2 sm:left-4">
                <CanvasLeftToolbar
                    onCreateNode={handleCreateFromToolbar}
                    onCreateNovelAgent={() => createNodeAtRandom(CANVAS_NODE_TYPES.agent)}
                />
            </div>

            <div className="absolute right-4 top-4 z-20 flex gap-2">
                <Tooltip title="恢复最近一次保存">
                    <Button icon={<ReloadOutlined />} onClick={resetToSavedGraph}>
                        恢复
                    </Button>
                </Tooltip>
                <Tooltip title="保存到浏览器本地">
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                        保存
                    </Button>
                </Tooltip>
            </div>

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
                onReconnect={reconnectExistingEdge}
                onPaneClick={closeContextMenu}
                onPaneContextMenu={handlePaneContextMenu}
                onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                    setSelection(selectedNodes[0]?.id ?? null, selectedEdges[0]?.id ?? null)
                }}
                onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
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

            {contextMenu.visible ? (
                <div
                    className="absolute z-30 min-w-48 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-md"
                    style={{ left: contextMenu.clientX, top: contextMenu.clientY }}
                    onClick={(event) => event.stopPropagation()}
                >
                    {menuItems.map((item) => {
                        if ('type' in item && item.type === 'divider') {
                            return <div key="divider" className="my-2 h-px bg-slate-200" />
                        }

                        return (
                            <button
                                key={item.key}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                                onClick={() => {
                                    item.onClick?.()
                                    closeContextMenu()
                                }}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
