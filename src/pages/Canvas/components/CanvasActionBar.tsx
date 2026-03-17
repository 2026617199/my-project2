import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'

interface CanvasActionBarProps {
    onReset: () => void
    onSave: () => void
}

export function CanvasActionBar({ onReset, onSave }: CanvasActionBarProps) {
    return (
        <div className="absolute right-4 top-4 z-20 flex gap-2">
            <Tooltip title="恢复最近一次保存">
                <Button icon={<ReloadOutlined />} onClick={onReset}>
                    恢复
                </Button>
            </Tooltip>
            <Tooltip title="保存到浏览器本地">
                <Button type="primary" icon={<SaveOutlined />} onClick={onSave}>
                    保存
                </Button>
            </Tooltip>
        </div>
    )
}
