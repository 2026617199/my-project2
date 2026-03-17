import { AppstoreAddOutlined, FileTextOutlined, PictureOutlined, RobotOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'

import { CANVAS_NODE_TYPES, type CanvasNodeType } from '@/types/canvas'

interface CanvasLeftToolbarProps {
    onCreateNode: (type: CanvasNodeType) => void
    onCreateNovelAgent: () => void
    zoom: number
}

export default function CanvasLeftToolbar({ onCreateNode, onCreateNovelAgent, zoom }: CanvasLeftToolbarProps) {
    return (
        <div
            className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-md sm:p-3"
            style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'left center',
            }}
        >
            <Dropdown
                trigger={['click']}
                menu={{
                    items: [
                        {
                            key: CANVAS_NODE_TYPES.text,
                            icon: <FileTextOutlined />,
                            label: '创建文本节点',
                            onClick: () => onCreateNode(CANVAS_NODE_TYPES.text),
                        },
                        {
                            key: CANVAS_NODE_TYPES.image,
                            icon: <PictureOutlined />,
                            label: '创建图片节点',
                            onClick: () => onCreateNode(CANVAS_NODE_TYPES.image),
                        },
                        {
                            key: CANVAS_NODE_TYPES.video,
                            icon: <VideoCameraOutlined />,
                            label: '创建视频节点',
                            onClick: () => onCreateNode(CANVAS_NODE_TYPES.video),
                        },
                    ],
                }}
            >
                <Button
                    icon={<AppstoreAddOutlined />}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border-slate-200 text-slate-700 hover:border-sky-300 hover:text-sky-600 sm:w-auto sm:px-3"
                >
                    <span className="hidden sm:inline">节点创建</span>
                </Button>
            </Dropdown>

            <Dropdown
                trigger={['click']}
                menu={{
                    items: [
                        {
                            key: 'novel-to-script',
                            label: '小说改剧本',
                            onClick: onCreateNovelAgent,
                        },
                    ],
                }}
            >
                <Button
                    icon={<RobotOutlined />}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border-slate-200 text-violet-700 hover:border-violet-300 hover:text-violet-600 sm:w-auto sm:px-3"
                >
                    <span className="hidden sm:inline">智能体</span>
                </Button>
            </Dropdown>
        </div>
    )
}
