import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { Input, InputNumber, Modal, Switch, Typography, message } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    DownloadOutlined,
    ExpandOutlined,
    ReloadOutlined,
    ScissorOutlined,
    ThunderboltOutlined,
    FullscreenOutlined,
} from '@ant-design/icons'
import ReactPlayer from 'react-player'

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

type ActionToolbarItem = {
    key: 'redraw' | 'erase' | 'enhance' | 'outpaint' | 'crop' | 'download' | 'zoom'
    label: '重绘' | '擦除' | '增强' | '扩图' | '裁剪' | '下载' | '放大查看'
    icon: React.ReactNode
}

function VideoNode({ id, data, selected }: NodeProps<VideoCanvasNode>) {
    const updateNodeData = useCanvasStore((state) => state.updateNodeData)
    const runNode = useCanvasStore((state) => state.runNode)
    const zoom = useCanvasStore((state) => state.viewport.zoom)

    const [activeToolbarAction, setActiveToolbarAction] = useState<ActionToolbarItem['key'] | null>(null)
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false)
    const toolbarActionTimerRef = useRef<number | null>(null)

    const previewVideoUrl = data.outputVideos[0]?.url

    const modelOptions = useMemo(
        () => VIDEO_MODELS.map((item) => ({ label: item.name, value: item.model })),
        [],
    )

    const actionToolbarItems = useMemo<ActionToolbarItem[]>(
        () => [
            { key: 'redraw', label: '重绘', icon: <ReloadOutlined className="text-[24px]" /> },
            { key: 'erase', label: '擦除', icon: <DeleteOutlined className="text-[24px]" /> },
            { key: 'enhance', label: '增强', icon: <ThunderboltOutlined className="text-[24px]" /> },
            { key: 'outpaint', label: '扩图', icon: <ExpandOutlined className="text-[24px]" /> },
            { key: 'crop', label: '裁剪', icon: <ScissorOutlined className="text-[24px]" /> },
            { key: 'download', label: '下载', icon: <DownloadOutlined className="text-[24px]" /> },
            { key: 'zoom', label: '放大查看', icon: <FullscreenOutlined className="text-[24px]" /> },
        ],
        [],
    )

    const handlePatch = useCallback(
        (patch: Partial<VideoNodeData>) => {
            updateNodeData(id, patch)
        },
        [id, updateNodeData],
    )

    const showActionFeedback = useCallback((action: ActionToolbarItem['key'], label: string) => {
        setActiveToolbarAction(action)

        if (toolbarActionTimerRef.current) {
            window.clearTimeout(toolbarActionTimerRef.current)
        }

        toolbarActionTimerRef.current = window.setTimeout(() => {
            setActiveToolbarAction((prev) => (prev === action ? null : prev))
        }, 320)

        message.info(`${label}事件已触发（占位功能）`)
    }, [])

    const handleToolbarAction = useCallback(
        (item: ActionToolbarItem) => {
            setActiveToolbarAction(item.key)

            if (item.key === 'zoom') {
                if (!previewVideoUrl) {
                    message.warning('当前没有可放大查看的视频')
                    return
                }

                setIsVideoPlayerOpen(true)

                if (toolbarActionTimerRef.current) {
                    window.clearTimeout(toolbarActionTimerRef.current)
                }
                toolbarActionTimerRef.current = window.setTimeout(() => {
                    setActiveToolbarAction((prev) => (prev === 'zoom' ? null : prev))
                }, 320)
                return
            }

            showActionFeedback(item.key, item.label)
        },
        [previewVideoUrl, showActionFeedback],
    )

    useEffect(() => {
        return () => {
            if (toolbarActionTimerRef.current) {
                window.clearTimeout(toolbarActionTimerRef.current)
            }
        }
    }, [])

    return (
        <>
            <NodeToolbar isVisible position={Position.Top} offset={10 * zoom}>
                <div
                    className={`nodrag nopan nowheel inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md transition-all duration-200 ${selected
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                        }`}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'bottom center' }}
                >
                    {actionToolbarItems.map((item) => {
                        const isActive = item.key === 'zoom' ? isVideoPlayerOpen : activeToolbarAction === item.key

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => void handleToolbarAction(item)}
                                className={`nodrag nopan nowheel inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-all duration-200 ${isActive
                                    ? 'border-sky-300 bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(125,211,252,0.4)]'
                                    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                title={item.label}
                                aria-label={item.label}
                            >
                                <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </NodeToolbar>
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
                        {previewVideoUrl ? (
                            <video
                                src={previewVideoUrl}
                                controls
                                className="nodrag nopan nowheel h-56 w-full rounded-2xl object-cover"
                            />
                        ) : (
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
                        )}
                    </PreviewSection>
                </div>
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{ height: 12, width: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: '#94a3b8' }}
                />
            </NodeShell>
            <Modal
                open={isVideoPlayerOpen}
                title="放大查看"
                onCancel={() => setIsVideoPlayerOpen(false)}
                footer={null}
                width={980}
                centered
                destroyOnClose
                classNames={{
                    container: 'rounded-2xl overflow-hidden',
                    header: 'border-b border-slate-200 bg-white',
                    body: 'bg-slate-950 p-3',
                }}
            >
                {previewVideoUrl ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-black">
                        <ReactPlayer
                            src={previewVideoUrl}
                            controls
                            playing
                            width="100%"
                            height="100%"
                        />
                    </div>
                ) : (
                    <Typography.Text className="text-slate-200">暂无可播放的视频</Typography.Text>
                )}
            </Modal>
        </>
    )
}

export default memo(VideoNode)
