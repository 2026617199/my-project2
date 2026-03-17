import { memo, useCallback, useMemo, useState } from 'react'
import { BulbOutlined } from '@ant-design/icons'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Button, Input, Modal, Tag, Typography } from 'antd'

import { NodeShell, PreviewSection } from './shared'

import CloudButton from '@/components/CloudButton'
import CloudSelect from '@/components/CloudSelect'
import { TEXT_MODELS } from '@/constants/ai-models'
import { useCanvasStore } from '@/store/canvas'
import type { AgentCanvasNode, AgentNodeData } from '@/types/canvas'

function AgentNode({ id, data, selected }: NodeProps<AgentCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)
    const zoom = useCanvasStore((state) => state.viewport.zoom)
    const [roleModalOpen, setRoleModalOpen] = useState(false)
    const [draftRoleDefinition, setDraftRoleDefinition] = useState(data.roleDefinition)

    const modelOptions = useMemo(
        () => TEXT_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const handlePatch = useCallback(
        (patch: Partial<AgentNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    const openRoleModal = useCallback(() => {
        setDraftRoleDefinition(data.roleDefinition)
        setRoleModalOpen(true)
    }, [data.roleDefinition])

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20 * zoom}>
                <div
                    className="w-96 rounded-[28px] border border-violet-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(76,29,149,0.18)] backdrop-blur-lg"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                    <Typography.Text strong className="mb-3 block text-violet-900">
                        智能体工具栏 · 小说改剧本
                    </Typography.Text>
                    <div className="space-y-3">
                        <Input.TextArea
                            value={data.prompt}
                            onChange={(event) => handlePatch({ prompt: event.target.value })}
                            placeholder="可补充创作要求，例如分场数量、对白密度、节奏风格。"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
                        <CloudSelect
                            className="nodrag nopan nowheel"
                            value={data.model}
                            options={modelOptions}
                            onChange={(value) => handlePatch({ model: String(value) })}
                        />
                        <PreviewSection title="角色定义">
                            <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-xs text-slate-600">
                                {data.roleDefinition.trim() ? '已设置角色定义' : '未设置角色定义'}
                            </Typography.Paragraph>
                        </PreviewSection>
                        <PreviewSection title="待处理内容">
                            <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-xs text-slate-600">
                                {data.finalPrompt || '请先连接文本节点，或填写补充内容。'}
                            </Typography.Paragraph>
                        </PreviewSection>
                        <div className="flex justify-end gap-2">
                            <Button className="nodrag nopan nowheel" onClick={openRoleModal}>
                                角色定义
                            </Button>
                            <CloudButton
                                className="nodrag nopan nowheel"
                                loading={data.status === 'queued' || data.status === 'running'}
                                onClick={() => void runNode(id)}
                            >
                                开始
                            </CloudButton>
                        </div>
                    </div>
                </div>
            </NodeToolbar>

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

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Tag color="purple">Agent</Tag>
                        <span>模型：{data.model || '未设置'}</span>
                        <span>进度：{data.progress}%</span>
                    </div>

                    <div className="flex gap-2 nodrag nopan nowheel">
                        <CloudButton
                            size="small"
                            loading={data.status === 'queued' || data.status === 'running'}
                            onClick={() => void runNode(id)}
                        >
                            开始
                        </CloudButton>
                        <Button size="small" onClick={openRoleModal}>
                            角色定义
                        </Button>
                    </div>

                    <PreviewSection title="输入汇总">
                        <Typography.Paragraph className="mb-0! line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">
                            {data.finalPrompt || '暂无输入内容'}
                        </Typography.Paragraph>
                    </PreviewSection>

                    <PreviewSection title="生成结果">
                        <Typography.Paragraph className="mb-0! line-clamp-5 whitespace-pre-wrap text-sm text-slate-700">
                            {data.outputText || '点击“开始”后，结果会自动写入新的文本节点。'}
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

            <Modal
                title="角色定义"
                open={roleModalOpen}
                onCancel={() => setRoleModalOpen(false)}
                onOk={() => {
                    handlePatch({ roleDefinition: draftRoleDefinition })
                    setRoleModalOpen(false)
                }}
                okText="保存"
                cancelText="取消"
            >
                <Input.TextArea
                    value={draftRoleDefinition}
                    onChange={(event) => setDraftRoleDefinition(event.target.value)}
                    autoSize={{ minRows: 5, maxRows: 10 }}
                    placeholder="输入角色定义，例如：主角性格、语气偏好、说话习惯、关系设定等。"
                />
            </Modal>
        </>
    )
}

export default memo(AgentNode)
