import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
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
import { Button, Layout, Select, Slider, Space, Tooltip, Typography, message } from 'antd'

import { canvasEdgeTypes } from './CustomEdges'
import { canvasNodeTypes } from './CustomNodes'

import CanvasLeftToolbar from '@/components/CanvasLeftToolbar'
import { useCanvasStore } from '@/store/canvas'
import { CANVAS_NODE_TYPES, canConnectNodes, type CanvasEdge, type CanvasNode } from '@/types/canvas'

function isSameViewport(a: { x: number; y: number; zoom: number }, b: { x: number; y: number; zoom: number }) {
    const EPSILON = 0.0001
    return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON && Math.abs(a.zoom - b.zoom) < EPSILON
}

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
    const isProgrammaticViewportSyncRef = useRef(false)
    const currentConnectionRef = useRef<{ sourceNodeId?: string; isConnected: boolean }>({ isConnected: false })
    const suppressNextPaneClickRef = useRef(false)
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

    const sourceNodeType = useMemo(() => {
        if (!contextMenu.sourceNodeId) {
            return null
        }

        return nodes.find((node) => node.id === contextMenu.sourceNodeId)?.type ?? null
    }, [contextMenu.sourceNodeId, nodes])

    const allowedConnectionTargetTypes = useMemo(() => {
        const creatableTypes = [CANVAS_NODE_TYPES.text, CANVAS_NODE_TYPES.image, CANVAS_NODE_TYPES.video] as const

        if (!sourceNodeType) {
            return new Set<keyof typeof CANVAS_NODE_TYPES>(creatableTypes)
        }

        if (sourceNodeType === CANVAS_NODE_TYPES.text || sourceNodeType === CANVAS_NODE_TYPES.image) {
            return new Set<keyof typeof CANVAS_NODE_TYPES>([CANVAS_NODE_TYPES.image, CANVAS_NODE_TYPES.video])
        }

        return new Set<keyof typeof CANVAS_NODE_TYPES>(
            creatableTypes.filter((type) => canConnectNodes(sourceNodeType, type)),
        )
    }, [sourceNodeType])

    useEffect(() => {
        hydrateGraph()
    }, [hydrateGraph])

    useEffect(() => {
        const currentViewport = reactFlow.getViewport()
        if (isSameViewport(currentViewport, viewport)) {
            return
        }

        isProgrammaticViewportSyncRef.current = true
        reactFlow.setViewport(viewport, { duration: 0 })

        window.setTimeout(() => {
            isProgrammaticViewportSyncRef.current = false
        }, 0)
    }, [reactFlow, viewport])

    const handleConnect = useCallback(
        (connection: Connection) => {
            // Record valid connection result to avoid opening creation menu on connect end
            currentConnectionRef.current.isConnected = Boolean(connection.target)
            connectNodes(connection)
        },
        [connectNodes],
    )

    const handleConnectStart = useCallback(
        (_: any, handle: any) => {
            // Start a new drag session
            currentConnectionRef.current = {
                sourceNodeId: handle?.nodeId,
                isConnected: false,
            }
        },
        [],
    )

    const handleConnectEnd = useCallback(
        (event: any, connectionState: { toNode?: { id: string } | null; toHandle?: { nodeId?: string } | null } | null) => {
            const touch = event.touches?.[0]
            const clientX = touch?.clientX ?? event.clientX
            const clientY = touch?.clientY ?? event.clientY
            const endedOnExistingNode = Boolean(connectionState?.toNode || connectionState?.toHandle?.nodeId)

            // If user drags from a source handle and ends on blank pane (not on existing node),
            // open node creation menu so newly created node can be auto-connected.
            if (
                currentConnectionRef.current.sourceNodeId &&
                !currentConnectionRef.current.isConnected &&
                !endedOnExistingNode
            ) {
                const sourceNodeId = currentConnectionRef.current.sourceNodeId
                const sourceNode = nodes.find((node) => node.id === sourceNodeId)

                if (sourceNode) {
                    // Prevent the immediate pane click from closing the just-opened menu.
                    suppressNextPaneClickRef.current = true

                    openContextMenu(clientX, clientY, sourceNodeId, true)

                    window.setTimeout(() => {
                        suppressNextPaneClickRef.current = false
                    }, 0)
                }
            }

            // Reset connection state
            currentConnectionRef.current = { isConnected: false }
        },
        [nodes, openContextMenu],
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

            const relationType =
                sourceNode.type === CANVAS_NODE_TYPES.image &&
                    (targetNode.type === CANVAS_NODE_TYPES.image || targetNode.type === CANVAS_NODE_TYPES.video)
                    ? 'reference-image'
                    : null

            if (relationType !== 'reference-image') {
                return true
            }

            return !edges.some(
                (edge) =>
                    edge.target === targetNode.id &&
                    edge.data?.relationType === 'reference-image' &&
                    edge.id !== ('id' in connection ? connection.id : undefined),
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
            if (contextMenu.isConnectionMenu && !allowedConnectionTargetTypes.has(type)) {
                message.warning('该来源节点不支持创建此类型的后续节点')
                return
            }

            const position = reactFlow.screenToFlowPosition({ x: contextMenu.clientX, y: contextMenu.clientY })
            if (contextMenu.isConnectionMenu && contextMenu.sourceNodeId) {
                createNodeAndConnect(contextMenu.sourceNodeId, type, position)
            } else {
                createNode(type, position)
            }
        },
        [
            allowedConnectionTargetTypes,
            contextMenu.clientX,
            contextMenu.clientY,
            contextMenu.isConnectionMenu,
            contextMenu.sourceNodeId,
            createNode,
            createNodeAndConnect,
            reactFlow,
        ],
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

    const menuItems = useMemo(() => {
        if (contextMenu.isConnectionMenu) {
            const candidateItems = [
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
            ]

            return candidateItems.map((item) => ({
                ...item,
                disabled: !allowedConnectionTargetTypes.has(item.key),
                disabledReason: '仅允许创建图片或视频作为后续节点',
            }))
        }

        return [
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
        ]
    }, [allowedConnectionTargetTypes, contextMenu.isConnectionMenu, deleteSelectedElements, handleCreateNode])

    useEffect(() => {
        if (!contextMenu.visible) {
            return
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null
            if (target?.closest('[data-context-menu-root="true"]')) {
                return
            }

            closeContextMenu()
        }

        document.addEventListener('pointerdown', handlePointerDown, true)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true)
        }
    }, [closeContextMenu, contextMenu.visible])

    return (
        <div className="relative h-[calc(100vh-65px)] w-full">
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

            {contextMenu.visible ? (
                <div
                    data-context-menu-root="true"
                    className={`absolute z-30 min-w-48 rounded-2xl border bg-white/95 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-md ${contextMenu.isConnectionMenu
                        ? 'border-sky-300 ring-2 ring-sky-200'
                        : 'border-slate-200'
                        }`}
                    style={{ left: contextMenu.clientX + 4, top: contextMenu.clientY + 4 }}
                    onClick={(event) => event.stopPropagation()}
                >
                    {contextMenu.isConnectionMenu && (
                        <div className="mb-2 px-3 py-1 text-xs font-medium text-sky-600">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                                选择要创建的节点
                            </div>
                            <div className="mt-1 text-[11px] font-normal text-sky-500/80">
                                创建后将自动与源节点连线
                            </div>
                        </div>
                    )}
                    {menuItems.map((item) => {
                        if ('type' in item && item.type === 'divider') {
                            return <div key="divider" className="my-2 h-px bg-slate-200" />
                        }

                        return (
                            <div key={item.key}>
                                <button
                                    type="button"
                                    disabled={'disabled' in item ? item.disabled : false}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${'disabled' in item && item.disabled
                                        ? 'cursor-not-allowed bg-slate-50 text-slate-400'
                                        : 'text-slate-700 hover:bg-slate-100 active:scale-[0.99]'
                                        }`}
                                    onClick={() => {
                                        if ('disabled' in item && item.disabled) {
                                            return
                                        }

                                        item.onClick?.()
                                        closeContextMenu()
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </span>
                                    {'disabled' in item && item.disabled ? (
                                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-400">
                                            不可用
                                        </span>
                                    ) : null}
                                </button>
                                {'disabled' in item && item.disabled && 'disabledReason' in item ? (
                                    <div className="px-3 pb-1 text-[11px] text-slate-400">{item.disabledReason}</div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
