import React, { useEffect, useRef, useState } from 'react'
import {
    Box, Button, IconButton, List, ListItem, TextareaAutosize, Typography
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import SendIcon from '@mui/icons-material/Send'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'
import chatApi from '../../services/chatApi'
import MessageBubble from './MessageBubble/MessageBubble'

function Chat({ currentChat }) {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])
    const [canSendMessages, setCanSendMessages] = useState(false)
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [chatName, setChatName] = useState('')
    const { id } = useParams()
    const navigate = useNavigate()
    const listRef = useRef(null)
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
            === listRef.current.clientHeight

        setAutoScrollEnabled(isAtBottom)
    }

    const handleSendMessage = async () => {
        if (currentMessage.trim() === '' || !canSendMessages || isSendingMessage) return

        setIsSendingMessage(true)
        const newMessage = {
            id: Date.now(),
            content: currentMessage,
            role: 'user',
            attachments
        }

        const updatedMessages = [...messages, newMessage]
        setMessages(updatedMessages)
        setCurrentMessage('')
        setAttachments([])

        const {
            responseStream, threadId
        } = await chatApi.sendMessage(newMessage, id || currentChat)

        if (responseStream) {
            if (!id) {
                navigate(`/chats/${threadId}`, { replace: true })
            }

            let accumulatedMessages = [...updatedMessages]

            responseStream.on('textCreated', () => {
                const newSystemMessage = { id: Date.now(), content: '', role: 'system' }
                accumulatedMessages = [...accumulatedMessages, newSystemMessage]
                setMessages(accumulatedMessages)
            })

            responseStream.on('textDelta', (textDelta) => {
                accumulatedMessages = accumulatedMessages.map((msg, index) => {
                    if (index === accumulatedMessages.length - 1) {
                        return { ...msg, content: msg.content + textDelta.value }
                    }
                    return msg
                })
                setMessages(accumulatedMessages)
            })

            responseStream.on('toolCallCreated', (toolCall) => {
                const toolMessage = {
                    id: Date.now(),
                    content: `Tool: ${toolCall.type}`,
                    role: 'system'
                }
                accumulatedMessages = [...accumulatedMessages, toolMessage]
                setMessages(accumulatedMessages)
            })

            responseStream.on('end', async () => {
                await chatApi.saveCompletedMessage(threadId || id, accumulatedMessages)
                setIsSendingMessage(false)
            })
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

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 128px)',
                justifyContent: 'space-between',
                overflowX: 'hidden'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    overflowY: 'auto',
                    flexGrow: 1
                }}
                ref={listRef}
                onScroll={handleScroll}
            >
                <Box
                    sx={{
                        maxWidth: '900px',
                        width: '100%',
                        padding: 2
                    }}
                >
                    <List>
                        {messages.map((message) => (
                            <ListItem
                                key={message.id}
                                sx={{
                                    justifyContent: message.role === 'user'
                                        ? 'flex-end'
                                        : 'flex-start',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word'
                                }}
                            >
                                <MessageBubble message={message} theme={theme} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Box>

            {canSendMessages ? (
                <Box
                    component="form"
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: 1,
                        position: 'sticky',
                        bottom: 0,
                        width: '100%',
                        backgroundColor: theme.palette.background.paper
                    }}
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSendMessage()
                    }}
                >
                    <Box
                        sx={{
                            maxWidth: '700px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-end'
                        }}
                    >
                        <IconButton
                            color="primary"
                            component="label"
                            sx={{ color: theme.palette.text.primary }}
                            disabled={!canSendMessages}
                        >
                            <AttachFileIcon />
                            <input
                                type="file"
                                hidden
                                onChange={handleAttachFile}
                            />
                        </IconButton>
                        <TextareaAutosize
                            minRows={1}
                            maxRows={14}
                            placeholder="Type your message..."
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                marginLeft: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                border: `1px solid ${theme.palette.divider}`,
                                backgroundColor: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                resize: 'none',
                                overflowY: 'auto',
                                fontSize: '16px'
                            }}
                            disabled={!canSendMessages}
                        />
                        <Button
                            variant="contained"
                            type="submit"
                            sx={{
                                marginLeft: 1,
                                alignSelf: 'flex-end',
                                backgroundColor:
                                theme.palette.mode === 'dark'
                                    ? theme.palette.grey[800]
                                    : theme.palette.primary.main,
                                color: theme.palette.mode === 'dark'
                                    ? theme.palette.text.primary
                                    : theme.palette.primary.contrastText,
                                '&:hover': {
                                    backgroundColor:
                                    theme.palette.mode === 'dark'
                                        ? theme.palette.grey[600]
                                        : theme.palette.primary.dark
                                }
                            }}
                            endIcon={<SendIcon />}
                            disabled={!canSendMessages || isSendingMessage}
                        >
                            Send
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Typography
                    variant="body1"
                    color="textSecondary"
                    align="center"
                    sx={{ padding: 2 }}
                >
                    You cannot send messages because you have no saved API key.
                    Please go to settings to add one.
                </Typography>
            )}
        </Box>
    )
}

export default Chat
