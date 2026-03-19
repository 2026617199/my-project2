type CanvasChatFabProps = {
    hasUnread: boolean
    onClick: () => void
}

export function CanvasChatFab({ hasUnread, onClick }: CanvasChatFabProps) {
    return (
        <button
            type="button"
            className="absolute bottom-6 right-6 z-40 h-14 w-14 rounded-full border border-sky-100 bg-white text-sky-600 shadow-[0_12px_30px_rgba(14,116,144,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(14,116,144,0.28)] active:translate-y-0"
            onClick={onClick}
            aria-label="打开 AI 对话"
        >
            <span className="pointer-events-none relative inline-flex h-full w-full items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 8.5a4 4 0 0 1 8 0v2.5h.5A2.5 2.5 0 0 1 19 13.5v1A2.5 2.5 0 0 1 16.5 17h-9A2.5 2.5 0 0 1 5 14.5v-1A2.5 2.5 0 0 1 7.5 11H8V8.5Z" />
                    <path d="M9.5 14h5M10.5 10h3" strokeLinecap="round" />
                    <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
                </svg>

                {hasUnread ? (
                    <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
            </span>
        </button>
    )
}
