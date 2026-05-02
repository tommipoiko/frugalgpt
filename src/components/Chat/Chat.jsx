import React, { useEffect, useRef, useState } from 'react'
import {
    Box, IconButton, TextareaAutosize, Typography, Tooltip
} from '@mui/material'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'
import chatApi from '../../services/chatApi'
import MessageBubble from './MessageBubble/MessageBubble'
import EmptyState from './EmptyState'
import ThinkingIndicator from './ThinkingIndicator'
import { brandGradient } from '../../theme'

/** Shared width so messages and composer stay aligned (avoids scrollbar shifting one column). */
const chatThreadMaxSx = {
    width: '100%',
    maxWidth: { xs: 'min(100%, 400px)', sm: 800 },
    minWidth: 0,
    mx: { xs: 'auto', sm: 0 },
    boxSizing: 'border-box'
}

const chatComposerMaxSx = {
    width: '100%',
    maxWidth: { xs: 'min(100%, 400px)', sm: 760 },
    minWidth: 0,
    mx: { xs: 'auto', sm: 0 },
    boxSizing: 'border-box',
    // Keeps disclaimer + input fully above the home indicator / rounded corners
    pb: 'calc(16px + env(safe-area-inset-bottom, 0px))'
}

function Chat({ currentChat }) {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])
    const [canSendMessages, setCanSendMessages] = useState(false)
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [sendError, setSendError] = useState('')
    const [reasoningPreview, setReasoningPreview] = useState('')
    const [statusPreview, setStatusPreview] = useState('')
    const [chatName, setChatName] = useState('')
    const { id } = useParams()
    const navigate = useNavigate()
    const listRef = useRef(null)
    const composerRef = useRef(null)
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
    const theme = useTheme()

    useEffect(() => {
        document.title = chatName || 'FrugalGPT'
    }, [chatName])

    useEffect(() => {
        const checkApiKey = async (userId) => {
            const userDocRef = doc(db, 'users', userId)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists() && userDocSnap.data().openAi?.openaiKey) {
                setCanSendMessages(true)
            } else {
                setCanSendMessages(false)
            }
        }

        // eslint-disable-next-line consistent-return
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user && id) {
                await checkApiKey(user.uid)
                const chatDocRef = doc(db, 'chats', id)
                const unsubscribeChat = onSnapshot(chatDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const chatData = snapshot.data()
                        setMessages(chatData.messages || [])
                        setChatName(chatData.name || '')
                    } else {
                        navigate('/')
                    }
                })
                return () => unsubscribeChat()
            } if (user && !id) {
                await checkApiKey(user.uid)
                setMessages([])
                setChatName('')
            } else {
                setCanSendMessages(false)
                setMessages([])
                setChatName('')
            }
        })

        return () => unsubscribeAuth()
    }, [id, navigate])

    useEffect(() => {
        if (autoScrollEnabled && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages, autoScrollEnabled])

    const handleScroll = () => {
        if (!listRef.current) return
        const isAtBottom = listRef.current.scrollHeight - listRef.current.scrollTop
            <= listRef.current.clientHeight + 12
        setAutoScrollEnabled(isAtBottom)
    }

    const handleSendMessage = async () => {
        if (currentMessage.trim() === '' || !canSendMessages || isSendingMessage) return

        setSendError('')
        setReasoningPreview('')
        setStatusPreview('Preparing response...')
        setIsSendingMessage(true)
        const preparedAttachments = attachments
        const outgoingMessage = currentMessage
        const newMessage = {
            id: Date.now(),
            content: outgoingMessage,
            role: 'user',
            attachments: preparedAttachments
        }

        const updatedMessages = [...messages, newMessage]
        setMessages(updatedMessages)
        setCurrentMessage('')
        setAttachments([])
        // Keep the composer active so the user can continue typing immediately.
        requestAnimationFrame(() => composerRef.current?.focus())
        const streamingAssistantMessageId = Date.now() + 1
        setMessages([
            ...updatedMessages,
            {
                id: streamingAssistantMessageId,
                content: '',
                role: 'system',
                sources: []
            }
        ])

        try {
            const { chatId, finalMessages } = await chatApi.sendMessage(
                newMessage,
                messages,
                id || currentChat,
                (partialAssistantText) => {
                    setMessages((prev) => prev.map((msg) => {
                        if (msg.id === streamingAssistantMessageId) {
                            return { ...msg, content: partialAssistantText }
                        }
                        return msg
                    }))
                },
                (reasoningDelta) => {
                    setReasoningPreview(reasoningDelta)
                },
                (sources) => {
                    setMessages((prev) => prev.map((msg) => {
                        if (msg.id === streamingAssistantMessageId) {
                            return { ...msg, sources }
                        }
                        return msg
                    }))
                },
                (status) => {
                    setStatusPreview(status.message || '')
                }
            )
            setMessages(finalMessages)
            setReasoningPreview('')
            setStatusPreview('')
            if (!id && chatId) {
                navigate(`/chats/${chatId}`, { replace: true })
            }
        } catch (error) {
            setSendError(error.message || 'Failed to send message. Please try again.')
            setReasoningPreview('')
            setStatusPreview('')
            setMessages(messages)
            setCurrentMessage(outgoingMessage)
            setAttachments(preparedAttachments)
        } finally {
            setIsSendingMessage(false)
        }
    }

    const handleAttachFile = (event) => {
        const file = event.target.files[0]
        if (file) {
            setAttachments([...attachments, { id: Date.now(), name: file.name }])
        }
    }

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSendMessage()
        }
    }

    const isEmpty = messages.length === 0 && !isSendingMessage

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                position: 'relative',
                boxSizing: 'border-box'
            }}
        >
            <Box
                ref={listRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    scrollbarGutter: 'stable'
                }}
            >
                <Box
                    sx={{
                        ...chatThreadMaxSx,
                        pt: { xs: 2, sm: 3 },
                        pb: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3
                    }}
                >
                    {isEmpty && (
                        <EmptyState />
                    )}

                    {!isEmpty && messages.map((message) => (
                        <Box
                            key={message.id}
                            sx={{
                                display: 'flex',
                                justifyContent: message.role === 'user'
                                    ? 'flex-end'
                                    : 'flex-start',
                                width: '100%'
                            }}
                        >
                            <MessageBubble message={message} theme={theme} />
                        </Box>
                    ))}

                    {(reasoningPreview || statusPreview) && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <ThinkingIndicator text={reasoningPreview || statusPreview} />
                        </Box>
                    )}

                    {sendError && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                py: 1
                            }}
                        >
                            <Typography color="error" variant="body2">
                                {sendError}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            <Box
                sx={{
                    flexShrink: 0,
                    width: '100%',
                    maxWidth: '100%',
                    backgroundImage: theme.palette.mode === 'dark'
                        ? 'linear-gradient(to top, rgba(11,11,15,1) 60%, rgba(11,11,15,0))'
                        : 'linear-gradient(to top, rgba(247,247,248,1) 60%, rgba(247,247,248,0))',
                    pt: { xs: 1.5, sm: 2 },
                    pb: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                }}
            >
                <Box sx={chatComposerMaxSx}>
                    {canSendMessages ? (
                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSendMessage()
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 1,
                                p: 1,
                                borderRadius: '24px',
                                backgroundColor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                boxShadow: theme.palette.mode === 'dark'
                                    ? '0 8px 32px -16px rgba(0,0,0,0.6)'
                                    : '0 8px 32px -16px rgba(15,23,42,0.12)',
                                transition: 'border-color 120ms ease, box-shadow 120ms ease',
                                '&:focus-within': {
                                    borderColor: 'primary.main',
                                    boxShadow: theme.palette.mode === 'dark'
                                        ? '0 0 0 3px rgba(52,211,153,0.20)'
                                        : '0 0 0 3px rgba(16,185,129,0.18)'
                                }
                            }}
                        >
                            <Tooltip title="Attach file">
                                <IconButton
                                    component="label"
                                    sx={{
                                        color: 'text.secondary',
                                        alignSelf: 'flex-end',
                                        mb: 0.5
                                    }}
                                    disabled={!canSendMessages || isSendingMessage}
                                >
                                    <AttachFileRoundedIcon fontSize="small" />
                                    <input
                                        type="file"
                                        hidden
                                        onChange={handleAttachFile}
                                    />
                                </IconButton>
                            </Tooltip>
                            <TextareaAutosize
                                ref={composerRef}
                                minRows={1}
                                maxRows={10}
                                placeholder="Ask anything..."
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: 'transparent',
                                    color: theme.palette.text.primary,
                                    resize: 'none',
                                    fontSize: '0.95rem',
                                    fontFamily: theme.typography.fontFamily,
                                    lineHeight: 1.5
                                }}
                                disabled={!canSendMessages}
                            />
                            <Tooltip title={isSendingMessage ? 'Generating...' : 'Send'}>
                                <span>
                                    <IconButton
                                        type="submit"
                                        disabled={
                                            !canSendMessages
                                            || isSendingMessage
                                            || currentMessage.trim() === ''
                                        }
                                        sx={{
                                            alignSelf: 'flex-end',
                                            mb: 0.5,
                                            width: 36,
                                            height: 36,
                                            color: '#fff',
                                            backgroundImage: brandGradient,
                                            '&:hover': {
                                                backgroundImage: brandGradient,
                                                filter: 'brightness(1.05)'
                                            },
                                            '&.Mui-disabled': {
                                                backgroundImage: 'none',
                                                backgroundColor: (
                                                    theme.palette.action.disabledBackground
                                                ),
                                                color: theme.palette.action.disabled
                                            }
                                        }}
                                    >
                                        {isSendingMessage
                                            ? <StopRoundedIcon fontSize="small" />
                                            : <ArrowUpwardRoundedIcon fontSize="small" />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                backgroundColor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                textAlign: 'center'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                You cannot send messages because you have no saved API key.
                                {' '}
                                <Box
                                    component="span"
                                    onClick={() => navigate('/user')}
                                    sx={{
                                        color: 'primary.main',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                >
                                    Add one in settings.
                                </Box>
                            </Typography>
                        </Box>
                    )}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        align="center"
                        sx={{
                            display: 'block',
                            mt: 0.75,
                            px: 0.5,
                            lineHeight: 1.35
                        }}
                    >
                        FrugalGPT can make mistakes. Verify important info.
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}

export default Chat
