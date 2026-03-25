import { IconX } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CANVAS_CHAT_MODELS, DEFAULT_CANVAS_CHAT_MODEL } from '@/constants/ai-models'
import type { ChatPersonaId, NoteGenerationMessage } from '@/types/NoteGeneration'

import { ChatComposer } from './ChatComposer'
import { ChatMessageList } from './ChatMessageList'

type ChatDrawerProps = {
    open: boolean
    onClose: () => void
    messages: NoteGenerationMessage[]
    isLoading: boolean
    personaId: ChatPersonaId
    onSend: (payload: { content: string; personaId: ChatPersonaId; model: string }) => Promise<void>
    onStop: () => void
}

export const ChatDrawer = ({
    open,
    onClose,
    messages,
    isLoading,
    personaId,
    onSend,
    onStop,
}: ChatDrawerProps) => {
    const [inputValue, setInputValue] = useState('')
    const [model, setModel] = useState(DEFAULT_CANVAS_CHAT_MODEL)

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
                        <div>
                            <DialogTitle>AI 对话</DialogTitle>
                            <DialogDescription>模型：{model}</DialogDescription>
                        </div>
                        <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                            onClick={onClose}
                        >
                            <IconX size={18} />
                        </button>
                    </header>

                    <div className="border-b border-slate-200 px-4 py-2">
                        <label className="mb-1 block text-xs text-slate-500">对话模型</label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-sm text-slate-700">
                                <SelectValue placeholder="选择模型" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {CANVAS_CHAT_MODELS.map((item) => (
                                    <SelectItem key={item.id} value={item.model}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ChatMessageList messages={messages} isLoading={isLoading} />

                    <ChatComposer
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleSend}
                        onStop={onStop}
                        disabled={isLoading ? false : !canSend}
                        loading={isLoading}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
