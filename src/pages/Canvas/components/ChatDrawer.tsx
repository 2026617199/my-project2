import { IconX } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DEFAULT_CANVAS_CHAT_MODEL } from '@/constants/ai-models'
import { NO_CHAT_PERSONA_ID } from '@/constants/chat-personas'
import type { ChatPersonaId, NoteGenerationMessage } from '@/types/NoteGeneration'

import { ChatComposer } from './ChatComposer'
import { ChatMessageList } from './ChatMessageList'

type ChatDrawerProps = {
    open: boolean
    onClose: () => void
    messages: NoteGenerationMessage[]
    isLoading: boolean
    onSend: (payload: { content: string; personaId: ChatPersonaId; model: string }) => Promise<void>
    onStop: () => void
}

export const ChatDrawer = ({
    open,
    onClose,
    messages,
    isLoading,
    onSend,
    onStop,
}: ChatDrawerProps) => {
    const [inputValue, setInputValue] = useState('')
    const [model, setModel] = useState(DEFAULT_CANVAS_CHAT_MODEL)
    const [personaId, setPersonaId] = useState<ChatPersonaId>(NO_CHAT_PERSONA_ID)

    const canSend = useMemo(() => {
        return inputValue.trim().length > 0 && !isLoading
    }, [inputValue, isLoading])

    const handleSend = async () => {
        if (!canSend) {
            return
        }

        const content = inputValue.trim()
        setInputValue('')
        await onSend({ content, personaId, model })
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent aria-label="AI 对话抽屉">
                <div className="flex h-full flex-col">
                    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <DialogTitle>AI 对话</DialogTitle>
                        <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                            onClick={onClose}
                        >
                            <IconX size={18} />
                        </button>
                    </header>

                    <ChatMessageList messages={messages} isLoading={isLoading} />

                    <ChatComposer
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleSend}
                        model={model}
                        onModelChange={setModel}
                        personaId={personaId}
                        onPersonaChange={setPersonaId}
                        onStop={onStop}
                        disabled={isLoading ? false : !canSend}
                        loading={isLoading}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
