import { IconSend2, IconSquare } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CANVAS_CHAT_MODELS } from '@/constants/ai-models'
import { CANVAS_CHAT_PERSONAS, NO_CHAT_PERSONA_ID } from '@/constants/chat-personas'
import type { ChatPersonaId } from '@/types/NoteGeneration'

type ChatComposerProps = {
    value: string
    onChange: (value: string) => void
    onSubmit: () => Promise<void> | void
    model: string
    onModelChange: (model: string) => void
    personaId: ChatPersonaId
    onPersonaChange: (personaId: ChatPersonaId) => void
    onStop?: () => void
    disabled?: boolean
    loading?: boolean
}

export const ChatComposer = ({
    value,
    onChange,
    onSubmit,
    model,
    onModelChange,
    personaId,
    onPersonaChange,
    onStop,
    disabled = false,
    loading = false,
}: ChatComposerProps) => {
    const canSend = value.trim().length > 0 && !disabled && !loading
    const canStop = loading && !disabled && Boolean(onStop)

    return (
        <footer className="border-t border-slate-200 px-4 py-3">
            <div className="flex items-end gap-2">
                <Textarea
                    value={value}
                    rows={3}
                    placeholder="输入你的问题..."
                    className="max-h-40 min-h-24 flex-1 resize-none border-slate-200 focus:border-blue-400 focus-visible:ring-0"
                    onChange={(event) => onChange(event.target.value)}
                />

                {loading ? (
                    <Button type="button" size="sm" variant="default" disabled={!canStop} onClick={onStop}>
                        <IconSquare size={14} />
                        停止
                    </Button>
                ) : (
                    <Button type="button" size="sm" variant="blue" disabled={!canSend} onClick={onSubmit}>
                        <IconSend2 size={16} />
                    </Button>
                )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                    <div className="text-xs text-slate-500">对话模型</div>
                    <Select value={model} onValueChange={onModelChange}>
                        <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-sm text-slate-700">
                            <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-56 overflow-y-auto">
                            {CANVAS_CHAT_MODELS.map((item) => (
                                <SelectItem key={item.id} value={item.model}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <div className="text-xs text-slate-500">对话人设</div>
                    <Select value={personaId} onValueChange={(nextValue) => onPersonaChange(nextValue as ChatPersonaId)}>
                        <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-sm text-slate-700">
                            <SelectValue placeholder="选择人设" />
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-56 overflow-y-auto">
                            <SelectItem value={NO_CHAT_PERSONA_ID}>默认对话（无人设）</SelectItem>
                            {CANVAS_CHAT_PERSONAS.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </footer>
    )
}
