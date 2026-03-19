import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createMessagesStream } from '@/api/ai'
import { CHAT_SYSTEM_PROMPTS, CHAT_TEXT_MODELS } from '@/constants/ai-models'
import type { AnthropicGenerationRequest, AnthropicMessage } from '@/types/AnthropicGeneration'
import type { ChatMessage, ChatSession } from '@/types/chat'
import { consumeAnthropicSSE } from '@/utils/anthropicStream'
import {
  appendMessagesToSession,
  clearChatHistory,
  createChatSession,
  getChatSessionById,
  listChatSessionMessages,
  listChatSessions,
} from '@/utils/chatStorage'

const SESSION_PAGE_SIZE = 10
const MESSAGE_PAGE_SIZE = 20

function toAnthropicMessage(message: ChatMessage): AnthropicMessage {
  return {
    role: message.role,
    content: message.content,
  }
}

function upsertSessionToTop(sessions: ChatSession[], updated: ChatSession) {
  const filtered = sessions.filter((session) => session.id !== updated.id)
  return [updated, ...filtered]
}

function createLocalMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: `chat-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  }
}

export function useCanvasChat() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionPage, setSessionPage] = useState(1)
  const [hasMoreSessions, setHasMoreSessions] = useState(false)
  const [messagePage, setMessagePage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState(CHAT_SYSTEM_PROMPTS[0]?.value ?? '')
  const [lastError, setLastError] = useState<string | null>(null)

  const isDrawerOpenRef = useRef(isDrawerOpen)
  const activeSessionIdRef = useRef(activeSessionId)

  const activeModel = useMemo(() => {
    return CHAT_TEXT_MODELS[0] ?? { id: 0, name: 'DeepSeek V3.2', model: 'deepseek-v3.2', platform: 'deepseek', platformId: 17 }
  }, [])

  const loadSessions = useCallback(async (page: number, append: boolean) => {
    setIsLoadingSessions(true)

    try {
      const result = await listChatSessions(page, SESSION_PAGE_SIZE)
      setSessions((prev) => (append ? [...prev, ...result.items] : result.items))
      setSessionPage(result.page)
      setHasMoreSessions(result.hasMore)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  const loadMessages = useCallback(async (sessionId: string, page: number, appendOldMessages: boolean) => {
    setIsLoadingMessages(true)

    try {
      const result = await listChatSessionMessages(sessionId, page, MESSAGE_PAGE_SIZE)
      setMessages((prev) => (appendOldMessages ? [...result.items, ...prev] : result.items))
      setMessagePage(result.page)
      setHasMoreMessages(result.hasMore)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  const selectSession = useCallback(
    async (sessionId: string) => {
      const session = await getChatSessionById(sessionId)
      if (!session) {
        setLastError('会话不存在，请刷新后重试')
        return
      }

      setActiveSessionId(session.id)
      setSelectedSystemPrompt(session.systemPrompt || CHAT_SYSTEM_PROMPTS[0]?.value || '')
      await loadMessages(session.id, 1, false)
      setLastError(null)
    },
    [loadMessages],
  )

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true)
    setHasUnread(false)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])

  const createSession = useCallback(async () => {
    const session = await createChatSession({
      model: activeModel.model,
      systemPrompt: selectedSystemPrompt || undefined,
    })

    setSessions((prev) => upsertSessionToTop(prev, session))
    setActiveSessionId(session.id)
    setMessages([])
    setMessagePage(1)
    setHasMoreMessages(false)
    setLastError(null)
  }, [activeModel.model, selectedSystemPrompt])

  const loadMoreSessions = useCallback(async () => {
    if (!hasMoreSessions || isLoadingSessions) {
      return
    }

    await loadSessions(sessionPage + 1, true)
  }, [hasMoreSessions, isLoadingSessions, loadSessions, sessionPage])

  const loadMoreMessages = useCallback(async () => {
    const currentSessionId = activeSessionIdRef.current
    if (!currentSessionId || !hasMoreMessages || isLoadingMessages) {
      return
    }

    await loadMessages(currentSessionId, messagePage + 1, true)
  }, [hasMoreMessages, isLoadingMessages, loadMessages, messagePage])

  const clearHistory = useCallback(async () => {
    await clearChatHistory()
    setSessions([])
    setActiveSessionId(null)
    setMessages([])
    setSessionPage(1)
    setHasMoreSessions(false)
    setMessagePage(1)
    setHasMoreMessages(false)
    setLastError(null)
    setHasUnread(false)
  }, [])

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmed = input.trim()
      const currentSessionId = activeSessionIdRef.current

      if (!trimmed) {
        return
      }

      if (!currentSessionId) {
        setLastError('请先点击“新建会话”')
        return
      }

      const session = await getChatSessionById(currentSessionId)
      if (!session) {
        setLastError('会话不存在，请新建会话后再试')
        return
      }

      setIsSending(true)
      setLastError(null)

      const userMessage = createLocalMessage('user', trimmed)
      const requestMessages = [...session.messages, userMessage].map(toAnthropicMessage)
      const requestPayload: AnthropicGenerationRequest = {
        model: activeModel.model,
        messages: requestMessages,
        max_tokens: 32000,
        stream: true,
        system: selectedSystemPrompt || undefined,
      }

      try {
        const updatedSessionWithUser = await appendMessagesToSession(currentSessionId, [userMessage], {
          systemPrompt: selectedSystemPrompt || undefined,
          model: activeModel.model,
        })

        if (activeSessionIdRef.current === currentSessionId) {
          setMessages((prev) => [...prev, userMessage])
        }

        setSessions((prev) => upsertSessionToTop(prev, updatedSessionWithUser))

        const assistantDraft = createLocalMessage('assistant', '')
        if (activeSessionIdRef.current === currentSessionId) {
          setMessages((prev) => [...prev, assistantDraft])
        }

        const streamResponse = await createMessagesStream(requestPayload)
        const streamResult = await consumeAnthropicSSE(streamResponse, {
          onText: (chunk) => {
            if (!chunk || activeSessionIdRef.current !== currentSessionId) {
              return
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantDraft.id
                  ? {
                      ...message,
                      content: message.content + chunk,
                    }
                  : message,
              ),
            )

            if (!isDrawerOpenRef.current) {
              setHasUnread(true)
            }
          },
        })

        const assistantText = streamResult.text.trim() || '（模型未返回文本内容）'
        const assistantMessage: ChatMessage = {
          ...assistantDraft,
          content: assistantText,
          model: streamResult.model || activeModel.model,
          requestId: streamResult.id,
          stopReason: streamResult.stop_reason,
          usage: streamResult.usage
            ? {
                inputTokens: streamResult.usage.input_tokens,
                outputTokens: streamResult.usage.output_tokens,
              }
            : undefined,
        }

        const updatedSessionWithAssistant = await appendMessagesToSession(currentSessionId, [assistantMessage], {
          systemPrompt: selectedSystemPrompt || undefined,
          model: activeModel.model,
        })

        if (activeSessionIdRef.current === currentSessionId) {
          setMessages((prev) =>
            prev.map((message) => (message.id === assistantDraft.id ? assistantMessage : message)),
          )
        }

        setSessions((prev) => upsertSessionToTop(prev, updatedSessionWithAssistant))

        if (!isDrawerOpenRef.current) {
          setHasUnread(true)
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : '发送失败，请稍后重试'
        setLastError(reason)
      } finally {
        setIsSending(false)
      }
    },
    [activeModel.model, selectedSystemPrompt],
  )

  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen
  }, [isDrawerOpen])

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    void loadSessions(1, false)
  }, [loadSessions])

  useEffect(() => {
    if (!isDrawerOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeDrawer, isDrawerOpen])

  return {
    activeModel,
    activeSessionId,
    closeDrawer,
    createSession,
    clearHistory,
    hasMoreMessages,
    hasMoreSessions,
    hasUnread,
    isDrawerOpen,
    isLoadingMessages,
    isLoadingSessions,
    isSending,
    lastError,
    loadMoreMessages,
    loadMoreSessions,
    messages,
    openDrawer,
    selectSession,
    selectedSystemPrompt,
    sendMessage,
    sessions,
    setSelectedSystemPrompt,
    systemPromptOptions: CHAT_SYSTEM_PROMPTS,
  }
}
