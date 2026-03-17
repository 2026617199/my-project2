import { memo, useCallback, useMemo } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Input, Typography } from 'antd'

import { NodeShell, PreviewSection } from './shared'

import CloudButton from '@/components/CloudButton'
import CloudSelect from '@/components/CloudSelect'
import {
    IMAGE_COUNTS,
    IMAGE_MODELS,
    IMAGE_ORIENTATIONS,
    IMAGE_RESOLUTIONS,
    IMAGE_SIZES,
} from '@/constants/ai-models'
import { useCanvasStore } from '@/store/canvas'
import type { ImageCanvasNode, ImageNodeData } from '@/types/canvas'

function ImageNode({ id, data, selected }: NodeProps<ImageCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)

    const modelOptions = useMemo(
        () => IMAGE_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const handlePatch = useCallback(
        (patch: Partial<ImageNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20}>
                <div className="w-96 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-lg">
                    <Typography.Text strong className="mb-3 block text-slate-900">
                        图片节点工具栏
                    </Typography.Text>
                    <div className="space-y-3">
                        <Input.TextArea
                            value={data.prompt}
                            onChange={(event) => handlePatch({ prompt: event.target.value })}
                            placeholder="补充这个图片节点自己的提示词"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <CloudSelect value={data.model} options={modelOptions} onChange={(value) => handlePatch({ model: String(value) })} />
                            <CloudSelect value={data.size} options={IMAGE_SIZES} onChange={(value) => handlePatch({ size: String(value) })} />
                            <CloudSelect value={data.resolution} options={IMAGE_RESOLUTIONS} onChange={(value) => handlePatch({ resolution: String(value) })} />
                            <CloudSelect value={data.orientation} options={IMAGE_ORIENTATIONS} onChange={(value) => handlePatch({ orientation: String(value) })} />
                            <CloudSelect value={data.count} options={IMAGE_COUNTS} onChange={(value) => handlePatch({ count: Number(value) })} />
                        </div>
                        <PreviewSection title="最终提示词预览">
                            <Typography.Paragraph className="mb-0! whitespace-pre-wrap text-xs text-slate-600">
                                {data.finalPrompt || '等待输入提示词或连接文本节点'}
                            </Typography.Paragraph>
                        </PreviewSection>
                        <div className="flex justify-end">
                            <CloudButton loading={data.status === 'queued' || data.status === 'running'} onClick={() => void runNode(id)}>
                                生成图片
                            </CloudButton>
                        </div>
                    </div>
                </div>
            </NodeToolbar>
            <NodeShell
                title={data.title}
                status={data.status}
                selected={selected}
                subtitle={`模型：${data.model || '未设置'} · 尺寸：${data.size}`}
            >
                <div className="space-y-3">
                    <PreviewSection title="提示词来源">
                        <Typography.Paragraph className="mb-0! line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">
                            {data.finalPrompt || '暂无提示词'}
                        </Typography.Paragraph>
                    </PreviewSection>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>分辨率：{data.resolution}</span>
                        <span>方向：{data.orientation}</span>
                        <span>张数：{data.count}</span>
                        <span>进度：{data.progress}%</span>
                    </div>
                    {data.errorMessage ? (
                        <Typography.Text className="block rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {data.errorMessage}
                        </Typography.Text>
                    ) : null}
                    {data.outputImages.length ? (
                        <div className="grid grid-cols-2 gap-2">
                            {data.outputImages.slice(0, 4).map((image) => (
                                <img key={image.url} src={image.url} alt="生成结果" className="h-28 w-full rounded-2xl object-cover" />
                            ))}
                        </div>
                    ) : (
                        <Typography.Text className="block text-xs text-slate-400">
                            生成完成后，这里会展示图片结果。
                        </Typography.Text>
                    )}
                </div>
                <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-slate-400!" />
                <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-fuchsia-500!" />
            </NodeShell>
        </>
    )
}

export default memo(ImageNode)
