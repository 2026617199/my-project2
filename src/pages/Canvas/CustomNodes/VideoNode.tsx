import { memo, useCallback, useMemo } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Input, InputNumber, Switch, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { NodeShell, PreviewSection } from './shared'

import CloudButton from '@/components/CloudButton'
import CloudSelect from '@/components/CloudSelect'
import {
    VIDEO_ASPECT_RATIOS,
    VIDEO_DURATION_CONFIG,
    VIDEO_MODELS,
    VIDEO_RESOLUTIONS,
} from '@/constants/ai-models'
import { useCanvasStore } from '@/store/canvas'
import type { VideoCanvasNode, VideoNodeData } from '@/types/canvas'

function VideoNode({ id, data, selected }: NodeProps<VideoCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)
    const zoom = useCanvasStore((state) => state.viewport.zoom)

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
            <NodeToolbar isVisible={selected} position={Position.Bottom} offset={20 * zoom}>
                <div
                    className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-lg"
                    style={{ width: 400, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                    <Typography.Text strong className="mb-3 block text-slate-900">
                        视频节点工具栏
                    </Typography.Text>
                    <div className="space-y-3">
                        {/* 模型选择 */}
                        <div className="flex items-center gap-2">
                            <Typography.Text className="w-16 shrink-0 text-xs text-slate-500">模型</Typography.Text>
                            <CloudSelect
                                className="flex-1 nodrag nopan nowheel"
                                value={data.model}
                                options={modelOptions}
                                onChange={(value) => handlePatch({ model: value as string })}
                                placeholder="选择视频模型"
                            />
                        </div>
                        {/* 宽高比 + 分辨率 */}
                        <div className="flex items-center gap-2">
                            <Typography.Text className="w-16 shrink-0 text-xs text-slate-500">宽高比</Typography.Text>
                            <CloudSelect
                                className="flex-1 nodrag nopan nowheel"
                                value={data.aspectRatio}
                                options={VIDEO_ASPECT_RATIOS}
                                onChange={(value) => handlePatch({ aspectRatio: value as string })}
                            />
                            <Typography.Text className="shrink-0 text-xs text-slate-500">分辨率</Typography.Text>
                            <CloudSelect
                                className="flex-1 nodrag nopan nowheel"
                                value={data.resolution}
                                options={VIDEO_RESOLUTIONS}
                                onChange={(value) => handlePatch({ resolution: value as string })}
                            />
                        </div>
                        {/* 时长 */}
                        <div className="flex items-center gap-2">
                            <Typography.Text className="w-16 shrink-0 text-xs text-slate-500">时长</Typography.Text>
                            <InputNumber
                                className="flex-1 nodrag nopan nowheel"
                                value={data.duration || null}
                                min={VIDEO_DURATION_CONFIG.min}
                                max={VIDEO_DURATION_CONFIG.max}
                                step={VIDEO_DURATION_CONFIG.step}
                                placeholder="自动（4-12秒）"
                                addonAfter="秒"
                                onChange={(value) => handlePatch({ duration: value ?? 0 })}
                            />
                        </div>
                        {/* 音频 + 固定镜头 */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    size="small"
                                    checked={data.audio}
                                    onChange={(checked) => handlePatch({ audio: checked })}
                                />
                                <Typography.Text className="text-xs text-slate-600">生成音频</Typography.Text>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    size="small"
                                    checked={data.cameraFixed}
                                    onChange={(checked) => handlePatch({ cameraFixed: checked })}
                                />
                                <Typography.Text className="text-xs text-slate-600">固定镜头</Typography.Text>
                            </div>
                        </div>
                        {/* 提示词 */}
                        <Input.TextArea
                            className="nodrag nopan nowheel"
                            value={data.prompt}
                            onChange={(event) => handlePatch({ prompt: event.target.value })}
                            placeholder="补充视频节点自己的提示词，例如镜头运动和节奏描述"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
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
                <div className="space-y-3 border-t border-slate-200/80 pt-3">
                    <PreviewSection title="视频预览">
                        <button
                            onClick={() => message.info('视频上传功能正在开发')}
                            className="nodrag nopan nowheel flex h-56 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/70 transition-all hover:border-sky-400 hover:bg-sky-50/50"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <PlusOutlined className="text-3xl text-slate-400 transition-colors group-hover:text-sky-500" />
                                <Typography.Text className="text-xs text-slate-500">
                                    点击添加视频
                                </Typography.Text>
                            </div>
                        </button>
                    </PreviewSection>
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
