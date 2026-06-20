import React, {
    useEffect, useMemo, useRef, useState
} from 'react'
import {
    Paperclip, ArrowUp, Square, ChevronDown, X
} from 'lucide-react'
import clsx from 'clsx'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'
import chatApi from '../../services/chatApi'
import MessageBubble from './MessageBubble/MessageBubble'
import EmptyState from './EmptyState'
import ThinkingIndicator from './ThinkingIndicator'
import ModelSettingsSheet from './ModelSettingsSheet'
import ProviderLogo from '../Brand/ProviderLogo'
import useKeyboardOverlapBottom from '../../hooks/useKeyboardOverlapBottom'
import useIsMobile from '../../hooks/useIsMobile'
import { summarizeAttachmentsForStore } from '../../utils/attachmentParts'
import { buildChatCostTooltip, formatChatCostUsd, summarizeChatCost } from '../../utils/chatCost'
import {
    buildInferenceDocFields,
    defaultModelKeyForUser,
    getChatModelEntry,
    listChatModelsForUser,
    resolveChatInferenceFromFirestore
} from '../../constants/availableModels'
import { formatChatModelError } from '../../utils/chatModelErrors'

const MAX_ATTACHMENT_SLOTS = 5
const COMPOSER_MAX_HEIGHT = 240

function hasProviderKey(data, pid) {
    if (!data) return false
    if (pid === 'openai') {
        return !!(data.providers?.openai?.apiKey?.trim() || data.openAi?.openaiKey?.trim())
    }
    return !!data.providers?.[pid]?.apiKey?.trim()
}

function persistReasoningForDoc(entry, reasoningEnabled) {
    if (entry.reasoningMode === 'toggle') return reasoningEnabled
    if (entry.reasoningMode === 'fixed-on') return true
    return false
}

function persistWebForDoc(entry, webSearchEnabled) {
    return !!entry.webSearch && webSearchEnabled
}

function apiReasoningForRequest(entry, reasoningEnabled) {
    return persistReasoningForDoc(entry, reasoningEnabled)
}

function apiWebForRequest(entry, webSearchEnabled) {
    return persistWebForDoc(entry, webSearchEnabled)
}

