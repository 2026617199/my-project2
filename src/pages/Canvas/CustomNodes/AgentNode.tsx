import { memo, useCallback } from 'react'
import { BulbOutlined } from '@ant-design/icons'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Tag, Typography } from 'antd'

import { NodeShell, PreviewSection } from './shared'

import CloudButton from '@/components/CloudButton'
import { useCanvasStore } from '@/store/canvas'
import type { AgentCanvasNode, AgentNodeData } from '@/types/canvas'

function AgentNode({ id, data, selected }: NodeProps<AgentCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)

    const handlePatch = useCallback(
        (patch: Partial<AgentNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    return (
        <>
            <NodeShell
                title={data.title}
                status={data.status}
                selected={selected}
                subtitle={<span className="text-violet-700">智能体：小说改剧本（仅支持 Text 作为输入/输出）</span>}
            >
                <div className="space-y-3">
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                        <BulbOutlined className="mr-1" />
                        将小说文本自动改写为标准剧本结构。
                    </div>


                    <div className="flex gap-2 nodrag nopan nowheel">
                        <CloudButton
                            size="small"
                            loading={data.status === 'queued' || data.status === 'running'}
                            onClick={() => void runNode(id)}
                        >
                            开始
                        </CloudButton>
                    </div>

                    <PreviewSection title="输入汇总">
                        <Typography.Paragraph className="mb-0! line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">
                            {data.finalPrompt || '暂无输入内容'}
                        </Typography.Paragraph>
                    </PreviewSection>
                    {data.errorMessage ? (
                        <Typography.Text className="block rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {data.errorMessage}
                        </Typography.Text>
                    ) : null}
                </div>

                <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-violet-400!" />
                <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-emerald-500!" />
            </NodeShell>

        </>
    )
}

export default memo(AgentNode)
