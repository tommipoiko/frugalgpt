import React, { useEffect, useRef, useState } from 'react'
import {
    Box, Button, IconButton, Paper, Typography, List, ListItem
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import SendIcon from '@mui/icons-material/Send'
import TextareaAutosize from '@mui/material/TextareaAutosize'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { doc, onSnapshot } from 'firebase/firestore'
import chatApi from '../services/chatApi'
import { db, auth } from '../services/firebase'

function Chat({ currentChat }) {
    const [messages, setMessages] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [attachments, setAttachments] = useState([])
    const [canSendMessages, setCanSendMessages] = useState(false)
    const { id } = useParams()
    const navigate = useNavigate()
    const listRef = useRef(null)
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
    const theme = useTheme()

    useEffect(() => {
        // eslint-disable-next-line consistent-return
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user && id) {
                const chatDocRef = doc(db, 'chats', id)
                const unsubscribeChat = onSnapshot(chatDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const chatData = snapshot.data()
                        setMessages(chatData.messages || [])
                        setCanSendMessages(chatData.userId === user.uid)
                    } else {
                        navigate('/')
                    }
                })
                return () => unsubscribeChat()
            } else if (user && !id) { // eslint-disable-line no-else-return
                setCanSendMessages(true)
                setMessages([])
            } else {
                setCanSendMessages(false)
                setMessages([])
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
        if (currentMessage.trim() === '' || !canSendMessages) return

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
            responseStream,
            threadId
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

    const renderMessage = (message) => (
        <ListItem
            key={message.id}
            sx={{
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 2,
                    backgroundColor: message.role === 'user'
                        ? theme.palette.primary.light
                        : theme.palette.background.paper,
                    color: message.role === 'user'
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                    maxWidth: '90%',
                    whiteSpace: 'pre-wrap'
                }}
            >
                <Typography variant="body1">{message.content}</Typography>
                {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ marginTop: 1 }}>
                        {message.attachments.map((attachment) => (
                            <Typography key={attachment.id} variant="body2" color="textSecondary">
                                {attachment.name}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Paper>
        </ListItem>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 128px)',
                justifyContent: 'space-between',
                width: '100%',
                overflowX: 'hidden'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    overflowY: 'auto',
                    flexGrow: 1,
                    width: '100%'
                }}
                ref={listRef}
                onScroll={handleScroll}
            >
                <Box
                    sx={{
                        maxWidth: '900px',
                        width: '100%',
                        padding: 2,
                        boxSizing: 'border-box'
                    }}
                >
                    <List>
                        {messages.map((message) => renderMessage(message))}
                    </List>
                </Box>
            </Box>

            <Box
                component="form"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 1,
                    position: 'sticky',
                    bottom: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: theme.palette.background.Paper
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
                        disabled={!canSendMessages}
                    >
                        Send
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

export default Chat
