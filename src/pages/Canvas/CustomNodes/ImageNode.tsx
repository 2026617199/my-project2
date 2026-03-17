import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
    const [isImageLoading, setIsImageLoading] = useState(false)
    const [hasImageLoadError, setHasImageLoadError] = useState(false)

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

    const previewImageUrl = data.outputImages[0]?.url

    useEffect(() => {
        if (!previewImageUrl) {
            setIsImageLoading(false)
            setHasImageLoadError(false)
            return
        }

        setIsImageLoading(true)
        setHasImageLoadError(false)
    }, [previewImageUrl])

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
                        <div className="grid grid-cols-2 gap-3 nodrag nopan nowheel">
                            <CloudSelect className="nodrag nopan nowheel" value={data.model} options={modelOptions} onChange={(value) => handlePatch({ model: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.size} options={IMAGE_SIZES} onChange={(value) => handlePatch({ size: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.resolution} options={IMAGE_RESOLUTIONS} onChange={(value) => handlePatch({ resolution: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.orientation} options={IMAGE_ORIENTATIONS} onChange={(value) => handlePatch({ orientation: String(value) })} />
                            <CloudSelect className="nodrag nopan nowheel" value={data.count} options={IMAGE_COUNTS} onChange={(value) => handlePatch({ count: Number(value) })} />
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
                <div className="space-y-3 border-t border-slate-200/80 pt-3">
                    <PreviewSection title="图片预览">
                        <div className="nodrag nopan nowheel">
                            {previewImageUrl ? (
                                <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                    <img
                                        src={previewImageUrl}
                                        alt="生成结果"
                                        className={`h-full w-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                        onLoad={() => setIsImageLoading(false)}
                                        onError={() => {
                                            setIsImageLoading(false)
                                            setHasImageLoadError(true)
                                        }}
                                    />
                                    {isImageLoading && !hasImageLoadError ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                                                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                                                图片加载中...
                                            </div>
                                        </div>
                                    ) : null}
                                    {hasImageLoadError ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-rose-50/95 p-3 text-center text-xs text-rose-600">
                                            图片加载失败，请重试生成或检查图片链接。
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 text-center">
                                    <Typography.Text className="px-4 text-xs text-slate-500">
                                        暂无图片输出
                                        <br />
                                        点击“生成图片”后将在此处预览
                                    </Typography.Text>
                                </div>
                            )}
                        </div>
                    </PreviewSection>
                    {data.errorMessage ? (
                        <Typography.Text className="block rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {data.errorMessage}
                        </Typography.Text>
                    ) : null}
                </div>
                <Handle type="target" position={Position.Left} className="h-3! w-3! border-2! border-white! bg-slate-400!" />
                <Handle type="source" position={Position.Right} className="h-3! w-3! border-2! border-white! bg-fuchsia-500!" />
            </NodeShell>
        </>
    )
}

export default memo(ImageNode)