function Chat({ currentChat }) {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])
    const [canSendMessages, setCanSendMessages] = useState(false)
    const [userSettingsLoaded, setUserSettingsLoaded] = useState(false)
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [sendError, setSendError] = useState('')
    const [activityState, setActivityState] = useState(null)
    const [chatName, setChatName] = useState('')
    const [userSettings, setUserSettings] = useState(null)
    const [chatInference, setChatInference] = useState(null)
    const chatInferenceRef = useRef(null)
    const userSettingsRef = useRef(null)
    const [selectedModelKey, setSelectedModelKey] = useState(() => {
        try {
            const raw = localStorage.getItem('frugalGptChatDefaults')
            if (raw) {
                const j = JSON.parse(raw)
                if (typeof j.modelKey === 'string') return j.modelKey
            }
        } catch {
            // ignore
        }
        return 'gpt-5.4'
    })
    const [reasoningEnabled, setReasoningEnabled] = useState(true)
    const [webSearchEnabled, setWebSearchEnabled] = useState(true)
    const [modelSheetOpen, setModelSheetOpen] = useState(false)
    const [sheetDraftModelKey, setSheetDraftModelKey] = useState('gpt-5.4')
    const [sheetDraftReasoning, setSheetDraftReasoning] = useState(true)
    const [sheetDraftWeb, setSheetDraftWeb] = useState(true)
    const [editPromptState, setEditPromptState] = useState(null)

    const { id } = useParams()
    const navigate = useNavigate()
    const listRef = useRef(null)
    const composerRef = useRef(null)
    const attachmentsRef = useRef([])
    const fileInputRef = useRef(null)
    const editPromptRef = useRef(null)
    const prevSheetOpen = useRef(false)
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
    const keyboardInset = useKeyboardOverlapBottom()
    const isMobileLayout = useIsMobile()
    const isExistingChat = Boolean(id || currentChat)

    userSettingsRef.current = userSettings
    chatInferenceRef.current = chatInference
    attachmentsRef.current = attachments

    const modelsAllowed = useMemo(
        () => listChatModelsForUser((pid) => hasProviderKey(userSettings, pid)),
        [userSettings]
    )

    const selectedEntry = useMemo(
        () => getChatModelEntry(selectedModelKey, chatInference?.entry),
        [selectedModelKey, chatInference]
    )
    const { provider } = selectedEntry

    useEffect(() => () => {
        attachmentsRef.current.forEach((a) => {
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
        })
    }, [])

    useEffect(() => {
        document.title = chatName || 'FrugalGPT'
    }, [chatName])

    useEffect(() => {
        if (id) return
        try {
            const raw = localStorage.getItem('frugalGptChatDefaults')
            if (raw) {
                const j = JSON.parse(raw)
                if (typeof j.reasoningEnabled === 'boolean') setReasoningEnabled(j.reasoningEnabled)
                if (typeof j.webSearchEnabled === 'boolean') setWebSearchEnabled(j.webSearchEnabled)
                if (typeof j.modelKey === 'string') setSelectedModelKey(j.modelKey)
            }
        } catch {
            // ignore
        }
    }, [id])

    useEffect(() => {
        localStorage.setItem('frugalGptChatDefaults', JSON.stringify({
            modelKey: selectedModelKey,
            reasoningEnabled,
            webSearchEnabled
        }))
    }, [selectedModelKey, reasoningEnabled, webSearchEnabled])

    useEffect(() => {
        let unsubUser = () => {}
        let unsubChat = () => {}
        const unsubAuth = auth.onAuthStateChanged((user) => {
            unsubUser()
            unsubChat()
            if (!user) {
                setCanSendMessages(false)
                setUserSettings(null)
                setUserSettingsLoaded(true)
                setMessages([])
                setChatName('')
                return
            }
            setUserSettingsLoaded(false)
            unsubUser = onSnapshot(
                doc(db, 'users', user.uid),
                (snap) => {
                    const data = snap.exists() ? snap.data() : null
                    setUserSettings(data)
                    setCanSendMessages(hasProviderKey(data, 'openai')
                        || hasProviderKey(data, 'anthropic')
                        || hasProviderKey(data, 'google')
                        || hasProviderKey(data, 'mistral'))
                    setUserSettingsLoaded(true)
                },
                (error) => {
                    console.error('Failed to load user settings:', error)
                    setUserSettings(null)
                    setCanSendMessages(false)
                    setUserSettingsLoaded(true)
                }
            )
            if (id) {
                unsubChat = onSnapshot(doc(db, 'chats', id), (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data()
                        setMessages(data.messages || [])
                        setChatName(data.name || '')
                        const inference = resolveChatInferenceFromFirestore(data)
                        if (inference) {
                            setChatInference(inference)
                            setSelectedModelKey(inference.modelKey)
                            if (typeof inference.reasoningEnabled === 'boolean') {
                                setReasoningEnabled(inference.reasoningEnabled)
                            }
                            if (typeof inference.webSearchEnabled === 'boolean') {
                                setWebSearchEnabled(inference.webSearchEnabled)
                            }
                        } else {
                            setChatInference(null)
                            const us = userSettingsRef.current
                            if (us) {
                                setSelectedModelKey(defaultModelKeyForUser(
                                    (pid) => hasProviderKey(us, pid)
                                ))
                            }
                        }
                    } else {
                        navigate('/')
                    }
                })
            } else {
                setMessages([])
                setChatName('')
                setChatInference(null)
            }
        })
        return () => {
            unsubAuth()
            unsubUser()
            unsubChat()
        }
    }, [id, navigate])

    useEffect(() => {
        if (id || !userSettings?.chatDefaults) return
        const d = userSettings.chatDefaults
        const allowed = listChatModelsForUser((pid) => hasProviderKey(userSettings, pid))
        if (typeof d.modelKey === 'string' && allowed.some((m) => m.key === d.modelKey)) {
            setSelectedModelKey(d.modelKey)
        } else if (typeof d.provider === 'string' && typeof d.model === 'string') {
            const inference = resolveChatInferenceFromFirestore(d)
            if (inference) setSelectedModelKey(inference.modelKey)
        }
        if (typeof d.reasoningEnabled === 'boolean') {
            setReasoningEnabled(d.reasoningEnabled)
        }
        if (typeof d.webSearchEnabled === 'boolean') {
            setWebSearchEnabled(d.webSearchEnabled)
        }
    }, [id, userSettings])

    useEffect(() => {
        if (id || currentChat) return
        if (!userSettings) return
        if (modelsAllowed.some((m) => m.key === selectedModelKey)) return
        const fb = defaultModelKeyForUser((pid) => hasProviderKey(userSettings, pid))
        setSelectedModelKey(fb)
    }, [id, currentChat, userSettings, modelsAllowed, selectedModelKey])

    useEffect(() => {
        if (modelSheetOpen && !prevSheetOpen.current) {
            setSheetDraftModelKey(selectedModelKey)
            setSheetDraftReasoning(reasoningEnabled)
            setSheetDraftWeb(webSearchEnabled)
        }
        prevSheetOpen.current = modelSheetOpen
    }, [modelSheetOpen, selectedModelKey, reasoningEnabled, webSearchEnabled])

    useEffect(() => {
        if (autoScrollEnabled && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages, autoScrollEnabled])

    const syncComposerHeight = () => {
        const el = composerRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
    }

    useEffect(() => {
        syncComposerHeight()
    }, [currentMessage])

    useEffect(() => {
        if (!editPromptState) return
        requestAnimationFrame(() => editPromptRef.current?.focus())
    }, [editPromptState])

    const effectiveReasoningRequest = apiReasoningForRequest(selectedEntry, reasoningEnabled)
    const effectiveWebRequest = apiWebForRequest(selectedEntry, webSearchEnabled)

    const handleScroll = () => {
        if (!listRef.current) return
        const isAtBottom = listRef.current.scrollHeight - listRef.current.scrollTop
            <= listRef.current.clientHeight + 12
        setAutoScrollEnabled(isAtBottom)
    }

    const scrollToLatest = () => {
        setAutoScrollEnabled(true)
        requestAnimationFrame(() => {
            if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight
            }
        })
    }

    const commitInferenceSettings = async ({
        modelKey: mk,
        reasoningEnabled: nextR,
        webSearchEnabled: nextW
    }) => {
        const e = getChatModelEntry(mk)
        setSelectedModelKey(mk)
        setReasoningEnabled(nextR)
        setWebSearchEnabled(nextW)
        const pr = persistReasoningForDoc(e, nextR)
        const pw = persistWebForDoc(e, nextW)
        const inferenceDoc = buildInferenceDocFields(e, {
            reasoningEnabled: pr,
            webSearchEnabled: pw
        })
        localStorage.setItem('frugalGptChatDefaults', JSON.stringify({
            modelKey: mk,
            reasoningEnabled: nextR,
            webSearchEnabled: nextW
        }))
        try {
            await chatApi.saveUserChatDefaults(inferenceDoc)
        } catch {
            // non-blocking
        }
        const chatKey = id || currentChat
        if (chatKey) {
            try {
                await chatApi.updateChatInferenceDoc(chatKey, inferenceDoc)
                setChatInference({
                    modelKey: mk,
                    entry: e,
                    isLegacy: e.isLegacy === true,
                    provider: e.provider,
                    model: e.apiModelId,
                    modelLabel: e.label,
                    providerLabel: e.providerLabel,
                    reasoningEnabled: pr,
                    webSearchEnabled: pw
                })
            } catch {
                // non-blocking
            }
        }
    }

    const handleSheetDraftModelKeyChange = (key) => {
        setSheetDraftModelKey(key)
        const e = getChatModelEntry(key)
        if (e.reasoningMode === 'fixed-on') setSheetDraftReasoning(true)
        else if (e.reasoningMode === 'none') setSheetDraftReasoning(false)
        if (!e.webSearch) setSheetDraftWeb(false)
    }

    const handleSheetApply = () => {
        if (isExistingChat) {
            setModelSheetOpen(false)
            return
        }
        commitInferenceSettings({
            modelKey: sheetDraftModelKey,
            reasoningEnabled: sheetDraftReasoning,
            webSearchEnabled: sheetDraftWeb
        })
        setModelSheetOpen(false)
    }

    const removeAttachment = (attachmentId) => {
        setAttachments((prev) => {
            const item = prev.find((att) => att.id === attachmentId)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter((att) => att.id !== attachmentId)
        })
    }

    const runMessageGeneration = async ({
        userMessage,
        priorMessages,
        attachmentFiles = [],
        rollbackMessages,
        rollbackComposer = null,
        rollbackAttachments = null
    }) => {
        const persistR = persistReasoningForDoc(selectedEntry, reasoningEnabled)
        const persistW = persistWebForDoc(selectedEntry, webSearchEnabled)

        setSendError('')
        setActivityState('thinking')
        setIsSendingMessage(true)

        const streamingAssistantMessageId = Date.now() + 1
        setMessages([
            ...priorMessages,
            userMessage,
            {
                id: streamingAssistantMessageId,
                content: '',
                role: 'system',
                sources: []
            }
        ])

        try {
            const { chatId, finalMessages } = await chatApi.sendMessage(
                userMessage,
                priorMessages,
                id || currentChat,
                (partialAssistantText) => {
                    if (partialAssistantText.trim()) {
                        setActivityState(null)
                    }
                    setMessages((prev) => prev.map((msg) => {
                        if (msg.id === streamingAssistantMessageId) {
                            return { ...msg, content: partialAssistantText }
                        }
                        return msg
                    }))
                },
                () => {},
                (sources) => {
                    setMessages((prev) => prev.map((msg) => {
                        if (msg.id === streamingAssistantMessageId) {
                            return { ...msg, sources }
                        }
                        return msg
                    }))
                },
                (status) => {
                    if (status.state === 'responding' || status.state === 'done') {
                        setActivityState(null)
                        return
                    }
                    if (status.state === 'searching') {
                        setActivityState('searching')
                    } else if (status.state === 'reasoning') {
                        setActivityState('reasoning')
                    } else if (status.state === 'thinking') {
                        setActivityState('thinking')
                    }
                },
                {
                    provider: selectedEntry.provider,
                    model: selectedEntry.apiModelId,
                    modelKey: selectedModelKey,
                    modelLabel: selectedEntry.label,
                    providerLabel: selectedEntry.providerLabel,
                    reasoningEnabled: effectiveReasoningRequest,
                    webSearchEnabled: effectiveWebRequest,
                    inferenceForDoc: {
                        reasoningEnabled: persistR,
                        webSearchEnabled: persistW
                    },
                    attachmentFiles
                }
            )
            if (rollbackAttachments) {
                rollbackAttachments.forEach((a) => {
                    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
                })
            }
            setMessages(finalMessages)
            setActivityState(null)
            if (!id && chatId) {
                navigate(`/chats/${chatId}`, { replace: true })
            }
        } catch (error) {
            setSendError(formatChatModelError(
                error.message,
                chatInferenceRef.current || {
                    modelLabel: selectedEntry.label,
                    providerLabel: selectedEntry.providerLabel,
                    provider: selectedEntry.provider,
                    model: selectedEntry.apiModelId,
                    isLegacy: selectedEntry.isLegacy === true
                }
            ))
            setActivityState(null)
            setMessages(rollbackMessages)
            if (rollbackComposer !== null) {
                setCurrentMessage(rollbackComposer)
            }
            if (rollbackAttachments !== null) {
                setAttachments(rollbackAttachments)
            }
        } finally {
            setIsSendingMessage(false)
        }
    }

    const handleCopyPrompt = async (messageId) => {
        const target = messages.find((msg) => msg.id === messageId)
        const text = target?.content?.trim()
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            setSendError('Could not copy to clipboard.')
        }
    }

    const handleRetryPrompt = (messageId) => {
        const messageIndex = messages.findIndex((msg) => msg.id === messageId)
        if (messageIndex === -1 || isSendingMessage || !canSendMessages) return

        const userMessage = messages[messageIndex]
        if (userMessage.role !== 'user') return
        if (!hasProviderKey(userSettings, selectedEntry.provider)) return
        if (Array.isArray(userMessage.attachments) && userMessage.attachments.length > 0) {
            setSendError('Retry is not supported for messages with attachments.')
            return
        }

        const priorMessages = messages.slice(0, messageIndex)
        runMessageGeneration({
            userMessage,
            priorMessages,
            rollbackMessages: messages
        })
    }

    const handleEditPrompt = (messageId) => {
        const messageIndex = messages.findIndex((msg) => msg.id === messageId)
        if (messageIndex === -1 || isSendingMessage) return

        const userMessage = messages[messageIndex]
        if (userMessage.role !== 'user') return
        if (Array.isArray(userMessage.attachments) && userMessage.attachments.length > 0) {
            setSendError('Edit is not supported for messages with attachments.')
            return
        }

        setEditPromptState({
            messageId,
            draft: userMessage.content || ''
        })
    }

    const handleEditPromptCancel = () => {
        setEditPromptState(null)
    }

    const handleEditPromptSubmit = async (event) => {
        event.preventDefault()
        if (!editPromptState || isSendingMessage || !canSendMessages) return

        const trimmed = editPromptState.draft.trim()
        if (!trimmed) return
        if (!hasProviderKey(userSettings, selectedEntry.provider)) return

        const messageIndex = messages.findIndex((msg) => msg.id === editPromptState.messageId)
        if (messageIndex === -1) {
            setEditPromptState(null)
            return
        }

        const original = messages[messageIndex]
        const priorMessages = messages.slice(0, messageIndex)
        const editedMessage = { ...original, content: trimmed }

        setEditPromptState(null)
        await runMessageGeneration({
            userMessage: editedMessage,
            priorMessages,
            rollbackMessages: messages
        })
    }

    const handleSendMessage = async () => {
        const trimmed = currentMessage.trim()
        const fileSlots = attachments.map((a) => a.file)
        if ((!trimmed && fileSlots.length === 0) || !canSendMessages || isSendingMessage) return
        if (!hasProviderKey(userSettings, selectedEntry.provider)) return

        const preparedAttachments = [...attachments]
        const outgoingMessage = currentMessage
        const storedAttachments = summarizeAttachmentsForStore(fileSlots)
        const newMessage = {
            id: Date.now(),
            content: trimmed,
            role: 'user',
            ...(storedAttachments.length ? { attachments: storedAttachments } : {})
        }

        setCurrentMessage('')
        setAttachments([])
        if (isMobileLayout) {
            composerRef.current?.blur()
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
        } else {
            requestAnimationFrame(() => composerRef.current?.focus())
        }

        await runMessageGeneration({
            userMessage: newMessage,
            priorMessages: messages,
            attachmentFiles: fileSlots,
            rollbackMessages: messages,
            rollbackComposer: outgoingMessage,
            rollbackAttachments: preparedAttachments
        })
    }

    const handleAttachFile = () => {
        const input = fileInputRef.current
        if (!input?.files?.length) return
        setAttachments((prev) => {
            const room = MAX_ATTACHMENT_SLOTS - prev.length
            if (room <= 0) return prev
            const toAdd = Array.from(input.files).slice(0, room)
            const next = [...prev]
            toAdd.forEach((file) => {
                const attId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                const previewUrl = file.type.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : null
                next.push({ id: attId, file, previewUrl })
            })
            return next
        })
        input.value = ''
    }

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSendMessage()
        }
    }

    const chatCost = useMemo(() => summarizeChatCost(messages), [messages])
    const chatCostTooltip = useMemo(
        () => buildChatCostTooltip(chatCost),
        [chatCost]
    )
    const isEmpty = messages.length === 0 && !isSendingMessage
    const showJumpLatest = !autoScrollEnabled && !isEmpty
    const threadWidth = 'w-full max-w-[min(100%,calc(100vw-1rem))] sm:max-w-[800px]'
    const composerWidth = 'w-full max-w-[min(100%,calc(100vw-1rem))] sm:max-w-[920px]'
    const modelSelectorLabel = `${selectedEntry.label} model settings`
    const legacyModelNotice = chatInference?.isLegacy
        ? `This chat uses ${chatInference.modelLabel} (${chatInference.providerLabel}), `
            + 'which is no longer in the FrugalGPT model list. Messages still call the saved API model.'
        : null
    const composerStatusClass = 'rounded-2xl border border-slate-200/90 bg-white p-6 text-center dark:border-white/[0.10] dark:bg-zinc-900'

    const renderComposerContent = () => {
        if (!userSettingsLoaded) {
            return (
                <div className={composerStatusClass}>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">
                        Loading your settings…
                    </p>
                </div>
            )
        }

        if (!canSendMessages) {
            return (
                <div className={composerStatusClass}>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">
                        You cannot send messages because no provider API key is saved.
                        {' '}
                        <button
                            type="button"
                            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            onClick={() => navigate('/user')}
                        >
                            Add keys in settings.
                        </button>
                    </p>
                </div>
            )
        }

        return (
            <>
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                        {attachments.map((a) => (
                            <div
                                key={a.id}
                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 dark:border-white/[0.12] dark:bg-zinc-800/80"
                            >
                                {a.previewUrl ? (
                                    <img
                                        src={a.previewUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1">
                                        <Paperclip className="h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
                                        <span className="max-w-full truncate text-[9px] font-medium leading-tight text-slate-600 dark:text-zinc-300">
                                            {(a.file.name.split('.').pop() || 'file').slice(0, 6)}
                                        </span>
                                    </div>
                                )}
                                {isMobileLayout && (
                                    <button
                                        type="button"
                                        className="absolute inset-0 z-[1] rounded-xl bg-transparent active:bg-black/10"
                                        aria-label={`Remove ${a.file.name}`}
                                        onClick={() => removeAttachment(a.id)}
                                    />
                                )}
                                <button
                                    type="button"
                                    className="absolute right-0.5 top-0.5 z-[2] flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white opacity-0 shadow-md transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 max-[600px]:hidden"
                                    aria-label={`Remove ${a.file.name}`}
                                    onClick={() => removeAttachment(a.id)}
                                >
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form
                    className="flex flex-col gap-2 rounded-[24px] border border-slate-200/90 bg-white p-2 shadow-lg shadow-slate-900/5 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 min-[600px]:flex-row min-[600px]:items-end min-[600px]:gap-2 dark:border-white/[0.10] dark:bg-zinc-900 dark:shadow-black/40"
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSendMessage()
                    }}
                >
                    <textarea
                        ref={composerRef}
                        rows={1}
                        placeholder="Ask anything..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!canSendMessages}
                        className="scrollbar-none order-1 max-h-[240px] min-h-[44px] w-full min-w-0 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-[max(16px,0.95rem)] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 min-[600px]:order-3 min-[600px]:flex-1 min-[600px]:px-1 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    />
                    <div className="order-2 flex w-full items-center justify-between gap-2 min-[600px]:contents">
                        <div className="flex items-center gap-1 min-[600px]:contents">
                            <label
                                htmlFor="chat-attach-input"
                                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-[600px]:order-1 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
                            >
                                <Paperclip className="h-[18px] w-[18px]" aria-hidden />
                                <input
                                    ref={fileInputRef}
                                    id="chat-attach-input"
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleAttachFile}
                                    disabled={
                                        !canSendMessages
                                                    || isSendingMessage
                                                    || attachments.length >= MAX_ATTACHMENT_SLOTS
                                    }
                                />
                            </label>
                            <div className="flex items-center gap-2 min-[600px]:order-2">
                                <button
                                    type="button"
                                    onClick={() => setModelSheetOpen(true)}
                                    aria-label={modelSelectorLabel}
                                    title={modelSelectorLabel}
                                    className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-800 shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow dark:border-white/[0.10] dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <ProviderLogo provider={provider} size={20} />
                                    <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-brand-500 dark:border-zinc-900" />
                                </button>
                                <span
                                    className="shrink-0 text-[11px] tabular-nums text-slate-500 sm:text-xs dark:text-zinc-400"
                                    title={chatCostTooltip}
                                >
                                    Chat cost:
                                    {' '}
                                    {chatCost.hasEstimate ? '~' : ''}
                                    $
                                    {formatChatCostUsd(chatCost.totalUsd)}
                                </span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={
                                !canSendMessages
                                            || isSendingMessage
                                            || (currentMessage.trim() === ''
                                                && attachments.length === 0)
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/25 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none min-[600px]:order-4 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                            title={isSendingMessage ? 'Generating…' : 'Send'}
                        >
                            {isSendingMessage
                                ? <Square className="h-4 w-4 fill-current" />
                                : <ArrowUp className="h-4 w-4" />}
                        </button>
                    </div>
                </form>
            </>
        )
    }

    return (
        <div className="relative box-border flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden">
            <ModelSettingsSheet
                open={modelSheetOpen}
                onClose={() => setModelSheetOpen(false)}
                isMobile={isMobileLayout}
                draftModelKey={sheetDraftModelKey}
                onDraftModelChange={handleSheetDraftModelKeyChange}
                draftReasoning={sheetDraftReasoning}
                onDraftReasoningChange={setSheetDraftReasoning}
                draftWebSearch={sheetDraftWeb}
                onDraftWebSearchChange={setSheetDraftWeb}
                models={modelsAllowed}
                entry={selectedEntry}
                onApply={handleSheetApply}
                readOnly={isExistingChat}
            />

            <div
                ref={listRef}
                onScroll={handleScroll}
                className="scrollbar-none flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden overscroll-y-contain"
            >
                <div className={clsx(threadWidth, 'flex min-w-0 flex-col gap-8 px-4 pb-4 pt-6 sm:px-6 sm:pt-8')}>
                    {isEmpty && (
                        <EmptyState />
                    )}

                    {!isEmpty && messages.map((message) => (
                        <div
                            key={message.id}
                            className={clsx(
                                'flex w-full',
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <MessageBubble
                                message={message}
                                onCopy={
                                    message.role === 'user'
                                        ? () => handleCopyPrompt(message.id)
                                        : undefined
                                }
                                onRetry={
                                    message.role === 'user'
                                        ? () => handleRetryPrompt(message.id)
                                        : undefined
                                }
                                onEdit={
                                    message.role === 'user'
                                        ? () => handleEditPrompt(message.id)
                                        : undefined
                                }
                                actionsDisabled={isSendingMessage}
                            />
                        </div>
                    ))}

                    {activityState && (
                        <div className="flex justify-start">
                            <ThinkingIndicator state={activityState} />
                        </div>
                    )}

                    {sendError && (
                        <div className="flex justify-center py-2">
                            <p className="max-w-xl rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-center text-sm leading-relaxed text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
                                {sendError}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={clsx(
                    'relative flex shrink-0 flex-col items-center',
                    'bg-gradient-to-t from-[#f7f7f8] from-45% to-transparent',
                    'dark:from-[#0b0b0f] dark:to-transparent',
                    'pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))]',
                    'sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]',
                    'pt-3 sm:pt-4'
                )}
                style={{
                    paddingBottom: keyboardInset > 0
                        ? '10px'
                        : 'calc(12px + env(safe-area-inset-bottom, 0px))'
                }}
            >
                {showJumpLatest && (
                    <div className="pointer-events-none absolute inset-x-0 -top-11 z-20 flex justify-center px-4 sm:px-6">
                        <div className={clsx(composerWidth, 'flex justify-end')}>
                            <button
                                type="button"
                                onClick={scrollToLatest}
                                className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-sm dark:border-white/[0.12] dark:bg-zinc-900/90 dark:text-zinc-100"
                            >
                                Latest
                                <ChevronDown className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                )}

                <div className={clsx(composerWidth, 'space-y-2')}>
                    {legacyModelNotice && (
                        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                            {legacyModelNotice}
                        </p>
                    )}
                    {renderComposerContent()}
                </div>
            </div>

            {editPromptState && (
                <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4">
                    <form
                        onSubmit={handleEditPromptSubmit}
                        className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900"
                    >
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Edit prompt
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                            Update your message and regenerate the response from here.
                        </p>
                        <textarea
                            ref={editPromptRef}
                            required
                            rows={6}
                            value={editPromptState.draft}
                            onChange={(e) => setEditPromptState((prev) => (
                                prev ? { ...prev, draft: e.target.value } : prev
                            ))}
                            className="scrollbar-none mt-4 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[16px] leading-relaxed text-slate-900 outline-none ring-brand-500/0 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-zinc-950 dark:text-white sm:text-sm"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleEditPromptCancel}
                                className="rounded-[10px] px-4 py-2 text-sm font-medium text-slate-700 hover:bg-black/5 dark:text-zinc-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!editPromptState.draft.trim() || isSendingMessage}
                                className="rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Save & resend
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

export default Chat
