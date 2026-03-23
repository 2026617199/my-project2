import { NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react'
import { useState } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import type { ImageNodeType } from '@/types/flow'

import { ImageContent } from './ImageContent'
import { ImagePromptPanel } from './ImagePromptPanel'
import { ImageToolbar } from './ImageToolbar'

/**
 * 图片节点组件
 * 职责：
 * - 不支持拖拽调整尺寸，使用内容驱动与样式约束
 * - 提供左右 Handle 用于流程连接
 * - 展示图片内容、生成状态与进度
 * - 提供工具栏操作（复制、删除、重新生成）
 */
export const ImageNode = ({
    id,
    data,
    selected
}: NodeProps<ImageNodeType>) => {
    const { zoom } = useViewport()

    const [isHovered, setIsHovered] = useState(false)

    console.log('图片节点重新渲染', id)

    return (
        <>
            {/* 左侧输入 Handle */}
            <ButtonHandle
                type="target"
                position={Position.Left}
                id="input"
                visible={selected || isHovered}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            {/* 右侧输出 Handle */}
            <ButtonHandle
                type="source"
                position={Position.Right}
                id="output"
                visible={selected || isHovered}
                className="h-3! w-3! border-2! border-background! bg-primary!"
            />

            {/* 顶部工具栏：随节点与画布缩放联动 */}
            <NodeToolbar isVisible position={Position.Top} offset={10 * zoom}>
                <ImageToolbar data={data} selected={selected} zoom={zoom} />
            </NodeToolbar>

            {/* 底部增强输入区：固定在节点下方 */}
            <NodeToolbar
                isVisible={selected}
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
                    <ImagePromptPanel nodeId={id} />
                </div>
            </NodeToolbar>

            <div
                className="relative flex w-87.5 min-h-62.5 flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-transform duration-200 ease-in-out"
                onMouseEnter={() => {
                    setIsHovered(true)
                }}
                onMouseLeave={() => {
                    setIsHovered(false)
                }}
            >
                {/* 图片内容区 */}
                <div className="flex h-full w-full overflow-hidden rounded-md bg-muted/10">
                    <ImageContent data={data} />
                </div>
            </div>
        </>
    )
}
