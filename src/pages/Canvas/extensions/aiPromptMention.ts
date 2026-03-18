import Mention from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'

export type AiPromptMenuItem = {
    key: string
    label: '多机位九宫格' | '角色三视图生成' | '角色立绘图生成'
    prompt: string
}

const AI_PROMPT_MENU_ITEMS: AiPromptMenuItem[] = [
    {
        key: 'multi-camera-nine-grid',
        label: '多机位九宫格',
        prompt:
            '把人物图集合成特写+正面，生成一张面部特写（[此处自动插入角色的性格描述]）和它的全身图（最左边是超大的人物面部特写，右边放人物全身，生成一张图片，渐变色纯色背景，丰富的光影。',
    },
    {
        key: 'three-view-character',
        label: '角色三视图生成',
        prompt:
            '把人物图集合成一个21:9的特写+三视图，生成一张面部特写（[此处自动插入角色的性格描述]）和全身三视图（最左边是超大的人物面部特写，右边放人物全身的正视图，侧视图，后视图），生成在一张图片里面，渐变色纯色背景，丰富的光影。',
    },
    {
        key: 'character-standing-illustration',
        label: '角色立绘图生成',
        prompt: '把人物图集合成为一个3x3的多机位九宫格分镜图，展示同一角色在不同摄影机角度与镜头语言下的表现',
    },
]

type MenuRendererState = {
    root: HTMLDivElement
    list: HTMLUListElement
    cleanup: () => void
    update: (props: SuggestionProps<AiPromptMenuItem>) => void
    onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const createUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const createMenuRenderer = () => {
    let state: MenuRendererState | null = null

    const destroy = () => {
        state?.cleanup()
        state = null
    }

    const mount = (props: SuggestionProps<AiPromptMenuItem>) => {
        let selectedIndex = 0
        let currentProps = props

        const root = document.createElement('div')
        root.className = 'ai-prompt-slash-menu nodrag nopan nowheel'
        root.setAttribute('role', 'listbox')

        const list = document.createElement('ul')
        list.className = 'ai-prompt-slash-menu__list'
        root.appendChild(list)

        const preventScroll = (event: WheelEvent) => {
            event.preventDefault()
        }

        const handleOutsideMouseDown = (event: MouseEvent) => {
            const target = event.target as Node | null
            if (!target || root.contains(target)) {
                return
            }

            destroy()
        }

        const setMenuPosition = (nextProps: SuggestionProps<AiPromptMenuItem>) => {
            const rect = nextProps.clientRect?.()
            if (!rect) {
                return
            }

            root.style.left = `${window.scrollX + rect.left}px`
            root.style.top = `${window.scrollY + rect.bottom + 8}px`
        }

        const selectItem = (item: AiPromptMenuItem, from: number, to: number) => {
            currentProps.editor
                .chain()
                .focus()
                .insertContentAt(
                    { from, to },
                    [
                        {
                            type: 'aiPromptMention',
                            attrs: {
                                id: createUuid(),
                                label: item.label,
                                prompt: item.prompt,
                                type: 'aiPrompt',
                            },
                        },
                        {
                            type: 'text',
                            text: ' ',
                        },
                    ],
                )
                .run()
        }

        const getMenuItemFromIndex = (index: number) => AI_PROMPT_MENU_ITEMS[index]

        const render = () => {
            list.innerHTML = ''

            AI_PROMPT_MENU_ITEMS.forEach((item, index) => {
                const menuItem = document.createElement('li')
                menuItem.className = 'ai-prompt-slash-menu__item'
                menuItem.setAttribute('role', 'option')
                menuItem.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false')

                if (index === selectedIndex) {
                    menuItem.classList.add('is-active')
                }

                menuItem.textContent = item.label
                menuItem.addEventListener('mouseenter', () => {
                    selectedIndex = index
                    render()
                })

                menuItem.addEventListener('mousedown', (event) => {
                    event.preventDefault()
                })

                menuItem.addEventListener('click', (event) => {
                    const isAppend = event.ctrlKey || event.metaKey

                    if (!isAppend) {
                        selectItem(item, currentProps.range.from, currentProps.range.to)
                        destroy()
                        return
                    }

                    const { state } = currentProps.editor
                    const cursorPos = state.selection.from
                    selectItem(item, cursorPos, cursorPos)
                    destroy()
                })

                list.appendChild(menuItem)
            })
        }

        const update = (nextProps: SuggestionProps<AiPromptMenuItem>) => {
            currentProps = nextProps
            setMenuPosition(nextProps)
            render()
        }

        const onKeyDown = ({ event }: SuggestionKeyDownProps) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                event.stopPropagation()
                selectedIndex = (selectedIndex + 1) % AI_PROMPT_MENU_ITEMS.length
                render()
                return true
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                selectedIndex = (selectedIndex - 1 + AI_PROMPT_MENU_ITEMS.length) % AI_PROMPT_MENU_ITEMS.length
                render()
                return true
            }

            if (event.key === 'Enter') {
                event.preventDefault()
                event.stopPropagation()
                const selectedItem = getMenuItemFromIndex(selectedIndex)

                if (selectedItem) {
                    selectItem(selectedItem, currentProps.range.from, currentProps.range.to)
                }

                destroy()
                return true
            }

            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                destroy()
                return true
            }

            if (event.key === 'Backspace' && currentProps.query.length === 0) {
                event.preventDefault()
                event.stopPropagation()
                currentProps.editor.chain().focus().deleteRange(currentProps.range).run()
                destroy()
                return true
            }

            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                event.stopPropagation()
                return true
            }

            return false
        }

        const cleanup = () => {
            window.removeEventListener('wheel', preventScroll)
            document.removeEventListener('mousedown', handleOutsideMouseDown, true)

            if (root.parentElement) {
                root.parentElement.removeChild(root)
            }
        }

        update(props)
        document.body.appendChild(root)

        window.addEventListener('wheel', preventScroll, { passive: false })
        document.addEventListener('mousedown', handleOutsideMouseDown, true)

        state = {
            root,
            list,
            cleanup,
            update,
            onKeyDown,
        }
    }

    return {
        onStart: (props: SuggestionProps<AiPromptMenuItem>) => {
            destroy()
            mount(props)
        },
        onUpdate: (props: SuggestionProps<AiPromptMenuItem>) => {
            state?.update(props)
        },
        onKeyDown: (props: SuggestionKeyDownProps) => {
            if (!state) {
                return false
            }

            return state.onKeyDown(props)
        },
        onExit: () => {
            destroy()
        },
    }
}

