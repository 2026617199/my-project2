import { NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react'
import { memo } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import type { VideoNodeType } from '@/types/flow'

import { VideoContent } from './VideoContent'
import { VideoPromptPanel } from './VideoPromptPanel'
import { VideoToolbar } from './VideoToolbar'

/**
 * 视频节点组件
 * 职责：
 * - 不支持拖拽调整尺寸，使用内容驱动与样式约束
 * - 提供左右 Handle 用于流程连接
 * - 展示视频内容、生成状态与进度
 * - 提供工具栏操作（复制、删除、重新生成）
 */
export const VideoNode = memo(({
    id,
    data,
    selected,
    dragging
}: NodeProps<VideoNodeType>) => {
    const { zoom } = useViewport()
    const isDragging = Boolean(dragging)
    const handleVisibilityClass = selected
        ? 'visible opacity-100'
        : 'invisible opacity-0 group-hover/node:visible group-hover/node:opacity-100'

    // console.log('视频节点重新渲染', id)

    return (
        <div className="group/node relative">
            {/* 左侧输入 Handle */}
            <ButtonHandle
                type="target"
                position={Position.Left}
                id="input"
                visible
                className={`transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            {/* 右侧输出 Handle */}
            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible
                className={`transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            {/* 顶部工具栏：随节点与画布缩放联动 */}
            <NodeToolbar isVisible={selected && !isDragging} position={Position.Top} offset={10 * zoom}>
                <VideoToolbar
                    data={data}
                    selected={selected}
                />
            </NodeToolbar>

            {/* 底部增强输入区：固定在节点下方 */}
            <NodeToolbar
                isVisible={selected && !isDragging}
                position={Position.Bottom}
                offset={18 * zoom}
            >
                <div
                    className="nodrag nopan nowheel"
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                    }}
                >
                    <VideoPromptPanel nodeId={id} />
                </div>
            </NodeToolbar>

            <div
                className="relative flex w-87.5 min-h-62.5 flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-transform duration-200 ease-in-out"
            >
                {/* 视频内容区：与图片节点一致的比例容器，保证展示区域尺寸标准化 */}
                <div className="relative flex w-full min-h-62.5 aspect-7/5 overflow-hidden rounded-md bg-muted/10">
                    {isDragging ? (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            拖动中...
                        </div>
                    ) : (
                        <VideoContent data={data} />
                    )}
                </div>
            </div>
        </div>
    )
})

VideoNode.displayName = 'VideoNode'
