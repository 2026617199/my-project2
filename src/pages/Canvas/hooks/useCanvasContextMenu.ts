import { useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { message } from 'antd'

import type { CanvasContextMenuState, CanvasEdge, CanvasNode, CanvasNodeType } from '@/types/canvas'

interface UseCanvasContextMenuParams {
    contextMenu: CanvasContextMenuState
    allowedConnectionTargetTypes: Set<CanvasNodeType>
    reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
    openContextMenu: (clientX: number, clientY: number, sourceNodeId?: string, isConnectionMenu?: boolean) => void
    closeContextMenu: () => void
    setSelection: (nodeId: string | null, edgeId: string | null) => void
    createNode: (type: CanvasNodeType, position: { x: number; y: number }) => void
    createNodeAndConnect: (sourceNodeId: string, targetNodeType: CanvasNodeType, position: { x: number; y: number }) => void
}

export function useCanvasContextMenu({
    contextMenu,
    allowedConnectionTargetTypes,
    reactFlow,
    openContextMenu,
    closeContextMenu,
    setSelection,
    createNode,
    createNodeAndConnect,
}: UseCanvasContextMenuParams) {
    const handlePaneContextMenu = useCallback(
        (event: MouseEvent | ReactMouseEvent<Element, MouseEvent>) => {
            event.preventDefault()
            openContextMenu(event.clientX, event.clientY)
            setSelection(null, null)
        },
        [openContextMenu, setSelection],
    )

    const handleCreateNode = useCallback(
        (type: CanvasNodeType) => {
            if (contextMenu.isConnectionMenu && !allowedConnectionTargetTypes.has(type)) {
                message.warning('该来源节点不支持创建此类型的后续节点')
                return
            }

            const position = reactFlow.screenToFlowPosition({ x: contextMenu.clientX, y: contextMenu.clientY })
            if (contextMenu.isConnectionMenu && contextMenu.sourceNodeId) {
                createNodeAndConnect(contextMenu.sourceNodeId, type, position)
                return
            }

            createNode(type, position)
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

    return {
        handleCreateNode,
        handlePaneContextMenu,
    }
}
