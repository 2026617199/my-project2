import { useEffect, useRef, useState } from 'react'

import { Button, Empty, Input, Select, Spin, Typography } from 'antd'

import type { ChatMessage, ChatSession, SystemPromptOption } from '@/types/chat'

type CanvasChatDrawerProps = {
    activeModelName: string
    activeSessionId: string | null
    hasMoreMessages: boolean
    hasMoreSessions: boolean
    isLoadingMessages: boolean
    isLoadingSessions: boolean
    isOpen: boolean
    isSending: boolean
    lastError: string | null
    messages: ChatMessage[]
    onClearHistory: () => Promise<void> | void
    onClose: () => void
    onCreateSession: () => Promise<void> | void
    onLoadMoreMessages: () => Promise<void> | void
    onLoadMoreSessions: () => Promise<void> | void
    onSelectSession: (sessionId: string) => Promise<void> | void
    onSendMessage: (message: string) => Promise<void> | void
    selectedSystemPrompt: string
    sessions: ChatSession[]
    setSelectedSystemPrompt: (value: string) => void
    systemPromptOptions: SystemPromptOption[]
}

function formatTimestamp(timestamp: number) {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

export function CanvasChatDrawer({
    activeModelName,
    activeSessionId,
    hasMoreMessages,
    hasMoreSessions,
    isLoadingMessages,
    isLoadingSessions,
    isOpen,
    isSending,
    lastError,
    messages,
    onClearHistory,
    onClose,
    onCreateSession,
    onLoadMoreMessages,
    onLoadMoreSessions,
    onSelectSession,
    onSendMessage,
    selectedSystemPrompt,
    sessions,
    setSelectedSystemPrompt,
    systemPromptOptions,
}: CanvasChatDrawerProps) {
    const [draft, setDraft] = useState('')
    const messageListRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!messageListRef.current) {
            return
        }

        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }, [messages, isOpen])

    const handleSend = async () => {
        const trimmed = draft.trim()
        if (!trimmed || isSending) {
            return
        }

        setDraft('')
        await onSendMessage(trimmed)
    }

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
                className={`absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            <aside
                className={`absolute right-0 top-0 flex h-screen w-95 transform flex-col border-l border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.25)] transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <header className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                    <div>
                        <Typography.Text strong className="text-slate-800">
                            AI 对话
                        </Typography.Text>
                        <Typography.Paragraph className="m-0! text-xs! text-slate-500!">模型：{activeModelName}</Typography.Paragraph>
                    </div>

                    <Button type="text" onClick={onClose}>
                        关闭
                    </Button>
                </header>

                <section className="border-b border-slate-200 p-3">
                    <div className="flex gap-2">
                        <Button type="primary" size="small" onClick={() => void onCreateSession()}>
                            新建会话
                        </Button>
                        <Button danger size="small" onClick={() => void onClearHistory()}>
                            清空历史
                        </Button>
                    </div>

                    <div className="mt-3 max-h-28 space-y-2 overflow-y-auto pr-1">
                        {sessions.map((session) => {
                            const active = session.id === activeSessionId
                            return (
                                <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => void onSelectSession(session.id)}
                                    className={`w-full rounded-lg border px-2 py-1 text-left text-xs transition-colors ${active
                                            ? 'border-sky-300 bg-sky-50 text-sky-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <p className="truncate font-medium">{session.title}</p>
                                    <p className="truncate text-[11px] text-slate-400">{formatTimestamp(session.updatedAt)}</p>
                                </button>
                            )
                        })}

                        {!sessions.length && !isLoadingSessions ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话，请先新建" />
                        ) : null}
                    </div>

                    {hasMoreSessions ? (
                        <div className="mt-2">
                            <Button block size="small" onClick={() => void onLoadMoreSessions()} loading={isLoadingSessions}>
                                加载更多会话
                            </Button>
                        </div>
                    ) : null}
                </section>

                <section ref={messageListRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
                    {hasMoreMessages ? (
                        <div className="mb-3 flex justify-center">
                            <Button size="small" onClick={() => void onLoadMoreMessages()} loading={isLoadingMessages}>
                                加载更早消息
                            </Button>
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        {messages.map((message) => {
                            const isUser = message.role === 'user'
                            return (
                                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <article
                                        className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm ${isUser ? 'bg-sky-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
                                        <p className={`mt-1 text-[11px] ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>
                                            {formatTimestamp(message.createdAt)}
                                        </p>
                                    </article>
                                </div>
                            )
                        })}

                        {!messages.length && activeSessionId ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="开始你的第一条消息吧" />
                        ) : null}

                        {!activeSessionId ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先新建会话" />
                        ) : null}
                    </div>

                    {isSending ? (
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <Spin size="small" /> AI 正在思考中...
                        </div>
                    ) : null}
                </section>

                <footer className="border-t border-slate-200 p-3">
                    <Select
                        value={selectedSystemPrompt}
                        options={systemPromptOptions}
                        className="w-full"
                        onChange={setSelectedSystemPrompt}
                        size="small"
                    />

                    <Input.TextArea
                        className="mt-2"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        placeholder="输入 Prompt 后发送"
                        onPressEnter={(event) => {
                            if (!event.shiftKey) {
                                event.preventDefault()
                                void handleSend()
                            }
                        }}
                    />

                    {lastError ? <p className="mt-2 text-xs text-rose-500">{lastError}</p> : null}

                    <Button
                        type="primary"
                        className="mt-2"
                        block
                        onClick={() => void handleSend()}
                        disabled={!activeSessionId}
                        loading={isSending}
                    >
                        发送
                    </Button>
                </footer>
            </aside>
        </div>
    )
}
