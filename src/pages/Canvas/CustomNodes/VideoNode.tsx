import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { InputNumber, Modal, Radio, Typography, message } from 'antd'
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

import { uploadImage } from '@/api/ai'
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
    const [isUploadLoading, setIsUploadLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string>()
    const toolbarActionTimerRef = useRef<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const promptCacheRef = useRef(data.prompt ?? '')

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

    const editor = useEditor({
        extensions: [StarterKit],
        content: data.prompt || '',
        immediatelyRender: true,
        editorProps: {
            attributes: {
                class:
                    'nodrag nopan nowheel min-h-[200px] max-h-[200px] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 focus:outline-none',
            },
        },
    })

    const commitPromptToStore = useCallback(() => {
        if (!editor) {
            return
        }

        const nextPrompt = editor.getText({ blockSeparator: '\n' }).trim()
        promptCacheRef.current = nextPrompt

        if (nextPrompt !== data.prompt) {
            handlePatch({ prompt: nextPrompt })
        }
    }, [data.prompt, editor, handlePatch])

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        const maxSize = 10 * 1024 * 1024

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: '仅支持 JPEG、PNG、WebP、GIF 格式图片' }
        }

        if (file.size > maxSize) {
            return { valid: false, error: '图片大小不能超过 10MB' }
        }

        return { valid: true }
    }

    const uploadReferenceImage = useCallback(
        async (file: File) => {
            setIsUploadLoading(true)
            setUploadError(undefined)

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('purpose', 'generation')

                const response = await uploadImage(formData)
                if (response.success && response.data?.url) {
                    const currentUploaded = Array.isArray(data.uploadedReferenceImageUrls)
                        ? data.uploadedReferenceImageUrls
                        : []

                    const appended = [...currentUploaded, response.data.url]

                    handlePatch({
                        uploadedReferenceImageUrls: Array.from(new Set(appended)),
                        dismissedAutoReferenceImageUrls: (data.dismissedAutoReferenceImageUrls ?? []).filter(
                            (item) => item !== response.data.url,
                        ),
                    })

                    message.success('参考图上传成功')
                    return
                }

                const errorMsg = response.message || '上传失败，请稍后重试'
                setUploadError(errorMsg)
                message.error(errorMsg)
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : '上传失败，请检查网络连接'
                setUploadError(errorMsg)
                message.error(errorMsg)
            } finally {
                setIsUploadLoading(false)
            }
        },
        [data.dismissedAutoReferenceImageUrls, data.uploadedReferenceImageUrls, handlePatch],
    )

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (!file) {
                return
            }

            const validation = validateFile(file)
            if (!validation.valid) {
                setUploadError(validation.error)
                message.error(validation.error)
                event.target.value = ''
                return
            }

            void uploadReferenceImage(file)
            event.target.value = ''
        },
        [uploadReferenceImage],
    )

    const handleDeleteReferenceImage = useCallback(
        (url: string) => {
            const nextUploaded = (data.uploadedReferenceImageUrls ?? []).filter((item) => item !== url)
            const dismissed = Array.from(new Set([...(data.dismissedAutoReferenceImageUrls ?? []), url]))

            handlePatch({
                uploadedReferenceImageUrls: nextUploaded,
                dismissedAutoReferenceImageUrls: dismissed,
            })
        },
        [data.dismissedAutoReferenceImageUrls, data.uploadedReferenceImageUrls, handlePatch],
    )

    const handleRunVideo = useCallback(() => {
        commitPromptToStore()
        void runNode(id)
    }, [commitPromptToStore, id, runNode])

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

    useEffect(() => {
        const patch: Partial<VideoNodeData> = {}

        if (!data.model) {
            patch.model = VIDEO_MODELS[0]?.model ?? ''
        }
        if (!data.aspectRatio) {
            patch.aspectRatio = '16:9'
        }
        if (!data.resolution) {
            patch.resolution = '720p'
        }
        if (!data.duration || data.duration < VIDEO_DURATION_CONFIG.min) {
            patch.duration = VIDEO_DURATION_CONFIG.defaultValue
        }

        if (!Array.isArray(data.referenceImageUrls)) {
            patch.referenceImageUrls = []
        }
        if (!Array.isArray(data.uploadedReferenceImageUrls)) {
            patch.uploadedReferenceImageUrls = []
        }
        if (!Array.isArray(data.dismissedAutoReferenceImageUrls)) {
            patch.dismissedAutoReferenceImageUrls = []
        }

        if (typeof data.audio !== 'boolean') {
            patch.audio = true
        }
        if (typeof data.cameraFixed !== 'boolean') {
            patch.cameraFixed = false
        }

        if (Object.keys(patch).length > 0) {
            handlePatch(patch)
        }
    }, [data, handlePatch])

    useEffect(() => {
        if (!editor) {
            return
        }

        const nextPrompt = data.prompt || ''
        if (nextPrompt === promptCacheRef.current) {
            return
        }

        promptCacheRef.current = nextPrompt
        if (!editor.isFocused) {
            editor.commands.setContent(nextPrompt)
        }
    }, [data.prompt, editor])

    const referenceImageUrls = data.referenceImageUrls ?? []
    const hasHorizontalScroll = referenceImageUrls.length > 8

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
                    style={{ width: 640, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                    {/* 视频节点工具栏 */}
                    <div className="space-y-4">
                        <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadLoading}
                                    className="nodrag nopan nowheel flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-200 text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="上传参考图"
                                    aria-label="上传参考图"
                                >
                                    <PlusOutlined className="text-lg" />
                                </button>

                                <div
                                    className={`nodrag nopan nowheel h-16 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1 ${hasHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
                                >
                                    {referenceImageUrls.length > 0 ? (
                                        <div className="flex h-full items-center gap-2">
                                            {referenceImageUrls.map((url, index) => (
                                                <div key={`${url}-${index}`} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                                                    <img src={url} alt={`参考图-${index + 1}`} className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteReferenceImage(url)}
                                                        className="nodrag nopan nowheel absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-md bg-rose-500/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                        title="删除参考图"
                                                        aria-label={`删除参考图${index + 1}`}
                                                    >
                                                        <DeleteOutlined className="text-[10px]" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center text-xs text-slate-400">
                                            暂无参考图，点击左侧按钮上传（支持自动注入上游图片）。
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />
                            {uploadError ? (
                                <Typography.Text className="block text-xs text-rose-600">{uploadError}</Typography.Text>
                            ) : null}
                        </section>

                        <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div className="flex items-center justify-between">
                                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    中部区域 · 编辑区（prompt）
                                </Typography.Text>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                                        onClick={() => editor?.chain().focus().undo().run()}
                                        disabled={!editor?.can().undo()}
                                    >
                                        撤销
                                    </button>
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                                        onClick={() => editor?.chain().focus().redo().run()}
                                        disabled={!editor?.can().redo()}
                                    >
                                        重做
                                    </button>
                                    <button
                                        type="button"
                                        className="nodrag nopan nowheel rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-100"
                                        onClick={() => {
                                            editor?.commands.clearContent()
                                            promptCacheRef.current = ''
                                            handlePatch({ prompt: '' })
                                        }}
                                    >
                                        清空
                                    </button>
                                </div>
                            </div>
                            <div onBlur={commitPromptToStore}>
                                <EditorContent editor={editor} />
                            </div>
                            {/* 工具栏部分 */}
                            <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                <Typography.Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    下部区域 · 工具栏
                                </Typography.Text>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">模型</Typography.Text>
                                        <CloudSelect
                                            className="nodrag nopan nowheel"
                                            value={data.model}
                                            options={modelOptions}
                                            onChange={(value) => handlePatch({ model: String(value) })}
                                            placeholder="选择视频模型"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">宽高比</Typography.Text>
                                        <CloudSelect
                                            className="nodrag nopan nowheel"
                                            value={data.aspectRatio}
                                            options={VIDEO_ASPECT_RATIOS}
                                            onChange={(value) => handlePatch({ aspectRatio: String(value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">分辨率</Typography.Text>
                                        <CloudSelect
                                            className="nodrag nopan nowheel"
                                            value={data.resolution}
                                            options={VIDEO_RESOLUTIONS}
                                            onChange={(value) => handlePatch({ resolution: String(value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">视频时长（秒）</Typography.Text>
                                        <InputNumber
                                            className="w-full nodrag nopan nowheel"
                                            min={VIDEO_DURATION_CONFIG.min}
                                            max={VIDEO_DURATION_CONFIG.max}
                                            step={VIDEO_DURATION_CONFIG.step}
                                            value={data.duration}
                                            addonAfter="秒"
                                            onChange={(value) =>
                                                handlePatch({
                                                    duration: value && value >= VIDEO_DURATION_CONFIG.min
                                                        ? Number(value)
                                                        : VIDEO_DURATION_CONFIG.defaultValue,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">是否生成音频</Typography.Text>
                                        <Radio.Group
                                            className="nodrag nopan nowheel"
                                            value={data.audio}
                                            onChange={(event) => handlePatch({ audio: Boolean(event.target.value) })}
                                            options={[
                                                { label: '是', value: true },
                                                { label: '否', value: false },
                                            ]}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Typography.Text className="text-xs text-slate-500">固定镜头</Typography.Text>
                                        <Radio.Group
                                            className="nodrag nopan nowheel"
                                            value={data.cameraFixed}
                                            onChange={(event) => handlePatch({ cameraFixed: Boolean(event.target.value) })}
                                            options={[
                                                { label: '是', value: true },
                                                { label: '否', value: false },
                                            ]}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <CloudButton loading={data.status === 'queued' || data.status === 'running'} onClick={handleRunVideo}>
                                        生成视频
                                    </CloudButton>
                                </div>
                            </section>
                        </section>
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
