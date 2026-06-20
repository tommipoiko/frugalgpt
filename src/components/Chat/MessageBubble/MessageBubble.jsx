import React, {
    useEffect, useRef, useState
} from 'react'
import {
    Sparkles, FileText, Copy, RotateCw, Pencil
} from 'lucide-react'
import clsx from 'clsx'
import AssistantMarkdown from './AssistantMarkdown'
import Sources from '../Sources'

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_THRESHOLD_PX = 12
const MENU_INTERACTIVE_DELAY_MS = 450
const MENU_WIDTH = 180
const MENU_HEIGHT = 140

function MessageBubble({
    message,
    onCopy,
    onRetry,
    onEdit,
    actionsDisabled = false
}) {
    const isUser = message.role === 'user'
    const hasActions = isUser && (onCopy || onRetry || onEdit)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
    const [menuInteractive, setMenuInteractive] = useState(false)
    const bubbleRef = useRef(null)
    const longPressTimerRef = useRef(null)
    const touchStartRef = useRef(null)
    const longPressMenuOpenRef = useRef(false)
    const dismissReadyTimerRef = useRef(null)
    const menuOpenRef = useRef(false)

    menuOpenRef.current = menuOpen

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges()
    }

    useEffect(() => () => {
        clearLongPressTimer()
        if (dismissReadyTimerRef.current) {
            window.clearTimeout(dismissReadyTimerRef.current)
        }
    }, [])

    const scheduleMenuInteractive = () => {
        if (dismissReadyTimerRef.current) {
            window.clearTimeout(dismissReadyTimerRef.current)
        }
        dismissReadyTimerRef.current = window.setTimeout(() => {
            longPressMenuOpenRef.current = false
            setMenuInteractive(true)
            dismissReadyTimerRef.current = null
        }, MENU_INTERACTIVE_DELAY_MS)
    }

    const closeMenu = () => {
        if (dismissReadyTimerRef.current) {
            window.clearTimeout(dismissReadyTimerRef.current)
            dismissReadyTimerRef.current = null
        }
        setMenuOpen(false)
        setMenuInteractive(false)
        longPressMenuOpenRef.current = false
        clearSelection()
    }

    const openMenuAt = (clientX, clientY, { fromTouch = false } = {}) => {
        if (actionsDisabled || !hasActions) return
        clearSelection()
        const padding = 12
        const maxLeft = typeof window !== 'undefined'
            ? Math.max(padding, window.innerWidth - MENU_WIDTH - padding)
            : clientX
        const maxTop = typeof window !== 'undefined'
            ? Math.max(padding, window.innerHeight - MENU_HEIGHT - padding)
            : clientY
        setMenuPos({
            top: Math.min(Math.max(clientY, padding), maxTop),
            left: Math.min(Math.max(clientX, padding), maxLeft)
        })
        setMenuOpen(true)
        if (fromTouch) {
            longPressMenuOpenRef.current = true
            setMenuInteractive(false)
        } else {
            longPressMenuOpenRef.current = false
            setMenuInteractive(true)
        }
    }

    const handleContextMenu = (event) => {
        if (!hasActions) return
        event.preventDefault()
        openMenuAt(event.clientX, event.clientY)
    }

    const handleBackdropDismiss = () => {
        if (!menuInteractive) return
        closeMenu()
    }

    useEffect(() => {
        if (!menuOpen) return undefined

        clearSelection()
        document.body.classList.add('select-none')

        const blockSelect = (event) => {
            event.preventDefault()
        }

        document.addEventListener('selectstart', blockSelect, true)

        return () => {
            document.body.classList.remove('select-none')
            document.removeEventListener('selectstart', blockSelect, true)
            clearSelection()
        }
    }, [menuOpen])

    useEffect(() => {
        if (!menuOpen || menuInteractive) return undefined

        const blockGhostClick = (event) => {
            event.preventDefault()
            event.stopPropagation()
        }

        document.addEventListener('click', blockGhostClick, { capture: true })
        return () => document.removeEventListener('click', blockGhostClick, { capture: true })
    }, [menuOpen, menuInteractive])

    useEffect(() => {
        const el = bubbleRef.current
        if (!el || !hasActions) return undefined

        const cancelPendingLongPress = () => {
            clearLongPressTimer()
        }

        const onTouchStart = (event) => {
            if (actionsDisabled || menuOpenRef.current) return
            const touch = event.touches[0]
            if (!touch) return
            cancelPendingLongPress()
            touchStartRef.current = { x: touch.clientX, y: touch.clientY }
            const { clientX, clientY } = touch
            longPressTimerRef.current = window.setTimeout(() => {
                openMenuAt(clientX, clientY, { fromTouch: true })
                clearSelection()
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(12)
                }
            }, LONG_PRESS_MS)
        }

        const onTouchMove = (event) => {
            if (longPressMenuOpenRef.current) return
            const start = touchStartRef.current
            const touch = event.touches[0]
            if (!start || !touch) return
            const dx = Math.abs(touch.clientX - start.x)
            const dy = Math.abs(touch.clientY - start.y)
            if (dx > LONG_PRESS_MOVE_THRESHOLD_PX || dy > LONG_PRESS_MOVE_THRESHOLD_PX) {
                cancelPendingLongPress()
            }
        }

        const onTouchEnd = (event) => {
            clearLongPressTimer()
            touchStartRef.current = null

            if (longPressMenuOpenRef.current) {
                event.preventDefault()
                event.stopPropagation()
                clearSelection()
                scheduleMenuInteractive()
            }
        }

        const onSelectStart = (event) => {
            if (!actionsDisabled) {
                event.preventDefault()
            }
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: true })
        el.addEventListener('touchend', onTouchEnd, { passive: false })
        el.addEventListener('touchcancel', onTouchEnd, { passive: false })
        el.addEventListener('selectstart', onSelectStart)

        return () => {
            cancelPendingLongPress()
            touchStartRef.current = null
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
            el.removeEventListener('touchcancel', onTouchEnd)
            el.removeEventListener('selectstart', onSelectStart)
        }
    }, [actionsDisabled, hasActions])

    const runMenuAction = (action) => (event) => {
        if (!menuInteractive) {
            event.preventDefault()
            event.stopPropagation()
            return
        }
        closeMenu()
        action()
    }

    const handleCopyClick = runMenuAction(() => onCopy?.())
    const handleRetryClick = runMenuAction(() => onRetry?.())
    const handleEditClick = runMenuAction(() => onEdit?.())

    if (isUser) {
        return (
            <>
                <div
                    ref={bubbleRef}
                    onContextMenu={handleContextMenu}
                    className={clsx(
                        'max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[4px]',
                        'bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 px-4 py-3',
                        'text-white shadow-lg shadow-brand-500/20',
                        hasActions && !actionsDisabled && [
                            'cursor-context-menu touch-manipulation select-none',
                            '[-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]',
                            '[&_*]:select-none [&_*]:[-webkit-touch-callout:none]'
                        ]
                    )}
                >
                    {!!message.content?.trim() && (
                        <p className="text-[0.95rem] leading-relaxed">{message.content}</p>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                            {message.attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="inline-flex items-center gap-2 text-[0.8rem] opacity-90"
                                >
                                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {attachment.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {menuOpen && (
                    <>
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Close menu"
                            className={clsx(
                                'fixed inset-0 z-[1280] bg-transparent',
                                !menuInteractive && 'pointer-events-none'
                            )}
                            onClick={handleBackdropDismiss}
                        />
                        <div
                            role="menu"
                            aria-hidden={!menuInteractive}
                            className={clsx(
                                'fixed z-[1290] min-w-[160px] rounded-xl border border-slate-200/80',
                                'bg-white py-1 shadow-lg select-none [-webkit-touch-callout:none]',
                                '[-webkit-tap-highlight-color:transparent] dark:border-white/10 dark:bg-zinc-900',
                                !menuInteractive && 'pointer-events-none'
                            )}
                            style={{
                                top: menuPos.top,
                                left: menuPos.left
                            }}
                        >
                            {onCopy && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full select-none items-center gap-2 px-3 py-2.5 text-left text-sm [-webkit-touch-callout:none] hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10"
                                    onClick={handleCopyClick}
                                >
                                    <Copy className="h-4 w-4 shrink-0 opacity-70" />
                                    Copy prompt
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={actionsDisabled}
                                    className="flex w-full select-none items-center gap-2 px-3 py-2.5 text-left text-sm [-webkit-touch-callout:none] hover:bg-black/5 active:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
                                    onClick={handleEditClick}
                                >
                                    <Pencil className="h-4 w-4 shrink-0 opacity-70" />
                                    Edit prompt
                                </button>
                            )}
                            {onRetry && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={actionsDisabled}
                                    className="flex w-full select-none items-center gap-2 px-3 py-2.5 text-left text-sm [-webkit-touch-callout:none] hover:bg-black/5 active:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
                                    onClick={handleRetryClick}
                                >
                                    <RotateCw className="h-4 w-4 shrink-0 opacity-70" />
                                    Retry prompt
                                </button>
                            )}
                        </div>
                    </>
                )}
            </>
        )
    }

    return (
        <div className="flex w-full max-w-full flex-col items-start gap-2 min-[600px]:flex-row min-[600px]:items-start min-[600px]:gap-3">
            <div
                className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/25"
            >
                <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="w-full min-w-0 flex-1 break-words text-[0.95rem] leading-relaxed text-slate-900 dark:text-zinc-100">
                {message.content
                    ? <AssistantMarkdown content={message.content} />
                    : null}
                {Array.isArray(message.sources) && message.sources.length > 0 && (
                    <Sources sources={message.sources} />
                )}
            </div>
        </div>
    )
}

export default MessageBubble
