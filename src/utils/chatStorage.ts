import { del, get, keys, set } from 'idb-keyval'

import type { ChatHistoryPage, ChatMessage, ChatSession } from '@/types/chat'

const CHAT_SESSION_KEY_PREFIX = 'chat-'

function isChatSessionKey(key: unknown): key is string {
  return typeof key === 'string' && key.startsWith(CHAT_SESSION_KEY_PREFIX)
}

function getDefaultSessionTitle() {
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  return `会话 ${time}`
}

async function generateUniqueSessionId() {
  let nextTimestamp = Date.now()

  while (true) {
    const sessionId = `${CHAT_SESSION_KEY_PREFIX}${nextTimestamp}`
    const existed = await get<ChatSession | undefined>(sessionId)

    if (!existed) {
      return sessionId
    }

    nextTimestamp += 1
  }
}

async function listAllSessions() {
  const allKeys = await keys()
  const sessionKeys = allKeys.filter(isChatSessionKey)
  const sessions = await Promise.all(sessionKeys.map((sessionId) => get<ChatSession | undefined>(sessionId)))

  return sessions
    .filter((session): session is ChatSession => Boolean(session))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createChatSession(payload: {
  title?: string
  model: string
  systemPrompt?: string
}) {
  const now = Date.now()
  const sessionId = await generateUniqueSessionId()

  const session: ChatSession = {
    id: sessionId,
    title: payload.title?.trim() || getDefaultSessionTitle(),
    model: payload.model,
    systemPrompt: payload.systemPrompt,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }

  await set(session.id, session)

  return session
}

export async function getChatSessionById(sessionId: string) {
  return (await get<ChatSession | undefined>(sessionId)) ?? null
}

export async function listChatSessions(page = 1, pageSize = 10): Promise<ChatHistoryPage<ChatSession>> {
  const safePage = Math.max(page, 1)
  const safePageSize = Math.max(pageSize, 1)
  const sessions = await listAllSessions()
  const start = (safePage - 1) * safePageSize
  const end = start + safePageSize

  return {
    items: sessions.slice(start, end),
    page: safePage,
    pageSize: safePageSize,
    total: sessions.length,
    hasMore: end < sessions.length,
  }
}

export async function listChatSessionMessages(
  sessionId: string,
  page = 1,
  pageSize = 20,
): Promise<ChatHistoryPage<ChatMessage>> {
  const safePage = Math.max(page, 1)
  const safePageSize = Math.max(pageSize, 1)
  const session = await getChatSessionById(sessionId)
  const allMessages = session?.messages ?? []
  const total = allMessages.length

  if (!total) {
    return {
      items: [],
      page: safePage,
      pageSize: safePageSize,
      total: 0,
      hasMore: false,
    }
  }

  const end = Math.max(total - (safePage - 1) * safePageSize, 0)
  const start = Math.max(end - safePageSize, 0)

  return {
    items: allMessages.slice(start, end),
    page: safePage,
    pageSize: safePageSize,
    total,
    hasMore: start > 0,
  }
}

export async function appendMessagesToSession(
  sessionId: string,
  messages: ChatMessage[],
  options?: { systemPrompt?: string; model?: string },
) {
  const session = await getChatSessionById(sessionId)

  if (!session) {
    throw new Error('会话不存在，请先新建会话')
  }

  const updatedSession: ChatSession = {
    ...session,
    model: options?.model ?? session.model,
    systemPrompt: options?.systemPrompt ?? session.systemPrompt,
    updatedAt: Date.now(),
    messages: [...session.messages, ...messages],
  }

  await set(updatedSession.id, updatedSession)

  return updatedSession
}

export async function clearChatHistory() {
  const allKeys = await keys()
  const sessionKeys = allKeys.filter(isChatSessionKey)

  await Promise.all(sessionKeys.map((sessionId) => del(sessionId)))
}
