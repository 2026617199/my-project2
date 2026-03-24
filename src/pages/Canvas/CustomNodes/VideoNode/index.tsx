import { NodeToolbar, Position, type NodeProps } from '@xyflow/react'
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
                className={`h-3! w-3! border-2! border-background! bg-primary! transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            {/* 右侧输出 Handle */}
            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible
                className={`h-3! w-3! border-2! border-background! bg-primary! transition-opacity duration-150 ${handleVisibilityClass}`}
            />

            <div
                className="relative flex w-100 min-h-30 flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-transform duration-200 ease-in-out"
            >
                {/* 选中时显示工具栏（与图片节点一致，使用 NodeToolbar 管理定位） */}
                <NodeToolbar isVisible={selected && !isDragging} position={Position.Top} offset={10}>
                    <VideoToolbar
                        data={data}
                        selected={selected}
                    />
                </NodeToolbar>

                {/* 底部增强输入区：固定在节点下方 */}
                <NodeToolbar
                    isVisible={selected && !isDragging}
                    position={Position.Bottom}
                    offset={18}
                >
                    <div className="nodrag nopan nowheel">
                        <VideoPromptPanel nodeId={id} />
                    </div>
                </NodeToolbar>

                {/* 视频内容区 */}
                <div className="h-full w-full flex-1 min-h-0 bg-muted/10">
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
