import { useCallback, useMemo, useRef } from 'react'
import type { Connection, Edge } from '@xyflow/react'

import { CANVAS_NODE_TYPES, canConnectNodes, type CanvasEdge, type CanvasNode, type CanvasNodeType } from '@/types/canvas'

interface UseCanvasConnectionParams {
    nodes: CanvasNode[]
    edges: CanvasEdge[]
    contextMenuSourceNodeId?: string
    connectNodes: (connection: Connection) => void
    openContextMenu: (clientX: number, clientY: number, sourceNodeId?: string, isConnectionMenu?: boolean) => void
}

type ConnectionDragHandle = {
    nodeId?: string | null
} | null

type ConnectionEndState = {
    toNode?: { id: string } | null
    toHandle?: { nodeId?: string | null } | null
} | null

export function useCanvasConnection({
    nodes,
    edges,
    contextMenuSourceNodeId,
    connectNodes,
    openContextMenu,
}: UseCanvasConnectionParams) {
    const currentConnectionRef = useRef<{ sourceNodeId?: string; isConnected: boolean }>({ isConnected: false })
    const suppressNextPaneClickRef = useRef(false)

    const sourceNodeType = useMemo(() => {
        if (!contextMenuSourceNodeId) {
            return null
        }

        return nodes.find((node) => node.id === contextMenuSourceNodeId)?.type ?? null
    }, [contextMenuSourceNodeId, nodes])

    const allowedConnectionTargetTypes = useMemo(() => {
        const creatableTypes: CanvasNodeType[] = [CANVAS_NODE_TYPES.text, CANVAS_NODE_TYPES.image, CANVAS_NODE_TYPES.video]

        if (!sourceNodeType) {
            return new Set<CanvasNodeType>(creatableTypes)
        }

        if (sourceNodeType === CANVAS_NODE_TYPES.text || sourceNodeType === CANVAS_NODE_TYPES.image) {
            return new Set<CanvasNodeType>([CANVAS_NODE_TYPES.image, CANVAS_NODE_TYPES.video])
        }

        return new Set<CanvasNodeType>(creatableTypes.filter((type) => canConnectNodes(sourceNodeType, type)))
    }, [sourceNodeType])

    const handleConnect = useCallback(
        (connection: Connection) => {
            currentConnectionRef.current.isConnected = Boolean(connection.target)
            connectNodes(connection)
        },
        [connectNodes],
    )

    const handleConnectStart = useCallback((_: unknown, handle: ConnectionDragHandle) => {
        currentConnectionRef.current = {
            sourceNodeId: handle?.nodeId ?? undefined,
            isConnected: false,
        }
    }, [])

    const handleConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent, connectionState: ConnectionEndState) => {
            const touch = 'touches' in event ? event.touches[0] : undefined
            const clientX = touch?.clientX ?? ('clientX' in event ? event.clientX : 0)
            const clientY = touch?.clientY ?? ('clientY' in event ? event.clientY : 0)
            const endedOnExistingNode = Boolean(connectionState?.toNode || connectionState?.toHandle?.nodeId)

            if (
                currentConnectionRef.current.sourceNodeId &&
                !currentConnectionRef.current.isConnected &&
                !endedOnExistingNode
            ) {
                const sourceNodeId = currentConnectionRef.current.sourceNodeId
                const sourceNode = nodes.find((node) => node.id === sourceNodeId)

                if (sourceNode) {
                    suppressNextPaneClickRef.current = true
                    openContextMenu(clientX, clientY, sourceNodeId, true)

                    window.setTimeout(() => {
                        suppressNextPaneClickRef.current = false
                    }, 0)
                }
            }

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

    return {
        allowedConnectionTargetTypes,
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        isValidConnection,
        suppressNextPaneClickRef,
    }
}
