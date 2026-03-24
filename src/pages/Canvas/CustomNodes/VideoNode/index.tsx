import { NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react'
import { useState } from 'react'

import { ButtonHandle } from '@/components/button-handle'
import type { VideoNodeType } from '@/types/flow'

import { VideoContent } from './VideoContent'
import { VideoToolbar } from './VideoToolbar'

/**
 * 视频节点组件
 * 职责：
 * - 不支持拖拽调整尺寸，使用内容驱动与样式约束
 * - 提供左右 Handle 用于流程连接
 * - 展示视频内容、生成状态与进度
 * - 提供工具栏操作（复制、删除、重新生成）
 */
export const VideoNode = ({
    id,
    data,
    selected
}: NodeProps<VideoNodeType>) => {
    const { zoom } = useViewport()

    const [isHovered, setIsHovered] = useState(false)

    // console.log('视频节点重新渲染', id)

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

            <div
                className="relative flex w-100 min-h-70 flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-transform duration-200 ease-in-out"
                onMouseEnter={() => {
                    setIsHovered(true)
                }}
                onMouseLeave={() => {
                    setIsHovered(false)
                }}
            >
                {/* 选中时显示工具栏（与图片节点一致，使用 NodeToolbar 管理定位） */}
                <NodeToolbar isVisible={selected} position={Position.Top} offset={10 * zoom}>
                    <VideoToolbar
                        data={data}
                        selected={selected}
                        zoom={zoom}
                    />
                </NodeToolbar>

                {/* 视频内容区 */}
                <div className="flex h-full w-full overflow-hidden rounded-md bg-muted/10">
                    <VideoContent data={data} />
                </div>
            </div>
        </>
    )
}
