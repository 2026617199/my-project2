import { useEffect, useRef } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'

import type { CanvasEdge, CanvasNode, CanvasViewport } from '@/types/canvas'

const VIEWPORT_EPSILON = 0.0001

function isSameViewport(a: CanvasViewport, b: CanvasViewport) {
    return Math.abs(a.x - b.x) < VIEWPORT_EPSILON && Math.abs(a.y - b.y) < VIEWPORT_EPSILON && Math.abs(a.zoom - b.zoom) < VIEWPORT_EPSILON
}

interface UseCanvasViewportSyncParams {
    reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
    viewport: CanvasViewport
}

export function useCanvasViewportSync({ reactFlow, viewport }: UseCanvasViewportSyncParams) {
    const isProgrammaticViewportSyncRef = useRef(false)

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

    return {
        isProgrammaticViewportSyncRef,
    }
}
