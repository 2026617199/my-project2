import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'

import { CanvasFlow } from './components/CanvasFlow'
import { CanvasSidebar } from './components/CanvasSidebar'
import { CanvasChatToolbar } from './components/CanvasChatToolbar'
import { ChatDrawer } from './components/ChatDrawer'
import { useCanvasChat } from '@/hooks/useCanvasChat'

// 外部组件 - 提供 ReactFlowProvider 和工具栏
const CanvasPage = () => {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const { messages, isLoading, sendMessage, stopMessage } = useCanvasChat()

    return (
        <ReactFlowProvider>
            <div className="h-screen w-screen">
                <CanvasFlow />

                {/* 悬浮侧边栏：与 CanvasFlow 同级，避免节点移动时不必要重渲染。 */}
                <CanvasSidebar />

                {/* 右下圆形聊天工具栏：负责打开抽屉与切换 system 人设。 */}
                <CanvasChatToolbar
                    onOpenChat={() => setIsChatOpen(true)}
                    isChatOpen={isChatOpen}
                />

                {/* 右侧抽屉聊天窗口：统一走 createChatCompletion，并使用 idb-keyval 持久化会话。 */}
                <ChatDrawer
                    open={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    messages={messages}
                    isLoading={isLoading}
                    onSend={sendMessage}
                    onStop={stopMessage}
                />
            </div>
        </ReactFlowProvider>
    )
}

export default CanvasPage