import { memo, useCallback, useMemo } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Input, InputNumber, Switch, Typography } from 'antd'

import { NodeShell, PreviewSection } from './shared'

import CloudButton from '@/components/CloudButton'
import CloudSelect from '@/components/CloudSelect'
import {
    IMAGE_RESOLUTIONS,
    VIDEO_ASPECT_RATIOS,
    VIDEO_DURATION_CONFIG,
    VIDEO_MODELS,
    VIDEO_STYLE_OPTIONS,
} from '@/constants/ai-models'
import { useCanvasStore } from '@/store/canvas'
import type { VideoCanvasNode, VideoNodeData } from '@/types/canvas'

function VideoNode({ id, data, selected }: NodeProps<VideoCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)

    const modelOptions = useMemo(
        () => VIDEO_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const handlePatch = useCallback(
        (patch: Partial<VideoNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    return (
        <>
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20}>
                <div
                    className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-lg"
                    style={{ width: 380 }}
                >
                    <Typography.Text strong className="mb-3 block text-slate-900">
                        视频节点工具栏
                    </Typography.Text>
                    <div className="space-y-3">
                        <Input.TextArea
                            value={data.prompt}
                            onChange={(event) => handlePatch({ prompt: event.target.value })}
                            placeholder="补充视频节点自己的提示词，例如镜头运动和节奏描述"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <CloudSelect value={data.model} options={modelOptions} onChange={(value) => handlePatch({ model: String(value) })} />
                            <CloudSelect value={data.aspectRatio} options={VIDEO_ASPECT_RATIOS} onChange={(value) => handlePatch({ aspectRatio: String(value) })} />
                            <CloudSelect value={data.resolution} options={IMAGE_RESOLUTIONS} onChange={(value) => handlePatch({ resolution: String(value) })} />
                            <CloudSelect value={data.style} options={VIDEO_STYLE_OPTIONS} onChange={(value) => handlePatch({ style: value ? String(value) : undefined })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1 text-xs text-slate-500">
                                时长（秒）
                                <InputNumber
                                    min={VIDEO_DURATION_CONFIG.min}
                                    max={VIDEO_DURATION_CONFIG.max}
                                    step={VIDEO_DURATION_CONFIG.step}
                                    value={data.duration}
                                    onChange={(value) => handlePatch({ duration: Number(value ?? 0) })}
                                    className="w-full"
                                />
                            </label>
                            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                <label className="flex items-center justify-between gap-2">
                                    高清输出
                                    <Switch size="small" checked={data.hd} onChange={(checked) => handlePatch({ hd: checked })} />
                                </label>
                                <label className="flex items-center justify-between gap-2">
                                    添加水印
                                    <Switch size="small" checked={data.watermark} onChange={(checked) => handlePatch({ watermark: checked })} />
                                </label>
                                <label className="flex items-center justify-between gap-2">
                                    故事板模式
                                    <Switch size="small" checked={data.storyboard} onChange={(checked) => handlePatch({ storyboard: checked })} />
                                </label>
                            </div>
                        </div>
                        <PreviewSection title="最终提示词预览">
                            <Typography.Paragraph style={{ marginBottom: 0 }} className="whitespace-pre-wrap text-xs text-slate-600">
                                {data.finalPrompt || '等待输入提示词或连接文本节点'}
                            </Typography.Paragraph>
                        </PreviewSection>
                        <PreviewSection title="参考图来源">
                            {data.referenceImageUrl ? (
                                <img src={data.referenceImageUrl} alt="参考图" className="h-36 w-full rounded-2xl object-cover" />
                            ) : (
                                <Typography.Text className="text-xs text-slate-400">
                                    暂无参考图。连接图片节点后，会自动把最新成功生成的图片作为参考图。
                                </Typography.Text>
                            )}
                        </PreviewSection>
                        <div className="flex justify-end">
                            <CloudButton loading={data.status === 'queued' || data.status === 'running'} onClick={() => void runNode(id)}>
                                生成视频
                            </CloudButton>
                        </div>
                    </div>
                </div>
            </NodeToolbar>
            <NodeShell
                title={data.title}
                status={data.status}
                selected={selected}
                subtitle={`模型：${data.model || '未设置'} · 比例：${data.aspectRatio}`}
            >
                <div className="space-y-3">
                    <PreviewSection title="提示词来源">
                        <Typography.Paragraph style={{ marginBottom: 0 }} className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">
                            {data.finalPrompt || '暂无提示词'}
                        </Typography.Paragraph>
                    </PreviewSection>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>时长：{data.duration}s</span>
                        <span>分辨率：{data.resolution}</span>
                        <span>参考图：{data.referenceImageUrl ? '已连接' : '无'}</span>
                        <span>进度：{data.progress}%</span>
                    </div>
                    {data.errorMessage ? (
                        <Typography.Text className="block rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {data.errorMessage}
                        </Typography.Text>
                    ) : null}
                    {data.outputVideos.length ? (
                        <div className="space-y-2">
                            {data.outputVideos.slice(0, 2).map((video) => (
                                <video key={video.url} src={video.url} controls className="h-40 w-full rounded-2xl bg-slate-950 object-cover" />
                            ))}
                        </div>
                    ) : (
                        <Typography.Text className="block text-xs text-slate-400">
                            视频完成后，这里会出现预览。
                        </Typography.Text>
                    )}
                </div>
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{ height: 12, width: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: '#94a3b8' }}
                />
            </NodeShell>
        </>
    )
}

export default memo(VideoNode)
