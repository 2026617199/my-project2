import type { ColorMode } from '@xyflow/react'
import { Layout, Select, Slider, Space, Typography } from 'antd'

interface CanvasHeaderProps {
    colorMode: ColorMode
    paneClickDistance: number
    onColorModeChange: (value: ColorMode) => void
    onPaneClickDistanceChange: (value: number) => void
}

export function CanvasHeader({
    colorMode,
    paneClickDistance,
    onColorModeChange,
    onPaneClickDistanceChange,
}: CanvasHeaderProps) {
    return (
        <Layout.Header className="z-10 flex items-center justify-between border-b! border-slate-200! bg-white/80! px-4! py-2 backdrop-blur-sm!">
            <Space align="center" size="large">
                <div>
                    <Typography.Text strong className="block text-lg text-slate-900">
                        画布编辑器
                    </Typography.Text>
                    <Typography.Text type="secondary" className="text-xs">
                        右键空白区创建节点，连接文本 / 图片 / 视频，让生成链路在画布里流动起来。
                    </Typography.Text>
                </div>
            </Space>
            <Space align="center" size="middle">
                <div className="flex items-center gap-2">
                    <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
                        点击阈值:
                    </Typography.Text>
                    <Slider
                        min={0}
                        max={100}
                        value={paneClickDistance}
                        onChange={(value) => onPaneClickDistanceChange(Array.isArray(value) ? value[0] : value)}
                        className="w-24"
                    />
                    <Typography.Text type="secondary" className="w-6 text-xs">
                        {paneClickDistance}
                    </Typography.Text>
                </div>
                <Select
                    value={colorMode}
                    onChange={(value) => onColorModeChange(value as ColorMode)}
                    options={[
                        { value: 'dark', label: '深色' },
                        { value: 'light', label: '浅色' },
                        { value: 'system', label: '跟随系统' },
                    ]}
                    className="w-28"
                />
            </Space>
        </Layout.Header>
    )
}
