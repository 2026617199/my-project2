export interface ChatModelOption {
  id: number
  name: string
  model: string
  platform: string
  platformId: number
}

export interface SystemPromptOption {
  label: string
  value: string
}

export interface ChatTokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  model?: string
  requestId?: string
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage?: ChatTokenUsage
}

export interface ChatSession {
  id: string
  title: string
  model: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export interface ChatHistoryPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}