export const AiPromptMention = Mention.extend({
    name: 'aiPromptMention',

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-id'),
                renderHTML: (attributes) => ({ 'data-id': attributes.id }),
            },
            label: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent ?? '',
                renderHTML: (attributes) => ({ 'data-label': attributes.label }),
            },
            prompt: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-prompt') ?? '',
                renderHTML: (attributes) => ({ 'data-prompt': attributes.prompt }),
            },
            type: {
                default: 'aiPrompt',
                parseHTML: (element) => element.getAttribute('data-type') ?? 'aiPrompt',
                renderHTML: (attributes) => ({ 'data-type': attributes.type }),
            },
        }
    },

    renderHTML({ HTMLAttributes, node }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'ai-prompt-mention',
                contenteditable: 'false',
            }),
            node.attrs.label,
        ]
    },

    renderText({ node }) {
        return node.attrs.label
    },

    addKeyboardShortcuts() {
        return {
            Backspace: () => {
                const { state } = this.editor
                const { selection } = state

                if (!selection.empty) {
                    return false
                }

                const { $from } = selection
                const nodeBefore = $from.nodeBefore

                if (!nodeBefore || nodeBefore.type.name !== this.name) {
                    return false
                }

                const from = $from.pos - nodeBefore.nodeSize
                this.editor.commands.deleteRange({ from, to: $from.pos })
                return true
            },
        }
    },
}).configure({
    suggestion: {
        char: '/',
        allowSpaces: true,
        startOfLine: false,
        allowedPrefixes: null,
        items: () => AI_PROMPT_MENU_ITEMS,
        command: ({ editor, range, props }) => {
            const selectedItem = props as unknown as AiPromptMenuItem

            editor
                .chain()
                .focus()
                .insertContentAt(range, [
                    {
                        type: 'aiPromptMention',
                        attrs: {
                            id: createUuid(),
                            label: selectedItem.label,
                            prompt: selectedItem.prompt,
                            type: 'aiPrompt',
                        },
                    },
                    {
                        type: 'text',
                        text: ' ',
                    },
                ])
                .run()
        },
        render: createMenuRenderer,
    },
    deleteTriggerWithBackspace: true,
    HTMLAttributes: {
        class: 'ai-prompt-mention',
        spellcheck: 'false',
    },
})
